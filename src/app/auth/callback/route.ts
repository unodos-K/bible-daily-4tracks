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
      // Check for pending invite code
      const { cookies } = await import('next/headers')
      const cookieStore = cookies()
      const inviteCode = cookieStore.get('pending_invite_code')?.value

      if (inviteCode) {
        // 초대 기록 확인 (이미 등록되었는지 방어 코드)
        const { data: existing } = await supabase
          .from('invites')
          .select('id')
          .eq('invitee_id', data.session.user.id)
          .single();
          
        if (!existing) {
          await supabase.from('invites').insert({
            inviter_id: inviteCode,
            invite_code: inviteCode,
            invitee_id: data.session.user.id
          });
        }
        
        // 쿠키 삭제를 위해 응답 객체 생성
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
