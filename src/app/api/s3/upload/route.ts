import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateAuthentication, 
  validateFiles
} from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// Configure route handler for large file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for large file uploads

// POST /api/s3/upload - Upload files to S3 folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return createErrorResponse(
        API_ERROR_CODES.INVALID_INPUT, 
        'Failed to parse form data. The file may be too large or the request is malformed. Maximum file size is 100MB.',
        400
      );
    }

    const folderName = formData.get('folderName') as string;
    const files = formData.getAll('files') as File[];

    // Validate folder name
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Folder name is required', 400);
    }

    // Additional file size validation
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      return createErrorResponse(
        API_ERROR_CODES.VALIDATION_ERROR,
        `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum file size is 100MB.`,
        400
      );
    }

    // Validate files
    const fileValidation = validateFiles(files);
    if (!fileValidation.valid) {
      return createErrorResponse(
        API_ERROR_CODES.VALIDATION_ERROR,
        'File validation failed',
        400,
        fileValidation.errors
      );
    }

    // Upload files to the specified folder with improved error handling
    const uploadResults = [];
    
    for (const file of files) {
      try {
        // Check individual file size again
        if (file.size > MAX_FILE_SIZE) {
          uploadResults.push({
            fileName: file.name,
            success: false,
            fileKey: '',
            location: '',
            size: file.size,
            error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 100MB.`
          });
          continue;
        }

        // Convert file to buffer with memory optimization for large files
        let fileContent: Buffer;
        try {
          const arrayBuffer = await file.arrayBuffer();
          fileContent = Buffer.from(arrayBuffer);
        } catch (bufferError) {
          uploadResults.push({
            fileName: file.name,
            success: false,
            fileKey: '',
            location: '',
            size: file.size,
            error: 'Failed to read file content'
          });
          continue;
        }
        
        const result = await s3Service.uploadFileToFolder(
          folderName.trim(),
          file.name,
          fileContent,
          file.type || 'application/octet-stream'
        );
        
        uploadResults.push({
          fileName: file.name,
          ...result
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        uploadResults.push({
          fileName: file.name,
          success: false,
          fileKey: '',
          location: '',
          size: file.size,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.length - successCount;
    
    return createSuccessResponse({
      results: uploadResults,
      summary: {
        total: uploadResults.length,
        successful: successCount,
        failed: failureCount
      }
    }, failureCount === 0 ? 200 : 207); // 207 Multi-Status for partial success
  } catch (error) {
    console.error('Error uploading files:', error);
    
    return createErrorResponse(
      API_ERROR_CODES.UPLOAD_ERROR,
      error instanceof Error ? error.message : 'Failed to upload files'
    );
  }
}