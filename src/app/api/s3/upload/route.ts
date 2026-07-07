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

    const formData = await request.formData();
    const folderName = formData.get('folderName') as string;
    const files = formData.getAll('files') as File[];

    // Validate folder name
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Folder name is required', 400);
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

    // Upload files to the specified folder
    const uploadResults = [];
    
    for (const file of files) {
      try {
        const fileContent = Buffer.from(await file.arrayBuffer());
        
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
        uploadResults.push({
          fileName: file.name,
          success: false,
          fileKey: '',
          location: '',
          size: 0,
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