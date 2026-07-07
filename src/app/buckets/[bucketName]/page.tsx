import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import ObjectList from '@/components/s3/ObjectList';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface BucketPageProps {
  params: Promise<{
    bucketName: string;
  }>;
}

export default async function BucketPage({ params }: BucketPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const { bucketName } = await params;
  const decodedBucketName = decodeURIComponent(bucketName);

  // Validate bucket name
  if (!decodedBucketName || decodedBucketName.trim().length === 0) {
    notFound();
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 font-sans">
      <main className="flex flex-1 w-full max-w-6xl mx-auto flex-col py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link
              href="/buckets"
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back to Folders
            </Link>
          </nav>

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Folder: {decodedBucketName}
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Browse and manage files in this folder
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload More Files
              </Link>
            </div>
          </div>
        </div>
        
        <ObjectList bucketName={decodedBucketName} />
      </main>
    </div>
  );
}