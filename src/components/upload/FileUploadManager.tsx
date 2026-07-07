'use client'

import { useState, useCallback, useEffect } from 'react'
import FileUploadZone, { FileWithPreview } from './FileUploadZone'
import FilePreview from './FilePreview'
import UploadProgress, { UploadProgressFile } from './UploadProgress'

type UploadStep = 'select' | 'bucket' | 'progress' | 'complete'

interface Folder {
  name: string
  prefix: string
  objectCount: number
  lastModified?: string
}

interface FileUploadManagerProps {
  onUploadComplete?: (results: any[]) => void
}

export default function FileUploadManager({ onUploadComplete }: FileUploadManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [currentStep, setCurrentStep] = useState<UploadStep>('select')
  const [uploadProgress, setUploadProgress] = useState<UploadProgressFile[]>([])
  const [totalProgress, setTotalProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [folderError, setFolderError] = useState<string | null>(null)

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

  // Load folders when stepping to folder selection
  useEffect(() => {
    if (currentStep === 'bucket') {
      loadFolders()
    }
  }, [currentStep])

  const loadFolders = async () => {
    setIsLoadingFolders(true)
    setFolderError(null)
    
    try {
      const response = await fetch('/api/s3/folders')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load folders')
      }
      
      setFolders(result.data || [])
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Failed to load folders')
      setFolders([])
    } finally {
      setIsLoadingFolders(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError('Folder name is required')
      return
    }

    setIsCreatingFolder(true)
    setFolderError(null)
    
    try {
      const response = await fetch('/api/s3/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderName: newFolderName.trim() }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create folder')
      }
      
      // Add the new folder to the list and select it
      const newFolder: Folder = {
        name: result.data.folderName,
        prefix: result.data.folderPrefix,
        objectCount: 0,
        lastModified: new Date().toISOString(),
      }
      
      setFolders(prev => [newFolder, ...prev])
      setSelectedFolder(newFolder.name)
      setNewFolderName('')
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const uploadFiles = async () => {
    const formData = new FormData()
    formData.append('folderName', selectedFolder)
    
    selectedFiles.forEach((file, index) => {
      formData.append('files', file)
    })

    // Initialize progress tracking
    const initialProgress: UploadProgressFile[] = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending'
    }))
    
    setUploadProgress(initialProgress)
    setTotalProgress(0)

    try {
      // Set all files to uploading status
      setUploadProgress(prev => prev.map(file => ({ ...file, status: 'uploading' })))
      
      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed')
      }
      
      // Update progress based on results
      const uploadResults = result.data?.results || []
      
      setUploadProgress(prev => prev.map((file, index) => {
        const uploadResult = uploadResults.find((r: any) => r.fileName === file.name)
        
        if (uploadResult) {
          return {
            ...file,
            progress: 100,
            status: uploadResult.success ? 'completed' : 'error',
            error: uploadResult.error
          }
        }
        
        return {
          ...file,
          progress: 100,
          status: 'error',
          error: 'Upload result not found'
        }
      }))
      
      // Calculate final progress
      const successCount = uploadResults.filter((r: any) => r.success).length
      setTotalProgress(100)
      setCurrentStep('complete')
      
      // Call completion callback if provided
      if (onUploadComplete) {
        onUploadComplete(uploadResults)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      
      // Mark all files as error
      setUploadProgress(prev => prev.map(file => ({
        ...file,
        progress: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed'
      })))
    } finally {
      setIsUploading(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep === 'select' && selectedFiles.length > 0) {
      setCurrentStep('bucket')
      setError(null)
    } else if (currentStep === 'bucket' && selectedFolder) {
      startUpload()
    }
  }

  const handleBackStep = () => {
    if (currentStep === 'bucket') {
      setCurrentStep('select')
      setSelectedFolder('')
      setFolderError(null)
    } else if (currentStep === 'progress') {
      setCurrentStep('bucket')
      setUploadProgress([])
      setTotalProgress(0)
      setIsUploading(false)
      setError(null)
    }
  }

  const startUpload = () => {
    setCurrentStep('progress')
    setIsUploading(true)
    setError(null)
    
    // Start real upload
    uploadFiles()
  }

  const handleRetry = async (fileName: string) => {
    const fileIndex = uploadProgress.findIndex(f => f.name === fileName)
    const originalFile = selectedFiles.find(f => f.name === fileName)
    
    if (fileIndex === -1 || !originalFile) return

    // Reset this file's status
    setUploadProgress(prev => {
      const updated = [...prev]
      updated[fileIndex] = { 
        ...updated[fileIndex], 
        status: 'uploading', 
        progress: 0, 
        error: undefined 
      }
      return updated
    })

    try {
      // Create FormData for single file
      const formData = new FormData()
      formData.append('folderName', selectedFolder)
      formData.append('files', originalFile)

      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed')
      }
      
      const uploadResult = result.data?.results?.[0]
      
      // Update this file's progress
      setUploadProgress(prev => {
        const updated = [...prev]
        updated[fileIndex] = {
          ...updated[fileIndex],
          progress: 100,
          status: uploadResult?.success ? 'completed' : 'error',
          error: uploadResult?.error
        }
        return updated
      })
      
    } catch (err) {
      setUploadProgress(prev => {
        const updated = [...prev]
        updated[fileIndex] = {
          ...updated[fileIndex],
          progress: 0,
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed'
        }
        return updated
      })
    }
  }

  const handleCancel = () => {
    setIsUploading(false)
    setCurrentStep('bucket')
    setUploadProgress([])
    setTotalProgress(0)
    setError(null)
  }

  const startOver = () => {
    handleClearAll()
    setCurrentStep('select')
    setUploadProgress([])
    setTotalProgress(0)
    setIsUploading(false)
    setSelectedFolder('')
    setError(null)
    setFolderError(null)
    setNewFolderName('')
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
              Choose Folder
            </h2>
            <p className="text-gray-600">
              Select an existing folder or create a new one for your files
            </p>
          </div>

          {/* Error display */}
          {folderError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Folder Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {folderError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Existing Folders Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Folders
                </h3>
                <button
                  onClick={loadFolders}
                  disabled={isLoadingFolders}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {isLoadingFolders ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {isLoadingFolders ? (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 mx-auto text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-500 mt-2">Loading folders...</p>
                </div>
              ) : folders.length > 0 ? (
                <div className="space-y-2">
                  {folders.map((folder) => (
                    <button
                      key={folder.name}
                      onClick={() => setSelectedFolder(folder.name)}
                      className={`w-full p-3 text-left border rounded-md hover:border-blue-300 transition-colors ${selectedFolder === folder.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full border-2 ${selectedFolder === folder.name
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                            }`}>
                            {selectedFolder === folder.name && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            <span className="font-medium text-gray-900">{folder.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500">
                            {folder.objectCount} files
                          </span>
                          {folder.lastModified && (
                            <div className="text-xs text-gray-400">
                              {new Date(folder.lastModified).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <p>No folders found</p>
                  <p className="text-xs mt-1">Create your first folder below</p>
                </div>
              )}
            </div>

            {/* Create New Folder Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Folder
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                    Folder Name
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createFolder()
                        }
                      }}
                      placeholder="my-documents"
                      disabled={isCreatingFolder}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button 
                      onClick={createFolder}
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isCreatingFolder ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Folder names can contain letters, numbers, hyphens, and underscores
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBackStep}
              disabled={isUploading || isCreatingFolder}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back to Files
            </button>
            <button
              onClick={handleNextStep}
              disabled={!selectedFolder || isUploading || isCreatingFolder || isLoadingFolders}
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
                ? `Uploading ${selectedFiles.length} files to ${selectedFolder} folder`
                : `Successfully uploaded ${selectedFiles.length} files to ${selectedFolder} folder`
              }
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Upload Error
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

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