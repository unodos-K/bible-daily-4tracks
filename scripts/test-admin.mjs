import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const db = new PGlite();
const ADMIN = '77d3a5c6-f9bb-447e-b6cf-be5c663dce54';
const USER = '00000000-0000-4000-8000-000000000001';
const as = (id) => db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE profiles(id uuid PRIMARY KEY, nickname text, name text);
    CREATE TABLE reading_settings(user_id uuid PRIMARY KEY, start_date date NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE reading_records(user_id uuid, day_index integer, read_date date NOT NULL, completed_at timestamptz, one_verse jsonb, PRIMARY KEY(user_id,day_index));
    CREATE TABLE friendships(user_id uuid, friend_id uuid, status text, created_at timestamptz DEFAULT now());
    CREATE TABLE one_verse_likes(id uuid PRIMARY KEY, liker_id uuid, author_id uuid, day_index integer, created_at timestamptz DEFAULT now());
    CREATE TABLE notifications(id uuid PRIMARY KEY, recipient_id uuid, actor_id uuid, type text, related_day_index integer, metadata jsonb DEFAULT '{}', event_key text, is_read boolean DEFAULT false, read_at timestamptz, created_at timestamptz DEFAULT now());
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260919130000_admin_readonly_inspection.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO auth.users(id) VALUES ($1),($2)', [ADMIN, USER]);
  await db.query('INSERT INTO profiles(id,nickname,name) VALUES ($1,$2,$3),($4,$5,$6)', [ADMIN,'관리자','Admin',USER,'순례자','User']);
  await db.query("INSERT INTO reading_settings(user_id,start_date) VALUES ($1,'2026-01-01')", [USER]);
  await db.query("INSERT INTO reading_records VALUES ($1,1,'2026-09-19','2026-09-19T01:00:00Z',$2)", [USER, { book: '창세기', chapter: 1, verse: 1, isMemorized: true, memorizedAt: '2026-09-19T02:00:00Z', memo: 'private text' }]);
  await db.query("INSERT INTO notifications(id,recipient_id,actor_id,type,related_day_index,event_key) VALUES (gen_random_uuid(),$1,$2,'one_verse_liked',1,'like:test')", [USER, ADMIN]);
  await as(ADMIN); await db.exec('SET ROLE authenticated');
  const summary = (await db.query('SELECT public.admin_summary() value')).rows[0].value;
  assert.equal(summary.totalUsers, 2);
  const detail = (await db.query('SELECT public.admin_user_detail($1) value', [USER])).rows[0].value;
  assert.equal(detail.records[0].hasFootprint, true);
  assert.equal('memo' in detail.records[0], false, 'private memo must not be returned');
  const notifications = (await db.query("SELECT public.admin_search_notifications($1) value", [USER])).rows[0].value;
  assert.equal(notifications.total, 1);
  await as(USER);
  await assert.rejects(db.query('SELECT public.admin_summary()'), /administrator access required/);
  await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(db.query('SELECT public.admin_summary()'), /administrator access required/);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT public.admin_summary()'), /permission denied/);
  console.log('PASS: admin authorization, summary, sanitized detail, notification search');
} finally {
  await db.close();
}
