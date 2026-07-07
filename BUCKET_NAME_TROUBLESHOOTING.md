# S3 Bucket Name Troubleshooting Guide

## The Problem
If you see this error: 
```
The bucket you are attempting to access must be addressed using the specified endpoint
```

This typically means one of these issues:

## 1. **Bucket Name Already Taken** (Most Common)
S3 bucket names must be **globally unique** across all AWS accounts worldwide. The name `s3-file-manager` is likely already taken.

### ✅ Solution: Use a Unique Bucket Name
Update your `.env.local` file:

```env
# Instead of this:
AWS_S3_DEFAULT_BUCKET=s3-file-manager

# Use something unique like:
AWS_S3_DEFAULT_BUCKET=my-company-file-manager-2024
# OR
AWS_S3_DEFAULT_BUCKET=your-name-s3-files-$(date +%s)
# OR  
AWS_S3_DEFAULT_BUCKET=s3-manager-abc123xyz
```

### ✅ Update Your IAM Policy
When you change the bucket name, update `aws-iam-policy.json`:

```json
{
  "Resource": [
    "arn:aws:s3:::your-new-bucket-name",
    "arn:aws:s3:::your-new-bucket-name/*"
  ]
}
```

## 2. **Region Mismatch**
Your AWS region might not match where the bucket should be created.

### ✅ Solution: Check Your Region
1. **Verify your region** in `.env.local`:
   ```env
   AWS_REGION=us-west-1  # Make sure this is correct
   ```

2. **Popular regions:**
   - `us-east-1` (N. Virginia) - Default, no LocationConstraint needed
   - `us-west-1` (N. California) 
   - `us-west-2` (Oregon)
   - `eu-west-1` (Ireland)

## 3. **Permissions Issue**
Your IAM user might not have the required permissions.

### ✅ Solution: Apply the Correct IAM Policy
Make sure your IAM user has this policy applied:

```bash
aws iam put-user-policy \
  --user-name s3-file-manager-user \
  --policy-name S3FileManagerPolicy \
  --policy-document file://aws-iam-policy.json
```

## 4. **Bucket Exists in Different Region**
If the bucket name exists but in a different region than your configuration.

### ✅ Solution: Use AWS CLI to Check
```bash
# List all your buckets and their regions
aws s3api list-buckets --query "Buckets[*].Name"

# Check if the bucket exists and where
aws s3api get-bucket-location --bucket your-bucket-name
```

## Quick Fix Steps

1. **Choose a unique bucket name:**
   ```env
   AWS_S3_DEFAULT_BUCKET=myapp-files-20241207
   ```

2. **Update IAM policy** with your new bucket name
   
3. **Apply the updated policy:**
   ```bash
   aws iam put-user-policy \
     --user-name s3-file-manager-user \
     --policy-name S3FileManagerPolicy \
     --policy-document file://aws-iam-policy.json
   ```

4. **Restart your app** to pick up the new environment variable

## Testing Your Configuration

After making changes, test with AWS CLI:

```bash
# Test creating the bucket manually
aws s3api create-bucket \
  --bucket your-new-bucket-name \
  --region your-region \
  --create-bucket-configuration LocationConstraint=your-region

# If successful, delete it (the app will recreate it)
aws s3api delete-bucket --bucket your-new-bucket-name
```

## Recommended Bucket Naming Pattern

Use this pattern for unique bucket names:
```
{your-company/name}-s3-file-manager-{year}
```

Examples:
- `acme-s3-file-manager-2024`
- `johnsmith-s3-file-manager-2024` 
- `mycompany-file-storage-2024`

This ensures your bucket name is unique and descriptive!