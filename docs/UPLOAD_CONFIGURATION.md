# File Upload Configuration & Chunked Upload Solution

## Upload Limits & Solutions

The S3 File Manager now handles large file uploads using a comprehensive multi-tier approach:

### Size Limits & Methods
- **Files ≤ 10MB**: Regular Server Actions with FormData
- **Files > 10MB**: Automatic chunked upload (5MB chunks)
- **Maximum file size**: 100MB per file
- **Chunk size**: 5MB (configurable)
- **Upload timeout**: 60 seconds per chunk

## Upload Architecture

### Tier 1: Chunked Upload (Files > 10MB)
**Location**: `/src/lib/actions/chunkedUpload.ts` & `/src/lib/utils/chunkedUploader.ts`

Files larger than 10MB automatically use chunked upload:
- Splits files into 5MB chunks
- Uploads chunks sequentially via Server Actions  
- Reassembles file server-side before S3 upload
- Real-time progress tracking per chunk
- Automatic retry for failed chunks

**Benefits**:
- Bypasses Next.js body size limitations completely
- Memory efficient (processes 5MB at a time)
- Network resilient (individual chunk retry)
- Progress visibility for large uploads

### Tier 2: Enhanced Server Actions (Files ≤ 10MB)
**Location**: `/src/lib/actions/upload.ts`

Regular files use improved Server Actions:
- Enhanced FormData parsing with corruption detection
- Timeout protection (60 seconds)
- Comprehensive error handling and validation
- Alternative single-file upload method

### Tier 3: API Route Fallback
**Location**: `/src/app/api/s3/upload/route.ts`

Legacy API routes maintained for compatibility:
- Enhanced error handling
- Better FormData parsing
- Improved timeout configuration

### Tier 4: Client-Side Utilities
**Location**: `/src/lib/utils/uploadHelpers.ts`

Comprehensive upload utilities:
- File validation and sanitization
- Error detection and user-friendly messaging
- FormData safety checks
- File chunking utilities (for future enhancements)

## Next.js Configuration

### Updated Configuration (`next.config.ts`)
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '100mb', // Server Actions up to 100MB
  },
  largePageDataBytes: 128 * 1024, // Enhanced page data handling
}
```

### Route Handler Configuration
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout
```

## Chunked Upload Process

### Client-Side Flow:
1. **File Size Check**: Automatically determines upload method
2. **Chunk Creation**: Splits large files into 5MB base64-encoded chunks
3. **Sequential Upload**: Uploads chunks one by one to avoid overwhelming server
4. **Progress Tracking**: Real-time progress updates per chunk
5. **Error Handling**: Individual chunk retry on failure
6. **Completion**: Server reassembles and uploads to S3

### Server-Side Flow:
1. **Authentication**: Verifies user session for each chunk
2. **Chunk Storage**: Temporarily stores chunks in server memory
3. **Validation**: Ensures all chunks received before assembly
4. **Reassembly**: Combines chunks back into original file
5. **S3 Upload**: Single upload of complete file to S3
6. **Cleanup**: Removes temporary chunk data

## Error Handling Improvements

### Enhanced Error Detection:
- **"Unexpected end of form"** → Automatically switches to chunked upload
- **"Request body exceeded 10MB"** → Bypassed by chunked upload
- **Network interruptions** → Individual chunk retry
- **FormData corruption** → User-friendly error messages with guidance

### User Experience:
- **Automatic Method Selection**: No user configuration needed
- **Real-time Progress**: Chunk-level progress for large files  
- **Smart Retry**: Automatic fallback between upload methods
- **Clear Messaging**: User-friendly error explanations

## Performance Optimizations

### Memory Management:
- **5MB Chunks**: Prevents server memory overflow
- **Sequential Processing**: One chunk at a time prevents resource exhaustion
- **Automatic Cleanup**: Temporary data removed after upload
- **Session Management**: Automatic cleanup of stale upload sessions

### Network Resilience:
- **Individual Chunk Retry**: Failed chunks can be retried without restarting
- **Progress Preservation**: Completed chunks don't need re-upload
- **Connection Stability**: Smaller chunks more resilient to network issues
- **Timeout Protection**: Per-chunk timeouts prevent hanging uploads

## Security Considerations

### Authentication:
- **Per-Chunk Auth**: Each chunk upload requires valid session
- **Session Validation**: Upload sessions tied to authenticated users
- **Automatic Expiry**: Upload sessions expire after 1 hour

### Data Integrity:
- **File Size Validation**: Ensures reassembled file matches original
- **Chunk Verification**: Validates chunk count and order
- **Base64 Encoding**: Safe transport of binary data
- **Cleanup on Failure**: Removes partial uploads on error

## Resolution for 38MB File Upload Issue

Your 38.83MB MP4 file will now:
- ✅ **Automatically use chunked upload** (detected as > 10MB)
- ✅ **Upload in ~8 chunks** (5MB each) with progress tracking
- ✅ **Bypass all Next.js body limits** completely  
- ✅ **Handle network interruptions** gracefully with chunk retry
- ✅ **Provide real-time feedback** during upload process
- ✅ **Complete successfully** without FormData parsing errors

The chunked upload system completely eliminates the "Unexpected end of form" and "Request body exceeded 10MB" errors by working within Next.js constraints while providing a robust, scalable solution for large file uploads.

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