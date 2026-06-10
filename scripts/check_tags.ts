import * as fs from 'fs';
const content = fs.readFileSync('src/components/Game.tsx', 'utf8');

// A better tag parser for tsx
function analyzeTags(source: string) {
    let unclosed = [];
    let idx = 0;
    while(idx < source.length) {
        let tagStart = source.indexOf('<', idx);
        if (tagStart === -1) break;
        
        let tagEnd = source.indexOf('>', tagStart);
        if (tagEnd === -1) break;
        
        // Skip comments
        if (source.substring(tagStart, tagStart + 4) === '<!--') {
            idx = source.indexOf('-->', tagStart) + 3;
            continue;
        }

        let isClose = source[tagStart + 1] === '/';
        let isAutoClose = source[tagEnd - 1] === '/';

        let tagContent = source.substring(tagStart + (isClose ? 2 : 1), tagEnd);
        let spaceIdx = tagContent.indexOf(' ');
        let tagName = spaceIdx !== -1 ? tagContent.substring(0, spaceIdx) : tagContent;
        
        if (tagName && /^[a-zA-Z]/.test(tagName) && !isAutoClose) {
            if (isClose) {
                let last = unclosed[unclosed.length - 1];
                if (last === tagName) {
                    unclosed.pop();
                } else {
                    console.log('Mismatch at', tagStart, 'expected', last, 'got', tagName);
                }
            } else {
                unclosed.push(tagName);
            }
        }
        idx = tagEnd + 1;
    }
    console.log(unclosed);
}

analyzeTags(content);
