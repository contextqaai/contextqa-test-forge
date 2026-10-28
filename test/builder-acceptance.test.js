import test from 'node:test';
import assert from 'node:assert/strict';
import {assessScenario} from '../scripts/verify-builder-lifecycle.js';
const report = (status, error) => ({errors: [], suites: [{specs: [{tests: [{expectedStatus: 'passed', results: [{status, error: error ? {message: error} : undefined}]}]}]}]});
test('builder negative controls require a completed failure at the intended assertion, never a runner startup failure', () => {
  assert.equal(assessScenario(report('failed', 'expect(locator).toHaveText failed'), 1, 'failed', 'toHaveText'), true);
  assert.equal(assessScenario(report('passed'), 0, 'passed', ''), true);
  for (const [value, code] of [[report('failed', 'Browser launch failed'), 1], [report('timedOut', 'toHaveText'), 1], [report('skipped'), 1], [report('failed', 'toHaveText'), 0], [report('failed', 'toHaveText'), null]]) assert.equal(assessScenario(value, code, 'failed', 'toHaveText'), false);
  const retry = report('failed', 'toHaveText'); retry.suites[0].specs[0].tests[0].results.push({status: 'passed'});
  assert.equal(assessScenario(retry, 1, 'failed', 'toHaveText'), false);
  const globalError = report('passed'); globalError.errors = [{message: 'invalid config'}];
  assert.equal(assessScenario(globalError, 0, 'passed', ''), false);
});
