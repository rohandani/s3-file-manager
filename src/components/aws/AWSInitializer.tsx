'use client'

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * AWSInitializer - Client-side component that initializes AWS services
 * when a user is authenticated. This ensures the default S3 bucket
 * exists before users try to upload files.
 */
export default function AWSInitializer() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only initialize when user is authenticated
    console.log('status is ', status);
    console.log('session?.user is ', session?.user);
    if (status === 'authenticated' && session?.user) {
      initializeAWS();
    }
  }, [session, status]);

  const initializeAWS = async () => {
    try {
      // Call the initialization API endpoint
      const response = await fetch('/api/aws/initialize', {
        method: 'POST'
      });

      if (!response.ok) {
        console.warn('AWS initialization failed:', await response.text());
      } else {
        console.log('AWS services initialized successfully');
      }
    } catch (error) {
      console.warn('AWS initialization error:', error);
      // Don't throw - let the app continue
    }
  };

  // This component doesn't render anything
  return null;
}