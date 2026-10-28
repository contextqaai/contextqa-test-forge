#!/usr/bin/env node
import {open,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {buildOutcomesReport,renderOutcomesMarkdown,OutcomeInputError} from '../src/outcomes.js';

try {
  const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--input'||args[2]!=='--out'||!args[1]||!args[3])throw new OutcomeInputError('Usage: node scripts/outcomes.js --input INPUT_JSON --out NEW_PRIVATE_DIRECTORY');
  const file=await open(args[1],'r');let input;
  try{const stat=await file.stat();if(!stat.isFile()||stat.size>1_000_000)throw new OutcomeInputError('Outcome input must be a JSON file of at most 1 MB');const buffer=Buffer.alloc(1_000_001);const {bytesRead}=await file.read(buffer,0,buffer.length,0);if(bytesRead>1_000_000)throw new OutcomeInputError('Outcome input exceeds 1 MB');input=JSON.parse(buffer.subarray(0,bytesRead).toString('utf8'));}finally{await file.close();}
  const report=buildOutcomesReport(input),directory=resolve(args[3]);await mkdir(directory,{mode:0o700});
  await writeFile(join(directory,'result.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});await writeFile(join(directory,'report.md'),renderOutcomesMarkdown(report),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({saved:true,kind:report.kind,dataTrust:report.dataTrust,inputSha256:report.inputSha256,liveServiceRequests:0,evidenceVerifiedByTool:false}));
}catch(error){console.error(error instanceof OutcomeInputError?error.message:'Cannot create outcome report. Check valid input JSON and a new output directory; existing files are never overwritten.');process.exitCode=1;}
