// Real PostgreSQL role/claim simulation, not an actual login/session test.
// Read-only transactions; never inserts users or application records.
import { execFileSync } from 'node:child_process';
const calls=['public.admin_summary()','public.admin_search_users()',"public.admin_user_detail('77d3a5c6-f9bb-447e-b6cf-be5c663dce54'::uuid)",'public.admin_search_notifications()','public.admin_data_checks()'];
for(const [label,role,uid] of [['anon','anon',''],['null-uid','authenticated',''],['non-admin','authenticated','00000000-0000-4000-8000-000000000001']]) {
 const checks=calls.map(call=>`BEGIN PERFORM ${call}; RAISE EXCEPTION 'UNEXPECTED ACCESS: ${label}'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;`).join('\n');
 const claims=JSON.stringify(uid?{sub:uid}:{});
 const sql=`BEGIN READ ONLY; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${uid}',true); SELECT set_config('request.jwt.claims','${claims}',true); DO $check$ BEGIN ${checks} END $check$; SELECT '${label}: all 5 RPCs denied' AS result; ROLLBACK;`;
 const result=execFileSync('supabase',['db','query','--linked',sql],{encoding:'utf8'});
 if(result.includes('"error"')) throw new Error(result);
 console.log(`${label}: all 5 RPCs denied (SQLSTATE 42501)`);
}
const admin='77d3a5c6-f9bb-447e-b6cf-be5c663dce54';
const sql=`BEGIN READ ONLY; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${admin}',true); SELECT set_config('request.jwt.claims','{"sub":"${admin}"}',true); DO $check$ BEGIN ${calls.map(call=>`PERFORM ${call};`).join('\n')} END $check$; SELECT 'admin: all 5 RPCs executed' AS result; ROLLBACK;`;
const result=execFileSync('supabase',['db','query','--linked',sql],{encoding:'utf8'});
if(result.includes('"error"')) throw new Error(result);
console.log('admin: all 5 RPCs executed (no record contents printed)');
