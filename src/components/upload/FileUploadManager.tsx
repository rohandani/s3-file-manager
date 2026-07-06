'use client'

import { useState, useCallback } from 'react'
import FileUploadZone, { FileWithPreview } from './FileUploadZone'
import FilePreview from './FilePreview'
import UploadProgress, { UploadProgressFile } from './UploadProgress'

type UploadMethod = 'individual' | 'zip'
type UploadStep = 'select' | 'method' | 'progress' | 'complete'

interface FileUploadManagerProps {
  onUploadComplete?: (results: any[]) => void
}

export default function FileUploadManager({ onUploadComplete }: FileUploadManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('individual')
  const [currentStep, setCurrentStep] = useState<UploadStep>('select')
  const [uploadProgress, setUploadProgress] = useState<UploadProgressFile[]>([])
  const [totalProgress, setTotalProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleFilesAccepted = useCallback((files: FileWithPreview[]) => {
    setSelectedFiles(prevFiles => [...prevFiles, ...files])
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prevFiles => {
      const newFiles = [...prevFiles]
      // Clean up preview URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }, [])

  const handleClearAll = useCallback(() => {
    // Clean up all preview URLs
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setSelectedFiles([])
    setCurrentStep('select')
  }, [selectedFiles])

  const handleNextStep = () => {
    if (currentStep === 'select' && selectedFiles.length > 0) {
      setCurrentStep('method')
    } else if (currentStep === 'method') {
      startUpload()
    }
  }

  const handleBackStep = () => {
    if (currentStep === 'method') {
      setCurrentStep('select')
    } else if (currentStep === 'progress') {
      setCurrentStep('method')
      setUploadProgress([])
      setTotalProgress(0)
      setIsUploading(false)
    }
  }

  const startUpload = () => {
    setCurrentStep('progress')
    setIsUploading(true)
    
    // Initialize progress tracking for all files
    const initialProgress: UploadProgressFile[] = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending'
    }))
    
    setUploadProgress(initialProgress)
    
    // Simulate upload progress (replace with actual upload logic)
    simulateUpload(initialProgress)
  }

  // Simulate upload for demo purposes - replace with actual upload logic
  const simulateUpload = async (files: UploadProgressFile[]) => {
    const updateProgress = (index: number, progress: number, status: UploadProgressFile['status'], error?: string) => {
      setUploadProgress(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], progress, status, error }
        return updated
      })
      
      // Update total progress
      setTotalProgress(prev => {
        const completedFiles = files.filter((_, i) => i < index || (i === index && status === 'completed')).length
        const currentFileProgress = index < files.length && status === 'uploading' ? progress / 100 : 0
        return ((completedFiles + currentFileProgress) / files.length) * 100
      })
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Start uploading this file
      updateProgress(i, 0, 'uploading')
      
      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Simulate occasional errors
        if (progress === 50 && Math.random() < 0.1) {
          updateProgress(i, progress, 'error', 'Network connection failed')
          break
        }
        
        if (progress === 100) {
          updateProgress(i, 100, 'completed')
        } else {
          updateProgress(i, progress, 'uploading')
        }
      }
    }
    
    setIsUploading(false)
    setCurrentStep('complete')
    
    // Call completion callback if provided
    if (onUploadComplete) {
      onUploadComplete(files.map(f => ({ name: f.name, status: 'completed' })))
    }
  }

  const handleRetry = (fileName: string) => {
    const fileIndex = uploadProgress.findIndex(f => f.name === fileName)
    if (fileIndex !== -1) {
      setUploadProgress(prev => {
        const updated = [...prev]
        updated[fileIndex] = { ...updated[fileIndex], status: 'pending', progress: 0, error: undefined }
        return updated
      })
      
      // Restart upload for this file (simplified for demo)
      setTimeout(() => {
        simulateUpload([uploadProgress[fileIndex]])
      }, 1000)
    }
  }

  const handleCancel = () => {
    setIsUploading(false)
    setCurrentStep('method')
    setUploadProgress([])
    setTotalProgress(0)
  }

  const startOver = () => {
    handleClearAll()
    setCurrentStep('select')
    setUploadProgress([])
    setTotalProgress(0)
    setIsUploading(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['select', 'method', 'progress'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : index < ['select', 'method', 'progress'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  index < ['select', 'method', 'progress'].indexOf(currentStep)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 'select' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Select Files to Upload
            </h2>
            <p className="text-gray-600">
              Choose photos, videos, documents, and other files from your device
            </p>
          </div>

          <FileUploadZone
            onFilesAccepted={handleFilesAccepted}
            maxSize={100 * 1024 * 1024} // 100MB
            maxFiles={20}
          />

          {selectedFiles.length > 0 && (
            <>
              <FilePreview
                files={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Continue to Upload Options →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === 'method' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Upload Method
            </h2>
            <p className="text-gray-600">
              Select how you'd like to upload your files to optimize costs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setUploadMethod('individual')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                uploadMethod === 'individual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-3">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  uploadMethod === 'individual'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {uploadMethod === 'individual' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Individually
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Upload each file separately to S3
              </p>
              <p className="text-xs text-gray-500">
                • Better for mixed file types
                • Easier to manage individual files
                • Slightly higher request costs
              </p>
            </button>

            <button
              onClick={() => setUploadMethod('zip')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                uploadMethod === 'zip'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-3">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  uploadMethod === 'zip'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {uploadMethod === 'zip' && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create ZIP Archive
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Compress files into a single ZIP archive
              </p>
              <p className="text-xs text-gray-500">
                • Reduces storage costs
                • Faster transfer for many small files
                • Lower request costs
              </p>
            </button>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBackStep}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ← Back to File Selection
            </button>
            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Upload →
            </button>
          </div>
        </div>
      )}

      {(currentStep === 'progress' || currentStep === 'complete') && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStep === 'progress' ? 'Uploading Files' : 'Upload Complete'}
            </h2>
            <p className="text-gray-600">
              {currentStep === 'progress' 
                ? `Uploading ${selectedFiles.length} files ${uploadMethod === 'zip' ? 'as ZIP archive' : 'individually'}`
                : 'Your files have been processed'
              }
            </p>
          </div>

          <UploadProgress
            files={uploadProgress}
            totalProgress={totalProgress}
            onCancel={isUploading ? handleCancel : undefined}
            onRetry={handleRetry}
          />

          {currentStep === 'complete' && (
            <div className="flex justify-center space-x-4">
              <button
                onClick={startOver}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Upload More Files
              </button>
              <button
                onClick={() => {/* Navigate to bucket management */}}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View in Bucket Manager →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}