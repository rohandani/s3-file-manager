'use server';

import { auth } from '@/lib/auth/auth';
import { s3Service } from '@/lib/aws/s3-service';
import { ensureAWSInitialized } from '@/lib/aws/initialize';

export interface ChunkUploadResult {
  success: boolean;
  chunkIndex: number;
  totalChunks: number;
  uploadId?: string;
  error?: string;
}

export interface FileChunk {
  data: string; // Base64 encoded chunk
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  folderName: string;
  fileSize: number;
  contentType: string;
  uploadId?: string;
}

export interface CompleteUploadResult {
  success: boolean;
  fileName: string;
  fileKey: string;
  location: string;
  size: number;
  error?: string;
}

// Store for tracking multipart uploads (in production, use Redis or database)
const uploadSessions = new Map<string, {
  folderName: string;
  fileName: string;
  chunks: Map<number, Buffer>;
  totalChunks: number;
  fileSize: number;
  contentType: string;
  createdAt: Date;
}>();

// Clean up old sessions (simple cleanup - in production use proper job scheduling)
function cleanupOldSessions() {
  const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
  for (const [uploadId, session] of uploadSessions.entries()) {
    if (session.createdAt.getTime() < cutoff) {
      uploadSessions.delete(uploadId);
    }
  }
}

export async function uploadFileChunk(chunk: FileChunk): Promise<ChunkUploadResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    // Clean up old sessions periodically
    if (Math.random() < 0.1) { // 10% chance
      cleanupOldSessions();
    }

    // Generate upload ID if not provided
    let uploadId = chunk.uploadId;
    if (!uploadId) {
      uploadId = `${session.user?.id || 'user'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get or create upload session
    let uploadSession = uploadSessions.get(uploadId);
    if (!uploadSession) {
      uploadSession = {
        folderName: chunk.folderName,
        fileName: chunk.fileName,
        chunks: new Map(),
        totalChunks: chunk.totalChunks,
        fileSize: chunk.fileSize,
        contentType: chunk.contentType,
        createdAt: new Date()
      };
      uploadSessions.set(uploadId, uploadSession);
    }

    // Decode and store chunk
    const chunkBuffer = Buffer.from(chunk.data, 'base64');
    uploadSession.chunks.set(chunk.chunkIndex, chunkBuffer);

    return {
      success: true,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      uploadId: uploadId
    };

  } catch (error) {
    console.error('Error uploading chunk:', error);
    return {
      success: false,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      uploadId: chunk.uploadId,
      error: error instanceof Error ? error.message : 'Chunk upload failed'
    };
  }
}

export async function completeChunkedUpload(uploadId: string): Promise<CompleteUploadResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Ensure AWS is initialized
    await ensureAWSInitialized();

    // Get upload session
    const uploadSession = uploadSessions.get(uploadId);
    if (!uploadSession) {
      throw new Error('Upload session not found or expired');
    }

    // Verify all chunks are received
    if (uploadSession.chunks.size !== uploadSession.totalChunks) {
      throw new Error(`Missing chunks: received ${uploadSession.chunks.size}/${uploadSession.totalChunks}`);
    }

    // Reassemble file
    const sortedChunks = Array.from(uploadSession.chunks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, buffer]) => buffer);

    const completeFile = Buffer.concat(sortedChunks);

    // Verify file size
    if (completeFile.length !== uploadSession.fileSize) {
      throw new Error(`File size mismatch: expected ${uploadSession.fileSize}, got ${completeFile.length}`);
    }

    // Upload to S3
    const result = await s3Service.uploadFileToFolder(
      uploadSession.folderName,
      uploadSession.fileName,
      completeFile,
      uploadSession.contentType
    );

    // Clean up session
    uploadSessions.delete(uploadId);

    return {
      fileName: uploadSession.fileName,
      ...result
    };

  } catch (error) {
    console.error('Error completing chunked upload:', error);
    return {
      success: false,
      fileName: 'unknown',
      fileKey: '',
      location: '',
      size: 0,
      error: error instanceof Error ? error.message : 'Upload completion failed'
    };
  }
}

export async function cancelChunkedUpload(uploadId: string): Promise<{ success: boolean }> {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      throw new Error('Authentication required');
    }

    // Remove upload session
    const deleted = uploadSessions.delete(uploadId);

    return { success: deleted };
  } catch (error) {
    console.error('Error canceling chunked upload:', error);
    return { success: false };
  }
}