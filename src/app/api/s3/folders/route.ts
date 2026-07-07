import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';
import { createSuccessResponse, createErrorResponse, validateAuthentication } from '@/lib/api/utils';
import { API_ERROR_CODES } from '@/lib/api/types';

// Configure route handler
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/s3/folders - List folders in main bucket
export async function GET() {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);

    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    const folders = await s3Service.listFolders();

    return createSuccessResponse(folders);
  } catch (error) {
    console.error('Error listing folders:', error);

    return createErrorResponse(
      API_ERROR_CODES.BUCKET_LIST_ERROR,
      error instanceof Error ? error.message : 'Failed to list folders'
    );
  }
}

// POST /api/s3/folders - Create new folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { isValid } = validateAuthentication(session);

    if (!isValid) {
      return createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    const body = await request.json();
    const { folderName } = body;

    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Folder name is required', 400);
    }

    if (folderName.trim().length < 1 || folderName.trim().length > 50) {
      return createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Folder name must be between 1 and 50 characters', 400);
    }

    const folderPrefix = await s3Service.createFolder(folderName.trim());

    return createSuccessResponse({
      folderName: folderPrefix.replace('/', ''),
      folderPrefix,
      message: 'Folder created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating folder:', error);

    return createErrorResponse(
      API_ERROR_CODES.BUCKET_CREATE_ERROR,
      error instanceof Error ? error.message : 'Failed to create folder'
    );
  }
}