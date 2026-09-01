import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session?.user) {
      // Invite acceptance is an authenticated, server-only RPC. The opaque invite
      // UUID never requires a client-side SELECT of the invites table.
      const { cookies } = await import('next/headers')
      const cookieStore = cookies()
      const inviteId = cookieStore.get('pending_invite_code')?.value

      if (inviteId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteId)) {
          const { error: inviteError } = await supabase.rpc('accept_invite', { p_invite_id: inviteId })
          if (inviteError) console.warn('Invite acceptance was rejected')
        }

        const response = NextResponse.redirect(`${origin}${next}`)
        response.cookies.delete('pending_invite_code')
        return response
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=auth-failed`)
}
