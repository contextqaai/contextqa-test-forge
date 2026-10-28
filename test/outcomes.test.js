import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {buildOutcomesReport,renderOutcomesMarkdown} from '../src/outcomes.js';
const execute=promisify(execFile);
const example=JSON.parse(await readFile(new URL('../examples/outcome-input.example.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(example);

test('reported requirements, disclosed retries and maintenance retain their correct units',()=>{
  const report=buildOutcomesReport(copy()),m=report.current.metrics;
  assert.equal(m.reportedAttemptCount,3);assert.equal(m.reviewedRequirementCount,2);assert.equal(m.retryAttemptCount,1);
  assert.equal(m.reviewedToVerifiedMinutes.mean,45);assert.equal(report.baseline.metrics.reviewedToVerifiedMinutes.mean,75);assert.equal(report.comparisons.reviewedToVerifiedMinutes.currentMinusBaseline,-30);
  assert.equal(m.handsOnMinutes.mean,26.5);assert.equal(m.maintenancePerWorkflowChangeMinutes.mean,22);
  assert.deepEqual(m.reportedAssertionPassRate,{numerator:2,denominator:3,rate:0.666667,unknownCount:0});assert.equal(m.unchangedBuildFalseFailureRate.numerator,1);assert.equal(m.unchangedBuildFalseFailureRate.denominator,3);
  assert.equal(report.dataTrust,'user-reported-unverified');assert.equal(report.evidenceVerifiedByTool,false);assert.equal(report.liveServiceRequests,0);
});
test('missing provider usage and cost stay unknown; cached tokens are not added to input tokens',()=>{
  const data=copy(),report=buildOutcomesReport(data),usage=report.current.metrics.modelUsage;
  assert.equal(usage.inputTokens.value,null);assert.equal(usage.inputTokens.knownSubtotal,800);assert.equal(usage.inputTokens.missingCount,1);assert.equal(usage.cost.trackingComplete,false);assert.equal(report.current.metrics.executionCost.byCurrency.length,0);
  data.current.modelUsage=data.current.modelUsage.slice(0,1);data.current.modelUsage[0].cachedInputTokens=200;
  const known=buildOutcomesReport(data).current.metrics.modelUsage;assert.equal(known.inputTokens.value,800);assert.equal(known.cachedInputTokens.value,200);assert.equal(known.outputTokens.value,300);
});
test('absent fields and zero denominators do not become zero usage or perfect rates',()=>{
  const data=copy();data.current={window:data.current.window,attempts:[{id:'unknown-1',workflowId:'approval',requirementId:'unknown'}]};
  const metrics=buildOutcomesReport(data).current.metrics;assert.equal(metrics.requirementCount,1);assert.equal(metrics.reviewedRequirementCount,0);assert.equal(metrics.unknownReviewRequirementCount,1);assert.equal(metrics.handsOnMinutes.mean,null);assert.equal(metrics.reviewedToVerifiedMinutes.mean,null);assert.equal(metrics.reportedAssertionPassRate.rate,null);assert.equal(metrics.criticalCriteriaVerifiedRate.rate,null);assert.equal(metrics.modelUsage.inputTokens.value,null);assert.equal(metrics.repairAcceptanceRate.rate,null);
});
test('unverified labels and right-censored observations cannot establish first verified time',()=>{
  const data=copy();data.current.attempts[0].evidenceRefs=[];data.current.attempts[2].verifiedAt='2026-10-16T10:00:00Z';
  const metrics=buildOutcomesReport(data).current.metrics;assert.equal(metrics.reviewedToVerifiedMinutes.knownCount,0);assert.equal(metrics.missingVerificationEvidenceCount,1);assert.equal(metrics.rightCensoredVerificationCount,1);
});
test('repair rates distinguish pending decisions and unknown revalidation/rollback',()=>{
  const data=copy();data.current.repairs[0].revalidated=null;data.current.repairs[0].rolledBack=null;const metrics=buildOutcomesReport(data).current.metrics;
  assert.deepEqual(metrics.repairAcceptanceRate,{numerator:1,denominator:1,rate:1,unknownCount:1});assert.deepEqual(metrics.repairRevalidationSuccessRate,{numerator:0,denominator:1,rate:0,unknownCount:1});assert.equal(metrics.repairRollbackRate.unknownCount,1);
});
test('estimates are excluded from actual costs and mixed currencies are never combined',()=>{
  const data=copy();data.current.executionCostComplete=true;data.current.executionCosts=[{id:'usd',amount:2,currency:'USD',source:'invoice'},{id:'eur',amount:3,currency:'EUR',source:'provider-reported'}];
  let cost=buildOutcomesReport(data).current.metrics.executionCost;assert.deepEqual(cost.byCurrency.map(row=>[row.currency,row.value]),[['EUR',3],['USD',2]]);
  data.current.executionCosts[0].source='estimate';cost=buildOutcomesReport(data).current.metrics.executionCost;assert.equal(cost.byCurrency.find(row=>row.currency==='USD').value,null);assert.equal(cost.byCurrency.find(row=>row.currency==='USD').excludedEstimateRecords,1);
});
test('comparison requires claimed matched scope and complete metric observations',()=>{
  const data=copy();data.experiment.matchedTaskAndScope=false;assert.equal(buildOutcomesReport(data).comparisons.reviewedToVerifiedMinutes.currentMinusBaseline,null);
  data.experiment.matchedTaskAndScope=true;data.current.attempts[0].authoringMinutes=null;assert.equal(buildOutcomesReport(data).comparisons.handsOnMinutes.currentMinusBaseline,null);
});
test('invalid counts, fake dates, cyclic retries, contradictory repairs and secret URLs fail',()=>{
  const mutations=[data=>data.current.coverage.verifiedCriticalCriteria=3,data=>data.current.attempts[0].reviewedAt='2026-02-30T09:00:00Z',data=>data.current.attempts[0].verifiedAt='2026-10-08T08:00:00Z',data=>data.current.attempts[1].retryOf='current-3',data=>data.current.repairs[0].accepted=false,data=>data.current.attempts[0].evidenceRefs=['https://storage.invalid/file?signature=private'],data=>data.experiment.businessGoal='Bearer should-never-be-in-a-report',data=>data.current.modelUsage[0].inputTokens=-1,data=>data.current.attempts[0].id=data.current.attempts[1].id];
  for(const mutate of mutations){const data=copy();mutate(data);assert.throws(()=>buildOutcomesReport(data));}
});
test('deterministic report and safe Markdown do not invent ROI or treat a label as authentication',()=>{
  const data=copy();data.experiment.title='<script>unsafe</script> [link](https://example.invalid)';const a=buildOutcomesReport(data),b=buildOutcomesReport(copy());assert.deepEqual(a,buildOutcomesReport(data));assert.notEqual(a.inputSha256,b.inputSha256);const markdown=renderOutcomesMarkdown(a);assert.ok(markdown.includes('&lt;script&gt;'));assert.ok(!markdown.includes('<script>'));assert.ok(markdown.includes('not business success'));assert.ok(markdown.includes('authenticated none'));assert.ok(!Object.hasOwn(a,'roi'));
});
test('outcomes CLI creates private new files and refuses overwrite',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'cqa-outcomes-'));t.after(()=>rm(directory,{recursive:true,force:true}));const out=join(directory,'missing-parent','report');const args=['scripts/outcomes.js','--input','examples/outcome-input.example.json','--out',out];
  const result=await execute(process.execPath,args);assert.equal(JSON.parse(result.stdout).liveServiceRequests,0);assert.equal((await stat(join(out,'result.json'))).mode&0o777,0o600);assert.equal((await stat(out)).mode&0o777,0o700);await assert.rejects(execute(process.execPath,args));assert.ok((await readFile(join(out,'report.md'),'utf8')).includes('synthetic-example'));
});
