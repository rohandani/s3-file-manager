import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

// Middleware function to handle authentication
export default async function middleware(request: NextRequest) {
  const session = await auth()
  
  // Define public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/api/auth']
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  // Allow access to public paths and static assets
  if (isPublicPath || request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }
  
  // Redirect to sign-in if not authenticated
  if (!session) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Match all paths except static files and API auth routes
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
}