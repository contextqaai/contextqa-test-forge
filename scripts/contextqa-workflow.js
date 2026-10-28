#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {approveBundle,previewBundle,applyBundle,readContextQACase,portableMapping} from '../src/contextqa-workflow.js';

const args=process.argv.slice(2),command=args.shift();
const option=name=>args.includes('--'+name)?args[args.indexOf('--'+name)+1]:undefined;
const load=async name=>JSON.parse(await readFile(option(name),'utf8'));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
try {
  if(command==='approve-bundle') {
    if(!args.includes('--confirm-reviewed')) throw new Error('Inspect source, IDs, raw payloads and side effects before --confirm-reviewed');
    await save(option('out'),approveBundle(await load('bundle'),await load('source'),option('reviewer')));
    console.log(JSON.stringify({approved:true,executed:false}));
  } else if(command==='preview-bundle') {
    const {validateRequest}=await import('../src/contextqa.js');
    await save(option('out'),previewBundle(await load('bundle'),await load('source'),validateRequest));
    console.log(JSON.stringify({previewed:true,networkCalls:0}));
  } else if(command==='apply-bundle') {
    if(!args.includes('--approve-write')) throw new Error('Explicit --approve-write required');
    const {ContextQAClient}=await import('../src/contextqa.js');
    const client=new ContextQAClient({token:process.env.CONTEXTQA_API_TOKEN});
    const journal=await applyBundle({client,bundle:await load('bundle'),source:await load('source'),receipt:await load('approval'),journalFile:option('journal'),approveWrite:true});
    console.log(JSON.stringify({state:journal.state,attempted:journal.operations.length,journal:option('journal'),replaySupported:false}));
    if(journal.state!=='completed') process.exitCode=1;
  } else if(command==='read-case') {
    const {ContextQAClient}=await import('../src/contextqa.js');
    const client=new ContextQAClient({token:process.env.CONTEXTQA_API_TOKEN});
    const result=await readContextQACase(client,{caseId:Number(option('case-id')),stepIds:option('step-ids')?.split(',').map(Number) || []});
    await mkdir(option('out'),{mode:0o700});
    await save(option('out')+'/source.json',result.source);await save(option('out')+'/private-records.json',result.raw);
    console.log(JSON.stringify({read:true,sourceSha:result.source.sourceSha,steps:result.source.steps.length,executed:false}));
  } else if(command==='map-portable') {
    if(!args.includes('--confirm-reviewed')) throw new Error('Manually verify source-step semantics, selectors and assertions before --confirm-reviewed');
    const result=portableMapping(await load('source'),await load('mapping'),option('reviewer'));
    await mkdir(option('out'),{mode:0o700});
    await save(option('out')+'/contract.json',result.contract);await save(option('out')+'/approval.json',result.approval);
    console.log(JSON.stringify({mapped:true,mappingSha:result.mappingSha,executed:false}));
  } else throw new Error('Commands: approve-bundle, preview-bundle, apply-bundle, read-case, map-portable. See docs/contextqa.md.');
} catch(error) {console.error(error.message);process.exitCode=1;}
