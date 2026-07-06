import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZipService } from '@/lib/services/zipService';

// Mock JSZip
vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['mock zip content'], { type: 'application/zip' }))
    }))
  };
});

describe('ZipService', () => {
  // Helper function to create mock files
  const createMockFile = (name: string, size: number, type: string = 'text/plain'): File => {
    const content = 'x'.repeat(size);
    return new File([content], name, { type });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createZip', () => {
    it('should successfully create a zip from multiple files', async () => {
      const files = [
        createMockFile('file1.txt', 100),
        createMockFile('file2.txt', 200),
        createMockFile('file3.jpg', 300)
      ];

      const result = await ZipService.createZip(files);

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.originalSize).toBe(600);
      expect(result.compressedSize).toBeGreaterThan(0);
    });

    it('should handle empty file array', async () => {
      const result = await ZipService.createZip([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No files provided for ZIP creation');
      expect(result.originalSize).toBe(0);
    });

    it('should respect maximum file size limit', async () => {
      const files = [createMockFile('largefile.txt', 1000)];
      const maxSize = 500;

      const result = await ZipService.createZip(files, { maxFileSize: maxSize });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
      expect(result.originalSize).toBe(1000);
    });

    it('should filter out excluded file extensions', async () => {
      const files = [
        createMockFile('document.txt', 100),
        createMockFile('archive.zip', 200),
        createMockFile('compressed.rar', 150)
      ];

      const result = await ZipService.createZip(files);

      // Should only include the txt file, excluding zip and rar
      expect(result.success).toBe(true);
      // The originalSize should still include all files for comparison
      expect(result.originalSize).toBe(450);
    });

    it('should call progress callback during creation', async () => {
      const files = [
        createMockFile('file1.txt', 100),
        createMockFile('file2.txt', 200)
      ];

      const progressCallback = vi.fn();

      await ZipService.createZip(files, { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith({
        current: 1,
        total: 2,
        currentFile: 'file1.txt',
        percentage: 50
      });
      expect(progressCallback).toHaveBeenCalledWith({
        current: 2,
        total: 2,
        currentFile: 'file2.txt',
        percentage: 100
      });
    });

    it('should handle JSZip errors gracefully', async () => {
      // Mock JSZip to throw an error
      const JSZip = await import('jszip');
      vi.mocked(JSZip.default).mockImplementation(() => {
        throw new Error('JSZip initialization failed');
      });

      const files = [createMockFile('file1.txt', 100)];
      const result = await ZipService.createZip(files);

      expect(result.success).toBe(false);
      expect(result.error).toBe('JSZip initialization failed');
    });
  });

  describe('validateFilesForZip', () => {
    it('should validate files successfully', () => {
      const files = [
        createMockFile('file1.txt', 100),
        createMockFile('file2.jpg', 200)
      ];

      const result = ZipService.validateFilesForZip(files);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect when no files are provided', () => {
      const result = ZipService.validateFilesForZip([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No files selected for ZIP creation');
    });

    it('should detect when total size exceeds maximum', () => {
      const files = [createMockFile('largefile.txt', 1000)];
      const maxSize = 500;

      const result = ZipService.validateFilesForZip(files, maxSize);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should warn about duplicate filenames', () => {
      const files = [
        createMockFile('duplicate.txt', 100),
        createMockFile('duplicate.txt', 200)
      ];

      const result = ZipService.validateFilesForZip(files);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Duplicate filenames found: duplicate.txt. Files will be renamed automatically.');
    });

    it('should warn about already compressed files', () => {
      const files = [
        createMockFile('document.txt', 100),
        createMockFile('archive.zip', 200)
      ];

      const result = ZipService.validateFilesForZip(files);

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('already compressed');
      expect(result.warnings[0]).toContain('archive.zip');
    });
  });

  describe('estimateCompressionRatio', () => {
    it('should estimate high compression for text files', () => {
      const files = [
        createMockFile('document.txt', 1000),
        createMockFile('data.csv', 2000)
      ];

      const ratio = ZipService.estimateCompressionRatio(files);

      expect(ratio).toBeGreaterThan(50); // Text files should compress well
    });

    it('should estimate low compression for already compressed files', () => {
      const files = [
        createMockFile('image.jpg', 1000),
        createMockFile('video.mp4', 2000)
      ];

      const ratio = ZipService.estimateCompressionRatio(files);

      expect(ratio).toBeLessThan(10); // Already compressed files
    });

    it('should handle mixed file types', () => {
      const files = [
        createMockFile('document.txt', 1000), // High compression
        createMockFile('image.jpg', 1000),    // Low compression
        createMockFile('data.pdf', 1000)      // Medium compression
      ];

      const ratio = ZipService.estimateCompressionRatio(files);

      expect(ratio).toBeGreaterThan(10);
      expect(ratio).toBeLessThan(50);
    });

    it('should return 0 for empty file list', () => {
      const ratio = ZipService.estimateCompressionRatio([]);

      expect(ratio).toBe(0);
    });
  });
});