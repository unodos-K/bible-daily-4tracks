-- 1. invites 테이블 신설 (외부 추천/초대용)
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_invites_inviter_id ON public.invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON public.invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_invitee_id ON public.invites(invitee_id);

-- 2. friendships 테이블 수정 (내부 소셜 연결용)
-- 먼저 status 컬럼 추가 (기존 테이블에 없을 경우)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='friendships' AND column_name='status') THEN
        ALTER TABLE public.friendships ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 기존 friendship 상태는 보존한다. 기존 pending 요청을 자동 승인하거나
-- NULL 상태를 accepted로 추정 변환하지 않는다. 상태 정합성은 별도 점검 후
-- 제품 정책에 맞는 명시적 작업으로 처리해야 한다.

-- 3. RLS (Row Level Security) 설정
-- invites RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own invites" ON public.invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can view their own invites" ON public.invites FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "System can view all invites for processing" ON public.invites FOR SELECT USING (true); -- 가입 시 코드 조회용

-- friendships RLS 추가 보완 (기존에 없을 경우)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view friendships involving them" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can insert friendships where they are user_id" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friendships where they are friend_id" ON public.friendships FOR UPDATE USING (auth.uid() = friend_id);
CREATE POLICY "Users can delete friendships involving them" ON public.friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
