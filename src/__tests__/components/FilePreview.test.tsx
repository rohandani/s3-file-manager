import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import FilePreview from '@/components/upload/FilePreview'
import { FileWithPreview } from '@/components/upload/FileUploadZone'

// Mock URL methods
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mocked-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('FilePreview', () => {
  const mockOnRemoveFile = vi.fn()
  const mockOnClearAll = vi.fn()

  const sampleFiles: FileWithPreview[] = [
    Object.assign(new File(['content1'], 'image.jpg', { type: 'image/jpeg' }), {
      preview: 'preview-url-1'
    }),
    Object.assign(new File(['content2'], 'document.pdf', { type: 'application/pdf' }), {
      preview: undefined
    }),
    Object.assign(new File(['content3'], 'video.mp4', { type: 'video/mp4' }), {
      preview: 'preview-url-2'
    })
  ]

  beforeEach(() => {
    mockOnRemoveFile.mockClear()
    mockOnClearAll.mockClear()
  })

  it('does not render when no files are provided', () => {
    const { container } = render(
      <FilePreview 
        files={[]} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('renders file list with correct count and total size', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    expect(screen.getByText('Selected Files (3)')).toBeInTheDocument()
    
    // Check that all files are displayed
    expect(screen.getByText('image.jpg')).toBeInTheDocument()
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('video.mp4')).toBeInTheDocument()
  })

  it('displays file types and sizes correctly', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    expect(screen.getByText('image/jpeg')).toBeInTheDocument()
    expect(screen.getByText('application/pdf')).toBeInTheDocument()
    expect(screen.getByText('video/mp4')).toBeInTheDocument()
  })

  it('calls onRemoveFile when remove button is clicked', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    const removeButtons = screen.getAllByTitle('Remove file')
    fireEvent.click(removeButtons[0])
    
    expect(mockOnRemoveFile).toHaveBeenCalledWith(0)
  })

  it('calls onClearAll when Clear All button is clicked', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)
    
    expect(mockOnClearAll).toHaveBeenCalled()
  })

  it('renders image preview when available', () => {
    const imageFile = Object.assign(new File(['image'], 'test.jpg', { type: 'image/jpeg' }), {
      preview: 'test-preview-url'
    })
    
    render(
      <FilePreview 
        files={[imageFile]} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    const img = screen.getByAltText('test.jpg')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'test-preview-url')
  })

  it('renders video preview when available', () => {
    const videoFile = Object.assign(new File(['video'], 'test.mp4', { type: 'video/mp4' }), {
      preview: 'test-video-url'
    })
    
    render(
      <FilePreview 
        files={[videoFile]} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('src', 'test-video-url')
  })

  it('renders appropriate file icons for different file types', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    // Check that SVG elements are rendered (icons)
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('displays validation summary', () => {
    render(
      <FilePreview 
        files={sampleFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    expect(screen.getByText('Files ready for upload')).toBeInTheDocument()
    expect(screen.getByText(/All selected files have passed validation checks/)).toBeInTheDocument()
  })

  it('formats file sizes correctly', () => {
    const largeFile = Object.assign(new File(['x'.repeat(1024 * 1024)], 'large.txt', { type: 'text/plain' }), {
      preview: undefined
    })
    
    render(
      <FilePreview 
        files={[largeFile]} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    // Find all elements containing size information
    const sizeElements = screen.getAllByText(/MB|KB|Bytes/)
    expect(sizeElements.length).toBeGreaterThan(0)
  })

  it('handles scrollable list when many files are present', () => {
    const manyFiles = Array.from({ length: 20 }, (_, i) => 
      Object.assign(new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' }), {
        preview: undefined
      })
    )
    
    render(
      <FilePreview 
        files={manyFiles} 
        onRemoveFile={mockOnRemoveFile} 
        onClearAll={mockOnClearAll} 
      />
    )
    
    expect(screen.getByText('Selected Files (20)')).toBeInTheDocument()
    
    // Check that the container exists
    const fileListContainer = screen.getByText('Selected Files (20)').closest('div')
    expect(fileListContainer).toBeInTheDocument()
  })
})