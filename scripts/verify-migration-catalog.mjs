// Read-only production catalog comparison against migrations executed in PGlite.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const final = process.argv.includes('--final');
const dir = '/private/tmp/oneverse-migration-audit';
mkdirSync(dir, { recursive: true });
const db = new PGlite();
const tables = "('invites','friendships','one_verse_likes','reading_records','one_verse_candidates','notifications')";
const query = `SELECT jsonb_build_object(
 'columns',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.relname AS tab,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS notnull,pg_get_expr(d.adbin,d.adrelid) AS def FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE c.relnamespace='public'::regnamespace AND c.relname IN ${tables} AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum) x),
 'constraints',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT conrelid::regclass::text AS tab,conname AS name,pg_get_constraintdef(oid) AS def,convalidated AS valid FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ${tables}) ORDER BY conname) x),
 'indexes',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT tablename AS tab,indexname AS name,indexdef AS def FROM pg_indexes WHERE schemaname='public' AND tablename IN ${tables} ORDER BY indexname) x),
 'functions',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,pg_get_function_arguments(p.oid) AS defaults,pg_get_function_result(p.oid) AS result,p.prosrc AS body,l.lanname AS lang,p.prosecdef AS security,p.proconfig AS config,has_function_privilege('anon',p.oid,'EXECUTE') AS anon,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated,EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) WHERE grantee=0 AND privilege_type='EXECUTE') AS public FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.pronamespace='public'::regnamespace AND (p.proname IN ('create_invite','accept_invite','mark_notifications_read','emit_activity_notification','notify_friendship_activity','notify_like_activity','notify_reading_activity','save_final_one_verse') OR p.proname LIKE 'admin_%') ORDER BY p.proname) x),
 'policies',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT tablename AS tab,policyname AS name,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ${tables} ORDER BY tablename,policyname) x),
 'rls',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT relname AS name,relrowsecurity AS enabled FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ${tables} ORDER BY relname) x),
 'triggers',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT tgname AS name,pg_get_triggerdef(oid) AS def,tgenabled AS enabled FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'notification_%' ORDER BY tgname) x),
 'grants',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT table_name AS tab,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('notifications','one_verse_candidates') AND grantee IN ('PUBLIC','anon','authenticated','service_role') ORDER BY table_name,grantee,privilege_type) x),
 'publication',EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications')
) AS catalog;`;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE profiles(id uuid PRIMARY KEY); CREATE TABLE friendships(user_id uuid NOT NULL,friend_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,friend_id));
CREATE TABLE reading_records(user_id uuid,day_index integer,read_date date,completed_at timestamptz,one_verse jsonb,PRIMARY KEY(user_id,day_index));
CREATE TABLE one_verse_likes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),liker_id uuid,author_id uuid,day_index integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(liker_id,author_id,day_index));`);
for(const f of readdirSync('supabase/migrations').sort().filter(f=>f.endsWith('.sql') && f>='20260823205000' && (final || f<'20260919090000'))) await db.exec(readFileSync(`supabase/migrations/${f}`,'utf8'));
const expected=(await db.query(query)).rows[0].catalog;
const raw=execFileSync('supabase',['db','query','--linked',query],{encoding:'utf8',maxBuffer:10*1024*1024});
const remote=JSON.parse(raw).rows[0].catalog;
writeFileSync(`${dir}/${final?'after':'before'}-catalog.json`,JSON.stringify(remote,null,2));
const diffs=[];
const norm=v=> typeof v==='string'?v.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim():v;
for(const category of ['columns','constraints','indexes','functions','policies','rls','triggers','grants']) {
 for(const e of expected[category]||[]) {
  // PG18 records NOT NULL in pg_constraint; PG17 exposes it via attnotnull.
  if(category==='constraints' && e.def.startsWith('NOT NULL ')) continue;
  // Existing base schema columns/constraints aren't introduced by these migrations.
  if(['columns','constraints','indexes'].includes(category) && ['friendships','one_verse_likes','reading_records'].includes(e.tab)) {
   if(category==='columns' && !(['status','liker_id','author_id'].includes(e.name))) continue;
   if(category==='constraints' && e.name!=='friendships_no_self_reference') continue;
   if(category==='indexes' && !e.name.startsWith('idx_') && e.name!=='reading_records_notification_streak') continue;
  }
  if(category==='rls' && !['invites','friendships','one_verse_candidates','notifications'].includes(e.name)) continue;
  const r=(remote[category]||[]).find(r=> category==='grants'?r.tab===e.tab&&r.grantee===e.grantee&&r.privilege_type===e.privilege_type:r.name===e.name&&(!e.tab||r.tab===e.tab));
  if(!r) {diffs.push({category,expected:e,actual:null});continue;}
  for(const k of Object.keys(e)) if(JSON.stringify(norm(e[k]))!==JSON.stringify(norm(r[k]))) diffs.push({category,name:e.name||e.tab,field:k,expected:e[k],actual:r[k]});
 }
}
if(!remote.publication) diffs.push({category:'publication',actual:false});
// Report extra policies/grants for explicit review instead of assuming they are safe.
const extraPolicies=(remote.policies||[]).filter(r=>!(expected.policies||[]).some(e=>e.name===r.name&&e.tab===r.tab));
const extraGrants=(remote.grants||[]).filter(r=>!(expected.grants||[]).some(e=>e.tab===r.tab&&e.grantee===r.grantee&&e.privilege_type===r.privilege_type));
const report={phase:final?'final':'first-five',diffs,extraPolicies,extraGrants,comparedFunctions:expected.functions.map(f=>f.name),publication:remote.publication};
writeFileSync(`${dir}/${final?'after':'before'}-comparison.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await db.close();
