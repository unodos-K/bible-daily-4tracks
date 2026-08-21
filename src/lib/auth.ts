import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    return {
      id: session.user.id,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '사용자',
      email: session.user.email || '',
      avatar_url: session.user.user_metadata?.avatar_url,
    };
  }
  return null;
}
