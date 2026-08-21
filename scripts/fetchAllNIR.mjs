import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchChapter } from 'bible-ko-mcp/build/bible.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, '../src/data/bibleTexts.json');

const BIBLE_BOOKS = [
  { code: 'gen', korean: '창세기', chapters: 50 },
  { code: 'exo', korean: '출애굽기', chapters: 40 },
  { code: 'lev', korean: '레위기', chapters: 27 },
  { code: 'num', korean: '민수기', chapters: 36 },
  { code: 'deu', korean: '신명기', chapters: 34 },
  { code: 'jos', korean: '여호수아', chapters: 24 },
  { code: 'jdg', korean: '사사기', chapters: 21 },
  { code: 'rut', korean: '룻기', chapters: 4 },
  { code: '1sa', korean: '사무엘상', chapters: 31 },
  { code: '2sa', korean: '사무엘하', chapters: 24 },
  { code: '1ki', korean: '열왕기상', chapters: 22 },
  { code: '2ki', korean: '열왕기하', chapters: 25 },
  { code: '1ch', korean: '역대상', chapters: 29 },
  { code: '2ch', korean: '역대하', chapters: 36 },
  { code: 'ezr', korean: '에스라', chapters: 10 },
  { code: 'neh', korean: '느헤미야', chapters: 13 },
  { code: 'est', korean: '에스더', chapters: 10 },
  { code: 'job', korean: '욥기', chapters: 42 },
  { code: 'psa', korean: '시편', chapters: 150 },
  { code: 'pro', korean: '잠언', chapters: 31 },
  { code: 'ecc', korean: '전도서', chapters: 12 },
  { code: 'sng', korean: '아가', chapters: 8 },
  { code: 'isa', korean: '이사야', chapters: 66 },
  { code: 'jer', korean: '예레미야', chapters: 52 },
  { code: 'lam', korean: '예레미야애가', chapters: 5 },
  { code: 'ezk', korean: '에스겔', chapters: 48 },
  { code: 'dan', korean: '다니엘', chapters: 12 },
  { code: 'hos', korean: '호세아', chapters: 14 },
  { code: 'jol', korean: '요엘', chapters: 3 },
  { code: 'amo', korean: '아모스', chapters: 9 },
  { code: 'oba', korean: '오바댜', chapters: 1 },
  { code: 'jon', korean: '요나', chapters: 4 },
  { code: 'mic', korean: '미가', chapters: 7 },
  { code: 'nam', korean: '나훔', chapters: 3 },
  { code: 'hab', korean: '하박국', chapters: 3 },
  { code: 'zep', korean: '스바냐', chapters: 3 },
  { code: 'hag', korean: '학개', chapters: 2 },
  { code: 'zec', korean: '스가랴', chapters: 14 },
  { code: 'mal', korean: '말라기', chapters: 4 },
  { code: 'mat', korean: '마태복음', chapters: 28 },
  { code: 'mrk', korean: '마가복음', chapters: 16 },
  { code: 'luk', korean: '누가복음', chapters: 24 },
  { code: 'jhn', korean: '요한복음', chapters: 21 },
  { code: 'act', korean: '사도행전', chapters: 28 },
  { code: 'rom', korean: '로마서', chapters: 16 },
  { code: '1co', korean: '고린도전서', chapters: 16 },
  { code: '2co', korean: '고린도후서', chapters: 13 },
  { code: 'gal', korean: '갈라디아서', chapters: 6 },
  { code: 'eph', korean: '에베소서', chapters: 6 },
  { code: 'php', korean: '빌립보서', chapters: 4 },
  { code: 'col', korean: '골로새서', chapters: 4 },
  { code: '1th', korean: '데살로니가전서', chapters: 5 },
  { code: '2th', korean: '데살로니가후서', chapters: 3 },
  { code: '1ti', korean: '디모데전서', chapters: 6 },
  { code: '2ti', korean: '디모데후서', chapters: 4 },
  { code: 'tit', korean: '디도서', chapters: 3 },
  { code: 'phm', 빌레몬서: 1 },
  { code: 'heb', korean: '히브리서', chapters: 13 },
  { code: 'jas', korean: '야고보서', chapters: 5 },
  { code: '1pe', korean: '베드로전서', chapters: 5 },
  { code: '2pe', korean: '베드로후서', chapters: 3 },
  { code: '1jn', korean: '요한일서', chapters: 5 },
  { code: '2jn', korean: '요한이서', chapters: 1 },
  { code: '3jn', korean: '요한삼서', chapters: 1 },
  { code: 'jud', korean: '유다서', chapters: 1 },
  { code: 'rev', korean: '요한계시록', chapters: 22 },
];

// '빌레몬서' 오타 교정
const BIBLE_BOOKS_FIXED = BIBLE_BOOKS.map(b => b.korean ? b : { code: 'phm', korean: '빌레몬서', chapters: 1 });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`Starting to fetch NIR Bible using bible-ko-mcp...`);
  const result = {};
  
  let totalBooks = 0;
  let totalChapters = 0;

  for (const book of BIBLE_BOOKS_FIXED) {
    result[book.korean] = {};
    console.log(`Fetching ${book.korean} (Total: ${book.chapters} chapters)...`);
    
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      try {
        const chapterData = await fetchChapter(book.code, chapter, 'NIR');
        
        const versesMap = {};
        for (const v of chapterData.verses) {
          versesMap[v.number.toString()] = v.text;
        }
        
        result[book.korean][chapter.toString()] = versesMap;
        totalChapters++;
        
        // 50ms delay as requested
        await sleep(50);
      } catch (err) {
        console.error(`Error fetching ${book.korean} ${chapter}:`, err);
      }
    }
    totalBooks++;
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nSuccessfully fetched ${totalBooks} books and ${totalChapters} chapters.`);
  console.log(`Data saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
