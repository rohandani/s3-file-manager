'use client'

import { useState, useCallback } from 'react'
import FileUploadZone, { FileWithPreview } from './FileUploadZone'
import FilePreview from './FilePreview'
import UploadProgress, { UploadProgressFile } from './UploadProgress'
import UploadMethodSelector, { UploadMethod } from './UploadMethodSelector'
import ZipCreationModal from './ZipCreationModal'
import { ZipCreationResult } from '@/lib/services/zipService'

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
  const [showZipModal, setShowZipModal] = useState(false)
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)

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
      onUploadComplete(files.map(f => ({ name: f.name, status: 'completed' })))
    }
  }

  // Simulate ZIP upload for demo purposes - replace with actual upload logic
  const simulateZipUpload = async (progressFile: UploadProgressFile, zipBlob: Blob) => {
    const updateProgress = (progress: number, status: UploadProgressFile['status'], error?: string) => {
      setUploadProgress([{ ...progressFile, progress, status, error }])
      setTotalProgress(progress)
    }

    // Start uploading ZIP file
    updateProgress(0, 'uploading')

    // Simulate progress updates for ZIP upload
    for (let progress = 0; progress <= 100; progress += 5) {
      await new Promise(resolve => setTimeout(resolve, 150))

      // Simulate occasional errors
      if (progress === 30 && Math.random() < 0.05) {
        updateProgress(progress, 'error', 'Network connection failed during ZIP upload')
        break
      }

      if (progress === 100) {
        updateProgress(100, 'completed')
      } else {
        updateProgress(progress, 'uploading')
      }
    }

    setIsUploading(false)
    setCurrentStep('complete')

    // Call completion callback if provided
    if (onUploadComplete) {
      onUploadComplete([{ name: progressFile.name, status: 'completed', method: 'zip' }])
    }
  }

  const handleNextStep = () => {
    if (currentStep === 'select' && selectedFiles.length > 0) {
      setCurrentStep('method')
    } else if (currentStep === 'method') {
      if (uploadMethod === 'zip') {
        // Show ZIP creation modal
        setShowZipModal(true)
      } else {
        startUpload()
      }
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
      setZipBlob(null)
    }
  }

  const handleZipSuccess = (result: ZipCreationResult) => {
    if (result.blob) {
      setZipBlob(result.blob)
      setShowZipModal(false)
      startUpload(result.blob)
    }
  }

  const handleZipError = (error: string) => {
    console.error('ZIP creation failed:', error)
    setShowZipModal(false)
    // Fallback to individual upload
    setUploadMethod('individual')
    alert(`ZIP creation failed: ${error}\\n\\nFalling back to individual file upload.`)
    startUpload()
  }

  const startUpload = (zipFile?: Blob) => {
    setCurrentStep('progress')
    setIsUploading(true)

    // Initialize progress tracking
    let initialProgress: UploadProgressFile[]

    if (uploadMethod === 'zip' && zipFile) {
      // Single file progress for ZIP
      initialProgress = [{
        name: `archive-${Date.now()}.zip`,
        size: zipFile.size,
        progress: 0,
        status: 'pending'
      }]
    } else {
      // Individual file progress
      initialProgress = selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending'
      }))
    }

    setUploadProgress(initialProgress)

    // Simulate upload progress (replace with actual upload logic)
    if (uploadMethod === 'zip' && zipFile) {
      simulateZipUpload(initialProgress[0], zipFile)
    } else {
      simulateUpload(initialProgress)
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
    setZipBlob(null)
    setShowZipModal(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['select', 'method', 'progress'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step
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
                className={`w-12 h-1 mx-2 ${index < ['select', 'method', 'progress'].indexOf(currentStep)
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
        <UploadMethodSelector
          files={selectedFiles}
          selectedMethod={uploadMethod}
          onMethodChange={setUploadMethod}
          onNext={handleNextStep}
          onBack={handleBackStep}
          disabled={isUploading}
        />
      )}

      {(currentStep === 'progress' || currentStep === 'complete') && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStep === 'progress' ? 'Uploading Files' : 'Upload Complete'}
            </h2>
            <p className="text-gray-600">
              {currentStep === 'progress'
                ? uploadMethod === 'zip'
                  ? `Uploading ZIP archive containing ${selectedFiles.length} files`
                  : `Uploading ${selectedFiles.length} files individually`
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
                onClick={() => {/* Navigate to bucket management */ }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View in Bucket Manager →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ZIP Creation Modal */}
      <ZipCreationModal
        files={selectedFiles}
        isOpen={showZipModal}
        onClose={() => setShowZipModal(false)}
        onSuccess={handleZipSuccess}
        onError={handleZipError}
      />
    </div>
  )
}