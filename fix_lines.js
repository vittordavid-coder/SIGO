const fs = require('fs');
const lines = fs.readFileSync('src/components/SyneraMobileView.tsx', 'utf8').split('\n');
const newLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes("let ctx = rawCanvas.getContext('2d', { willReadFrequently: true });")) {
    newLines.push(lines[i++]);
    newLines.push(lines[i++]);
    newLines.push(lines[i++]);
    newLines.push(lines[i++]);
    newLines.push(lines[i++]);
    // The next line is the extra }
    if (lines[i].trim() === '}') {
      newLines.push('        ctx.save();');
      i++;
    }
  } else {
    newLines.push(lines[i++]);
  }
}
fs.writeFileSync('src/components/SyneraMobileView.tsx', newLines.join('\n'));
