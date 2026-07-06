import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ZipCreationModal from '@/components/upload/ZipCreationModal';

// Mock the ZipService
const mockCreateZip = vi.fn();
const mockValidateFilesForZip = vi.fn();

vi.mock('@/lib/services/zipService', () => ({
  ZipService: {
    createZip: mockCreateZip,
    validateFilesForZip: mockValidateFilesForZip,
    estimateCompressionRatio: vi.fn().mockReturnValue(35)
  }
}));

describe('ZipCreationModal', () => {
  const mockFiles = [
    new File(['content1'], 'file1.txt', { type: 'text/plain' }),
    new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    new File(['content3'], 'file3.jpg', { type: 'image/jpeg' })
  ];

  const defaultProps = {
    files: mockFiles,
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default validation result
    mockValidateFilesForZip.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });

    // Default create zip result
    mockCreateZip.mockResolvedValue({
      success: true,
      blob: new Blob(['zip content'], { type: 'application/zip' }),
      originalSize: 1000,
      compressedSize: 650,
      compressionRatio: 35
    });
  });

  it('should not render when isOpen is false', () => {
    render(<ZipCreationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Create ZIP Archive')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Create ZIP Archive')).toBeInTheDocument();
    expect(screen.getByText('Files:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display file summary correctly', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Files:')).toBeInTheDocument();
    expect(screen.getByText('Total size:')).toBeInTheDocument();
    expect(screen.getByText('Estimated compressed:')).toBeInTheDocument();
  });

  it('should show validation errors when present', () => {
    mockValidateFilesForZip.mockReturnValue({
      isValid: false,
      errors: ['File size exceeds maximum limit'],
      warnings: []
    });

    render(<ZipCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Errors:')).toBeInTheDocument();
    expect(screen.getByText('File size exceeds maximum limit')).toBeInTheDocument();
  });

  it('should show validation warnings when present', () => {
    mockValidateFilesForZip.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Some files are already compressed']
    });

    render(<ZipCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText('Some files are already compressed')).toBeInTheDocument();
  });

  it('should disable Create ZIP button when validation fails', () => {
    mockValidateFilesForZip.mockReturnValue({
      isValid: false,
      errors: ['Invalid files'],
      warnings: []
    });

    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveClass('bg-gray-300', 'cursor-not-allowed');
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should start ZIP creation when Create ZIP button is clicked', async () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    expect(mockCreateZip).toHaveBeenCalledWith(mockFiles, {
      compressionLevel: 6,
      onProgress: expect.any(Function)
    });
  });

  it('should show progress during ZIP creation', async () => {
    let progressCallback: ((progress: any) => void) | null = null;
    
    mockCreateZip.mockImplementation((files, options) => {
      progressCallback = options.onProgress;
      return new Promise(resolve => {
        setTimeout(() => {
          if (progressCallback) {
            progressCallback({
              current: 1,
              total: 3,
              currentFile: 'file1.txt',
              percentage: 33
            });
          }
          resolve({
            success: true,
            blob: new Blob(['zip content']),
            originalSize: 1000,
            compressedSize: 650,
            compressionRatio: 35
          });
        }, 100);
      });
    });

    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating ZIP archive...')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Processing:')).toBeInTheDocument();
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });
  });

  it('should call onSuccess when ZIP creation succeeds', async () => {
    const mockResult = {
      success: true,
      blob: new Blob(['zip content']),
      originalSize: 1000,
      compressedSize: 650,
      compressionRatio: 35
    };
    
    mockCreateZip.mockResolvedValue(mockResult);
    
    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockResult);
    });
  });

  it('should call onError when ZIP creation fails', async () => {
    const errorResult = {
      success: false,
      error: 'ZIP creation failed',
      originalSize: 1000
    };
    
    mockCreateZip.mockResolvedValue(errorResult);
    
    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('ZIP creation failed');
    });
  });

  it('should handle ZIP creation exceptions', async () => {
    mockCreateZip.mockRejectedValue(new Error('Network error'));
    
    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Network error');
    });
  });

  it('should not show close button during ZIP creation', async () => {
    mockCreateZip.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<ZipCreationModal {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: 'Create ZIP' });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating ZIP archive...')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument();
    });
  });

  it('should display compression estimates correctly', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    expect(screen.getByText(/35\.0% savings/)).toBeInTheDocument();
  });

  it('should format file sizes correctly', () => {
    render(<ZipCreationModal {...defaultProps} />);
    
    // Should display formatted file sizes
    expect(screen.getByText(/Bytes|KB|MB|GB/)).toBeInTheDocument();
  });
});