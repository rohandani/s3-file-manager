import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { S3BucketError } from '@/lib/aws/types';
import { createSuccessResponse, createErrorResponse, validateAuthentication, validateBucketName } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// GET /api/s3/buckets - List user buckets
export async function GET() {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const buckets = await s3Service.listUserBuckets();
    
    return createSuccessResponse(buckets);
  } catch (error) {
    console.error('Error listing buckets:', error);
    
    return createErrorResponse(
      API_ERROR_CODES.BUCKET_LIST_ERROR,
      error instanceof Error ? error.message : 'Failed to list buckets'
    );
  }
}

// POST /api/s3/buckets - Create new bucket
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid, userId } = validateAuthentication(session);
    
    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const body = await request.json();
    const { bucketName } = body;

    const validation = validateBucketName(bucketName);
    if (!validation.valid) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, validation.error!, 400);
    }

    const createdBucketName = await s3Service.createBucket(bucketName.trim(), userId!);
    
    return createSuccessResponse({ 
      bucketName: createdBucketName,
      message: 'Bucket created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating bucket:', error);
    
    if (error instanceof S3BucketError || (error instanceof Error && error.message?.includes('already exists'))) {
      return createErrorResponse(
        API_ERROR_CODES.BUCKET_ALREADY_EXISTS,
        error instanceof Error ? error.message : 'Bucket already exists',
        409
      );
    }
    
    return createErrorResponse(
      API_ERROR_CODES.BUCKET_CREATE_ERROR,
      error instanceof Error ? error.message : 'Failed to create bucket'
    );
  }
}