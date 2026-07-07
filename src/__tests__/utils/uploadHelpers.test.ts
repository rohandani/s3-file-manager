/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { 
  validateFile, 
  createSafeFormData, 
  isFormDataError, 
  getUploadErrorMessage 
} from '@/lib/utils/uploadHelpers';

describe('uploadHelpers', () => {
  describe('validateFile', () => {
    it('should validate a good file', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty file', () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should reject file with empty name', () => {
      const file = new File(['content'], '', { type: 'text/plain' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File name is empty');
    });

    it('should reject oversized file', () => {
      const file = new File(['content'], 'large.txt', { type: 'text/plain' });
      // Mock size property to be larger than 100MB
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });
      
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('createSafeFormData', () => {
    it('should create FormData with valid inputs', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const formData = createSafeFormData('test-folder', [file]);
      
      expect(formData.get('folderName')).toBe('test-folder');
      expect(formData.getAll('files')).toHaveLength(1);
    });

    it('should throw error for empty folder name', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      expect(() => {
        createSafeFormData('', [file]);
      }).toThrow('Folder name is required');
    });

    it('should throw error for no files', () => {
      expect(() => {
        createSafeFormData('test-folder', []);
      }).toThrow('No files provided');
    });
  });

  describe('isFormDataError', () => {
    it('should detect FormData errors', () => {
      const error1 = new Error('Unexpected end of form');
      const error2 = new Error('boundary not found');
      const error3 = new Error('FormData parsing failed');
      
      expect(isFormDataError(error1)).toBe(true);
      expect(isFormDataError(error2)).toBe(true);
      expect(isFormDataError(error3)).toBe(true);
    });

    it('should not detect non-FormData errors', () => {
      const error1 = new Error('Network timeout');
      const error2 = new Error('File too large');
      
      expect(isFormDataError(error1)).toBe(false);
      expect(isFormDataError(error2)).toBe(false);
    });
  });

  describe('getUploadErrorMessage', () => {
    it('should return user-friendly message for FormData errors', () => {
      const error = new Error('Unexpected end of form boundary');
      const message = getUploadErrorMessage(error);
      
      expect(message).toContain('Network error');
      expect(message).toContain('interrupted');
    });

    it('should return user-friendly message for timeout errors', () => {
      const error = new Error('Request timeout');
      const message = getUploadErrorMessage(error);
      
      expect(message).toContain('timeout');
    });

    it('should return generic message for unknown errors', () => {
      const message = getUploadErrorMessage('unknown error');
      
      expect(message).toBe('Unknown upload error occurred');
    });
  });
});