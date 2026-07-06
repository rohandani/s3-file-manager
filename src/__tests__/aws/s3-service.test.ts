import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  S3Client,
  CreateBucketCommand,
  ListBucketsCommand,
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

  describe('createBucket', () => {
    it('should create a bucket with proper naming convention', async () => {
      const bucketName = 's3-file-manager-test-my-bucket-2026-07-06';
      
      s3Mock.on(CreateBucketCommand).resolves({});

      // Mock Date to return consistent date
      const mockDate = new Date('2026-07-06T00:00:00Z');
      vi.setSystemTime(mockDate);

      const result = await s3Service.createBucket('my-bucket', 'user123');

      expect(result).toBe(bucketName);
      expect(s3Mock.commandCalls(CreateBucketCommand)).toHaveLength(1);
      expect(s3Mock.commandCalls(CreateBucketCommand)[0].args[0].input).toEqual({
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: undefined,
        },
      });

      vi.useRealTimers();
    });

    it('should sanitize invalid characters in bucket names', async () => {
      s3Mock.on(CreateBucketCommand).resolves({});
      
      const mockDate = new Date('2026-07-06T00:00:00Z');
      vi.setSystemTime(mockDate);

      const result = await s3Service.createBucket('My Bucket!@#', 'user123');

      expect(result).toBe('s3-file-manager-test-my-bucket-2026-07-06');
      vi.useRealTimers();
    });

    it('should throw error when bucket already exists', async () => {
      const error = new Error('Bucket already exists');
      error.name = 'BucketAlreadyExists';
      s3Mock.on(CreateBucketCommand).rejects(error);

      await expect(s3Service.createBucket('existing-bucket', 'user123'))
        .rejects.toThrow('already exists');
    });

    it('should validate bucket name length', async () => {
      // We need to create a very long bucket name to trigger validation
      const longName = 'a'.repeat(100);
      
      await expect(s3Service.createBucket(longName, 'user123'))
        .rejects.toThrow('between 3 and 63 characters');
    });
  });

  describe('listUserBuckets', () => {
    it('should return list of buckets with proper formatting', async () => {
      const mockBuckets = [
        { Name: 'bucket1', CreationDate: new Date('2026-01-01') },
        { Name: 'bucket2', CreationDate: new Date('2026-02-01') },
      ];

      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: mockBuckets
      });

      const result = await s3Service.listUserBuckets();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'bucket1',
        creationDate: new Date('2026-01-01'),
        region: 'us-east-1',
      });
    });

    it('should handle empty bucket list', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: []
      });

      const result = await s3Service.listUserBuckets();

      expect(result).toHaveLength(0);
    });

    it('should handle missing Buckets property', async () => {
      s3Mock.on(ListBucketsCommand).resolves({});

      const result = await s3Service.listUserBuckets();

      expect(result).toHaveLength(0);
    });
  });

  describe('listObjects', () => {
    it('should return list of objects with proper formatting', async () => {
      const mockObjects = [
        {
          Key: 'file1.txt',
          Size: 1024,
          LastModified: new Date('2026-01-01'),
          StorageClass: 'STANDARD',
          ETag: '"abc123"',
        },
        {
          Key: 'file2.jpg',
          Size: 2048,
          LastModified: new Date('2026-01-02'),
          StorageClass: 'IA',
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
        StorageClass: 'STANDARD',
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