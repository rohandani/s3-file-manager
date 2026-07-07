'use server';

import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';

export interface UploadResult {
  success: boolean;
  fileName: string;
  fileKey: string;
  location: string;
  size: number;
  error?: string;
}

export interface UploadResponse {
  results: UploadResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Enhanced FormData parsing with better error handling
async function safeParseFormData(formData: FormData): Promise<{ folderName: string; files: File[] }> {
  try {
    const folderName = formData.get('folderName') as string;
    const files = formData.getAll('files') as File[];
    
    // Validate extracted data
    if (!folderName) {
      throw new Error('Folder name not found in form data');
    }
    
    if (!files || files.length === 0) {
      throw new Error('No files found in form data');
    }

    // Validate each file object
    for (const file of files) {
      if (!(file instanceof File)) {
        throw new Error(`Invalid file object: ${typeof file}`);
      }
      if (!file.name || file.name.trim().length === 0) {
        throw new Error('File with empty name detected');
      }
      if (file.size === 0) {
        throw new Error(`Empty file detected: ${file.name}`);
      }
    }

    return { folderName, files };
  } catch (error) {
    console.error('FormData parsing error:', error);
    if (error instanceof Error) {
      if (error.message.includes('end of form') || error.message.includes('boundary')) {
        throw new Error('FormData was corrupted during transmission. Please try uploading again with a stable internet connection.');
      }
      throw error;
    }
    throw new Error('Failed to parse upload data');
  }
}

export async function uploadFilesToS3(formData: FormData): Promise<UploadResponse> {
  let folderName: string;
  let files: File[];

  try {
    // Check authentication first
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    // Parse FormData with enhanced error handling
    const parsed = await safeParseFormData(formData);
    folderName = parsed.folderName;
    files = parsed.files;

    // Validate folder name
    if (typeof folderName !== 'string' || folderName.trim().length === 0) {
      throw new Error('Folder name is required');
    }

    if (folderName.trim().length < 1 || folderName.trim().length > 50) {
      throw new Error('Folder name must be between 1 and 50 characters');
    }

    // Additional file size validation
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      throw new Error(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum file size is 100MB.`);
    }

    // Upload files to the specified folder
    const uploadResults: UploadResult[] = [];
    
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

        // Convert file to buffer with enhanced error handling for large files
        let fileContent: Buffer;
        try {
          // Add timeout for large file reading
          const arrayBuffer = await Promise.race([
            file.arrayBuffer(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('File reading timeout')), 60000) // 60 seconds
            )
          ]) as ArrayBuffer;
          
          fileContent = Buffer.from(arrayBuffer);
        } catch (bufferError) {
          console.error(`Buffer conversion error for ${file.name}:`, bufferError);
          uploadResults.push({
            fileName: file.name,
            success: false,
            fileKey: '',
            location: '',
            size: file.size,
            error: bufferError instanceof Error && bufferError.message.includes('timeout') 
              ? 'File reading timeout - file may be too large or corrupted'
              : 'Failed to read file content'
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
    
    return {
      results: uploadResults,
      summary: {
        total: uploadResults.length,
        successful: successCount,
        failed: failureCount
      }
    };

  } catch (error) {
    console.error('Error in uploadFilesToS3 action:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('FormData was corrupted')) {
        throw new Error('Upload failed due to network issues. Please check your internet connection and try again.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Upload timeout. Please try uploading smaller files or check your internet connection.');
      }
      if (error.message.includes('boundary') || error.message.includes('end of form')) {
        throw new Error('File upload was interrupted. Please try again with a stable internet connection.');
      }
    }
    
    throw error;
  }
}

// Alternative upload method that bypasses FormData parsing issues
export async function uploadSingleFile(
  folderName: string,
  fileName: string,
  fileContent: ArrayBuffer,
  contentType?: string
): Promise<UploadResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    // Validate inputs
    if (!folderName || folderName.trim().length === 0) {
      throw new Error('Folder name is required');
    }
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('File name is required');
    }
    if (!fileContent || fileContent.byteLength === 0) {
      throw new Error('File content is empty');
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileContent.byteLength > MAX_FILE_SIZE) {
      throw new Error(`File too large (${Math.round(fileContent.byteLength / 1024 / 1024)}MB). Maximum size is 100MB.`);
    }

    // Convert to Buffer
    const buffer = Buffer.from(fileContent);

    // Upload to S3
    const result = await s3Service.uploadFileToFolder(
      folderName.trim(),
      fileName,
      buffer,
      contentType || 'application/octet-stream'
    );

    return {
      fileName,
      ...result
    };

  } catch (error) {
    console.error('Error in uploadSingleFile action:', error);
    return {
      fileName: fileName || 'unknown',
      success: false,
      fileKey: '',
      location: '',
      size: fileContent ? fileContent.byteLength : 0,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}