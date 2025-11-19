import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Sync with backend
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            firstName: data.user.user_metadata.full_name?.split(' ')[0] || '',
            lastName: data.user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
            googleId: data.user.id,
            avatar: data.user.user_metadata.avatar_url,
          }),
        })

        const result = await response.json()
        
        if (result.success) {
          // Store token
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
        }
      } catch (err) {
        console.error('Google sync error:', err)
      }
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}
