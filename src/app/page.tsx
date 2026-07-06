export default function Home() {
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
        </div>
      </main>
    </div>
  );
}
