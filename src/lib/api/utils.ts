import { NextResponse } from 'next/server';
import { ApiResponse, ApiErrorCode } from './types';

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  
  return NextResponse.json(response, { status });
}

/**
 * Validates that a user is authenticated
 */
export function validateAuthentication(session: any): { isValid: boolean; userId?: string } {
  if (!session?.user?.id) {
    return { isValid: false };
  }
  
  return { isValid: true, userId: session.user.id };
}

/**
 * Validates file upload constraints
 */
export interface FileValidationOptions {
  maxFileSize?: number;
  maxTotalSize?: number;
  allowedTypes?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  totalSize: number;
}

export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxFileSize = 50 * 1024 * 1024, // 50MB
    maxTotalSize = 100 * 1024 * 1024, // 100MB
    allowedTypes = [], // Empty array means all types allowed
  } = options;

  const errors: string[] = [];
  let totalSize = 0;

  if (!files || files.length === 0) {
    errors.push('No files provided');
    return { valid: false, errors, totalSize: 0 };
  }

  for (const file of files) {
    // Check individual file size
    if (file.size > maxFileSize) {
      errors.push(
        `File "${file.name}" exceeds maximum size of ${Math.round(maxFileSize / (1024 * 1024))}MB`
      );
    }

    // Check file type if restrictions exist
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File "${file.name}" has unsupported type: ${file.type}`);
    }

    // Check for valid file name
    if (!file.name || file.name.trim().length === 0) {
      errors.push('File must have a valid name');
    }

    totalSize += file.size;
  }

  // Check total size
  if (totalSize > maxTotalSize) {
    errors.push(
      `Total upload size (${Math.round(totalSize / (1024 * 1024))}MB) exceeds maximum of ${Math.round(maxTotalSize / (1024 * 1024))}MB`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSize,
  };
}

/**
 * Sanitizes and validates bucket name input
 */
export function validateBucketName(bucketName: string): { valid: boolean; error?: string } {
  if (!bucketName || typeof bucketName !== 'string') {
    return { valid: false, error: 'Bucket name must be a string' };
  }

  const trimmed = bucketName.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Bucket name cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Bucket name must be at least 3 characters long' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Bucket name must be less than 50 characters long' };
  }

  return { valid: true };
}

/**
 * Sanitizes and validates object key input
 */
export function validateObjectKey(objectKey: string): { valid: boolean; error?: string } {
  if (!objectKey || typeof objectKey !== 'string') {
    return { valid: false, error: 'Object key must be a string' };
  }

  const trimmed = objectKey.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Object key cannot be empty' };
  }

  if (trimmed.length > 1024) {
    return { valid: false, error: 'Object key must be less than 1024 characters long' };
  }

  return { valid: true };
}

/**
 * Creates a safe file key with user ID prefix and timestamp
 */
export function createSafeFileKey(userId: string, originalFileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return `${userId}/${timestamp}-${sanitizedFileName}`;
}