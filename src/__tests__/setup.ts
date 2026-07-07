import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_REGION = 'us-east-1'
process.env.AWS_S3_DEFAULT_BUCKET = 's3-file-manager-test'