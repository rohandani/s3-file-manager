# AWS S3 Integration

This module provides a secure, server-side AWS S3 integration for the S3 File Manager application.

## Configuration

### Environment Variables

The following environment variables must be configured:

```bash
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_DEFAULT_BUCKET=s3-file-manager
```

### Security Notes

- All AWS credentials are handled server-side only
- No credentials are exposed to client-side code
- Environment variables are validated before creating S3 client
- Singleton pattern ensures efficient resource usage

## Usage

### Import the S3 Service

```typescript
import { s3Service } from '@/lib/aws';
```

### Create a Bucket

```typescript
const bucketName = await s3Service.createBucket('my-files', 'user123');
// Creates: s3-file-manager-my-files-2026-07-06
```

### List Buckets

```typescript
const buckets = await s3Service.listUserBuckets();
```

### Upload Files

```typescript
const result = await s3Service.uploadFile(
  'my-bucket',
  'folder/file.txt',
  fileBuffer,
  'text/plain'
);
```

### List Objects

```typescript
const objects = await s3Service.listObjects('my-bucket', 'folder/');
```

### Generate Download URLs

```typescript
const downloadUrl = await s3Service.generatePresignedUrl('my-bucket', 'file.txt', 3600);
```

## Bucket Naming Convention

Buckets are automatically named using the pattern:
`{prefix}-{sanitized-user-name}-{YYYY-MM-DD}`

Where:
- `default bucket` comes from `AWS_S3_DEFAULT_BUCKET` environment variable
- `sanitized-user-name` is the user input with invalid characters replaced
- Date stamp ensures uniqueness and organization

## Error Handling

The service provides comprehensive error handling:
- Configuration errors for missing credentials
- AWS service errors with user-friendly messages
- Validation errors for bucket names and parameters
- Typed error responses for better debugging

## Testing

Run tests with:

```bash
npm test
npm run test:ui  # For interactive test UI
npm run test:run # For CI/automated testing
```

Test coverage includes:
- Bucket creation and management
- Object operations (upload, list, delete)
- Error handling scenarios
- Input validation
- Credential management