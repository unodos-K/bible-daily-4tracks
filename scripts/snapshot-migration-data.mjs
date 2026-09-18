// Aggregate-only read-only baseline; no personal content leaves PostgreSQL.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const phase=process.argv[2]||'before';
const tables=['profiles','reading_settings','reading_records','friendships','one_verse_likes','one_verse_candidates','invites','notifications'];
const sql=tables.map(t=>`SELECT '${t}' AS name,count(*) AS count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS fingerprint FROM public.${t} t`).join(' UNION ALL ');
const rows=JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{encoding:'utf8'})).rows;
writeFileSync(`/private/tmp/oneverse-migration-audit/${phase}-data.json`,JSON.stringify(rows,null,2));
if(phase==='after') {
 const before=JSON.parse(readFileSync('/private/tmp/oneverse-migration-audit/before-data.json','utf8'));
 console.log(JSON.stringify(rows.map(r=>({table:r.name,count:r.count,unchanged:before.some(b=>b.name===r.name&&b.fingerprint===r.fingerprint&&b.count===r.count)})),null,2));
} else console.log(JSON.stringify(rows.map(r=>({table:r.name,count:r.count})),null,2));
