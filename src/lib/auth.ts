import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  nickname?: string;
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
    email: user.email || '',
    avatar_url: user.user_metadata?.avatar_url,
    nickname: user.user_metadata?.nickname,
  };
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return toAuthUser(session?.user);
}

export async function updateUserNickname(nickname: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({
    data: { nickname }
  });
  
  if (error) {
    console.error("updateUserNickname error:", error);
    return false;
  }
  return true;
}
