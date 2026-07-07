'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FolderIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FolderInfo {
  name: string;
  prefix: string;
  objectCount: number;
  lastModified?: Date;
}

interface ApiError {
  code: string;
  message: string;
}

interface LoadingState {
  initial: boolean;
  refresh: boolean;
}

const FOLDERS_PER_PAGE = 10;

export default function BucketList() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ initial: true, refresh: false });
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFolders = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      setLoading(prev => ({ ...prev, [isRefresh ? 'refresh' : 'initial']: true }));

      const response = await fetch('/api/s3/folders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch folders');
      }

      setFolders(data.data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading({ initial: false, refresh: false });
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleRetry = () => {
    fetchFolders(true);
  };

  // Filter and paginate folders
  const filteredFolders = useMemo(() => {
    if (!searchTerm) return folders;
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm]);

  const totalPages = Math.ceil(filteredFolders.length / FOLDERS_PER_PAGE);
  const paginatedFolders = useMemo(() => {
    const startIndex = (currentPage - 1) * FOLDERS_PER_PAGE;
    return filteredFolders.slice(startIndex, startIndex + FOLDERS_PER_PAGE);
  }, [filteredFolders, currentPage]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileCount = (count: number): string => {
    if (count === 0) return 'Empty';
    if (count === 1) return '1 file';
    return `${count.toLocaleString()} files`;
  };

  // Loading state
  if (loading.initial) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading folders...</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Folders</h3>
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
  if (folders.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12">
          <div className="text-center">
            <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Folders Found</h3>
            <p className="text-gray-600 mb-6">
              You haven't created any storage folders yet. Start by uploading some files to create your first folder.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload Files
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main folder list
  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Storage Folders ({filteredFolders.length})
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
        
        {/* Search bar */}
        {folders.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Show search results info */}
      {searchTerm && (
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {filteredFolders.length === 0 
              ? `No folders found matching "${searchTerm}"`
              : `Showing ${filteredFolders.length} folder${filteredFolders.length !== 1 ? 's' : ''} matching "${searchTerm}"`
            }
          </p>
        </div>
      )}

      {/* Folder list */}
      <div className="divide-y divide-gray-200">
        {paginatedFolders.map((folder) => (
          <Link
            key={folder.prefix}
            href={`/buckets/${encodeURIComponent(folder.name)}`}
            className="block hover:bg-gray-50 transition-colors duration-150"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <FolderIcon className="h-8 w-8 text-blue-500 mr-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {folder.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          folder.objectCount === 0
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {formatFileCount(folder.objectCount)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Folder: {folder.prefix}</span>
                      {folder.lastModified && (
                        <span>Last modified: {formatDate(folder.lastModified)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * FOLDERS_PER_PAGE) + 1} to {Math.min(currentPage * FOLDERS_PER_PAGE, filteredFolders.length)} of {filteredFolders.length} folders
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}