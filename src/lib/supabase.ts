import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

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
