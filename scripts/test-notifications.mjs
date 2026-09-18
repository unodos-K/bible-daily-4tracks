// Isolated PostgreSQL engine; never connects to production or creates real users.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';
const as = id => db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
const count = async (type, recipient) => Number((await db.query('SELECT count(*) n FROM notifications WHERE type=$1 AND recipient_id=$2', [type,recipient])).rows[0].n);
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE TABLE profiles(id uuid PRIMARY KEY, nickname text);
    CREATE TABLE friendships(user_id uuid REFERENCES profiles,friend_id uuid REFERENCES profiles,status text,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,friend_id));
    CREATE TABLE reading_records(user_id uuid REFERENCES profiles,day_index integer,read_date date NOT NULL,completed_at timestamptz,one_verse jsonb,PRIMARY KEY(user_id,day_index));
    CREATE TABLE one_verse_likes(id uuid DEFAULT gen_random_uuid(),liker_id uuid REFERENCES profiles,author_id uuid REFERENCES profiles,day_index integer,UNIQUE(liker_id,author_id,day_index));
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260918090000_notifications.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260919090000_refine_notifications.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260919110000_atomic_one_verse_completion.sql', import.meta.url), 'utf8'));
  for(const id of [A,B,C]) await db.query('INSERT INTO profiles VALUES ($1,$2)',[id,id===A?'A':id===B?'B':'C']);
  await as(A);
  await db.query("INSERT INTO friendships(user_id,friend_id,status) VALUES ($1,$2,'pending')",[A,B]);
  assert.equal(await count('friend_request',B),1);
  await as(B);
  await db.query("UPDATE friendships SET status='accepted' WHERE user_id=$1 AND friend_id=$2",[A,B]);
  await db.query("INSERT INTO friendships(user_id,friend_id,status) VALUES ($1,$2,'accepted')",[B,A]);
  assert.equal(await count('friend_request_accepted',A),1);
  assert.equal(await count('friend_request_accepted',B),0,'reciprocal row must not duplicate');
  const verse = {book:'창세기',chapter:1,verse:1};
  await as(B);
  await db.query('INSERT INTO reading_records VALUES ($1,1,current_date,now(),$2)',[B,verse]);
  assert.equal(await count('one_verse_completed',A),1);
  await as(A);
  for(let i=0;i<3;i++) {
    await db.query('INSERT INTO one_verse_likes(liker_id,author_id,day_index) VALUES ($1,$2,1)',[A,B]);
    await db.query('DELETE FROM one_verse_likes WHERE liker_id=$1',[A]);
  }
  assert.equal(await count('one_verse_liked',B),1,'unlike/re-like deduplication');
  const likedDate = (await db.query('SELECT read_date::text read_date FROM reading_records WHERE user_id=$1 AND day_index=1',[B])).rows[0].read_date;
  assert.equal((await db.query("SELECT metadata->>'read_date' read_date FROM notifications WHERE type='one_verse_liked' AND recipient_id=$1",[B])).rows[0].read_date, likedDate, 'amen stores calendar date');
  await as(C);
  await db.query('INSERT INTO one_verse_likes(liker_id,author_id,day_index) VALUES ($1,$2,1)',[C,B]);
  assert.equal(await count('one_verse_liked',B),1,'nonfriend cannot notify');
  await as(B);
  for(const methods of [['voice'],['voice','writing'],['voice','writing']]) {
    await db.query('UPDATE reading_records SET one_verse=$1 WHERE user_id=$2 AND day_index=1',[{...verse,isMemorized:true,memorizedMethods:methods},B]);
  }
  assert.equal(await count('memorization_completed',A),2,'voice/writing distinct and idempotent');
  await as(A);
  await db.query("INSERT INTO reading_records(user_id,day_index,read_date,completed_at,one_verse) VALUES ($1,31,'2026-08-31',NULL,$2)", [A, verse]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT public.save_final_one_verse(31,$1)', [{...verse, verse: 2}])).rows[0].save_final_one_verse, true, 'final One Verse atomically completes a draft');
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT completed_at IS NOT NULL completed, read_date::text read_date, one_verse->>\'verse\' verse FROM reading_records WHERE user_id=$1 AND day_index=31',[A])).rows[0].completed, true);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT public.save_final_one_verse(31,$1)', [{...verse, verse: 3}])).rows[0].save_final_one_verse, false, 'completed timestamp cannot be replaced');
  await db.exec('RESET ROLE');
  await db.query('INSERT INTO one_verse_likes(liker_id,author_id,day_index) VALUES ($1,$1,31)', [A]);
  assert.equal(await count('one_verse_liked', A), 0, 'self amen does not notify self');
  await db.exec('RESET ROLE');
  await db.query("INSERT INTO reading_records(user_id,day_index,read_date,completed_at,one_verse) VALUES ($1,32,'2026-09-01',NULL,$2)", [A, {...verse, memo: 'keep me', isMemorized: true, memorizedMethods: ['voice']}]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT public.save_final_one_verse(32,$1)', [verse])).rows[0].save_final_one_verse, true, 'final save completes legacy draft');
  await db.exec('RESET ROLE');
  const preserved = (await db.query("SELECT one_verse->>'memo' memo, one_verse->>'isMemorized' memorized FROM reading_records WHERE user_id=$1 AND day_index=32", [A])).rows[0];
  assert.equal(preserved.memo, 'keep me', 'same-verse memo is preserved');
  assert.equal(preserved.memorized, 'true', 'same-verse memorization is preserved');
  await db.exec('RESET ROLE');
  await as(A);
  for(let day=1;day<=30;day++) {
    await db.query("INSERT INTO reading_records VALUES ($1,$2,$3::date,$3::date + interval '3 hour',$4)",[A,day,`2026-08-${String(day).padStart(2,'0')}`,verse]);
  }
  assert.equal(await count('reading_streak_achieved',B),0,'streak notifications are paused');
  await db.query('UPDATE reading_records SET completed_at=NULL WHERE user_id=$1 AND day_index=7',[A]);
  await db.query("UPDATE reading_records SET completed_at='2026-08-07 03:00:00+00' WHERE user_id=$1 AND day_index=7",[A]);
  assert.equal(await count('reading_streak_achieved',B),0,'paused streak notifications remain disabled');
  assert.equal((await db.query('SELECT count(*) n FROM notifications WHERE actor_id=recipient_id')).rows[0].n,0);
  // Validate read authorization as the actual restricted role, not the owner.
  await as(A); await db.exec('SET ROLE authenticated');
  assert.ok((await db.query('SELECT * FROM notifications')).rows.every(row=>row.recipient_id===A));
  await assert.rejects(db.query("INSERT INTO notifications(recipient_id,type,event_key) VALUES ($1,'friend_request','forged')",[B]),/permission denied/);
  await assert.rejects(db.query("SELECT emit_activity_notification($1,$2,'friend_request','forged',NULL,'{}')",[B,A]),/permission denied/);
  await assert.rejects(db.query("UPDATE notifications SET actor_id=$1",[C]),/permission denied/);
  await db.query('SELECT mark_notifications_read()');
  assert.ok((await db.query('SELECT * FROM notifications')).rows.every(row=>row.is_read && row.read_at));
  await db.exec('RESET ROLE');
  const bRow=(await db.query('SELECT id FROM notifications WHERE recipient_id=$1 LIMIT 1',[B])).rows[0];
  await db.exec('SET ROLE authenticated');
  await db.query('SELECT mark_notifications_read($1)',[bRow.id]);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT is_read FROM notifications WHERE id=$1',[bRow.id])).rows[0].is_read,false,'cannot mark another recipient notification');
  await as(B); await db.exec('SET ROLE authenticated');
  await db.query('SELECT mark_notifications_read($1)',[bRow.id]);
  assert.equal((await db.query('SELECT is_read FROM notifications WHERE id=$1',[bRow.id])).rows[0].is_read,true);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM notifications'), /permission denied/);
  await db.exec('RESET ROLE');
  console.log('PASS: request/accept/likes/streak/voice/writing/idempotency/self/nonfriend/RLS/RPC/read timestamps/account isolation');
} finally { await db.close(); }
