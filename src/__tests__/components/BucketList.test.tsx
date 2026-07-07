/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import BucketList from '@/components/s3/BucketList';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  FolderIcon: ({ className }: { className?: string }) => <div className={className} data-testid="folder-icon" />,
  ArrowPathIcon: ({ className }: { className?: string }) => <div className={className} data-testid="refresh-icon" />,
  ExclamationTriangleIcon: ({ className }: { className?: string }) => <div className={className} data-testid="error-icon" />,
}));

describe('BucketList', () => {
  beforeEach(() => {
    (global.fetch as any).mockClear();
  });

  it('should render loading state initially', () => {
    // Mock fetch to return a promise that never resolves (simulating loading)
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(<BucketList />);
    
    expect(getByText('Loading folders...')).toBeInTheDocument();
  });

  it('should render empty state when no folders exist', async () => {
    // Mock successful API response with empty data
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    const { findByText } = render(<BucketList />);
    
    await findByText('No Folders Found');
    expect(await findByText('Upload Files')).toBeInTheDocument();
  });

  it('should render error state when API fails', async () => {
    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'API Error' } })
    });

    const { findByText } = render(<BucketList />);
    
    await findByText('Error Loading Folders');
    await findByText('API Error');
  });
});