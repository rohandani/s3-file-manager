/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/s3/folders/route';
import { NextRequest } from 'next/server';

// Mock the auth module
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(),
}));

// Mock the AWS initialize module
vi.mock('@/lib/aws/initialize', () => ({
  ensureAWSInitialized: vi.fn(),
}));

// Mock the S3 service
vi.mock('@/lib/aws/s3-service', () => ({
  s3Service: {
    listFolders: vi.fn(),
    createFolder: vi.fn(),
  },
}));

describe('/api/s3/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { auth } = await import('@/lib/auth/auth');
      (auth as any).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should successfully return folders list', async () => {
      const { auth } = await import('@/lib/auth/auth');
      const { s3Service } = await import('@/lib/aws/s3-service');
      
      (auth as any).mockResolvedValue({ 
        user: { id: 'user123', email: 'test@example.com' } 
      });

      // Mock successful folder listing
      const mockFolders = [
        {
          name: 'photos',
          prefix: 'photos/',
          objectCount: 5,
          lastModified: new Date('2024-01-01T00:00:00Z')
        }
      ];
      (s3Service.listFolders as any).mockResolvedValue(mockFolders);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockFolders);
    });
  });

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { auth } = await import('@/lib/auth/auth');
      (auth as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/s3/folders', {
        method: 'POST',
        body: JSON.stringify({ folderName: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should successfully create a folder', async () => {
      const { auth } = await import('@/lib/auth/auth');
      const { s3Service } = await import('@/lib/aws/s3-service');
      
      (auth as any).mockResolvedValue({ 
        user: { id: 'user123', email: 'test@example.com' } 
      });

      (s3Service.createFolder as any).mockResolvedValue('test-folder/');

      const request = new NextRequest('http://localhost:3000/api/s3/folders', {
        method: 'POST',
        body: JSON.stringify({ folderName: 'test-folder' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.folderName).toBe('test-folder');
    });
  });
});