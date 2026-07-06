import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth module
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn()
}));

// Mock the s3Service
vi.mock('@/lib/aws/s3-service', () => ({
  s3Service: {
    listUserBuckets: vi.fn(),
    createBucket: vi.fn(),
    listObjects: vi.fn(),
    generatePresignedUrl: vi.fn(),
    uploadFile: vi.fn()
  }
}));

// Import after mocking
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { GET as getBuckets, POST as createBucket } from '@/app/api/s3/buckets/route';
import { GET as getObjects } from '@/app/api/s3/buckets/[bucketName]/objects/route';
import { POST as generatePresignedUrl } from '@/app/api/s3/presigned-url/route';
import { POST as uploadFiles } from '@/app/api/s3/upload/route';

const mockAuth = vi.mocked(auth);
const mockS3Service = vi.mocked(s3Service);

describe('S3 API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/s3/buckets', () => {
    it('should return unauthorized when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await getBuckets();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return buckets when authenticated', async () => {
      const mockBuckets = [
        { name: 'test-bucket-1', creationDate: new Date('2026-07-06T23:37:59.129Z'), region: 'us-east-1' },
        { name: 'test-bucket-2', creationDate: new Date('2026-07-06T23:37:59.129Z'), region: 'us-east-1' }
      ];

      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.listUserBuckets.mockResolvedValue(mockBuckets);

      const response = await getBuckets();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Dates get serialized as strings in JSON, so we need to check the structure
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('test-bucket-1');
      expect(data.data[0].region).toBe('us-east-1');
      expect(typeof data.data[0].creationDate).toBe('string');
    });
  });

  describe('POST /api/s3/buckets', () => {
    it('should create bucket with valid input', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.createBucket.mockResolvedValue('test-bucket-2026-07-06');

      const request = new NextRequest('http://localhost/api/s3/buckets', {
        method: 'POST',
        body: JSON.stringify({ bucketName: 'test-bucket' })
      });

      const response = await createBucket(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.bucketName).toBe('test-bucket-2026-07-06');
      expect(mockS3Service.createBucket).toHaveBeenCalledWith('test-bucket', 'user123');
    });

    it('should return error for invalid bucket name', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });

      const request = new NextRequest('http://localhost/api/s3/buckets', {
        method: 'POST',
        body: JSON.stringify({ bucketName: '' })
      });

      const response = await createBucket(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /api/s3/buckets/[bucketName]/objects', () => {
    it('should list objects in bucket', async () => {
      const mockObjects = [
        {
          key: 'user123/file1.txt',
          size: 1024,
          lastModified: new Date('2026-07-06T23:37:59.190Z'),
          storageClass: 'STANDARD',
          etag: 'etag1'
        }
      ];

      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.listObjects.mockResolvedValue(mockObjects);

      const request = new NextRequest('http://localhost/api/s3/buckets/test-bucket/objects');
      const params = Promise.resolve({ bucketName: 'test-bucket' });

      const response = await getObjects(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Dates get serialized as strings in JSON
      expect(data.data.objects).toHaveLength(1);
      expect(data.data.objects[0].key).toBe('user123/file1.txt');
      expect(data.data.objects[0].size).toBe(1024);
      expect(typeof data.data.objects[0].lastModified).toBe('string');
      expect(data.data.bucketName).toBe('test-bucket');
    });
  });

  describe('POST /api/s3/presigned-url', () => {
    it('should generate presigned URL for user\'s file', async () => {
      const mockUrl = 'https://s3.amazonaws.com/test-bucket/user123/file.txt?signed-url';
      
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.generatePresignedUrl.mockResolvedValue(mockUrl);

      const request = new NextRequest('http://localhost/api/s3/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          bucketName: 'test-bucket',
          objectKey: 'user123/file.txt',
          expiresIn: 3600
        })
      });

      const response = await generatePresignedUrl(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.presignedUrl).toBe(mockUrl);
      expect(mockS3Service.generatePresignedUrl).toHaveBeenCalledWith(
        'test-bucket',
        'user123/file.txt',
        3600
      );
    });

    it('should reject access to other user\'s files', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });

      const request = new NextRequest('http://localhost/api/s3/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          bucketName: 'test-bucket',
          objectKey: 'other-user/file.txt',
          expiresIn: 3600
        })
      });

      const response = await generatePresignedUrl(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});