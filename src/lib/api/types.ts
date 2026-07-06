// Common API response types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UploadResultResponse {
  fileName: string;
  success: boolean;
  fileKey: string;
  location: string;
  size: number;
  error?: string;
}

export interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
}

export interface BucketListResponse {
  buckets: Array<{
    name: string;
    creationDate: Date;
    region: string;
  }>;
}

export interface ObjectListResponse {
  bucketName: string;
  objects: Array<{
    key: string;
    size: number;
    lastModified: Date;
    storageClass: string;
    etag: string;
  }>;
  count: number;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  expiresIn: number;
  expiresAt: string;
}

// Common error codes
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUCKET_CREATE_ERROR: 'BUCKET_CREATE_ERROR',
  BUCKET_ALREADY_EXISTS: 'BUCKET_ALREADY_EXISTS',
  BUCKET_LIST_ERROR: 'BUCKET_LIST_ERROR',
  BUCKET_NOT_FOUND: 'BUCKET_NOT_FOUND',
  OBJECT_LIST_ERROR: 'OBJECT_LIST_ERROR',
  OBJECT_NOT_FOUND: 'OBJECT_NOT_FOUND',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  PRESIGNED_URL_ERROR: 'PRESIGNED_URL_ERROR',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];