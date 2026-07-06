import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import FileUploadManager from '@/components/upload/FileUploadManager'

export default async function UploadPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            S3 File Upload
          </h1>
          <p className="text-center text-gray-600 mt-2">
            Upload files to your AWS S3 buckets with cost optimization
          </p>
        </div>

        <FileUploadManager />
      </div>
    </div>
  )
}