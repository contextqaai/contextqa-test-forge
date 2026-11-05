// Local presentation example. No API, model, browser execution or publication.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const states = ['passed', 'failed', 'not-run', 'inconclusive'];
const sections = ['summary', 'failures', 'trends', 'cases', 'actions'];
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const label = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
const refs = value => Array.isArray(value) && value.length <= 30 && value.every(x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(x));
const text = x => x == null ? 'unknown' : String(x);
const html = x => text(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = x => text(x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/[\\`*_{}\[\]()#+!|]/g,'\\$&').replace(/[\r\n]+/g,' ');
const percent = (n,d) => d ? `${(100*n/d).toFixed(1)}%` : 'unknown';
export function analyze(data) {
  requireValue(data?.schema === 1 && ['synthetic','observed'].includes(data.mode), 'Use schema 1 and synthetic or observed mode');
  for (const key of ['title','runId','environment']) requireValue(label(data[key]),`Missing ${key}`);
  requireValue(Array.isArray(data.cases) && data.cases.length > 0, 'Provide the complete selected case scope');
  requireValue(new Set(data.cases.map(c=>c.id)).size === data.cases.length, 'Duplicate case IDs');
  for (const c of data.cases) {
    requireValue(refs([c.id]) && label(c.title), 'Invalid case identity');
    requireValue(states.includes(c.initial) && states.includes(c.final), 'Unknown outcome; use inconclusive for missing evidence');
    for (const key of ['area','category','owner']) requireValue(c[key] == null || label(c[key]),`Invalid ${key}`);
    requireValue(refs(c.evidence), 'Use opaque evidence references, not URLs or credentials');
    requireValue(!['passed','failed'].includes(c.final) || c.evidence.length > 0, 'Observed outcomes require evidence references');
    const recovered = c.initial === 'failed' && c.final === 'passed';
    requireValue(!c.recovery || recovered, 'Recovery requires initial failure and final pass');
    if (c.recovery) {
      const r=c.recovery;
      requireValue(['reviewed-fix','rerun'].includes(r.kind) && r.revalidated === true && refs(r.evidence) && r.evidence.length > 0, 'Recovery requires mechanism and revalidation evidence');
      requireValue(r.applied === (r.kind === 'reviewed-fix'), 'Distinguish an applied repair from an unchanged rerun');
    }
    // A pass after a failure without a mechanism stays recovered / mechanism unknown.
  }
  const decision=data.releaseDecision;
  requireValue(decision && ['pending','go','no-go'].includes(decision.status) && label(decision.reason), 'Provide the human decision status and reason');
  requireValue(decision.owner == null || label(decision.owner), 'Invalid decision owner');
  requireValue(decision.status === 'pending' || label(decision.owner), 'A recorded release decision needs an owner');
  requireValue(Array.isArray(data.history) && data.history.every(h=>label(h.runId)&&label(h.date)&&Number.isSafeInteger(h.total)&&h.total>0&&['initialPassed','finalPassed'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0&&h[k]<=h.total)), 'Invalid history counts or denominator');
  requireValue(new Set(data.history.map(h=>h.runId)).size===data.history.length,'Duplicate history runs');
  requireValue(Array.isArray(data.nextActions) && data.nextActions.every(label), 'Invalid next actions');
  const total=data.cases.length;
  const initialPassed=data.cases.filter(c=>c.initial==='passed').length;
  const finalPassed=data.cases.filter(c=>c.final==='passed').length;
  return {total,initialPassed,finalPassed,recovered:data.cases.filter(c=>c.initial==='failed'&&c.final==='passed').length,failed:data.cases.filter(c=>c.final==='failed').length,notRun:data.cases.filter(c=>c.final==='not-run').length,inconclusive:data.cases.filter(c=>c.final==='inconclusive').length,initialRate:percent(initialPassed,total),finalRate:percent(finalPassed,total),lift:((finalPassed-initialPassed)*100/total).toFixed(1)};
}
export function render(data, profile) {
  const m=analyze(data);
  requireValue(label(profile?.title)&&label(profile.audience)&&/^#[a-fA-F0-9]{6}$/.test(profile.accent), 'Invalid title, audience or accent');
  requireValue(Array.isArray(profile.sections)&&profile.sections.length>0&&profile.sections.every(s=>sections.includes(s))&&new Set(profile.sections).size===profile.sections.length, 'Invalid sections');
  requireValue(['all','exceptions'].includes(profile.caseDetail),'Invalid case detail');
  const marker=data.mode==='synthetic'?'SYNTHETIC EXAMPLE - not a live run':'SUPPLIED OBSERVATIONS - verify provenance before sharing';
  const decision=`Human release decision: ${data.releaseDecision.status.toUpperCase()} | Owner: ${text(data.releaseDecision.owner)} | ${data.releaseDecision.reason}`;
  let markdown=`# ${md(profile.title)}\n\n**${marker}**\n\n${md(data.title)} · ${md(data.runId)} · ${md(data.environment)}\n\nAudience: ${md(profile.audience)}\n\n${md(decision)}\n\n`;
  let body=`<header><small>CONTEXTQA EVIDENCE / YOUR REPORT</small><h1>${html(profile.title)}</h1><p>${html(data.title)} · ${html(data.runId)} · ${html(data.environment)}</p><p>Audience: ${html(profile.audience)}</p></header><aside>${html(marker)}</aside><p class="decision">${html(decision)}</p>`;
  // Evidence status, decision and denominator remain visible in every profile.
  const essentials=`Scope: ${m.total} selected cases. Initial: ${m.initialPassed}/${m.total} (${m.initialRate}); final: ${m.finalPassed}/${m.total} (${m.finalRate}). Still failed: ${m.failed}; not run: ${m.notRun}; inconclusive: ${m.inconclusive}.`;
  markdown+=essentials+'\n\n';body+=`<p>${html(essentials)}</p>`;
  const add=(heading,headers,rows)=>{
    markdown+=`## ${heading}\n\n| ${headers.map(md).join(' | ')} |\n| ${headers.map(()=> '---').join(' | ')} |\n`+rows.map(row=>'| '+row.map(md).join(' | ')+' |').join('\n')+'\n\n';
    body+=`<section><h2>${html(heading)}</h2><div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${html(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${html(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  };
  for(const section of profile.sections){
    if(section==='summary'){
      const previousBody=body;
      add('Run summary',['Measure','Value'],[['Selected cases',m.total],['Initial pass rate',`${m.initialRate} (${m.initialPassed}/${m.total})`],['Final pass rate',`${m.finalRate} (${m.finalPassed}/${m.total})`],['Change',`${m.lift} percentage points`],['Recovered from initial failure',m.recovered],['Still failing',m.failed],['Not run / inconclusive',`${m.notRun} / ${m.inconclusive}`]]);
      const cards=[['Cases in scope',m.total],['Initial pass rate',m.initialRate],['Final pass rate',m.finalRate],['Recovered',m.recovered],['Still failing',m.failed],['Not run / inconclusive',`${m.notRun} / ${m.inconclusive}`]];
      body=previousBody+`<section><h2>Run summary</h2><div class="cards">${cards.map(([name,value])=>`<div class="card"><small>${html(name)}</small><strong>${html(value)}</strong></div>`).join('')}</div><p>Change: ${html(m.lift)} percentage points. Initial failures remain part of the record.</p></section>`;
    }
    if(section==='failures'){
      const initial=data.cases.filter(c=>c.initial==='failed');const cats=[...new Set(initial.map(c=>c.category??'unknown'))];
      add('Failure analysis',['Category','Initially failed','Recovered','Still failed','Unresolved'],cats.length?cats.map(cat=>{const rows=initial.filter(c=>(c.category??'unknown')===cat);return [cat,rows.length,rows.filter(c=>c.final==='passed').length,rows.filter(c=>c.final==='failed').length,rows.filter(c=>['not-run','inconclusive'].includes(c.final)).length];}):[['No initial failures',0,0,0,0]]);
    }
    if(section==='trends')add('Run history',['Run','Date','Cases','Initial pass rate','Final pass rate'],data.history.length?data.history.map(h=>[h.runId,h.date,h.total,percent(h.initialPassed,h.total),percent(h.finalPassed,h.total)]):[['No history supplied','unknown','unknown','unknown','unknown']]);
    if(section==='cases'){
      const selected=data.cases.filter(c=>profile.caseDetail==='all'||c.initial!=='passed'||c.final!=='passed');
      add('Case results',['Case / area','Initial → final','Recovery','Owner / category','Evidence'],selected.length?selected.map(c=>[`${c.id}: ${c.title} / ${text(c.area)}`,`${c.initial} → ${c.final}`,c.recovery?.kind??(c.initial==='failed'&&c.final==='passed'?'mechanism unknown':'none'),`${text(c.owner)} / ${text(c.category)}`,[...new Set([...c.evidence,...(c.recovery?.evidence??[])])].join(', ')||'unknown']):[['No exceptions','passed → passed','none','unknown','See selected source']]);
    }
    if(section==='actions')add('Proposed next actions',['Action','Review status'],data.nextActions.length?data.nextActions.map(a=>[a,'For human review']):[['No actions supplied','unknown']]);
  }
  const footer='Rates use all selected cases, including not-run and inconclusive. Recovery does not erase the initial attempt. Classifications are supplied inputs. Evidence references are not fetched or authenticated by this renderer. History may have different scope; compare before interpreting trends.';
  markdown+=footer+'\n';body+=`<footer>${html(footer)}</footer>`;
  const document=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(profile.title)}</title><style>:root{--accent:${profile.accent}}*{box-sizing:border-box}body{font:15px/1.5 Arial,sans-serif;color:#172033;background:#f5f7fc;margin:0;padding:32px}main{max-width:1050px;margin:auto}header{background:var(--accent);color:white;padding:30px;border-radius:16px}h1{font-size:36px;margin:8px 0}h2{font-size:21px}small{letter-spacing:2px}aside,.decision{padding:14px;border-radius:8px;background:#fff2ca}aside{margin-top:16px;font-weight:bold}section{background:white;padding:22px;border:1px solid #dce2ef;border-radius:12px;margin:18px 0;break-inside:avoid}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{padding:14px;background:#f1f4fc;border-radius:9px}.card small{font-size:10px;letter-spacing:1px}.card strong{display:block;font-size:28px;color:var(--accent)}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:11px 8px;border-bottom:1px solid #e3e7f0;overflow-wrap:anywhere}th{color:var(--accent);overflow-wrap:normal}th:nth-child(3){min-width:70px}footer{color:#526078;font-size:12px;padding:20px 0}@media print{body{background:white;padding:0;font-size:11px}header{padding:14px}header p{margin:5px 0}h1{font-size:24px}h2{font-size:16px;margin:0 0 8px}aside,.decision{padding:8px;margin:8px 0}footer{font-size:10px;padding:8px 0}section{padding:10px;margin:8px 0}table{font-size:10px}.card{padding:8px}.card strong{font-size:22px}td,th{padding:7px 5px}.table-wrap{overflow:visible}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:14mm}</style><main>${body}</main></html>`;
  return {markdown,html:document,metrics:m};
}
async function main(){
  const [inputPath,profilePath,out,...extra]=process.argv.slice(2);
  requireValue(inputPath&&profilePath&&out&&!extra.length,'Usage: node examples/custom-report/render.mjs INPUT.json PROFILE.json NEW_OUTPUT_DIRECTORY');
  const data=JSON.parse(await readFile(inputPath,'utf8'));const profile=JSON.parse(await readFile(profilePath,'utf8'));const result=render(data,profile);
  await mkdir(out,{mode:0o700});
  for(const [name,content] of [['report.md',result.markdown],['report.html',result.html],['metrics.json',JSON.stringify(result.metrics,null,2)+'\n']])await writeFile(`${out}/${name}`,content,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({output:out,mode:data.mode,networkCalls:0,modelCalls:0,executed:false,published:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
