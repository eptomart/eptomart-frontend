const parser = require('@babel/parser');
const fs = require('fs');
const files = process.argv.slice(1);
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'classProperties'] });
    console.log('OK', f);
  } catch (e) {
    console.log('FAIL', f, e.message);
  }
}
