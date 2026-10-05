import parser from '@babel/parser';
import fs from 'fs';
const files = process.argv.slice(2);
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'classProperties'] });
    console.log('OK', f);
  } catch (e) {
    console.log('FAIL', f, e.message);
  }
}
