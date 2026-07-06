'use client'

export interface UploadProgressFile {
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface UploadProgressProps {
  files: UploadProgressFile[]
  totalProgress: number
  onCancel?: () => void
  onRetry?: (fileName: string) => void
}

export default function UploadProgress({ 
  files, 
  totalProgress, 
  onCancel, 
  onRetry 
}: UploadProgressProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadProgressFile['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'uploading':
        return (
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getStatusText = (status: UploadProgressFile['status'], progress: number) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
      case 'uploading':
        return `${progress}%`
      case 'pending':
        return 'Waiting...'
      default:
        return 'Unknown'
    }
  }

  const completedFiles = files.filter(f => f.status === 'completed').length
  const errorFiles = files.filter(f => f.status === 'error').length
  const isCompleted = completedFiles === files.length
  const hasErrors = errorFiles > 0

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-4">
      {/* Overall progress header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Upload Progress
          </h3>
          <p className="text-sm text-gray-500">
            {completedFiles} of {files.length} files completed
            {hasErrors && ` (${errorFiles} failed)`}
          </p>
        </div>
        
        {!isCompleted && onCancel && (
          <button
            onClick={onCancel}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Overall Progress</span>
          <span>{Math.round(totalProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted
                ? hasErrors
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Individual file progress */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(file.status)}
            </div>

            {/* File info and progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <span className="text-xs text-gray-500 ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>
              
              {/* Progress bar for individual file */}
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {file.status === 'error' && file.error && (
                <p className="text-xs text-red-600 mt-1 truncate">
                  {file.error}
                </p>
              )}
            </div>

            {/* Status text and retry button */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {getStatusText(file.status, file.progress)}
              </span>
              
              {file.status === 'error' && onRetry && (
                <button
                  onClick={() => onRetry(file.name)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary message */}
      {isCompleted && (
        <div className={`mt-4 p-3 rounded-md ${
          hasErrors ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          <div className="flex items-start space-x-2">
            <svg 
              className={`w-4 h-4 mt-0.5 ${
                hasErrors ? 'text-yellow-400' : 'text-green-400'
              }`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              {hasErrors ? (
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              )}
            </svg>
            <div className="text-sm">
              <p className={`font-medium ${
                hasErrors ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {hasErrors 
                  ? `Upload completed with ${errorFiles} ${errorFiles === 1 ? 'error' : 'errors'}`
                  : 'All files uploaded successfully!'
                }
              </p>
              <p className={`mt-1 ${
                hasErrors ? 'text-yellow-700' : 'text-green-700'
              }`}>
                {hasErrors
                  ? 'Some files failed to upload. You can retry failed uploads or proceed with the successful ones.'
                  : 'Your files have been successfully uploaded to S3 and are ready to use.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}