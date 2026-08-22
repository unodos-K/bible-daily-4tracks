import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../src/data/bibleTexts.json');
const outputPath = path.join(__dirname, '../src/data/chunked_text.json');

function chunkVerse(text) {
    if (!text) return text;
    let processed = text;

    // 1. 구두점 분할: 쉼표(,), 마침표(.), 물음표(?), 느낌표(!) 뒤에 공백이 오는 경우 / 삽입.
    processed = processed.replace(/([,\.\?!])\s+/g, '$1 / ');

    // 2. 연결어미 분할: 어절 끝이 -고, -며, -서, -니 로 끝나는 경우 뒤에 / 삽입.
    processed = processed.replace(/([가-힣a-zA-Z0-9])(고|며|서|니)\s+/g, '$1$2 / ');

    // 3. 주요 조사 분할: 2글자 이상 단어 끝의 이, 은, 는, 가, 을, 를, 에, 에게, 에서, 의, 와, 과
    processed = processed.replace(/([가-힣a-zA-Z0-9]+)(이)\s+/g, '$1$2 / ');
    processed = processed.replace(/([가-힣a-zA-Z0-9]+)(은|는|가|을|를|에|에게|에서)\s+/g, '$1$2 / ');
    
    // 추가: 관형격 조사(의), 접속 조사(와, 과) 분할 (단, 이와, 그와, 저와 등은 예외 처리)
    processed = processed.replace(/([가-힣a-zA-Z0-9]+)(의|와|과)\s+/g, (match, p1, p2) => {
        // '이와', '그와', '저와' 같은 지시대명사 결합 관용구는 분할하지 않음
        if ((p2 === '와' || p2 === '과') && (p1 === '이' || p1 === '그' || p1 === '저')) {
            return match;
        }
        return `${p1}${p2} / `;
    });

    // 4. 인용 도입 서술어 분할
    processed = processed.replace(/(말씀하시기를|이르시되|대답하여 이르되)\s+/g, '$1 / ');

    // 5. 후처리 및 정제 (Clean-up)
    // 중복된 슬래시 통합
    processed = processed.replace(/(\/\s*)+/g, '/ ');
    // 슬래시 앞뒤 공백 규격 통일
    processed = processed.replace(/\s*\/\s*/g, ' / ');
    // 문장 맨 앞과 맨 끝 슬래시 제거
    processed = processed.replace(/^\s*\/\s*/, '');
    processed = processed.replace(/\s*\/\s*$/, '');
    
    return processed;
}

function main() {
    try {
        console.log("Loading Bible text data...");
        const bibleData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        const existingChunkedData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const resultData = {};

        let totalChapters = 0;
        let totalVerses = 0;

        for (const book in existingChunkedData) {
            if (book !== '요나') {
                resultData[book] = existingChunkedData[book];
            }
            if (book === '오바댜') {
                console.log("Processing '요나'...");
                resultData['요나'] = {};
                for (const chapter in bibleData['요나']) {
                    totalChapters++;
                    resultData['요나'][chapter] = {};
                    for (const verse in bibleData['요나'][chapter]) {
                        totalVerses++;
                        const text = bibleData['요나'][chapter][verse];
                        resultData['요나'][chapter][verse] = chunkVerse(text);
                    }
                }
            }
        }

        console.log(`Processed ${totalChapters} chapters, ${totalVerses} verses for Jonah.`);

        console.log("\n--- 요나 1장 1절~5절 예시 ---");
        for (let i = 1; i <= 5; i++) {
            if (resultData['요나'] && resultData['요나']['1'] && resultData['요나']['1'][String(i)]) {
                console.log(`${i}절: ${resultData['요나']['1'][String(i)]}`);
            }
        }
        console.log("--------------------------------\n");

        console.log("Writing final results to file...");
        fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2), 'utf8');
        console.log(`Chunking complete! Results saved to ${outputPath}`);

    } catch (error) {
        console.error("An error occurred during execution:", error);
    }
}

main();
