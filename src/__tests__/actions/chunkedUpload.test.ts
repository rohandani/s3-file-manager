/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFileChunk, completeChunkedUpload } from '@/lib/actions/chunkedUpload';

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
    uploadFileToFolder: vi.fn(),
  },
}));

describe('Chunked Upload Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFileChunk', () => {
    it('should upload chunk successfully', async () => {
      const { auth } = await import('@/lib/auth/auth');
      (auth as any).mockResolvedValue({ 
        user: { id: 'user123', email: 'test@example.com' } 
      });

      const chunk = {
        data: 'dGVzdCBkYXRh', // Base64 for "test data"
        chunkIndex: 0,
        totalChunks: 2,
        fileName: 'test.txt',
        folderName: 'test-folder',
        fileSize: 100,
        contentType: 'text/plain'
      };

      const result = await uploadFileChunk(chunk);

      expect(result.success).toBe(true);
      expect(result.chunkIndex).toBe(0);
      expect(result.totalChunks).toBe(2);
      expect(result.uploadId).toBeDefined();
    });

    it('should handle unauthenticated user', async () => {
      const { auth } = await import('@/lib/auth/auth');
      (auth as any).mockResolvedValue(null);

      const chunk = {
        data: 'dGVzdCBkYXRh',
        chunkIndex: 0,
        totalChunks: 1,
        fileName: 'test.txt',
        folderName: 'test-folder',
        fileSize: 100,
        contentType: 'text/plain'
      };

      const result = await uploadFileChunk(chunk);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('completeChunkedUpload', () => {
    it('should handle missing upload session', async () => {
      const { auth } = await import('@/lib/auth/auth');
      (auth as any).mockResolvedValue({ 
        user: { id: 'user123', email: 'test@example.com' } 
      });

      const result = await completeChunkedUpload('invalid-upload-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload session not found or expired');
    });
  });
});