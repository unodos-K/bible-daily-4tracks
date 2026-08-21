import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithKakao() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      scopes: 'profile_nickname profile_image',
      redirectTo: `${origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
