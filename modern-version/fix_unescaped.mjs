import fs from 'fs';

const log = fs.readFileSync('lint_output.txt', 'utf8');
const lines = log.split('\n');

let currentFile = '';
const errorsByFile = {};

for (const line of lines) {
  if (line.startsWith('C:\\')) {
    currentFile = line.trim();
    if (!errorsByFile[currentFile]) errorsByFile[currentFile] = [];
  } else {
    const match = line.match(/^\s*(\d+):(\d+)\s+error\s+`\'` can be escaped with/);
    if (match && currentFile) {
      errorsByFile[currentFile].push({
        line: parseInt(match[1], 10) - 1, // 0-indexed
        col: parseInt(match[2], 10) - 1
      });
    }
  }
}

for (const file in errorsByFile) {
  if (!fs.existsSync(file)) continue;
  let contentLines = fs.readFileSync(file, 'utf8').split('\n');
  
  // Sort errors by line descending, then column descending, to not mess up offsets
  const errors = errorsByFile[file].sort((a, b) => {
    if (b.line !== a.line) return b.line - a.line;
    return b.col - a.col;
  });
  
  for (const err of errors) {
    let lineStr = contentLines[err.line];
    if (lineStr && lineStr[err.col] === "'") {
      contentLines[err.line] = lineStr.substring(0, err.col) + "&apos;" + lineStr.substring(err.col + 1);
    }
  }
  
  fs.writeFileSync(file, contentLines.join('\n'));
  console.log('Fixed quotes in', file);
}
