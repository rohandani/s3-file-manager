import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';
import { createErrorResponse, validateAuthentication, validateObjectKey } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// POST /api/s3/download - Stream download file from S3
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const body = await request.json();
    const { key } = body;

    // Validate object key
    const objectValidation = validateObjectKey(key);
    if (!objectValidation.valid) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, objectValidation.error!, 400);
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    // Get the default bucket name
    const defaultBucketName = process.env.AWS_S3_DEFAULT_BUCKET || 's3-file-manager';

    // Generate presigned URL with proper download headers
    const presignedUrl = await s3Service.generatePresignedUrl(
      defaultBucketName,
      key.trim(),
      300 // 5 minutes should be enough for download
    );

    // Fetch the file from S3
    const fileResponse = await fetch(presignedUrl, {
      method: 'GET',
    });

    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from S3');
    }

    // Get filename from key
    const filename = key.split('/').pop() || 'download';
    
    // Stream the file back to the client with proper headers
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', fileResponse.headers.get('Content-Type') || 'application/octet-stream');
    
    // Copy content length if available
    const contentLength = fileResponse.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(fileResponse.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    
    if (error instanceof Error && error.message?.includes('does not exist')) {
      return createErrorResponse(
        API_ERROR_CODES.OBJECT_NOT_FOUND,
        error.message,
        404
      );
    }
    
    return createErrorResponse(
      API_ERROR_CODES.PRESIGNED_URL_ERROR,
      error instanceof Error ? error.message : 'Failed to download file'
    );
  }
}