// Test script to verify AWS credentials
// Run with: node scripts/test-aws-connection.js

require('dotenv').config({ path: '.env.local' });
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testConnection() {
  console.log('Testing AWS connection...');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ Connection successful!');
    console.log('Available buckets:', response.Buckets?.length || 0);
    
    if (response.Buckets?.length > 0) {
      console.log('Bucket names:');
      response.Buckets.forEach(bucket => {
        console.log(`  - ${bucket.Name}`);
      });
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.error('Check your AWS_ACCESS_KEY_ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('Check your AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'UnknownEndpoint') {
      console.error('Check your AWS_REGION');
    }
  }
}

testConnection();