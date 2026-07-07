// Upload utility functions for handling large files and FormData issues

export interface ChunkedFile {
  name: string;
  size: number;
  type: string;
  chunks: ArrayBuffer[];
  chunkSize: number;
}

/**
 * Split large files into smaller chunks to avoid FormData parsing issues
 */
export function chunkFile(file: File, chunkSize: number = 10 * 1024 * 1024): Promise<ChunkedFile> {
  return new Promise((resolve, reject) => {
    const chunks: ArrayBuffer[] = [];
    let offset = 0;

    const readChunk = () => {
      if (offset >= file.size) {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          chunks,
          chunkSize
        });
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          chunks.push(event.target.result);
          offset += chunkSize;
          readChunk();
        } else {
          reject(new Error('Failed to read file chunk'));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read chunk at offset ${offset}`));
      };

      reader.readAsArrayBuffer(slice);
    };

    readChunk();
  });
}

/**
 * Reassemble file chunks back into a single ArrayBuffer
 */
export function reassembleChunks(chunkedFile: ChunkedFile): ArrayBuffer {
  const totalSize = chunkedFile.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new ArrayBuffer(totalSize);
  const uint8Result = new Uint8Array(result);
  
  let offset = 0;
  for (const chunk of chunkedFile.chunks) {
    uint8Result.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  
  return result;
}

/**
 * Validate file before upload to catch issues early
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if file object is valid
  if (!(file instanceof File)) {
    return { valid: false, error: 'Invalid file object' };
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    return { valid: false, error: 'File name is empty' };
  }

  // Check file size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_SIZE) {
    return { 
      valid: false, 
      error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 100MB.` 
    };
  }

  // Check file name for problematic characters
  const problematicChars = /[<>:"|?*\x00-\x1f]/;
  if (problematicChars.test(file.name)) {
    return { 
      valid: false, 
      error: 'File name contains invalid characters' 
    };
  }

  return { valid: true };
}

/**
 * Create a safe FormData object with validation
 */
export function createSafeFormData(folderName: string, files: File[]): FormData {
  const formData = new FormData();
  
  // Validate folder name
  if (!folderName || folderName.trim().length === 0) {
    throw new Error('Folder name is required');
  }
  
  // Validate files
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  // Validate each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(`File validation failed for "${file.name}": ${validation.error}`);
    }
  }

  // Add to FormData
  formData.append('folderName', folderName.trim());
  files.forEach(file => {
    formData.append('files', file);
  });

  return formData;
}

/**
 * Detect if an error is related to FormData parsing issues
 */
export function isFormDataError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('end of form') ||
    message.includes('boundary') ||
    message.includes('unexpected end') ||
    message.includes('formdata') ||
    message.includes('multipart')
  );
}

/**
 * Get user-friendly error message for upload failures
 */
export function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown upload error occurred';
  }

  const message = error.message;

  if (isFormDataError(error)) {
    return 'Network error: File upload was interrupted. Please check your internet connection and try again.';
  }

  if (message.includes('timeout')) {
    return 'Upload timeout: The file may be too large or your connection is slow. Try uploading a smaller file.';
  }

  if (message.includes('too large') || message.includes('size')) {
    return 'File is too large. Maximum file size is 100MB.';
  }

  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'Authentication error: Please sign in again and try uploading.';
  }

  if (message.includes('network') || message.includes('connection')) {
    return 'Network error: Please check your internet connection and try again.';
  }

  // Return the original message if it's already user-friendly
  if (message.length < 100 && !message.includes('Error:')) {
    return message;
  }

  return 'Upload failed. Please try again.';
}