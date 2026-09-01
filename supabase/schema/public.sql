


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."accept_invite"("p_invite_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."accept_invite"("p_invite_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invite"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."create_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '친구'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'nickname'
  )
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    nickname = EXCLUDED.nickname;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invite_code" "text" NOT NULL,
    "invitee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "accepted_at" timestamp with time zone
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."one_verse_likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "liker_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "day_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."one_verse_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "avatar_url" "text",
    "nickname" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_records" (
    "user_id" "uuid" NOT NULL,
    "day_index" integer NOT NULL,
    "read_date" "date" NOT NULL,
    "completed_at" timestamp with time zone,
    "one_verse" "jsonb"
);


ALTER TABLE "public"."reading_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reading_settings" (
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."reading_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("user_id", "friend_id");


ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_no_self_reference" CHECK (("user_id" <> "friend_id"));



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "one_verse_likes_liker_id_author_id_day_index_key" UNIQUE ("liker_id", "author_id", "day_index");



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "one_verse_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reading_records"
    ADD CONSTRAINT "reading_records_pkey" PRIMARY KEY ("user_id", "day_index");



ALTER TABLE ONLY "public"."reading_settings"
    ADD CONSTRAINT "reading_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_invites_invite_code" ON "public"."invites" USING "btree" ("invite_code");



CREATE INDEX "idx_invites_invitee_id" ON "public"."invites" USING "btree" ("invitee_id");


CREATE INDEX "idx_friendships_friend_status" ON "public"."friendships" USING "btree" ("friend_id", "status");


CREATE INDEX "idx_friendships_user_status" ON "public"."friendships" USING "btree" ("user_id", "status");


CREATE INDEX "idx_one_verse_likes_author_day" ON "public"."one_verse_likes" USING "btree" ("author_id", "day_index");


CREATE INDEX "idx_reading_records_user_completed_one_verse" ON "public"."reading_records" USING "btree" ("user_id", "completed_at" DESC) WHERE (("one_verse" IS NOT NULL) AND ("completed_at" IS NOT NULL));



CREATE INDEX "idx_invites_inviter_id" ON "public"."invites" USING "btree" ("inviter_id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "fk_friendships_friend" FOREIGN KEY ("friend_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "fk_friendships_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "fk_one_verse_likes_author" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "fk_one_verse_likes_liker" FOREIGN KEY ("liker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_records"
    ADD CONSTRAINT "fk_reading_records_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_settings"
    ADD CONSTRAINT "fk_reading_settings_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "one_verse_likes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."one_verse_likes"
    ADD CONSTRAINT "one_verse_likes_liker_id_fkey" FOREIGN KEY ("liker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_records"
    ADD CONSTRAINT "reading_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reading_settings"
    ADD CONSTRAINT "reading_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can select friendships" ON "public"."friendships" FOR SELECT USING (true);



CREATE POLICY "Anyone can select likes" ON "public"."one_verse_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view read records" ON "public"."reading_records" FOR SELECT USING (true);



CREATE POLICY "Users can delete friendships involving them" ON "public"."friendships" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can delete own reading records" ON "public"."reading_records" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reading settings" ON "public"."reading_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own friendships" ON "public"."friendships" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."one_verse_likes" FOR DELETE USING (("auth"."uid"() = "liker_id"));



CREATE POLICY "Users can insert friendships where they are user_id" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reading records" ON "public"."reading_records" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reading settings" ON "public"."reading_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own friendships" ON "public"."friendships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."one_verse_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "liker_id"));



CREATE POLICY "Users can update friendships where they are friend_id" ON "public"."friendships" FOR UPDATE USING (("auth"."uid"() = "friend_id"));



CREATE POLICY "Users can update own reading records" ON "public"."reading_records" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reading settings" ON "public"."reading_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view friendships involving them" ON "public"."friendships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "friend_id")));



CREATE POLICY "Users can view own reading records" ON "public"."reading_records" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reading settings" ON "public"."reading_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own invites" ON "public"."invites" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id")));



ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."one_verse_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reading_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reading_settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_invite"("p_invite_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite"("p_invite_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_invite"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."one_verse_likes" TO "anon";
GRANT ALL ON TABLE "public"."one_verse_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."one_verse_likes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reading_records" TO "anon";
GRANT ALL ON TABLE "public"."reading_records" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_records" TO "service_role";



GRANT ALL ON TABLE "public"."reading_settings" TO "anon";
GRANT ALL ON TABLE "public"."reading_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."reading_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






