import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FileUploadManager from '@/components/upload/FileUploadManager'

// Mock the dependencies
vi.mock('@/components/upload/FileUploadZone', () => ({
  default: ({ onFilesAccepted }: { onFilesAccepted: (files: any[]) => void }) => (
    <div data-testid="file-upload-zone">
      <button
        onClick={() => onFilesAccepted([
          { name: 'test.txt', size: 1024, type: 'text/plain' }
        ])}
      >
        Add Files
      </button>
    </div>
  )
}))

vi.mock('@/components/upload/FilePreview', () => ({
  default: ({ files, onRemoveFile, onClearAll }: any) => (
    <div data-testid="file-preview">
      {files.map((file: any, index: number) => (
        <div key={index} data-testid={`file-${index}`}>
          {file.name}
          <button onClick={() => onRemoveFile(index)}>Remove</button>
        </div>
      ))}
      <button onClick={onClearAll}>Clear All</button>
    </div>
  )
}))

vi.mock('@/components/upload/UploadProgress', () => ({
  default: ({ files, onRetry }: any) => (
    <div data-testid="upload-progress">
      {files.map((file: any, index: number) => (
        <div key={index} data-testid={`progress-${index}`}>
          {file.name}: {file.status}
          {file.status === 'error' && onRetry && (
            <button onClick={() => onRetry(file.name)}>Retry</button>
          )}
        </div>
      ))}
    </div>
  )
}))

// Mock fetch
global.fetch = vi.fn()

describe('FileUploadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial file selection step', () => {
    render(<FileUploadManager />)
    
    expect(screen.getByText('Select Files to Upload')).toBeInTheDocument()
    expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument()
  })

  it('progresses to folder selection after files are selected', async () => {
    render(<FileUploadManager />)
    
    // Add files
    fireEvent.click(screen.getByText('Add Files'))
    
    // Should show file preview and next button
    expect(screen.getByTestId('file-preview')).toBeInTheDocument()
    expect(screen.getByText('Choose Destination →')).toBeInTheDocument()
    
    // Click next
    fireEvent.click(screen.getByText('Choose Destination →'))
    
    // Should progress to folder step
    await waitFor(() => {
      expect(screen.getByText('Choose Folder')).toBeInTheDocument()
    })
  })

  it('loads folders when entering folder selection step', async () => {
    const mockFolders = [
      {
        name: 'test-folder-1',
        prefix: 'test-folder-1/',
        objectCount: 5,
        lastModified: '2024-01-01T00:00:00Z'
      },
      {
        name: 'test-folder-2',
        prefix: 'test-folder-2/',
        objectCount: 3,
        lastModified: '2024-01-02T00:00:00Z'
      }
    ]

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockFolders })
    })

    render(<FileUploadManager />)
    
    // Add files and go to folder step
    fireEvent.click(screen.getByText('Add Files'))
    fireEvent.click(screen.getByText('Choose Destination →'))
    
    // Should load folders
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/s3/folders')
    })

    // Should display folders
    await waitFor(() => {
      expect(screen.getByText('test-folder-1')).toBeInTheDocument()
      expect(screen.getByText('test-folder-2')).toBeInTheDocument()
    })
  })

  it('handles folder creation', async () => {
    const mockResponse = {
      data: {
        folderName: 'new-test-folder',
        folderPrefix: 'new-test-folder/'
      }
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }) // Empty folder list
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse // Folder creation response
      })

    render(<FileUploadManager />)
    
    // Add files and go to folder step
    fireEvent.click(screen.getByText('Add Files'))
    fireEvent.click(screen.getByText('Choose Destination →'))
    
    await waitFor(() => {
      expect(screen.getByText('Create New Folder')).toBeInTheDocument()
    })
    
    // Fill folder name and create
    const input = screen.getByPlaceholderText('my-documents')
    fireEvent.change(input, { target: { value: 'new-test-folder' } })
    fireEvent.click(screen.getByText('Create'))
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/s3/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderName: 'new-test-folder' }),
      })
    })
  })

  it('handles upload process', async () => {
    const mockUploadResponse = {
      data: {
        results: [
          {
            fileName: 'test.txt',
            success: true,
            fileKey: 'test-folder/test.txt',
            location: 's3://s3-file-manager/test-folder/test.txt',
            size: 1024
          }
        ],
        summary: {
          total: 1,
          successful: 1,
          failed: 0
        }
      }
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: 'test-folder', prefix: 'test-folder/', objectCount: 0 }] }) // Folder list
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUploadResponse // Upload response
      })

    render(<FileUploadManager />)
    
    // Add files, select folder, and start upload
    fireEvent.click(screen.getByText('Add Files'))
    fireEvent.click(screen.getByText('Choose Destination →'))
    
    await waitFor(() => {
      expect(screen.getByText('test-folder')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('test-folder'))
    fireEvent.click(screen.getByText('Upload Files →'))
    
    // Should call upload API
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/s3/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    // Should show progress
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
  })

  it('handles upload errors', async () => {
    const mockErrorResponse = {
      error: {
        message: 'Upload failed: Network error'
      }
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: 'test-folder', prefix: 'test-folder/', objectCount: 0 }] })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      })

    render(<FileUploadManager />)
    
    // Add files, select folder, and start upload
    fireEvent.click(screen.getByText('Add Files'))
    fireEvent.click(screen.getByText('Choose Destination →'))
    
    await waitFor(() => {
      expect(screen.getByText('test-folder')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('test-folder'))
    fireEvent.click(screen.getByText('Upload Files →'))
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Upload Error')).toBeInTheDocument()
      expect(screen.getByText('Upload failed: Network error')).toBeInTheDocument()
    })
  })
})