import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createS3Client, getS3Client } from '../../lib/aws/s3-client';

// Mock the S3Client to avoid actual AWS calls
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function MockS3Client(config: any) {
    // @ts-ignore
    this.config = config;
  }),
}));

describe('S3 Client Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'us-east-1';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('createS3Client', () => {
    it('should create S3 client with proper configuration', () => {
      const client = createS3Client();
      
      expect(client).toBeDefined();
      expect(client.config).toBeDefined();
    });

    it('should throw error when AWS_ACCESS_KEY_ID is missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      expect(() => createS3Client())
        .toThrow('AWS credentials not configured');
    });

    it('should throw error when AWS_SECRET_ACCESS_KEY is missing', () => {
      delete process.env.AWS_SECRET_ACCESS_KEY;

      expect(() => createS3Client())
        .toThrow('AWS credentials not configured');
    });

    it('should throw error when AWS_REGION is missing', () => {
      delete process.env.AWS_REGION;

      expect(() => createS3Client())
        .toThrow('AWS_REGION not configured');
    });

    it('should handle empty string environment variables', () => {
      process.env.AWS_ACCESS_KEY_ID = '';

      expect(() => createS3Client())
        .toThrow('AWS credentials not configured');
    });
  });

  describe('getS3Client', () => {
    it('should return singleton instance', () => {
      const client1 = getS3Client();
      const client2 = getS3Client();

      expect(client1).toBe(client2);
    });

    it('should create new client when first called', () => {
      const client = getS3Client();
      
      expect(client).toBeDefined();
    });
  });
});