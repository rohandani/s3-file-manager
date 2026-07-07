import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth module
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn()
}));

// Mock the s3Service
vi.mock('@/lib/aws/s3-service', () => ({
  s3Service: {
    listFolders: vi.fn(),
    createFolder: vi.fn(),
    listObjects: vi.fn(),
    generatePresignedUrl: vi.fn(),
    uploadFileToFolder: vi.fn()
  }
}));

// Import after mocking
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { GET as getFolders, POST as createFolder } from '@/app/api/s3/folders/route';
import { GET as getObjects } from '@/app/api/s3/buckets/[bucketName]/objects/route';
import { POST as generatePresignedUrl } from '@/app/api/s3/presigned-url/route';
import { POST as uploadFiles } from '@/app/api/s3/upload/route';

const mockAuth = vi.mocked(auth);
const mockS3Service = vi.mocked(s3Service);

describe('S3 API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/s3/folders', () => {
    it('should return unauthorized when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await getFolders();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return folders when authenticated', async () => {
      const mockFolders = [
        { name: 'photos', prefix: 'photos/', objectCount: 5, lastModified: new Date('2026-07-06T23:37:59.129Z') },
        { name: 'documents', prefix: 'documents/', objectCount: 3, lastModified: new Date('2026-07-06T23:37:59.129Z') }
      ];

      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.listFolders.mockResolvedValue(mockFolders);

      const response = await getFolders();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('photos');
      expect(data.data[0].prefix).toBe('photos/');
      expect(data.data[0].objectCount).toBe(5);
    });
  });

  describe('POST /api/s3/folders', () => {
    it('should create folder with valid input', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });
      mockS3Service.createFolder.mockResolvedValue('test-folder/');

      const request = new NextRequest('http://localhost/api/s3/folders', {
        method: 'POST',
        body: JSON.stringify({ folderName: 'test-folder' })
      });

      const response = await createFolder(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.folderName).toBe('test-folder');
      expect(data.data.folderPrefix).toBe('test-folder/');
      expect(mockS3Service.createFolder).toHaveBeenCalledWith('test-folder');
    });

    it('should return error for empty folder name', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user123' } });

      const request = new NextRequest('http://localhost/api/s3/folders', {
        method: 'POST',
        body: JSON.stringify({ folderName: '' })
      });

      const response = await createFolder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });

});