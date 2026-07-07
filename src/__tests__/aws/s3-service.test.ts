import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  S3Client,
  CreateBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { S3Service } from '../../lib/aws/s3-service';

// Create S3 client mock
const s3Mock = mockClient(S3Client);

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    // Reset all mocks before each test
    s3Mock.reset();
    s3Service = new S3Service();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureMainBucket', () => {
    it('should return existing bucket name if bucket exists', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });

      const result = await s3Service.ensureMainBucket();

      expect(result).toBe('s3-file-manager-test');
      expect(s3Mock.commandCalls(ListObjectsV2Command)).toHaveLength(1);
    });

    it('should create bucket if it does not exist', async () => {
      const noSuchBucketError = new Error('NoSuchBucket');
      noSuchBucketError.name = 'NoSuchBucket';
      
      s3Mock.on(ListObjectsV2Command).rejects(noSuchBucketError);
      s3Mock.on(CreateBucketCommand).resolves({});

      const result = await s3Service.ensureMainBucket();

      expect(result).toBe('s3-file-manager-test');
      expect(s3Mock.commandCalls(CreateBucketCommand)).toHaveLength(1);
      expect(s3Mock.commandCalls(CreateBucketCommand)[0].args[0].input).toEqual({
        Bucket: 's3-file-manager-test',
        CreateBucketConfiguration: undefined,
      });
    });
  });

  describe('listFolders', () => {
    it('should return list of folders from bucket', async () => {
      s3Mock.on(ListObjectsV2Command)
        .resolvesOnce({
          Contents: []
        })
        .resolvesOnce({
          CommonPrefixes: [
            { Prefix: 'photos/' },
            { Prefix: 'documents/' }
          ]
        })
        .resolvesOnce({
          Contents: [
            { Key: 'photos/image1.jpg', Size: 1024, LastModified: new Date('2024-01-01') },
            { Key: 'photos/image2.jpg', Size: 2048, LastModified: new Date('2024-01-02') }
          ]
        })
        .resolvesOnce({
          Contents: [
            { Key: 'documents/doc1.pdf', Size: 5120, LastModified: new Date('2024-01-03') }
          ]
        });

      const result = await s3Service.listFolders();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'documents',
        prefix: 'documents/',
        objectCount: 1,
        lastModified: new Date('2024-01-03')
      });
      expect(result[1]).toEqual({
        name: 'photos',
        prefix: 'photos/',
        objectCount: 2,
        lastModified: new Date('2024-01-02')
      });
    });
  });

  describe('createFolder', () => {
    it('should create folder prefix with sanitized name', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });

      const result = await s3Service.createFolder('My Photos');

      expect(result).toBe('my-photos/');
    });

    it('should sanitize invalid characters in folder names', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });

      const result = await s3Service.createFolder('My Folder!@#');

      expect(result).toBe('my-folder/');
    });
  });

  describe('uploadFileToFolder', () => {
    it('should upload file to specified folder', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });
      s3Mock.on(PutObjectCommand).resolves({});

      const fileContent = Buffer.from('test content');
      const result = await s3Service.uploadFileToFolder('photos', 'test.jpg', fileContent, 'image/jpeg');

      expect(result.success).toBe(true);
      expect(result.fileKey).toBe('photos/test.jpg');
      expect(result.location).toBe('s3://s3-file-manager-test/photos/test.jpg');
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
    });

    it('should handle upload failure', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });
      s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

      const fileContent = Buffer.from('test content');
      const result = await s3Service.uploadFileToFolder('photos', 'test.jpg', fileContent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should use default content type when not provided', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });
      s3Mock.on(PutObjectCommand).resolves({});

      const fileContent = Buffer.from('test content');
      await s3Service.uploadFileToFolder('documents', 'test.txt', fileContent);

      expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.ContentType)
        .toBe('application/octet-stream');
    });
  });

  describe('listObjects', () => {
    it('should return list of objects with proper formatting', async () => {
      const mockObjects = [
        {
          Key: 'file1.txt',
          Size: 1024,
          LastModified: new Date('2026-01-01'),
          StorageClass: 'STANDARD' as const,
          ETag: '"abc123"',
        },
        {
          Key: 'file2.jpg',
          Size: 2048,
          LastModified: new Date('2026-01-02'),
          StorageClass: 'REDUCED_REDUNDANCY' as const,
          ETag: '"def456"',
        },
      ];

      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: mockObjects
      });

      const result = await s3Service.listObjects('test-bucket');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'file1.txt',
        size: 1024,
        lastModified: new Date('2026-01-01'),
        storageClass: 'STANDARD',
        etag: '"abc123"',
      });
    });

    it('should handle prefix parameter', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: []
      });

      await s3Service.listObjects('test-bucket', 'uploads/');

      expect(s3Mock.commandCalls(ListObjectsV2Command)[0].args[0].input).toEqual({
        Bucket: 'test-bucket',
        Prefix: 'uploads/',
        MaxKeys: 1000,
      });
    });

    it('should throw error for non-existent bucket', async () => {
      const error = new Error('The specified bucket does not exist');
      error.name = 'NoSuchBucket';
      s3Mock.on(ListObjectsV2Command).rejects(error);

      await expect(s3Service.listObjects('nonexistent-bucket'))
        .rejects.toThrow('does not exist');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      s3Mock.on(PutObjectCommand).resolves({
        ETag: '"abc123"'
      });

      const fileContent = Buffer.from('test content');
      const result = await s3Service.uploadFile(
        'test-bucket',
        'test-file.txt',
        fileContent,
        'text/plain'
      );

      expect(result.success).toBe(true);
      expect(result.fileKey).toBe('test-file.txt');
      expect(result.location).toBe('s3://test-bucket/test-file.txt');
      expect(result.size).toBe(fileContent.length);
    });

    it('should handle upload failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

      const result = await s3Service.uploadFile(
        'test-bucket',
        'test-file.txt',
        Buffer.from('test'),
        'text/plain'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should use default content type when not provided', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await s3Service.uploadFile('test-bucket', 'test-file', Buffer.from('test'));

      expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.ContentType)
        .toBe('application/octet-stream');
    });
  });

  describe('deleteObject', () => {
    it('should delete object successfully', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      const result = await s3Service.deleteObject('test-bucket', 'test-file.txt');

      expect(result).toBe(true);
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
    });

    it('should throw error when delete fails', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('Delete failed'));

      await expect(s3Service.deleteObject('test-bucket', 'test-file.txt'))
        .rejects.toThrow('Failed to delete object');
    });
  });

  describe('deleteBucket', () => {
    it('should delete bucket successfully', async () => {
      s3Mock.on(DeleteBucketCommand).resolves({});

      const result = await s3Service.deleteBucket('test-bucket');

      expect(result).toBe(true);
      expect(s3Mock.commandCalls(DeleteBucketCommand)).toHaveLength(1);
    });
  });

  describe('getObjectMetadata', () => {
    it('should return object metadata', async () => {
      const mockMetadata = {
        ContentLength: 1024,
        LastModified: new Date('2026-01-01'),
        StorageClass: 'STANDARD' as const,
        ETag: '"abc123"',
      };

      s3Mock.on(HeadObjectCommand).resolves(mockMetadata);

      const result = await s3Service.getObjectMetadata('test-bucket', 'test-file.txt');

      expect(result).toEqual({
        key: 'test-file.txt',
        size: 1024,
        lastModified: new Date('2026-01-01'),
        storageClass: 'STANDARD',
        etag: '"abc123"',
      });
    });

    it('should return null for non-existent object', async () => {
      s3Mock.on(HeadObjectCommand).rejects(new Error('Not found'));

      const result = await s3Service.getObjectMetadata('test-bucket', 'nonexistent.txt');

      expect(result).toBeNull();
    });
  });
});