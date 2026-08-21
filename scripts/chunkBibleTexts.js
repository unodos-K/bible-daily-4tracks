const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/bibleTexts.json');
const outputPath = path.join(__dirname, '../src/data/chunked_text.json');

const bibleData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Rules configuration
// 1. connective endings and punctuation
const splitRegex1 = /([고며서자나니]|므로|려고)[,.]?$/;
const punctRegex = /[.,!?:;]$/;
const quoteEndRegex = /["']$/;
const quoteStartRegex = /^["']/;
// 3. subject / object ending
const subjObjRegex = /([은는이가을를])$/;

function chunkText(text) {
    const tokens = [];
    // 1. Any non-whitespace character sequence (the word)
    // 2. The whitespace sequence following it
    const tokenRegex = /(\S+)(\s*)/g;
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
        tokens.push({ word: match[1], space: match[2] });
    }
    
    if (tokens.length === 0) return text;
    
    const preferredSplits = new Array(tokens.length).fill(false);
    
    for (let i = 0; i < tokens.length - 1; i++) {
        const word = tokens[i].word;
        const nextWord = tokens[i+1].word;
        
        let shouldSplit = false;
        
        if (splitRegex1.test(word) || punctRegex.test(word)) {
            shouldSplit = true;
        }
        
        if (quoteEndRegex.test(word) || quoteStartRegex.test(nextWord)) {
            shouldSplit = true;
        }
        
        if (subjObjRegex.test(word)) {
            shouldSplit = true;
        }
        
        preferredSplits[i] = shouldSplit;
    }
    
    const chunks = [];
    let currentStartIndex = 0;
    
    while (currentStartIndex < tokens.length) {
        let remaining = tokens.length - currentStartIndex;
        
        if (remaining <= 5) {
            let splitIndex = -1;
            for (let i = currentStartIndex + 1; i < currentStartIndex + remaining - 1; i++) {
                if (preferredSplits[i] && (i - currentStartIndex + 1 >= 2) && (tokens.length - 1 - i >= 2)) {
                    splitIndex = i;
                    break;
                }
            }
            if (splitIndex !== -1 && (splitIndex - currentStartIndex + 1 <= 5) && (splitIndex - currentStartIndex + 1 >= 2)) {
                 chunks.push(tokens.slice(currentStartIndex, splitIndex + 1));
                 currentStartIndex = splitIndex + 1;
                 continue;
            } else if (remaining >= 2) {
                chunks.push(tokens.slice(currentStartIndex));
                currentStartIndex = tokens.length;
            } else {
                if (chunks.length > 0) {
                    chunks[chunks.length - 1].push(tokens[currentStartIndex]);
                } else {
                    chunks.push([tokens[currentStartIndex]]);
                }
                currentStartIndex = tokens.length;
            }
        } else {
            let splitIndex = -1;
            for (let i = currentStartIndex + 4; i >= currentStartIndex + 1; i--) {
                if (preferredSplits[i]) {
                    if (tokens.length - 1 - i === 1) {
                        continue;
                    }
                    splitIndex = i;
                    break;
                }
            }
            
            if (splitIndex === -1) {
                splitIndex = currentStartIndex + 4;
                if (tokens.length - 1 - splitIndex === 1) {
                    splitIndex--;
                }
            }
            
            chunks.push(tokens.slice(currentStartIndex, splitIndex + 1));
            currentStartIndex = splitIndex + 1;
        }
    }
    
    let result = "";
    for (let c = 0; c < chunks.length; c++) {
        const chunkTokens = chunks[c];
        for (let i = 0; i < chunkTokens.length; i++) {
            result += chunkTokens[i].word;
            
            if (i === chunkTokens.length - 1 && c !== chunks.length - 1) {
                result += " / ";
            } else {
                result += chunkTokens[i].space;
            }
        }
    }
    return result;
}

const resultData = {};
let totalVerses = 0;
let processedVerses = 0;

for (const book in bibleData) {
    resultData[book] = {};
    for (const chapter in bibleData[book]) {
        resultData[book][chapter] = {};
        for (const verse in bibleData[book][chapter]) {
            totalVerses++;
            resultData[book][chapter][verse] = chunkText(bibleData[book][chapter][verse]);
            processedVerses++;
        }
    }
}

fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2), 'utf8');
console.log(`Chunking complete! Processed ${processedVerses}/${totalVerses} verses.`);

console.log("창세기 1:1 ->", resultData["창세기"]["1"]["1"]);
console.log("창세기 1:2 ->", resultData["창세기"]["1"]["2"]);
