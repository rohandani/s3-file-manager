# S3 File Manager PWA

A Progressive Web App that enables users to authenticate with Gmail and manage file uploads to AWS S3 with intelligent cost optimization features.

## ✨ Features

- 🔐 **Google Authentication** - Secure login with Gmail using NextAuth.js
- 📱 **Progressive Web App** - Installable on mobile devices with offline support
- ☁️ **AWS S3 Integration** - Direct file uploads to your S3 buckets
- 💰 **Cost Optimization** - Smart comparison between individual and zip uploads
- 📦 **Bucket Management** - Create and manage S3 buckets with custom naming
- 📊 **File Browsing** - View objects in your buckets on-demand
- 🎯 **Mobile-First** - Optimized for mobile file uploads from your phone
- 🔄 **Offline Support** - Works offline with background sync when reconnected

## 🚀 Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Authentication:** NextAuth.js v5 with Google Provider
- **Cloud Storage:** AWS S3 with SDK v3
- **Styling:** Tailwind CSS
- **PWA:** next-pwa plugin
- **File Handling:** react-dropzone, JSZip
- **Language:** TypeScript

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- An AWS account with S3 access
- Google OAuth2 credentials
- Basic knowledge of Next.js and React

## ⚙️ Environment Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   # NextAuth.js Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret
   
   # Google OAuth2
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_PREFIX=your-app-name
   ```

## 🔧 Getting Started

1. **Set up Google OAuth2:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth2 credentials
   - Add `http://localhost:3000` to authorized origins
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs

2. **Configure AWS S3:**
   - Create an IAM user with S3 full access permissions
   - Generate access keys for the user
   - Note your preferred AWS region

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
s3-file-manager/
├── .kiro/                  # Kiro IDE configuration and specs
├── app/                    # Next.js App Router pages and layouts
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── lib/              # Utility libraries and services
├── public/               # Static assets and PWA manifest
├── types/               # TypeScript type definitions
└── tests/              # Test files
```

## 💡 How It Works

1. **Authentication:** Users sign in with their Google account using NextAuth.js
2. **File Selection:** Users can select multiple files from their device using drag-and-drop or file picker
3. **Upload Method:** The app compares costs between individual uploads vs. creating a zip archive
4. **Bucket Creation:** Users provide a custom name, and the app creates an S3 bucket with date stamp
5. **Upload & Storage:** Files are uploaded to S3 with progress tracking and error handling
6. **Management:** Users can browse their buckets and view objects on-demand to control costs

## 🎯 Cost Optimization Features

- **Smart Comparison:** Real-time cost analysis between individual file uploads and zip archives
- **Storage Classes:** Support for different S3 storage classes (Standard, IA, Glacier)
- **Request Optimization:** Minimizes S3 API requests through batching and caching
- **On-Demand Loading:** Object listings only load when explicitly requested

## 📱 PWA Features

- **Installable:** Add to home screen on mobile devices
- **Offline Support:** Cache essential UI components and sync when online
- **Background Sync:** Resume interrupted uploads automatically
- **Native Feel:** App-like experience with proper icons and splash screens

## 🧪 Testing

Run the test suite:
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### AWS Lambda

1. Configure for serverless deployment
2. Set up environment variables
3. Deploy using `npm run deploy`

## 🔐 Security Considerations

- All AWS credentials are handled server-side only
- NextAuth.js provides secure session management
- Input validation and sanitization on all endpoints
- CORS policies configured for security
- Rate limiting on API endpoints

## 📊 Cost Estimation

The app provides cost estimates based on:
- **Storage costs:** Per GB per month based on storage class
- **Request costs:** PUT/POST requests for uploads
- **Transfer costs:** Data transfer charges
- **Savings analysis:** Comparison between upload methods

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/s3-file-manager/issues) section
2. Create a new issue with detailed description
3. Include environment details and error messages

## 🎉 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing full-stack framework
- [NextAuth.js](https://next-auth.js.org/) for simplified authentication
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/) for S3 integration
- [Workbox](https://developers.google.com/web/tools/workbox) for PWA capabilities

---

**Happy file managing! 🚀**