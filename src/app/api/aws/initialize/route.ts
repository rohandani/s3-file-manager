import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { createSuccessResponse, createErrorResponse, validateAuthentication } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// POST /api/aws/initialize - Initialize AWS services
export async function POST() {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    // Initialize S3 service (creates default bucket if needed)
    await s3Service.initialize();
    
    return createSuccessResponse({
      message: 'AWS services initialized successfully',
      bucket: process.env.AWS_S3_DEFAULT_BUCKET || 's3-file-manager'
    });
  } catch (error) {
    console.error('Error initializing AWS services:', error);
    
    return createErrorResponse(
      API_ERROR_CODES.BUCKET_CREATE_ERROR,
      error instanceof Error ? error.message : 'Failed to initialize AWS services'
    );
  }
}