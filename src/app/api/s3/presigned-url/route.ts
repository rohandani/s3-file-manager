import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateAuthentication, 
  validateBucketName,
  validateObjectKey 
} from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// POST /api/s3/presigned-url - Generate presigned download URL
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid, userId } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const body = await request.json();
    const { bucketName, objectKey, expiresIn } = body;

    // Validate bucket name
    const bucketValidation = validateBucketName(bucketName);
    if (!bucketValidation.valid) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, bucketValidation.error!, 400);
    }

    // Validate object key
    const objectValidation = validateObjectKey(objectKey);
    if (!objectValidation.valid) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, objectValidation.error!, 400);
    }

    // Validate expiresIn (default 1 hour, max 7 days)
    const expirationSeconds = expiresIn && typeof expiresIn === 'number' && expiresIn > 0 
      ? Math.min(expiresIn, 7 * 24 * 60 * 60) // Max 7 days
      : 3600; // Default 1 hour

    // Security check: ensure user can only access their own files
    if (!objectKey.startsWith(`${userId}/`)) {
      return createErrorResponse(
        API_ERROR_CODES.FORBIDDEN,
        'Access denied to this object',
        403
      );
    }

    const presignedUrl = await s3Service.generatePresignedUrl(
      bucketName.trim(),
      objectKey.trim(),
      expirationSeconds
    );
    
    return createSuccessResponse({
      presignedUrl,
      expiresIn: expirationSeconds,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    if (error instanceof Error && error.message?.includes('does not exist')) {
      return createErrorResponse(
        API_ERROR_CODES.OBJECT_NOT_FOUND,
        error.message,
        404
      );
    }
    
    return createErrorResponse(
      API_ERROR_CODES.PRESIGNED_URL_ERROR,
      error instanceof Error ? error.message : 'Failed to generate presigned URL'
    );
  }
}