import test from 'node:test';
import assert from 'node:assert/strict';
import {render,assertionStepMarker} from '../src/exporters.js';
import {evaluateFailure} from '../scripts/verify-export-failure.js';

test('Selenium assertions use distinct static test/step timeout messages',()=>{
  const steps=[{action:'assertText',selector:'#result',value:'Saved'},{action:'assertVisible',selector:'#result'},{action:'assertUrl',value:'https://example.test/'}];
  const code=render({tests:[{id:'one',title:'First',steps},{id:'two',title:'Second',steps}]},'selenium');
  const markers=[...code.matchAll(/10000, "(CQA_ASSERTION_TEST_\d+_STEP_\d+)"/g)].map(match=>match[1]);
  assert.deepEqual(markers,[0,1].flatMap(testIndex=>[0,1,2].map(stepIndex=>assertionStepMarker(testIndex,stepIndex))));
  assert.equal(new Set(markers).size,6);
});

test('Selenium TAP timeout at the expected assertion is accepted without caller stack',()=>{
  const marker=assertionStepMarker(0,7);
  const log=`not ok 1 - synthetic test\n  error: |-\n    ${marker}\n    Wait timed out after 10001ms\n  name: 'TimeoutError'\n  stack: |-\n    at selenium-webdriver/lib/webdriver.js:939:22\n`;
  const result=evaluateFailure({status:1,signal:null},log,35,marker);
  assert.equal(result.passed,true);assert.equal(result.matchedBy,'assertion-timeout-marker');
});

test('negative control rejects wrong assertions, startup errors, marker echoes and terminated runners',()=>{
  const marker=assertionStepMarker(0,7),expectedLine=35;
  for(const log of [
    `error: ${assertionStepMarker(0,6)}\nname: TimeoutError\nWait timed out`,
    'Error: Cannot find Chrome\n at tests.spec.js:14:1',
    `console output: ${marker}\nError: unrelated timeout`,
    `35 | await driver.wait(condition, 10000, "${marker}");\nError: browser launch failed`,
    `error: ${marker}\nname: TypeError\nUnexpected browser response`
  ]) assert.equal(evaluateFailure({status:1,signal:null},log,expectedLine,marker).passed,false,log);
  const actual=`TimeoutError: ${marker}\nWait timed out after 10000ms`;
  for(const result of [{status:0,signal:null},{status:null,signal:'SIGTERM'},{status:1,error:new Error('spawn failure')},{status:1,signal:'SIGTERM'}]) assert.equal(evaluateFailure(result,actual,expectedLine,marker).passed,false);
  assert.equal(evaluateFailure({status:1,signal:null},'Error: expectation failed\n at tests.spec.js:35:5',expectedLine,marker).matchedBy,'source-location');
});
