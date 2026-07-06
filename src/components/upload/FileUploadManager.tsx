'use client'

import { useState, useCallback } from 'react'
import FileUploadZone, { FileWithPreview } from './FileUploadZone'
import FilePreview from './FilePreview'
import UploadProgress, { UploadProgressFile } from './UploadProgress'

type UploadStep = 'select' | 'bucket' | 'progress' | 'complete'

interface FileUploadManagerProps {
  onUploadComplete?: (results: any[]) => void
}

export default function FileUploadManager({ onUploadComplete }: FileUploadManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [selectedBucket, setSelectedBucket] = useState<string>('')
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
      onUploadComplete(files.map(f => ({ name: f.name, status: 'completed', bucket: selectedBucket })))
    }
  }

  const handleNextStep = () => {
    if (currentStep === 'select' && selectedFiles.length > 0) {
      setCurrentStep('bucket')
    } else if (currentStep === 'bucket' && selectedBucket) {
      startUpload()
    }
  }

  const handleBackStep = () => {
    if (currentStep === 'bucket') {
      setCurrentStep('select')
    } else if (currentStep === 'progress') {
      setCurrentStep('bucket')
      setUploadProgress([])
      setTotalProgress(0)
      setIsUploading(false)
    }
  }

  const startUpload = () => {
    setCurrentStep('progress')
    setIsUploading(true)

    // Initialize progress tracking for individual files
    const initialProgress: UploadProgressFile[] = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending'
    }))

    setUploadProgress(initialProgress)
    
    // Start upload simulation
    simulateUpload(initialProgress)
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
    setCurrentStep('bucket')
    setUploadProgress([])
    setTotalProgress(0)
  }

  const startOver = () => {
    handleClearAll()
    setCurrentStep('select')
    setUploadProgress([])
    setTotalProgress(0)
    setIsUploading(false)
    setSelectedBucket('')
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['select', 'bucket', 'progress'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step
                ? 'bg-blue-600 text-white'
                : index < ['select', 'bucket', 'progress'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
                }`}
            >
              {index + 1}
            </div>
            {index < 2 && (
              <div
                className={`w-12 h-1 mx-2 ${index < ['select', 'bucket', 'progress'].indexOf(currentStep)
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
                  Choose Destination →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === 'bucket' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Destination
            </h2>
            <p className="text-gray-600">
              Select an existing bucket or create a new one for your files
            </p>
          </div>

          <div className="space-y-4">
            {/* Existing Buckets Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Existing Buckets
              </h3>
              
              {/* Mock bucket list - replace with actual bucket fetching */}
              <div className="space-y-2">
                {['my-photos-2024', 'documents-backup', 'project-files'].map((bucket) => (
                  <button
                    key={bucket}
                    onClick={() => setSelectedBucket(bucket)}
                    className={`w-full p-3 text-left border rounded-md hover:border-blue-300 transition-colors ${selectedBucket === bucket
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full border-2 ${selectedBucket === bucket
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                          }`}>
                          {selectedBucket === bucket && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{bucket}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Created 2024-06-15
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Empty state */}
              <div className="text-center py-8 text-gray-500 hidden">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4-4m0 0L9 5m6-6v4" />
                </svg>
                <p>No existing buckets found</p>
              </div>
            </div>

            {/* Create New Bucket Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Bucket
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="bucketName" className="block text-sm font-medium text-gray-700 mb-2">
                    Bucket Name
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="bucketName"
                      placeholder="my-new-bucket"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                      Create
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Bucket names must be globally unique and follow AWS naming conventions
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBackStep}
              disabled={isUploading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back to Files
            </button>
            <button
              onClick={handleNextStep}
              disabled={!selectedBucket || isUploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Files →
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
                ? `Uploading ${selectedFiles.length} files to ${selectedBucket}`
                : `Successfully uploaded ${selectedFiles.length} files to ${selectedBucket}`
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
                onClick={() => {/* Navigate to bucket management */ }}
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