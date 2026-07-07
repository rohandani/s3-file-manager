import { s3Service } from './s3-service';

/**
 * Initialize AWS services on app startup
 * This ensures the default S3 bucket exists before users interact with the app
 */
export async function initializeAWS(): Promise<void> {
  try {
    await s3Service.initialize();
  } catch (error) {
    console.error('AWS initialization failed:', error);
    // Don't throw error - allow app to continue
    // The bucket will be created on first use if initialization fails
  }
}

// For server-side initialization (API routes, server components)
let isInitialized = false;

export async function ensureAWSInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeAWS();
    isInitialized = true;
  }
}