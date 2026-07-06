'use client'

import { useCallback, useState } from 'react'
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone'

export interface FileWithPreview extends File {
  preview?: string
}

interface FileUploadZoneProps {
  onFilesAccepted: (files: FileWithPreview[]) => void
  maxSize?: number
  maxFiles?: number
  acceptedTypes?: Record<string, string[]>
  disabled?: boolean
}

export default function FileUploadZone({
  onFilesAccepted,
  maxSize = 100 * 1024 * 1024, // 100MB default
  maxFiles = 10,
  acceptedTypes = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
    'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.wmv'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.csv', '.json'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar']
  },
  disabled = false
}: FileUploadZoneProps) {
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([])
  
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setRejectedFiles(fileRejections)
    
    if (acceptedFiles.length > 0) {
      // Create preview URLs for images and videos
      const filesWithPreview = acceptedFiles.map(file => {
        const fileWithPreview = Object.assign(file, {
          preview: file.type.startsWith('image/') || file.type.startsWith('video/') 
            ? URL.createObjectURL(file) 
            : undefined
        })
        return fileWithPreview
      })
      
      onFilesAccepted(filesWithPreview)
    }
  }, [onFilesAccepted])

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    maxSize,
    maxFiles,
    accept: acceptedTypes,
    disabled,
    multiple: true
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    isFocused
  } = useDropzone(dropzoneOptions)

  // Dynamic styling based on dropzone state
  const getDropzoneClassName = () => {
    let baseClasses = "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ease-in-out focus:outline-none"
    
    if (disabled) {
      return `${baseClasses} border-gray-300 bg-gray-100 cursor-not-allowed`
    }
    
    if (isDragReject) {
      return `${baseClasses} border-red-400 bg-red-50 text-red-600`
    }
    
    if (isDragAccept || isFocused) {
      return `${baseClasses} border-green-400 bg-green-50 text-green-600`
    }
    
    if (isDragActive) {
      return `${baseClasses} border-blue-400 bg-blue-50 text-blue-600`
    }
    
    return `${baseClasses} border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 text-gray-600`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      <div {...getRootProps()} className={getDropzoneClassName()}>
        <input {...getInputProps()} />
        <div className="space-y-4">
          {/* Upload icon */}
          <div className="mx-auto w-12 h-12 flex items-center justify-center">
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
          </div>
          
          {/* Upload text */}
          <div>
            <p className="text-lg font-medium">
              {isDragActive ? (
                isDragReject ? (
                  "Some files are not supported"
                ) : (
                  "Drop files here..."
                )
              ) : (
                "Drag & drop files here, or click to select"
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Max {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: Images, Videos, PDFs, Text files, Archives
            </p>
          </div>
        </div>
      </div>

      {/* Error messages for rejected files */}
      {rejectedFiles.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Some files were rejected:
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {rejectedFiles.map(({ file, errors }) => (
              <li key={file.name} className="flex items-start space-x-2">
                <span className="font-medium">{file.name}:</span>
                <span>
                  {errors.map(e => e.message).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}