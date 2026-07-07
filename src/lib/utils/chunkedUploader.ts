// Client-side chunked upload utility

export interface ChunkedUploadOptions {
  chunkSize?: number; // Default 5MB
  onProgress?: (progress: number, chunkIndex: number, totalChunks: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error, chunkIndex?: number) => void;
}

export interface ChunkedUploadResult {
  success: boolean;
  fileName: string;
  fileKey: string;
  location: string;
  size: number;
  error?: string;
}

export class ChunkedUploader {
  private readonly chunkSize: number;
  private readonly file: File;
  private readonly folderName: string;
  private readonly options: ChunkedUploadOptions;
  private uploadId?: string;
  private cancelled = false;

  constructor(file: File, folderName: string, options: ChunkedUploadOptions = {}) {
    this.file = file;
    this.folderName = folderName;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB default
    this.options = options;
  }

  async upload(): Promise<ChunkedUploadResult> {
    try {
      this.cancelled = false;
      const totalChunks = Math.ceil(this.file.size / this.chunkSize);

      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (this.cancelled) {
          throw new Error('Upload cancelled');
        }

        await this.uploadChunk(chunkIndex, totalChunks);
        
        // Update progress
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        this.options.onProgress?.(progress, chunkIndex + 1, totalChunks);
        this.options.onChunkComplete?.(chunkIndex + 1, totalChunks);
      }

      // Complete upload
      if (!this.uploadId) {
        throw new Error('Upload ID not set');
      }

      const result = await this.completeUpload(this.uploadId);
      return result;

    } catch (error) {
      console.error('Chunked upload error:', error);
      
      // Cancel upload on error
      if (this.uploadId) {
        await this.cancelUpload();
      }

      const uploadError = error instanceof Error ? error : new Error('Upload failed');
      this.options.onError?.(uploadError);
      
      return {
        success: false,
        fileName: this.file.name,
        fileKey: '',
        location: '',
        size: this.file.size,
        error: uploadError.message
      };
    }
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    if (this.uploadId) {
      await this.cancelUpload();
    }
  }

  private async uploadChunk(chunkIndex: number, totalChunks: number): Promise<void> {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunkBlob = this.file.slice(start, end);

    // Convert chunk to base64
    const arrayBuffer = await chunkBlob.arrayBuffer();
    const base64Data = this.arrayBufferToBase64(arrayBuffer);

    // Import the server action
    const { uploadFileChunk } = await import('@/lib/actions/chunkedUpload');

    // Upload chunk
    const result = await uploadFileChunk({
      data: base64Data,
      chunkIndex,
      totalChunks,
      fileName: this.file.name,
      folderName: this.folderName,
      fileSize: this.file.size,
      contentType: this.file.type || 'application/octet-stream',
      uploadId: this.uploadId
    });

    if (!result.success) {
      throw new Error(result.error || `Failed to upload chunk ${chunkIndex}`);
    }

    // Set upload ID from first chunk
    if (!this.uploadId && result.uploadId) {
      this.uploadId = result.uploadId;
    }
  }

  private async completeUpload(uploadId: string): Promise<ChunkedUploadResult> {
    const { completeChunkedUpload } = await import('@/lib/actions/chunkedUpload');
    return await completeChunkedUpload(uploadId);
  }

  private async cancelUpload(): Promise<void> {
    if (!this.uploadId) return;
    
    try {
      const { cancelChunkedUpload } = await import('@/lib/actions/chunkedUpload');
      await cancelChunkedUpload(this.uploadId);
    } catch (error) {
      console.error('Error cancelling upload:', error);
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Utility function to determine if file should use chunked upload
export function shouldUseChunkedUpload(file: File): boolean {
  const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
  return file.size > CHUNK_THRESHOLD;
}

// Helper function for simple chunked upload
export async function uploadFileInChunks(
  file: File, 
  folderName: string, 
  options: ChunkedUploadOptions = {}
): Promise<ChunkedUploadResult> {
  const uploader = new ChunkedUploader(file, folderName, options);
  return await uploader.upload();
}