# AWS Setup Guide for S3 File Manager

## IAM Policy Setup

The S3 File Manager requires specific AWS permissions to function correctly. Follow these steps to set up the proper IAM policy:

### 1. Current Error

You're seeing this error because the IAM user lacks the necessary permissions:
```
User: arn:aws:iam::810890578080:user/s3-file-manager-user is not authorized to perform: s3:ListAllMyBuckets
```

### 2. Apply the IAM Policy

Use the provided `aws-iam-policy.json` file to grant the necessary permissions:

#### Option A: Using AWS CLI
```bash
# Attach the policy to your existing user
aws iam put-user-policy \
  --user-name s3-file-manager-user \
  --policy-name S3FileManagerPolicy \
  --policy-document file://aws-iam-policy.json
```

#### Option B: Using AWS Console
1. Go to AWS IAM Console
2. Navigate to Users → `s3-file-manager-user`
3. Click "Add permissions" → "Attach policies directly"
4. Click "Create policy"
5. Select "JSON" tab
6. Copy and paste the content from `aws-iam-policy.json`
7. Review and create the policy
8. Attach it to the user

### 3. Permissions Explained

The policy grants these essential permissions:

#### ListAllBuckets (Global)
- `s3:ListAllMyBuckets`: List all buckets in the account
- `s3:GetBucketLocation`: Get bucket regions

#### Bucket Management (s3-file-manager-* buckets only)
- `s3:CreateBucket`: Create new buckets
- `s3:DeleteBucket`: Delete empty buckets
- `s3:ListBucket`: List objects in buckets
- `s3:GetBucketAcl`: Get bucket permissions
- `s3:GetBucketVersioning`: Get versioning status

#### Object Management (s3-file-manager-* buckets only)
- `s3:PutObject`: Upload files
- `s3:GetObject`: Download files
- `s3:DeleteObject`: Delete files
- `s3:PutObjectAcl`: Set file permissions
- `s3:GetObjectAcl`: Get file permissions

### 4. Security Notes

- The policy restricts bucket operations to buckets with the `s3-file-manager-` prefix
- This ensures the application can only manage its own buckets
- Global `ListAllMyBuckets` is required to show existing buckets in the UI
- All object operations are scoped to the specific bucket pattern

### 5. Verification

After applying the policy, test the permissions:

```bash
# Test bucket listing
aws s3api list-buckets --profile your-profile

# Test bucket creation (optional)
aws s3api create-bucket --bucket s3-file-manager-test-$(date +%s) --profile your-profile
```

### 6. Environment Variables

Ensure these are set in your `.env.local`:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_DEFAULT_BUCKET=s3-file-manager
```

The `AWS_S3_DEFAULT_BUCKET` variable defines the name of the S3 bucket that will be automatically created and used for all file operations. The bucket will be created automatically when the app initializes if it doesn't exist.

### Troubleshooting

If you still see permission errors after applying the policy:

1. **Wait 1-2 minutes** for AWS policy propagation
2. **Refresh your application** to get new credentials
3. **Check the exact bucket name format** - it should start with `s3-file-manager-`
4. **Verify the region** in your environment variables
5. **Test with AWS CLI** to isolate the issue

### Alternative: Create New User

If you prefer to create a fresh IAM user:

```bash
# Create user
aws iam create-user --user-name s3-file-manager-user

# Attach policy
aws iam put-user-policy \
  --user-name s3-file-manager-user \
  --policy-name S3FileManagerPolicy \
  --policy-document file://aws-iam-policy.json

# Create access keys
aws iam create-access-key --user-name s3-file-manager-user
```

Save the access key ID and secret access key in your `.env.local` file.