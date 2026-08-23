'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during auth callback:', error.message);
        router.push('/');
        return;
      }

      if (session) {
        // 성공적으로 세션 획득 시 메인 페이지로 이동 (또는 이전 페이지)
        router.push('/home');
      } else {
        // 세션이 없으면 (예: 로그인 취소 등) 랜딩으로 이동
        router.push('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="text-stone-500 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p>카카오 로그인 처리 중입니다...</p>
      </div>
    </div>
  );
}
