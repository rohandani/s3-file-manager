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

export interface UploadResult {
    success: boolean;
    fileKey: string;
    location: string;
    size: number;
    error?: string;
}

export class S3Service {
    private s3Client;

    constructor() {
        this.s3Client = getS3Client();
    }

    /**
     * Creates a new S3 bucket with user naming and date stamping
     */
    async createBucket(baseName: string, userId: string): Promise<string> {
        // Validate bucket name
        const sanitizedBaseName = this.sanitizeBucketName(baseName);
        const dateStamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const bucketPrefix = process.env.AWS_S3_BUCKET_PREFIX || 's3-file-manager';
        const bucketName = `${bucketPrefix}-${sanitizedBaseName}-${dateStamp}`.toLowerCase();

        // Validate final bucket name
        this.validateBucketName(bucketName);

        try {
            const command = new CreateBucketCommand({
                Bucket: bucketName,
                CreateBucketConfiguration: process.env.AWS_REGION !== 'us-east-1' ? {
                    LocationConstraint: process.env.AWS_REGION as any,
                } : undefined,
            });

            await this.s3Client.send(command);
            return bucketName;
        } catch (error: any) {
            if (error?.name === 'BucketAlreadyExists' || error?.name === 'BucketAlreadyOwnedByYou') {
                throw new Error(`Bucket name '${bucketName}' already exists. Please choose a different name.`);
            }
            throw new Error(`Failed to create bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Lists all buckets associated with the current AWS credentials
     */
    async listUserBuckets(): Promise<BucketInfo[]> {
        try {
            const command = new ListBucketsCommand({});
            const response = await this.s3Client.send(command);

            return (response.Buckets || []).map(bucket => ({
                name: bucket.Name!,
                creationDate: bucket.CreationDate!,
                region: process.env.AWS_REGION || 'us-east-1',
            }));
        } catch (error) {
            throw new Error(`Failed to list buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
     * Sanitizes user input for bucket names
     */
    private sanitizeBucketName(input: string): string {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-') // Replace invalid characters with hyphens
            .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
            .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens
    }
}

// Export singleton instance
export const s3Service = new S3Service();