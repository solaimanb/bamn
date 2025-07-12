'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './AuthProvider'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function Providers({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  )
} 