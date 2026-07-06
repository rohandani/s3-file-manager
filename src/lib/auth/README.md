# Authentication Setup

This directory contains the NextAuth.js v5 authentication configuration for the S3 File Manager application.

## Configuration

### Files
- `auth.config.ts` - Main NextAuth.js configuration with Google OAuth provider
- `auth.ts` - NextAuth.js initialization and export of handlers
- `test-auth.ts` - Configuration validation script
- `next-auth.d.ts` - TypeScript type extensions for NextAuth.js

### Environment Variables Required

Copy `.env.local.example` to `.env.local` and fill in the following:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
7. Copy the Client ID and Client Secret to your `.env.local`

### Testing

Run the validation script:
```bash
npx tsx src/lib/auth/test-auth.ts
```

## Features Implemented

✅ Google OAuth2 authentication
✅ Custom sign-in page at `/auth/signin`
✅ Session management with JWT strategy
✅ User profile display with sign-out functionality
✅ Route protection with middleware
✅ TypeScript type safety
✅ Error handling and loading states

## Usage

### Client Components
Use `useSession()` from `next-auth/react`:

```tsx
import { useSession } from 'next-auth/react'

export default function Component() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <p>Loading...</p>
  if (!session) return <p>Please sign in</p>
  
  return <p>Hello {session.user.name}!</p>
}
```

### Server Components
Use the `auth()` function:

```tsx
import { auth } from '@/lib/auth/auth'

export default async function ServerComponent() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  return <p>Hello {session.user.name}!</p>
}
```