/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFilesToS3, uploadSingleFile } from '@/lib/actions/upload';

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

describe('uploadFilesToS3 Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when user is not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    (auth as any).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('folderName', 'test-folder');

    await expect(uploadFilesToS3(formData)).rejects.toThrow('Authentication required');
  });

  it('should throw error when folder name is missing', async () => {
    const { auth } = await import('@/lib/auth/auth');
    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    const formData = new FormData();
    // No folder name provided

    await expect(uploadFilesToS3(formData)).rejects.toThrow('Folder name not found in form data');
  });

  it('should throw error when no files provided', async () => {
    const { auth } = await import('@/lib/auth/auth');
    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    const formData = new FormData();
    formData.append('folderName', 'test-folder');
    // No files provided

    await expect(uploadFilesToS3(formData)).rejects.toThrow('No files found in form data');
  });

  it('should successfully upload files', async () => {
    const { auth } = await import('@/lib/auth/auth');
    const { s3Service } = await import('@/lib/aws/s3-service');

    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    // Mock successful S3 upload
    (s3Service.uploadFileToFolder as any).mockResolvedValue({
      success: true,
      fileKey: 'test-folder/test-file.txt',
      location: 's3://bucket/test-folder/test-file.txt',
      size: 100
    });

    const formData = new FormData();
    formData.append('folderName', 'test-folder');

    // Create a mock file
    const mockFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });
    formData.append('files', mockFile);

    const result = await uploadFilesToS3(formData);

    expect(result.summary.total).toBe(1);
    expect(result.summary.successful).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].fileName).toBe('test-file.txt');
  });

  it('should handle oversized files', async () => {
    const { auth } = await import('@/lib/auth/auth');

    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    const formData = new FormData();
    formData.append('folderName', 'test-folder');

    // Create a mock file larger than 100MB (simulate by setting size property)
    const mockFile = new File(['test content'], 'large-file.txt', { type: 'text/plain' });
    Object.defineProperty(mockFile, 'size', { value: 101 * 1024 * 1024 }); // 101MB
    formData.append('files', mockFile);

    await expect(uploadFilesToS3(formData)).rejects.toThrow('Files too large');
  });

  it('should handle corrupted FormData gracefully', async () => {
    const { auth } = await import('@/lib/auth/auth');

    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    // Create FormData that will trigger parsing error
    const formData = new FormData();
    formData.append('folderName', 'test-folder');

    // Mock FormData methods to throw boundary error
    const originalGet = formData.get.bind(formData);
    formData.get = vi.fn(() => {
      throw new Error('Unexpected end of form boundary');
    });

    await expect(uploadFilesToS3(formData)).rejects.toThrow('Upload failed due to network issues');
  });
});

describe('uploadSingleFile Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload single file successfully', async () => {
    const { auth } = await import('@/lib/auth/auth');
    const { s3Service } = await import('@/lib/aws/s3-service');

    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    (s3Service.uploadFileToFolder as any).mockResolvedValue({
      success: true,
      fileKey: 'test-folder/test.txt',
      location: 's3://bucket/test-folder/test.txt',
      size: 100
    });

    const fileContent = new ArrayBuffer(100);
    const result = await uploadSingleFile('test-folder', 'test.txt', fileContent, 'text/plain');

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('test.txt');
  });

  it('should handle oversized file in single upload', async () => {
    const { auth } = await import('@/lib/auth/auth');

    (auth as any).mockResolvedValue({
      user: { id: 'user123', email: 'test@example.com' }
    });

    const fileContent = new ArrayBuffer(101 * 1024 * 1024); // 101MB
    const result = await uploadSingleFile('test-folder', 'large.txt', fileContent);

    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });
});