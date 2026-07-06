// AWS S3 integration exports
export { S3Service, s3Service } from './s3-service';
export { createS3Client, getS3Client } from './s3-client';
export * from './types';

// Re-export commonly used types
export type {
  BucketInfo,
  ObjectInfo,
  UploadResult,
  ValidationResult,
  S3Config,
} from './types';