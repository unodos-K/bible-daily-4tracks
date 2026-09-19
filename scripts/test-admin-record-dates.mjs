import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync('src/lib/admin-record-dates.ts','utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { validDate, kstInput, kstToUtc } = exports;
for (const timezone of ['UTC','America/Los_Angeles','Asia/Seoul']) {
 process.env.TZ=timezone;
 assert.equal(kstInput('2026-09-19T15:00:00Z'),'2026-09-20T00:00:00');
 assert.equal(kstToUtc('2026-09-20','00:00'),'2026-09-19T15:00:00.000Z');
 assert.equal(kstToUtc('2026-09-20','23:59:59'),'2026-09-20T14:59:59.000Z');
 assert.equal(validDate('2024-02-29'),true);
 assert.equal(validDate('2026-02-29'),false);
 assert.equal(validDate('2026-04-31'),false);
 assert.throws(()=>kstToUtc('2026-01-01','24:00'));
 assert.throws(()=>kstToUtc('2026-01-01','12:60'));
}
console.log('PASS: explicit KST conversion, UTC boundary, invalid dates/times, independent of 3 browser/server timezones');
