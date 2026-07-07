import {
    CreateBucketCommand,
    DeleteBucketCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from './s3-client';

export interface BucketInfo {
    name: string;
    creationDate: Date;
    region: string;
}

export interface ObjectInfo {
    key: string;
    size: number;
    lastModified: Date;
    storageClass: string;
    etag: string;
}

export interface FolderInfo {
    name: string;
    prefix: string;
    objectCount: number;
    lastModified?: Date;
}

export interface UploadResult {
    success: boolean;
    fileKey: string;
    location: string;
    size: number;
    error?: string;
}

export class S3Service {
    private s3Client;
    private readonly DEFAULT_BUCKET: string;

    constructor() {
        this.s3Client = getS3Client();
        this.DEFAULT_BUCKET = process.env.AWS_S3_DEFAULT_BUCKET || 's3-file-manager';
    }

    /**
     * Initializes the service by ensuring the default bucket exists
     * Should be called once when the app starts
     */
    async initialize(): Promise<void> {
        try {
            await this.ensureMainBucket();
            console.log(`S3 Service initialized with bucket: ${this.DEFAULT_BUCKET}`);
        } catch (error) {
            console.error('Failed to initialize S3 Service:', error);
            // Don't throw - let the app continue, bucket will be created on first use
        }
    }

    /**
     * Ensures the main bucket exists, creates it if it doesn't
     */
    async ensureMainBucket(): Promise<string> {
        try {
            // First, try to check if we can list all buckets to see if our bucket exists
            const listBucketsCommand = new ListBucketsCommand({});
            const bucketsResponse = await this.s3Client.send(listBucketsCommand);
            
            // Check if our bucket already exists
            const existingBucket = bucketsResponse.Buckets?.find(bucket => bucket.Name === this.DEFAULT_BUCKET);
            if (existingBucket) {
                console.log(`Found existing bucket: ${this.DEFAULT_BUCKET}`);
                return this.DEFAULT_BUCKET;
            }

            // If bucket doesn't exist, create it
            console.log(`Bucket ${this.DEFAULT_BUCKET} not found, creating it...`);
            return await this.createBucket();

        } catch (error: any) {
            console.error('Error in ensureMainBucket:', error.message);
            
            // If we can't list buckets, try to access the bucket directly
            if (error?.name === 'AccessDenied' || error?.name === 'UnauthorizedOperation') {
                console.log('Cannot list buckets, trying direct bucket access...');
                return await this.checkBucketDirectly();
            }
            
            throw new Error(`Failed to access main bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Try to access the bucket directly when we can't list all buckets
     */
    private async checkBucketDirectly(): Promise<string> {
        try {
            // Try to list objects in the bucket to see if it exists
            const command = new ListObjectsV2Command({
                Bucket: this.DEFAULT_BUCKET,
                MaxKeys: 1,
            });

            await this.s3Client.send(command);
            console.log(`Bucket ${this.DEFAULT_BUCKET} exists and is accessible`);
            return this.DEFAULT_BUCKET;

        } catch (error: any) {
            if (error?.name === 'NoSuchBucket') {
                console.log(`Bucket ${this.DEFAULT_BUCKET} does not exist, creating it...`);
                return await this.createBucket();
            }
            
            // For other errors, provide more specific error messages
            if (error.message?.includes('endpoint')) {
                throw new Error(`Region mismatch: The bucket may exist in a different region. Current region: ${process.env.AWS_REGION}`);
            }
            
            throw new Error(`Failed to access bucket directly: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Creates the main bucket with proper error handling
     */
    private async createBucket(): Promise<string> {
        try {
            const region = process.env.AWS_REGION || 'us-east-1';
            
            const createCommand = new CreateBucketCommand({
                Bucket: this.DEFAULT_BUCKET,
                CreateBucketConfiguration: region !== 'us-east-1' ? {
                    LocationConstraint: region as any,
                } : undefined,
            });

            await this.s3Client.send(createCommand);
            console.log(`Successfully created S3 bucket: ${this.DEFAULT_BUCKET} in region: ${region}`);
            return this.DEFAULT_BUCKET;

        } catch (createError: any) {
            if (createError?.name === 'BucketAlreadyExists') {
                throw new Error(`Bucket name '${this.DEFAULT_BUCKET}' is already taken globally. Please choose a different name in your AWS_S3_DEFAULT_BUCKET environment variable.`);
            }
            
            if (createError?.name === 'BucketAlreadyOwnedByYou') {
                console.log(`Bucket ${this.DEFAULT_BUCKET} already exists and is owned by you`);
                return this.DEFAULT_BUCKET;
            }
            
            throw new Error(`Failed to create bucket: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
        }
    }

    /**
     * Lists folders (prefixes) in the main bucket
     */
    async listFolders(): Promise<FolderInfo[]> {
        try {
            await this.ensureMainBucket();

            const command = new ListObjectsV2Command({
                Bucket: this.DEFAULT_BUCKET,
                Delimiter: '/',
            });

            const response = await this.s3Client.send(command);
            const folders: FolderInfo[] = [];

            // Process common prefixes (folders)
            if (response.CommonPrefixes) {
                for (const prefix of response.CommonPrefixes) {
                    if (prefix.Prefix) {
                        const folderName = prefix.Prefix.replace('/', '');
                        
                        // Get object count and last modified for this folder
                        const folderObjects = await this.listObjects(this.DEFAULT_BUCKET, prefix.Prefix, 1000);
                        
                        folders.push({
                            name: folderName,
                            prefix: prefix.Prefix,
                            objectCount: folderObjects.length,
                            lastModified: folderObjects.length > 0 
                                ? folderObjects.reduce((latest, obj) => 
                                    obj.lastModified > latest ? obj.lastModified : latest, 
                                    folderObjects[0].lastModified)
                                : undefined
                        });
                    }
                }
            }

            return folders.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Creates a folder by ensuring it exists (will be created when first file is uploaded)
     */
    async createFolder(folderName: string): Promise<string> {
        await this.ensureMainBucket();
        
        // Sanitize folder name
        const sanitizedFolderName = this.sanitizeFolderName(folderName);
        if (!sanitizedFolderName) {
            throw new Error('Invalid folder name');
        }

        return `${sanitizedFolderName}/`;
    }

    /**
     * Uploads a file to a specific folder in the main bucket
     */
    async uploadFileToFolder(
        folderName: string,
        fileName: string,
        fileContent: Buffer | Uint8Array | string,
        contentType?: string
    ): Promise<UploadResult> {
        try {
            await this.ensureMainBucket();

            const sanitizedFolderName = this.sanitizeFolderName(folderName);
            const sanitizedFileName = this.sanitizeFileName(fileName);
            const fileKey = `${sanitizedFolderName}/${sanitizedFileName}`;

            const command = new PutObjectCommand({
                Bucket: this.DEFAULT_BUCKET,
                Key: fileKey,
                Body: fileContent,
                ContentType: contentType || 'application/octet-stream',
            });

            await this.s3Client.send(command);

            return {
                success: true,
                fileKey,
                location: `s3://${this.DEFAULT_BUCKET}/${fileKey}`,
                size: fileContent instanceof Buffer ? fileContent.length : fileContent.toString().length,
            };
        } catch (error) {
            return {
                success: false,
                fileKey: `${folderName}/${fileName}`,
                location: '',
                size: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Lists objects within a specific bucket
     */
    async listObjects(bucketName: string, prefix?: string, maxKeys?: number): Promise<ObjectInfo[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys || 1000,
            });

            const response = await this.s3Client.send(command);

            return (response.Contents || []).map(object => ({
                key: object.Key!,
                size: object.Size || 0,
                lastModified: object.LastModified!,
                storageClass: object.StorageClass || 'STANDARD',
                etag: object.ETag || '',
            }));
        } catch (error: any) {
            if (error?.name === 'NoSuchBucket') {
                throw new Error(`Bucket '${bucketName}' does not exist.`);
            }
            throw new Error(`Failed to list objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Uploads a file to S3
     */
    async uploadFile(
        bucketName: string,
        fileKey: string,
        fileContent: Buffer | Uint8Array | string,
        contentType?: string
    ): Promise<UploadResult> {
        try {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: fileKey,
                Body: fileContent,
                ContentType: contentType || 'application/octet-stream',
            });

            const response = await this.s3Client.send(command);

            return {
                success: true,
                fileKey,
                location: `s3://${bucketName}/${fileKey}`,
                size: fileContent instanceof Buffer ? fileContent.length : fileContent.toString().length,
            };
        } catch (error) {
            return {
                success: false,
                fileKey,
                location: '',
                size: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Generates a presigned URL for downloading an object
     */
    async generatePresignedUrl(bucketName: string, key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error) {
            throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Deletes an object from S3
     */
    async deleteObject(bucketName: string, key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Deletes a bucket (must be empty)
     */
    async deleteBucket(bucketName: string): Promise<boolean> {
        try {
            const command = new DeleteBucketCommand({
                Bucket: bucketName,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Gets metadata for a specific object
     */
    async getObjectMetadata(bucketName: string, key: string): Promise<ObjectInfo | null> {
        try {
            const command = new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const response = await this.s3Client.send(command);

            return {
                key,
                size: response.ContentLength || 0,
                lastModified: response.LastModified!,
                storageClass: response.StorageClass || 'STANDARD',
                etag: response.ETag || '',
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Validates bucket name according to AWS S3 naming conventions
     */
    private validateBucketName(bucketName: string): void {
        // AWS S3 bucket naming rules
        if (bucketName.length < 3 || bucketName.length > 63) {
            throw new Error('Bucket name must be between 3 and 63 characters long');
        }

        if (!/^[a-z0-9.-]+$/.test(bucketName)) {
            throw new Error('Bucket name can only contain lowercase letters, numbers, dots, and hyphens');
        }

        if (bucketName.startsWith('.') || bucketName.endsWith('.') ||
            bucketName.startsWith('-') || bucketName.endsWith('-')) {
            throw new Error('Bucket name cannot start or end with dots or hyphens');
        }

        if (bucketName.includes('..') || bucketName.includes('.-') || bucketName.includes('-.')) {
            throw new Error('Bucket name cannot contain consecutive dots or combinations of dots and hyphens');
        }

        if (/^\d+\.\d+\.\d+\.\d+$/.test(bucketName)) {
            throw new Error('Bucket name cannot be formatted as an IP address');
        }
    }

    /**
     * Sanitizes user input for folder names
     */
    private sanitizeFolderName(input: string): string {
        return input
            .trim()
            .replace(/[^a-zA-Z0-9-_.]/g, '-') // Replace invalid characters with hyphens
            .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
            .replace(/^-|-$/g, '') // Remove leading and trailing hyphens
            .toLowerCase();
    }

    /**
     * Sanitizes user input for file names
     */
    private sanitizeFileName(input: string): string {
        return input
            .trim()
            .replace(/[^a-zA-Z0-9-_.]/g, '_') // Replace invalid characters with underscores
            .replace(/_+/g, '_') // Replace multiple consecutive underscores with single underscore
            .replace(/^_|_$/g, ''); // Remove leading and trailing underscores
    }
}

// Export singleton instance
export const s3Service = new S3Service();