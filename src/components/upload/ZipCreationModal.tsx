'use client'

import { useState, useEffect } from 'react';
import { ZipService, ZipCreationProgress, ZipCreationResult } from '@/lib/services/zipService';

interface ZipCreationModalProps {
  files: File[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ZipCreationResult) => void;
  onError: (error: string) => void;
}

export default function ZipCreationModal({
  files,
  isOpen,
  onClose,
  onSuccess,
  onError
}: ZipCreationModalProps) {
  const [progress, setProgress] = useState<ZipCreationProgress | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      // Validate files when modal opens
      const validation = ZipService.validateFilesForZip(files);
      setValidationResult(validation);
    }
  }, [isOpen, files]);

  const handleStartCreation = async () => {
    if (!validationResult?.isValid || files.length === 0) {
      return;
    }

    setIsCreating(true);
    setProgress(null);

    try {
      const result = await ZipService.createZip(files, {
        compressionLevel: 6,
        onProgress: (progressData) => {
          setProgress(progressData);
        }
      });

      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.error || 'Failed to create ZIP file');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCreating(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      onClose();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimatedCompression = ZipService.estimateCompressionRatio(files);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Create ZIP Archive
          </h3>
          {!isCreating && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {!isCreating && validationResult && (
          <div className="space-y-4">
            {/* File summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Files:</span>
                <span className="font-medium">{files.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total size:</span>
                <span className="font-medium">{formatBytes(totalSize)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated compressed:</span>
                <span className="font-medium text-green-600">
                  {formatBytes(totalSize * (1 - estimatedCompression / 100))} 
                  ({estimatedCompression.toFixed(1)}% savings)
                </span>
              </div>
            </div>

            {/* Validation errors */}
            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleStartCreation}
                disabled={!validationResult.isValid}
                className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  validationResult.isValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create ZIP
              </button>
            </div>
          </div>
        )}

        {isCreating && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Creating ZIP archive...</p>
            </div>

            {progress && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Processing:</span>
                  <span className="font-medium">{progress.current} of {progress.total}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500 truncate">
                    {progress.currentFile}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {progress.percentage}%
                  </p>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-gray-400">
                This may take a few moments for large files
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}