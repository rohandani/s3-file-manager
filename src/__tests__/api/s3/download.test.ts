/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/s3/download/route';
import { NextRequest } from 'next/server';

// Mock the auth module
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(),
}));

// Mock the AWS initialize module
vi.mock('@/lib/aws/initialize', () => ({
  ensureAWSInitialized: vi.fn(),
}));

// Mock the S3 service
vi.mock('@/lib/aws/s3-service', () => ({
  s3Service: {
    generatePresignedUrl: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('/api/s3/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    (auth as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/s3/download', {
      method: 'POST',
      body: JSON.stringify({ key: 'test/file.txt' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 when object key is invalid', async () => {
    const { auth } = await import('@/lib/auth/auth');
    (auth as any).mockResolvedValue({ 
      user: { id: 'user123', email: 'test@example.com' } 
    });

    const request = new NextRequest('http://localhost:3000/api/s3/download', {
      method: 'POST',
      body: JSON.stringify({ key: '' }), // Invalid empty key
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('should successfully stream file download', async () => {
    const { auth } = await import('@/lib/auth/auth');
    const { s3Service } = await import('@/lib/aws/s3-service');
    
    (auth as any).mockResolvedValue({ 
      user: { id: 'user123', email: 'test@example.com' } 
    });

    // Mock successful presigned URL generation
    (s3Service.generatePresignedUrl as any).mockResolvedValue('https://s3.amazonaws.com/signed-url');

    // Mock successful file fetch from S3
    const mockFileContent = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('file content'));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: mockFileContent,
      headers: new Map([
        ['Content-Type', 'text/plain'],
        ['Content-Length', '12'],
      ]),
    });

    const request = new NextRequest('http://localhost:3000/api/s3/download', {
      method: 'POST',
      body: JSON.stringify({ key: 'test/file.txt' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="file.txt"');
    expect(response.headers.get('Content-Type')).toBe('text/plain');
  });
});