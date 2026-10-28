#!/usr/bin/env node
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkContextQAConnection} from '../src/contextqa-connection.js';

const usage='Usage: node --env-file=.env scripts/contextqa-connection.js --plan-id YOUR_AUTHORIZED_PLAN_ID\nReads one saved plan; does not execute or author anything. Credentials belong only in the process environment.\n';

export async function runConnectionCLI({argv=process.argv.slice(2),env=process.env,fetchImpl=globalThis.fetch,write=value=>process.stdout.write(value),writeError=value=>process.stderr.write(value)}={}) {
  if(argv.length===1&&argv[0]==='--help'){write(usage);return 0;}
  // Do not echo unknown flag values: a mistaken --token must not leak a key.
  if(argv.length!==2||argv[0]!=='--plan-id'||!/^\d+$/.test(argv[1])||!Number.isSafeInteger(Number(argv[1]))||Number(argv[1])<1){
    writeError('Supply exactly one --plan-id positive integer. Token arguments and other flags are unsupported.\n'+usage);return 2;
  }
  try{
    const checked=await checkContextQAConnection({planId:argv[1],env,fetchImpl});write(JSON.stringify(checked)+'\n');
    if(checked.status==='read_access_verified')return 0;
    return ['connection_error','unexpected_response'].includes(checked.status)?1:2;
  }catch{writeError('The read-only connection check could not complete. No credentials or upstream details are logged.\n');return 1;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await runConnectionCLI();
