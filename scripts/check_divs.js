const fs = require('fs');

const content = fs.readFileSync('src/components/Game.tsx', 'utf8');

let stack = [];
let idx = 0;
while (idx < content.length) {
    let divOpen = content.indexOf('<div', idx);
    let divClose = content.indexOf('</div', idx);
    if (divOpen !== -1 && (divOpen < divClose || divClose === -1)) {
        // find if it's auto closing, e.g. <div />
        let nextClose = content.indexOf('>', divOpen);
        if (content[nextClose - 1] === '/') {
            idx = nextClose + 1;
        } else {
            stack.push('<div @' + divOpen);
            idx = nextClose + 1;
        }
    } else if (divClose !== -1) {
        stack.pop();
        idx = divClose + 1;
    } else {
        break;
    }
}
console.log('Unbalanced divs:', stack.length);
