import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import BucketList from '@/components/s3/BucketList';
import Link from 'next/link';

export default async function BucketsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 font-sans">
      <main className="flex flex-1 w-full max-w-6xl mx-auto flex-col py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bucket Management</h1>
              <p className="text-lg text-gray-600 mt-2">
                Manage your S3 storage folders and browse your uploaded files
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Files
              </Link>
            </div>
          </div>
        </div>
        
        <BucketList />
      </main>
    </div>
  );
}