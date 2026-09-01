-- Invite links are opaque UUIDs (invites.id). They are created and accepted only
-- through the two authenticated RPCs below; clients never need to select invite rows.
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can view all invites for processing" ON public.invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON public.invites;
DROP POLICY IF EXISTS "Users can insert their own invites" ON public.invites;

-- This supports a user's own invite history without exposing invite codes or rows
-- belonging to other users. No client-side INSERT/UPDATE policy is granted.
CREATE POLICY "Users can view their own invites"
  ON public.invites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE OR REPLACE FUNCTION public.create_invite()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite_id UUID := gen_random_uuid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.invites (id, inviter_id, invite_code, expires_at)
  VALUES (v_invite_id, v_user_id, v_invite_id::TEXT, now() + INTERVAL '7 days');

  RETURN v_invite_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite(p_invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite public.invites%ROWTYPE;
  v_lock_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invite
  FROM public.invites
  WHERE id = p_invite_id
    AND invitee_id IS NULL
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND OR v_invite.inviter_id = v_user_id THEN
    RAISE EXCEPTION 'invite cannot be accepted' USING ERRCODE = '22023';
  END IF;

  -- Serializes acceptance for the same user pair until a historical unique
  -- constraint can be added after the preflight duplicate check.
  v_lock_key := LEAST(v_invite.inviter_id::TEXT, v_user_id::TEXT)
    || ':' || GREATEST(v_invite.inviter_id::TEXT, v_user_id::TEXT);
  PERFORM pg_advisory_xact_lock(hashtext(v_lock_key));

  UPDATE public.friendships
  SET status = 'accepted'
  WHERE user_id = v_invite.inviter_id
    AND friend_id = v_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.friendships (user_id, friend_id, status)
    VALUES (v_invite.inviter_id, v_user_id, 'accepted');
  END IF;

  UPDATE public.friendships
  SET status = 'accepted'
  WHERE user_id = v_user_id
    AND friend_id = v_invite.inviter_id;
  IF NOT FOUND THEN
    INSERT INTO public.friendships (user_id, friend_id, status)
    VALUES (v_user_id, v_invite.inviter_id, 'accepted');
  END IF;

  UPDATE public.invites
  SET invitee_id = v_user_id,
      accepted_at = now()
  WHERE id = v_invite.id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;
