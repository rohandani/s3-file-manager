'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DocumentIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  MusicalNoteIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';

interface ObjectInfo {
  key: string;
  size: number;
  lastModified: Date;
  storageClass: string;
  etag: string;
}

interface ObjectListProps {
  bucketName: string;
}

interface LoadingState {
  initial: boolean;
  refresh: boolean;
  download: Record<string, boolean>;
}

export default function ObjectList({ bucketName }: ObjectListProps) {
  const [objects, setObjects] = useState<ObjectInfo[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ 
    initial: true, 
    refresh: false, 
    download: {} 
  });
  const [error, setError] = useState<string | null>(null);

  const fetchObjects = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      setLoading(prev => ({ ...prev, [isRefresh ? 'refresh' : 'initial']: true }));

      // Get the default bucket name from the API
      const response = await fetch(`/api/s3/buckets/default/objects?prefix=${encodeURIComponent(bucketName + '/')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch objects');
      }

      // Filter out folder markers (keys ending with '/')
      const filteredObjects = (data.data?.objects || []).filter((obj: ObjectInfo) => !obj.key.endsWith('/'));
      setObjects(filteredObjects);
    } catch (err) {
      console.error('Error fetching objects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load objects');
    } finally {
      setLoading(prev => ({ ...prev, initial: false, refresh: false }));
    }
  }, [bucketName]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const handleRetry = () => {
    fetchObjects(true);
  };

  const handleDownload = async (objectKey: string) => {
    try {
      setLoading(prev => ({
        ...prev,
        download: { ...prev.download, [objectKey]: true }
      }));

      const response = await fetch('/api/s3/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: objectKey,
          expiresIn: 3600, // 1 hour
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate download URL');
      }

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = data.data.url;
      link.download = getFileName(objectKey);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading file:', err);
      // You could show a toast notification here
      alert(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setLoading(prev => ({
        ...prev,
        download: { ...prev.download, [objectKey]: false }
      }));
    }
  };

  const getFileName = (key: string): string => {
    return key.split('/').pop() || key;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const iconClass = "h-8 w-8 flex-shrink-0";

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return <PhotoIcon className={`${iconClass} text-green-500`} />;
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return <VideoCameraIcon className={`${iconClass} text-red-500`} />;
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) {
      return <MusicalNoteIcon className={`${iconClass} text-purple-500`} />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
      return <ArchiveBoxIcon className={`${iconClass} text-orange-500`} />;
    }
    return <DocumentIcon className={`${iconClass} text-blue-500`} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading.initial) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading files...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              disabled={loading.refresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.refresh ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Retrying...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (objects.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12">
          <div className="text-center">
            <DocumentIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Files Found</h3>
            <p className="text-gray-600 mb-6">
              This folder is empty. Upload some files to get started.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main object list
  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Files ({objects.length})
          </h2>
          <button
            onClick={handleRetry}
            disabled={loading.refresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.refresh ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Object list */}
      <div className="divide-y divide-gray-200">
        {objects.map((object) => {
          const fileName = getFileName(object.key);
          const isDownloading = loading.download[object.key];
          
          return (
            <div key={object.key} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  {getFileIcon(fileName)}
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(object.size)}</span>
                      <span>Modified: {formatDate(object.lastModified)}</span>
                      <span className="capitalize">Storage: {object.storageClass.toLowerCase()}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 font-mono truncate">
                      {object.key}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleDownload(object.key)}
                    disabled={isDownloading}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}