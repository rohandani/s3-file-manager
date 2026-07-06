// AWS S3 related types and interfaces

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketPrefix?: string;
}

export interface BucketInfo {
  name: string;
  creationDate: Date;
  region: string;
  objectCount?: number;
  totalSize?: number;
}

export interface ObjectInfo {
  key: string;
  size: number;
  lastModified: Date;
  storageClass: string;
  etag: string;
}

export interface UploadResult {
  success: boolean;
  fileKey: string;
  location: string;
  size: number;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Error types for better error handling
export class S3ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'S3ConfigurationError';
  }
}

export class S3BucketError extends Error {
  constructor(message: string, public bucketName?: string) {
    super(message);
    this.name = 'S3BucketError';
  }
}

export class S3ObjectError extends Error {
  constructor(message: string, public bucketName?: string, public objectKey?: string) {
    super(message);
    this.name = 'S3ObjectError';
  }
}