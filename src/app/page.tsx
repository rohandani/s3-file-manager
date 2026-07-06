import { auth } from '@/lib/auth/auth'
import UserProfile from '@/components/auth/UserProfile'
import Link from 'next/link'

export default async function Home() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-gray-50 font-sans">
        <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-16 px-8">
          <div className="text-center space-y-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              S3 File Manager
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Progressive Web App for managing file uploads to AWS S3 with cost optimization features
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📱 Progressive Web App
                </h3>
                <p className="text-gray-600">
                  Install on your device for native-like experience with offline capabilities
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📊 Cost Optimization
                </h3>
                <p className="text-gray-600">
                  Smart upload options to minimize your AWS S3 storage and transfer costs
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🔐 Secure Authentication
                </h3>
                <p className="text-gray-600">
                  Sign in with your Google account for secure access to your files
                </p>
              </div>
            </div>
            <div className="mt-8">
              <Link
                href="/auth/signin"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Get Started
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 font-sans">
      <UserProfile />
      
      <main className="flex flex-1 w-full max-w-4xl mx-auto flex-col py-8 px-8">
        <div className="text-center space-y-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user?.name}!
          </h1>
          <p className="text-lg text-gray-600">
            Manage your S3 files and uploads
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📁 File Upload
              </h3>
              <p className="text-gray-600 mb-4">
                Upload photos, videos, and files to your S3 buckets with cost optimization
              </p>
              <Link 
                href="/upload"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Upload Files →
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🗂️ Bucket Management
              </h3>
              <p className="text-gray-600 mb-4">
                View and manage your S3 buckets and browse stored objects
              </p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                View Buckets →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
