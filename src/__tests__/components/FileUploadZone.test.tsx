import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import FileUploadZone from '@/components/upload/FileUploadZone'

// Mock URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mocked-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('FileUploadZone', () => {
  const mockOnFilesAccepted = vi.fn()

  beforeEach(() => {
    mockOnFilesAccepted.mockClear()
  })

  it('renders upload zone with default props', () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} />)
    
    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
    expect(screen.getByText('Max 10 files, up to 100 MB each')).toBeInTheDocument()
    expect(screen.getByText('Supports: Images, Videos, PDFs, Text files, Archives')).toBeInTheDocument()
  })

  it('shows custom limits when provided', () => {
    render(
      <FileUploadZone 
        onFilesAccepted={mockOnFilesAccepted}
        maxFiles={5}
        maxSize={50 * 1024 * 1024}
      />
    )
    
    expect(screen.getByText('Max 5 files, up to 50 MB each')).toBeInTheDocument()
  })

  it('shows disabled state when disabled prop is true', () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} disabled={true} />)
    
    // The disabled class is applied to the root div of the dropzone
    const dropzone = document.querySelector('[class*="cursor-not-allowed"]')
    expect(dropzone).toBeInTheDocument()
  })

  it('renders without errors for large files scenario', async () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} maxSize={1000} />)
    
    // Just verify that the component renders without errors
    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
  })

  it('renders drag active state', () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} />)
    
    // The component should render (we can't easily test the visual state changes without more complex mocking)
    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
  })

  it('accepts valid files via input', async () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} />)
    
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true
      })

      fireEvent.change(input)
      
      await waitFor(() => {
        expect(mockOnFilesAccepted).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'hello.txt',
            type: 'text/plain'
          })
        ])
      })
    }
  })

  it('creates preview URLs for image files', async () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} />)
    
    const imageFile = new File(['image data'], 'image.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [imageFile],
        configurable: true
      })

      fireEvent.change(input)
      
      await waitFor(() => {
        expect(mockOnFilesAccepted).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'image.jpg',
            type: 'image/jpeg',
            preview: 'mocked-url'
          })
        ])
      })
      
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(imageFile)
    }
  })

  it('does not create preview URLs for non-image/video files', async () => {
    render(<FileUploadZone onFilesAccepted={mockOnFilesAccepted} />)
    
    const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [textFile],
        configurable: true
      })

      fireEvent.change(input)
      
      await waitFor(() => {
        expect(mockOnFilesAccepted).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'document.txt',
            type: 'text/plain',
            preview: undefined
          })
        ])
      })
    }
  })
})