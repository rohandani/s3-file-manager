import { authConfig } from './auth.config'

// Test function to validate auth configuration
export function validateAuthConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check if Google provider is configured
  const hasGoogleProvider = authConfig.providers?.length > 0
  
  if (!hasGoogleProvider) {
    issues.push('No providers found in configuration')
  }
  
  // Check if required environment variables are mentioned
  if (!process.env.GOOGLE_CLIENT_ID) {
    issues.push('GOOGLE_CLIENT_ID environment variable is required')
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    issues.push('GOOGLE_CLIENT_SECRET environment variable is required')
  }
  
  // Check if callbacks are configured
  if (!authConfig.callbacks?.session) {
    issues.push('Session callback not configured')
  }
  
  if (!authConfig.callbacks?.jwt) {
    issues.push('JWT callback not configured')
  }
  
  // Check if custom sign-in page is configured
  if (!authConfig.pages?.signIn) {
    issues.push('Custom sign-in page not configured')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

// Test the configuration
if (require.main === module) {
  const result = validateAuthConfig()
  console.log('Authentication Configuration Test:')
  console.log('Valid:', result.valid)
  if (result.issues.length > 0) {
    console.log('Issues found:')
    result.issues.forEach(issue => console.log(`  - ${issue}`))
  } else {
    console.log('✅ All authentication configuration checks passed!')
  }
}