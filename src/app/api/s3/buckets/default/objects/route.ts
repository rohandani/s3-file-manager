import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';
import { createSuccessResponse, createErrorResponse, validateAuthentication } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// GET /api/s3/buckets/default/objects - List objects in default bucket
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || undefined;
    const maxKeys = searchParams.get('maxKeys') ? parseInt(searchParams.get('maxKeys')!) : undefined;

    // Ensure AWS is initialized first
    await ensureAWSInitialized();

    // Get the default bucket name from environment
    const defaultBucketName = process.env.AWS_S3_DEFAULT_BUCKET || 's3-file-manager';

    const objects = await s3Service.listObjects(defaultBucketName, prefix, maxKeys);
    
    return createSuccessResponse({
      bucketName: defaultBucketName,
      objects,
      count: objects.length
    });
  } catch (error) {
    console.error('Error listing objects:', error);
    
    if (error instanceof Error && error.message?.includes('does not exist')) {
      return createErrorResponse(
        API_ERROR_CODES.BUCKET_NOT_FOUND,
        error.message,
        404
      );
    }
    
    return createErrorResponse(
      API_ERROR_CODES.OBJECT_LIST_ERROR,
      error instanceof Error ? error.message : 'Failed to list objects'
    );
  }
}