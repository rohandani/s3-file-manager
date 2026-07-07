# File Upload Configuration

## Upload Limits

The S3 File Manager has been configured to handle large file uploads with the following limits:

### Size Limits
- **Maximum file size**: 100MB per file
- **Maximum request body size**: 100MB total
- **Upload timeout**: 5 minutes for large file uploads

### Configuration Details

#### Next.js Configuration (`next.config.ts`)
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '100mb', // Allows up to 100MB request bodies
  },
}
```

#### Route Handler Configuration (`/api/s3/upload/route.ts`)
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout
```

## Error Handling

### Common Upload Errors

1. **"Request body exceeded 10MB"**
   - **Cause**: File or total upload size exceeds configured limits
   - **Solution**: Files are now configured to support up to 100MB

2. **"Failed to parse body as FormData"**
   - **Cause**: Malformed request or network issues during large file upload
   - **Solution**: Enhanced error handling with retry logic and better error messages

3. **"File too large"**
   - **Cause**: Individual file exceeds 100MB limit
   - **Solution**: Split large files or compress before uploading

## Best Practices

### For Large Files
1. **Use appropriate file formats**: Consider compression for images/videos
2. **Monitor upload progress**: UI shows upload progress for user feedback
3. **Handle network interruptions**: Implement retry logic for failed uploads
4. **Validate file sizes client-side**: Check sizes before attempting upload

### Performance Optimization
1. **Batch uploads**: Upload multiple small files together
2. **Streaming**: Large files are processed in chunks to reduce memory usage
3. **Error recovery**: Failed uploads can be retried individually

## Browser Compatibility

### Supported Upload Methods
- **FormData API**: Primary method for file uploads
- **File API**: For reading file contents and validation
- **Streaming**: Server-side processing reduces client memory usage

### Memory Management
- Files are processed as streams when possible
- Buffer conversion is optimized for large files
- Proper cleanup of temporary objects

## Monitoring and Debugging

### Client-Side Logging
Upload errors are logged to browser console with detailed error messages.

### Server-Side Logging
All upload attempts are logged with:
- File names and sizes
- Upload success/failure status
- Error details for debugging

### Error Messages
User-friendly error messages are provided for common issues:
- File size validation
- Network connectivity issues
- Server capacity limitations