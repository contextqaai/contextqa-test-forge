import {createHash} from 'node:crypto';

export class OutcomeInputError extends Error {}
const fail=message=>{throw new OutcomeInputError(message);};
const object=(value,label,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))fail(`Invalid ${label} fields`);return value;};
const text=(value,label,max=200)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail(`Invalid ${label}`);return value;};
const id=(value,label)=>{if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value))fail(`Invalid ${label}`);return value;};
const number=(value,label,integer=false)=>{if(value==null)return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e12||integer&&!Number.isSafeInteger(value))fail(`Invalid ${label}`);return value;};
const boolean=(value,label)=>{if(value==null)return null;if(typeof value!=='boolean')fail(`Invalid ${label}`);return value;};
const choice=(value,allowed,label)=>{if(value==null)return null;if(!allowed.includes(value))fail(`Invalid ${label}`);return value;};
const array=(value,label,max=1000)=>{if(value==null)return [];if(!Array.isArray(value)||value.length>max)fail(`Invalid ${label}`);return value;};
const unique=(rows,label)=>{if(new Set(rows.map(row=>row.id)).size!==rows.length)fail(`Duplicate ${label} IDs`);return rows;};
const date=(value,label)=>{if(value==null)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))fail(`Invalid UTC ${label}`);return value;};
const refs=value=>array(value,'evidence references',30).map(ref=>{text(ref,'evidence reference',300);if(/https?:\/\/|[?#\r\n]/i.test(ref))fail('Use private evidence labels, not URLs or signed references');return ref;});
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const round=value=>Number(value.toFixed(6));
function stats(values,unit) {
  const known=values.filter(value=>value!==null).sort((a,b)=>a-b),length=known.length;
  return {unit,mean:length?round(known.reduce((sum,value)=>sum+value,0)/length):null,median:length?round(length%2?known[(length-1)/2]:(known[length/2-1]+known[length/2])/2):null,min:length?known[0]:null,max:length?known.at(-1):null,knownCount:length,missingCount:values.length-length,totalCount:values.length};
}
const rate=(numerator,denominator,unknownCount=0)=>({numerator,denominator,rate:denominator?round(numerator/denominator):null,unknownCount});
function cost(value) {
  if(value==null)return null;object(value,'cost',['id','amount','currency','source','evidenceRefs']);
  const result={id:id(value.id,'cost ID'),amount:number(value.amount,'cost amount'),currency:value.currency==null?null:text(value.currency,'currency',3),source:choice(value.source,['provider-reported','invoice','estimate','unavailable'],'cost source'),evidenceRefs:refs(value.evidenceRefs)};
  if(result.currency!==null&&!/^[A-Z]{3}$/.test(result.currency))fail('Use an uppercase ISO currency code');
  if(result.amount!==null&&(!result.currency||!result.source||result.source==='unavailable'))fail('A reported cost needs its currency and source');
  return result;
}
function attempt(value) {
  object(value,'attempt',['id','workflowId','requirementId','changeId','buildId','retryOf','attempted','assertionOutcome','reviewedAt','verifiedAt','releaseDecisionAt','evidenceRefs','authoringMinutes','reviewMinutes','maintenanceMinutes','generationMs','executionMs','unchangedBuild','falseFailure']);
  const row={id:id(value.id,'attempt ID'),workflowId:id(value.workflowId,'workflow ID'),requirementId:id(value.requirementId,'requirement ID'),changeId:value.changeId==null?null:id(value.changeId,'change ID'),buildId:value.buildId==null?null:id(value.buildId,'build ID'),retryOf:value.retryOf==null?null:id(value.retryOf,'retry ID'),attempted:boolean(value.attempted,'attempted flag'),assertionOutcome:choice(value.assertionOutcome,['passed','failed','inconclusive','not-run'],'assertion outcome'),reviewedAt:date(value.reviewedAt,'review timestamp'),verifiedAt:date(value.verifiedAt,'verification timestamp'),releaseDecisionAt:date(value.releaseDecisionAt,'decision timestamp'),evidenceRefs:refs(value.evidenceRefs),unchangedBuild:boolean(value.unchangedBuild,'unchanged-build flag'),falseFailure:boolean(value.falseFailure,'false-failure classification')};
  for(const field of ['authoringMinutes','reviewMinutes','maintenanceMinutes','generationMs','executionMs'])row[field]=number(value[field],field);
  if(['passed','failed'].includes(row.assertionOutcome)&&row.attempted!==true)fail('A reported assertion outcome needs an attempted run');
  if(row.verifiedAt&&row.assertionOutcome!=='passed')fail('Verification time requires a reported passing assertion outcome');
  if(row.falseFailure===true&&(row.unchangedBuild!==true||row.assertionOutcome!=='failed'||row.attempted!==true))fail('False failures need a reviewed failed attempt on an unchanged build');
  for(const field of ['verifiedAt','releaseDecisionAt'])if(row.reviewedAt&&row[field]&&Date.parse(row[field])<Date.parse(row.reviewedAt))fail('Outcome timestamps cannot precede requirement review');
  return row;
}
function repair(value) {
  object(value,'repair',['id','workflowId','accepted','applied','revalidated','rolledBack','evidenceRefs']);
  const row={id:id(value.id,'repair ID'),workflowId:id(value.workflowId,'repair workflow ID'),evidenceRefs:refs(value.evidenceRefs)};
  for(const field of ['accepted','applied','revalidated','rolledBack'])row[field]=boolean(value[field],`repair ${field}`);
  if(row.applied===true&&row.accepted!==true||row.revalidated!==null&&row.applied!==true||row.rolledBack!==null&&row.applied!==true)fail('Repair outcomes require an accepted, applied proposal');
  return row;
}
function usage(value) {
  object(value,'model usage',['id','provider','model','usageSource','inputTokens','outputTokens','cachedInputTokens','cost','evidenceRefs']);
  const row={id:id(value.id,'model call ID'),provider:text(value.provider,'provider',100),model:text(value.model,'model',100),usageSource:choice(value.usageSource,['provider-reported','estimate','unavailable'],'usage source'),evidenceRefs:refs(value.evidenceRefs),cost:cost(value.cost)};
  for(const field of ['inputTokens','outputTokens','cachedInputTokens'])row[field]=number(value[field],field,true);
  if(row.cachedInputTokens!==null&&row.inputTokens!==null&&row.cachedInputTokens>row.inputTokens)fail('Cached input tokens cannot exceed total input tokens');
  return row;
}
function normalizeGroup(value,label) {
  object(value,label,['window','attemptsComplete','attempts','coverage','repairs','modelUsageComplete','modelUsage','executionCostComplete','executionCosts']);
  object(value.window,`${label} window`,['start','end']);
  const window={start:date(value.window.start,'window start'),end:date(value.window.end,'window end')};
  if(!window.start||!window.end||Date.parse(window.start)>=Date.parse(window.end))fail('Provide a positive observation window');
  const attempts=unique(array(value.attempts,'attempts').map(attempt),'attempt');
  const known=new Map(attempts.map(row=>[row.id,row]));
  for(const row of attempts) {
    if(row.reviewedAt&&(Date.parse(row.reviewedAt)<Date.parse(window.start)||Date.parse(row.reviewedAt)>=Date.parse(window.end)))fail('Reviewed requirements must fall within their group observation window');
    if(row.retryOf&&(!known.has(row.retryOf)||row.retryOf===row.id||known.get(row.retryOf).workflowId!==row.workflowId||known.get(row.retryOf).requirementId!==row.requirementId))fail('Each retry must reference another reported attempt of the same requirement/workflow');
    const visited=new Set([row.id]);let parent=row.retryOf;while(parent){if(visited.has(parent))fail('Retry references cannot form a cycle');visited.add(parent);parent=known.get(parent)?.retryOf;}
  }
  let coverage=null;
  if(value.coverage!=null){object(value.coverage,'coverage',['agreedCriticalCriteria','mappedCriticalCriteria','verifiedCriticalCriteria','evidenceRefs']);coverage={evidenceRefs:refs(value.coverage.evidenceRefs)};for(const field of ['agreedCriticalCriteria','mappedCriticalCriteria','verifiedCriticalCriteria'])coverage[field]=number(value.coverage[field],field,true);if(coverage.mappedCriticalCriteria!==null&&coverage.agreedCriticalCriteria!==null&&coverage.mappedCriticalCriteria>coverage.agreedCriticalCriteria||coverage.verifiedCriticalCriteria!==null&&coverage.mappedCriticalCriteria!==null&&coverage.verifiedCriticalCriteria>coverage.mappedCriticalCriteria||coverage.verifiedCriticalCriteria!==null&&coverage.agreedCriticalCriteria!==null&&coverage.verifiedCriticalCriteria>coverage.agreedCriticalCriteria)fail('Coverage counts cannot exceed the agreed/mapped scope');}
  const executionCosts=unique(array(value.executionCosts,'execution costs').map(row=>{const result=cost(row);if(!result)fail('Cost records cannot be null');return result;}),'execution cost');
  return {window,attemptsComplete:boolean(value.attemptsComplete,'attempt completeness'),attempts,coverage,repairs:unique(array(value.repairs,'repairs').map(repair),'repair'),modelUsageComplete:boolean(value.modelUsageComplete,'model usage completeness'),modelUsage:unique(array(value.modelUsage,'model usage').map(usage),'model call'),executionCostComplete:boolean(value.executionCostComplete,'execution cost completeness'),executionCosts};
}
function tokenSum(rows,field,complete) {
  const values=rows.map(row=>row.usageSource==='provider-reported'?row[field]:null),known=values.filter(value=>value!==null),subtotal=known.reduce((sum,value)=>sum+value,0);
  if(!Number.isSafeInteger(subtotal))fail('Token aggregate exceeds safe integer precision');
  return {value:complete===true&&known.length===rows.length?subtotal:null,knownSubtotal:known.length?subtotal:rows.length===0&&complete===true?0:null,knownCount:known.length,reportedCalls:rows.length,missingCount:rows.length-known.length,trackingComplete:complete};
}
function costs(rows,complete) {
  const currencies=[...new Set(rows.filter(row=>row.currency).map(row=>row.currency))].sort();
  return {trackingComplete:complete,reportedRecords:rows.length,unavailableRecords:rows.filter(row=>row.amount===null||!['provider-reported','invoice'].includes(row.source)).length,byCurrency:currencies.map(currency=>{const selected=rows.filter(row=>row.currency===currency),actual=selected.filter(row=>['provider-reported','invoice'].includes(row.source)&&row.amount!==null),sum=actual.reduce((total,row)=>total+row.amount,0);return {currency,value:complete===true&&actual.length===selected.length&&rows.every(row=>row.currency!==null)?round(sum):null,knownActualSubtotal:actual.length?round(sum):null,knownActualRecords:actual.length,excludedEstimateRecords:selected.filter(row=>row.source==='estimate').length};})};
}
function groupMetrics(group) {
  const rows=group.attempts,end=Date.parse(group.window.end),executed=rows.filter(row=>row.attempted===true),unchanged=executed.filter(row=>row.unchangedBuild===true),applied=group.repairs.filter(row=>row.applied===true),decided=group.repairs.filter(row=>row.accepted!==null);
  const within=value=>value!==null&&Date.parse(value)<=end;
  const requirements=new Map();for(const row of rows){const key=row.workflowId+':'+row.requirementId;requirements.set(key,[...(requirements.get(key)||[]),row]);}
  for(const records of requirements.values())if(new Set(records.map(row=>row.reviewedAt)).size>1)fail('Use one review timestamp per requirement version; give changed requirements a new ID');
  const lead=(records,field,verified=false)=>{const times=records.filter(row=>row.reviewedAt&&within(row[field])&&(!verified||row.evidenceRefs.length>0)).map(row=>(Date.parse(row[field])-Date.parse(row.reviewedAt))/60000);return times.length?Math.min(...times):null;};
  const effort=fields=>[...requirements.values()].map(records=>{const values=records.flatMap(row=>fields.map(field=>row[field]));return values.some(value=>value===null)?null:values.reduce((sum,value)=>sum+value,0);});
  const maintenanceGroups=new Map();
  for(const row of rows)if(row.changeId){const key=row.workflowId+':'+row.changeId;maintenanceGroups.set(key,[...(maintenanceGroups.get(key)||[]),row.maintenanceMinutes]);}
  const coverage=group.coverage,ratio=(field)=>coverage&&coverage[field]!==null&&coverage.agreedCriticalCriteria!==null?rate(coverage[field],coverage.agreedCriticalCriteria):{numerator:coverage?.[field]??null,denominator:coverage?.agreedCriticalCriteria??null,rate:null,unknownCount:null};
  return {
    reportedAttemptCount:rows.length,requirementCount:requirements.size,reviewedRequirementCount:[...requirements.values()].filter(records=>records[0].reviewedAt!==null).length,unknownReviewRequirementCount:[...requirements.values()].filter(records=>records[0].reviewedAt===null).length,attemptsComplete:group.attemptsComplete,retryAttemptCount:rows.filter(row=>row.retryOf!==null).length,unknownAttemptedCount:rows.filter(row=>row.attempted===null).length,
    reviewedToVerifiedMinutes:stats([...requirements.values()].map(records=>lead(records,'verifiedAt',true)),'minutes/requirement'),reviewedToReleaseDecisionMinutes:stats([...requirements.values()].map(records=>lead(records,'releaseDecisionAt')),'minutes/requirement'),
    missingVerificationEvidenceCount:rows.filter(row=>row.verifiedAt&&row.evidenceRefs.length===0).length,rightCensoredVerificationCount:rows.filter(row=>row.verifiedAt&&Date.parse(row.verifiedAt)>end).length,
    authoringMinutes:stats(effort(['authoringMinutes']),'minutes/requirement'),reviewMinutes:stats(effort(['reviewMinutes']),'minutes/requirement'),handsOnMinutes:stats(effort(['authoringMinutes','reviewMinutes','maintenanceMinutes']),'minutes/requirement'),
    generationMs:stats(rows.map(row=>row.generationMs),'milliseconds'),executionMs:stats(rows.map(row=>row.executionMs),'milliseconds'),maintenancePerWorkflowChangeMinutes:stats([...maintenanceGroups.values()].map(values=>values.some(value=>value===null)?null:values.reduce((sum,value)=>sum+value,0)),'minutes/workflow-change'),
    reportedAssertionPassRate:rate(executed.filter(row=>row.assertionOutcome==='passed').length,executed.length,executed.filter(row=>row.assertionOutcome===null||row.assertionOutcome==='inconclusive').length),
    criticalCriteriaMappedRate:ratio('mappedCriticalCriteria'),criticalCriteriaVerifiedRate:ratio('verifiedCriticalCriteria'),
    unchangedBuildFalseFailureRate:rate(unchanged.filter(row=>row.falseFailure===true).length,unchanged.length,unchanged.filter(row=>row.assertionOutcome==='failed'&&row.falseFailure===null).length),unchangedBuildSelectionUnknownCount:executed.filter(row=>row.unchangedBuild===null).length,
    repairAcceptanceRate:rate(decided.filter(row=>row.accepted===true).length,decided.length,group.repairs.length-decided.length),repairProposalCount:group.repairs.length,repairApplicationUnknownCount:group.repairs.filter(row=>row.accepted===true&&row.applied===null).length,
    repairRevalidationSuccessRate:rate(applied.filter(row=>row.revalidated===true).length,applied.length,applied.filter(row=>row.revalidated===null).length),repairRollbackRate:rate(applied.filter(row=>row.rolledBack===true).length,applied.length,applied.filter(row=>row.rolledBack===null).length),
    modelUsage:{reportedCalls:group.modelUsage.length,inputTokens:tokenSum(group.modelUsage,'inputTokens',group.modelUsageComplete),outputTokens:tokenSum(group.modelUsage,'outputTokens',group.modelUsageComplete),cachedInputTokens:tokenSum(group.modelUsage,'cachedInputTokens',group.modelUsageComplete),cost:costs(group.modelUsage.map(row=>row.cost).filter(Boolean),group.modelUsageComplete===true&&group.modelUsage.every(row=>row.cost!==null))},
    executionCost:costs(group.executionCosts,group.executionCostComplete),
  };
}

export function buildOutcomesReport(input) {
  object(input,'outcome input',['schema','kind','experiment','baseline','current']);if(input.schema!==1)fail('Use outcome input schema 1');
  const kind=choice(input.kind,['synthetic-example','reported-observation'],'observation kind');if(!kind)fail('Label synthetic examples or reported observations explicitly');
  if(/(?:token_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\bsk-[A-Za-z0-9_-]{12,}|Bearer\s+\S+)/i.test(JSON.stringify(input)))fail('Possible credential found; remove secrets from outcome input');
  object(input.experiment,'experiment',['id','title','businessGoal','matchedTaskAndScope','comparabilityNotes']);
  const experiment={id:id(input.experiment.id,'experiment ID'),title:text(input.experiment.title,'experiment title'),businessGoal:text(input.experiment.businessGoal,'business goal',1000),matchedTaskAndScope:boolean(input.experiment.matchedTaskAndScope,'comparability flag'),comparabilityNotes:input.experiment.comparabilityNotes==null?null:text(input.experiment.comparabilityNotes,'comparability notes',2000)};
  const current=normalizeGroup(input.current,'current'),baseline=input.baseline==null?null:normalizeGroup(input.baseline,'baseline');
  const result={schema:1,kind,inputSha256:createHash('sha256').update(canonical(input)).digest('hex'),dataTrust:'user-reported-unverified',evidenceVerifiedByTool:false,liveServiceRequests:0,experiment,current:{records:current,metrics:groupMetrics(current)},baseline:baseline?{records:baseline,metrics:groupMetrics(baseline)}:null,comparisons:{},limitations:['This is deterministic arithmetic over local user-supplied records, not authenticated provider evidence or telemetry.','Evidence references are labels only; no referenced file, URL, hash, run or identity is checked.','A reported passing assertion does not establish business success, complete coverage, release safety, ROI or causal attribution.','Missing values remain null. Estimates and missing provider usage are not presented as actual costs/tokens. Cached input tokens are a subset, never added to total input tokens.','Record every independent attempt and disclosed retry; selected final passes alone bias reliability metrics.','Review timestamp-to-result time, generation, execution and human effort have different units and responsibilities.']};
  for(const key of ['reviewedToVerifiedMinutes','reviewedToReleaseDecisionMinutes','handsOnMinutes','maintenancePerWorkflowChangeMinutes']) {
    const a=result.baseline?.metrics[key],b=result.current.metrics[key],complete=a&&a.knownCount>0&&a.missingCount===0&&b.knownCount>0&&b.missingCount===0;
    result.comparisons[key]={baselineMean:a?.mean??null,currentMean:b.mean,currentMinusBaseline:experiment.matchedTaskAndScope===true&&complete?round(b.mean-a.mean):null,interpretation:'Difference only; matching scope is a user claim and no causal improvement or savings is inferred.'};
  }
  return result;
}
const md=value=>String(value??'unknown').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char])).replace(/[\\`*_{}\[\]()#+!|]/g,'\\$&');
export function renderOutcomesMarkdown(report) {
  const metricRows=[['Reviewed → reported verified', 'reviewedToVerifiedMinutes'],['Reviewed → release decision','reviewedToReleaseDecisionMinutes'],['Hands-on effort','handsOnMinutes'],['Maintenance per workflow/change','maintenancePerWorkflowChangeMinutes']];
  const lines=['# ContextQA Test Forge outcome observations','',`**${md(report.kind)} · user-reported, unverified**`, '',md(report.experiment.title),'',md(report.experiment.businessGoal),'','A passing assertion is evidence about a specific check, not business success. This tool made no live service calls and authenticated none of the supplied evidence.','', '| Measure | Baseline mean | Current mean | Current − baseline |','|---|---:|---:|---:|'];
  for(const [label,key] of metricRows){const row=report.comparisons[key];lines.push(`| ${label} | ${row.baselineMean??'unknown'} | ${row.currentMean??'unknown'} | ${row.currentMinusBaseline??'not comparable'} |`);}
  for(const [label,group] of [['Baseline',report.baseline],['Current',report.current]])if(group){const m=group.metrics;lines.push('',`## ${label}`, '',`Window: ${md(group.records.window.start)} to ${md(group.records.window.end)} \(end excluded for reviewed requirements\).`, `Reported attempts: ${m.reportedAttemptCount}; disclosed retries: ${m.retryAttemptCount}; completeness claimed: ${group.records.attemptsComplete??'unknown'}.`, '', '| Rate | Numerator | Denominator | Rate | Unknown classifications |','|---|---:|---:|---:|---:|');for(const [name,key] of [['Reported assertion passes','reportedAssertionPassRate'],['Agreed critical criteria mapped','criticalCriteriaMappedRate'],['Agreed critical criteria reported verified','criticalCriteriaVerifiedRate'],['False failures on unchanged builds','unchangedBuildFalseFailureRate'],['Repair acceptance among decisions','repairAcceptanceRate'],['Revalidation among applied repairs','repairRevalidationSuccessRate'],['Rollback among applied repairs','repairRollbackRate']]){const rate=m[key];lines.push(`| ${name} | ${rate.numerator??'unknown'} | ${rate.denominator??'unknown'} | ${rate.rate===null?'unknown':round(rate.rate*100)+'%'} | ${rate.unknownCount??'unknown'} |`);}lines.push('',`Lead-time observations: ${m.reviewedToVerifiedMinutes.knownCount} known, ${m.reviewedToVerifiedMinutes.missingCount} missing/excluded. Review result.json for all sample counts, token completeness, currency-specific costs and evidence labels.`);}
  lines.push('','## Limits','',...report.limitations.map(value=>'- '+md(value)),'','Keep this report private until the input and evidence have been reviewed. No ROI, customer result or automatic-healing claim is produced.','');return lines.join('\n');
}
