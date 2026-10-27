import {readFile, writeFile} from 'node:fs/promises';
import {draft} from '../src/ai.js';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name)+1];
try {
  if (!args.includes('--approve-data-sharing') || !args.includes('--input') || !args.includes('--out')) throw new Error('Usage: node scripts/ai-draft.js --input REVIEWED_TEXT_FILE --out NEW_DRAFT.json --approve-data-sharing');
  const input = await readFile(option('--input'),'utf8');
  const result = await draft({input,approved:true,purpose:'Draft structured test cases or documentation from the supplied reviewed text. List unresolved requirements separately. Mark all proposed selectors as unverified. Never generate executable shell commands.'});
  await writeFile(option('--out'), JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({saved:true,reviewRequired:true,...result.metrics}));
} catch (error) { console.error(error.message); process.exitCode = 1; }
