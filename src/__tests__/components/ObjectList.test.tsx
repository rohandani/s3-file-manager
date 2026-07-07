/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import ObjectList from '@/components/s3/ObjectList';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  DocumentIcon: ({ className }: { className?: string }) => <div className={className} data-testid="document-icon" />,
  PhotoIcon: ({ className }: { className?: string }) => <div className={className} data-testid="photo-icon" />,
  VideoCameraIcon: ({ className }: { className?: string }) => <div className={className} data-testid="video-icon" />,
  MusicalNoteIcon: ({ className }: { className?: string }) => <div className={className} data-testid="music-icon" />,
  ArchiveBoxIcon: ({ className }: { className?: string }) => <div className={className} data-testid="archive-icon" />,
  ArrowPathIcon: ({ className }: { className?: string }) => <div className={className} data-testid="refresh-icon" />,
  ExclamationTriangleIcon: ({ className }: { className?: string }) => <div className={className} data-testid="error-icon" />,
  ArrowDownTrayIcon: ({ className }: { className?: string }) => <div className={className} data-testid="download-icon" />,
}));

describe('ObjectList', () => {
  beforeEach(() => {
    (global.fetch as any).mockClear();
  });

  it('should render loading state initially', () => {
    // Mock fetch to return a promise that never resolves (simulating loading)
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(<ObjectList bucketName="test-bucket" />);
    
    expect(getByText('Loading files...')).toBeInTheDocument();
  });

  it('should render empty state when no objects exist', async () => {
    // Mock successful API response with empty data
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { objects: [] } })
    });

    const { findByText } = render(<ObjectList bucketName="test-bucket" />);
    
    await findByText('No Files Found');
    await findByText('This folder is empty. Upload some files to get started.');
  });

  it('should render error state when API fails', async () => {
    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Bucket not found' } })
    });

    const { findByText } = render(<ObjectList bucketName="test-bucket" />);
    
    await findByText('Error Loading Files');
    await findByText('Bucket not found');
  });

  it('should handle download button click', async () => {
    // Mock successful API response with file data
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { objects: [
          {
            key: 'test-folder/test-file.pdf',
            size: 1024,
            lastModified: new Date('2024-01-01T00:00:00Z'),
            storageClass: 'STANDARD',
            etag: 'test-etag'
          }
        ] } })
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test content'], { type: 'application/pdf' })
      });

    const { findByText, getByRole } = render(<ObjectList bucketName="test-bucket" />);
    
    // Wait for the file to be rendered
    await findByText('test-file.pdf');
    
    // Find and click the download button
    const downloadButton = getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
    
    // Note: We can't easily test the actual download behavior in JSDOM
    // but we can verify the button is present and clickable
    expect(downloadButton).not.toBeDisabled();
  });
});