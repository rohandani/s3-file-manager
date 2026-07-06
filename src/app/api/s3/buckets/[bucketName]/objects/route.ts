import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { createSuccessResponse, createErrorResponse, validateAuthentication, validateBucketName } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// GET /api/s3/buckets/[bucketName]/objects - List objects in bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucketName: string }> }
) {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const { bucketName } = await params;
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || undefined;
    const maxKeys = searchParams.get('maxKeys') ? parseInt(searchParams.get('maxKeys')!) : undefined;

    const decodedBucketName = decodeURIComponent(bucketName);
    const bucketValidation = validateBucketName(decodedBucketName);
    if (!bucketValidation.valid) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, bucketValidation.error!, 400);
    }

    const objects = await s3Service.listObjects(decodedBucketName, prefix, maxKeys);
    
    return createSuccessResponse({
      bucketName: decodedBucketName,
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