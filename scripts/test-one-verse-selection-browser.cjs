// Component/hook integration with fake storage, not a production session test.
// Optional tools: npm install --prefix <temporary directory> playwright esbuild
// ONE_VERSE_BROWSER_TOOLS=<temporary directory> node scripts/test-one-verse-selection-browser.cjs
const { createRequire } = require('node:module');
const path = require('node:path');
const requireTools = process.env.ONE_VERSE_BROWSER_TOOLS ? createRequire(path.join(process.env.ONE_VERSE_BROWSER_TOOLS, 'package.json')) : require;
const { chromium } = requireTools('playwright');
const esbuild = requireTools('esbuild');
const http = require('node:http');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const storage = `
export async function fetchReadingSettings(){return {startDate:'2020-01-01',hasStarted:true,currentDay:1}}
export async function fetchReadRecords(){return window.record?.completedAt?{1:window.record}:{}}
export async function fetchOneVerseRecord(){return window.record?.oneVerse?window.record:null}
export async function fetchOneVerseCandidates(){return [window.verseA]}
export async function saveReadingSettings(){} export async function saveOneVerseCandidate(){return true} export async function removeOneVerseCandidate(){return true}
export async function updateMemorizeRecord(){}
export async function saveOneVerseSelection(day,verse,expected){window.calls++;await new Promise(r=>setTimeout(r,80));if(window.failSave)return false;
window.record={dayIndex:day,readDate:window.record?.readDate??'2020-01-01',completedAt:window.record?.completedAt??(verse?'2020-01-01T00:00:00Z':null),oneVerse:verse};
window.dispatchEvent(new CustomEvent('records_updated'));return true;}
`;
(async () => {
  const build = await esbuild.build({ stdin: { resolveDir: root, loader: 'tsx', contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {useBibleReader} from './src/hooks/useBibleReader';
import Row from './src/components/read/BibleVerseRow';
import Modals from './src/components/read/VerseInteractionModals';
window.calls=0;window.failSave=false;
window.verseA={trackType:'구약',book:'창세기',chapter:1,verse:1,rawText:'처음 말씀',displayText:'처음 말씀',chunks:['처음 말씀'],reference:'창세기 1:1'};
function App(){const r=useBibleReader();return <main><p id="completion">{String(r.isCompletedDay)}</p>{[1,2].map(number=><Row key={number} trackType="구약" book="창세기" chapter={1} verse={{verse:number,rawText:'말씀 '+number,displayText:'말씀 '+number,chunks:['말씀 '+number]}} fontSize={18} dayIndex={r.dayIndex} userId="test" selectedVerse={r.selectedVerse} confirmedVerse={r.confirmedVerse} markedVerses={r.oneVerseCandidates} record={r.records[1]} verseLikes={null} isLikeBusy={false} onToggleLike={()=>{}} onVerseClick={r.handleVerseClick} onConfirmVerse={r.handleConfirmVerse} onToggleMark={r.handleToggleCandidate} onOpenMemory={()=>{}} onShare={()=>{}} onRequestReselect={r.handleRequestReselect} isCompletedDay={r.isCompletedDay}/>)}<Modals showReselectModal={r.showReselectModal} setShowReselectModal={r.setShowReselectModal} confirmedVerse={r.confirmedVerse} pendingVerse={r.pendingVerse} setPendingVerse={r.setPendingVerse} isSaving={r.isSelectionSaving} error={r.selectionError} handleConfirmReselect={r.handleConfirmReselect} handleSaveSelection={r.handleSaveSelection}/></main>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
` }, bundle: true, write: false, jsx: 'automatic', alias: { '@': root + '/src' }, define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'fixture', setup(b) {
    b.onResolve({ filter: /^@\/lib\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
    b.onResolve({ filter: /^@\/components\/AuthProvider$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    b.onResolve({ filter: /^@\/lib\/social$/ }, () => ({ path: 'social', namespace: 'fixture' }));
    b.onResolve({ filter: /^@\/components\/friends\/LikeButton$/ }, () => ({ path: 'likes', namespace: 'fixture' }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'storage' ? storage : args.path === 'auth' ? `export const useAuth=()=>({authUser:{id:'test',name:'test'},isAuthLoading:false})` : args.path === 'social' ? `export async function getVerseLikes(){return {count:0,isLikedByMe:false,likers:[]}} export async function toggleLike(){return true}` : args.path === 'likes' ? `export default function Likes(){return null}` : `export const useRouter=()=>({push(){}})`, loader: 'tsx', resolveDir: root }));
  } }] });
  const css = process.env.ONE_VERSE_TEST_CSS ? fs.readFileSync(process.env.ONE_VERSE_TEST_CSS, 'utf8') : '';
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? build.outputFiles[0].text : `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/app.js"></script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const width of [320,390,768,1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
      const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/?day=1`);
      await page.getByRole('button',{name:'창세기 1장 1절 선택',exact:true}).click();
      await page.getByRole('button',{name:'One Verse',exact:true}).click();
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.evaluate(()=>window.calls),0,'confirmation before any write');
      await page.getByRole('button',{name:'One Verse 지정',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'hidden'});
      await page.waitForFunction(()=>document.querySelector('#completion').textContent==='true');
      const completed=await page.evaluate(()=>window.record.completedAt);
      await page.getByRole('button',{name:'다시 선택하기',exact:true}).waitFor();
      await page.getByRole('button',{name:'창세기 1장 2절 선택',exact:true}).click();
      await page.getByRole('button',{name:'Mark',exact:true}).click();
      await page.getByRole('button',{name:'Mark 해제',exact:true}).waitFor();
      assert.equal(await page.locator('[data-one-verse-marked="true"]').count(),2,'completed Day allows marking');
      await page.getByRole('button',{name:'Mark 해제',exact:true}).click();
      await page.getByRole('button',{name:'Mark',exact:true}).waitFor();
      assert.equal(await page.locator('[data-one-verse-marked="true"]').count(),1,'completed Day allows unmarking');
      assert.equal(await page.evaluate(()=>window.record.completedAt),completed,'Mark changes preserve completion');
      assert.equal(await page.evaluate(()=>window.record.oneVerse.verse),1,'Mark changes preserve One Verse');
      assert.equal(await page.locator('#one-verse-target').count(),1,'Quick Navigation unique target');
      await page.getByRole('button',{name:'One Verse',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.record.oneVerse.verse),1);
      const bounds=await page.getByRole('dialog').boundingBox();
      assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=844,'dialog within viewport');
      await page.evaluate(()=>window.failSave=true);
      await page.getByRole('button',{name:'변경하기',exact:true}).click();
      await page.getByRole('alert').waitFor();
      assert.equal(await page.evaluate(()=>window.record.oneVerse.verse),1,'failure retains old verse');
      await page.evaluate(()=>window.failSave=false);
      await page.getByRole('button',{name:'변경하기',exact:true}).evaluate(button=>{button.click();button.click()});
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>window.record.oneVerse.verse),2);
      assert.equal(await page.evaluate(()=>window.record.completedAt),completed);
      await page.getByRole('button',{name:'다시 선택하기',exact:true}).click();
      await page.getByRole('dialog').getByRole('button',{name:'다시 선택하기',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>window.record.oneVerse),null);
      assert.equal(await page.evaluate(()=>window.record.completedAt),completed);
      assert.equal(await page.locator('[data-one-verse-marked="true"]').count(),1);
      await page.getByRole('button',{name:'창세기 1장 1절 선택',exact:true}).click();
      await page.getByRole('button',{name:'One Verse',exact:true}).click();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>window.calls),4,'double click is locked; escape does not persist');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: actual hook/components, confirm/save/failure/retry/change/reset/Marks/completion/Escape/unique target. Mock storage, Chrome.`);
      await page.close();
    }
  } finally { await browser?.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
