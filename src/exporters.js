import {mkdir,writeFile} from 'node:fs/promises';
import {requireApproval,navigation} from './contracts.js';
import {sha} from './sources.js';
const quote=JSON.stringify;
const value=s=>s.env?`required(${quote(s.env)})`:quote(s.value);
export const assertionStepMarker=(testIndex,stepIndex)=>`CQA_ASSERTION_TEST_${testIndex+1}_STEP_${stepIndex+1}`;
function renderStep(s,f,assertionMarker) {
  const v=value(s), q=quote(s.selector);
  if(f==='playwright') {
    const e=`page.locator(${q})`;
    return ({navigate:`await page.goto(navigation(${v}));`,click:`await ${e}.click();`,fill:`await ${e}.fill(${v});`,select:`await ${e}.selectOption(${v});`,check:`await ${e}.check();`,assertText:`await expect(${e}).toHaveText(${v});`,assertVisible:`await expect(${e}).toBeVisible();`,assertUrl:`await expect(page).toHaveURL(${v});`})[s.action];
  }
  if(f==='selenium') {
    const e=`await element(${q})`;
    return ({navigate:`await driver.get(navigation(${v}));`,click:`await (${e}).click();`,fill:`await (${e}).clear(); await (${e}).sendKeys(${v});`,select:`await new Select(${e}).selectByValue(${v});`,check:`if (!await (${e}).isSelected()) await (${e}).click();`,assertText:`await driver.wait(async () => (await (${e}).getText()) === ${v}, 10000, ${quote(assertionMarker)});`,assertVisible:`await driver.wait(until.elementIsVisible(${e}), 10000, ${quote(assertionMarker)});`,assertUrl:`await driver.wait(until.urlIs(${v}), 10000, ${quote(assertionMarker)});`})[s.action];
  }
  const e=`await element(${q})`;
  return ({navigate:`await browser.url(navigation(${v}));`,click:`await (${e}).click();`,fill:`await (${e}).setValue(${v});`,select:`await (${e}).selectByAttribute('value', ${v});`,check:`if (!await (${e}).isSelected()) await (${e}).click();`,assertText:`await browser.waitUntil(async () => (await (${e}).getText()) === ${v}, {timeout:10000});`,assertVisible:`await (${e}).waitForDisplayed({timeout:10000});`,assertUrl:`await browser.waitUntil(async () => (await browser.getUrl()) === ${v}, {timeout:10000});`})[s.action];
}
const required=`const required = name => { if (!process.env[name]) throw new Error('Missing environment variable: '+name); return process.env[name]; };\n`;
export function render(contract,framework) {
  if(!['playwright','selenium','webdriverio'].includes(framework)) throw new Error('Unknown export framework');
  let header=required;
  if(framework==='playwright') header=`import {test, expect} from '@playwright/test';\n`+header;
  if(framework==='selenium') header=`import test from 'node:test';\nimport {Builder, By, until} from 'selenium-webdriver';\nimport {Select} from 'selenium-webdriver/lib/select.js';\nimport chrome from 'selenium-webdriver/chrome.js';\n`+header;
  if(framework==='webdriverio') header=`import test from 'node:test';\nimport {remote} from 'webdriverio';\n`+header;
  header+=navigation.toString()+'\n';
  return header+contract.tests.map((t,testIndex)=>{
    const name=quote(`${t.id}: ${t.title}`);
    const body=t.steps.map((s,stepIndex)=>'    '+renderStep(s,framework,assertionStepMarker(testIndex,stepIndex))).join('\n');
    if(framework==='playwright') return `test(${name}, async ({page}) => {\n${body}\n});`;
    const setup=framework==='selenium'?`const options=new chrome.Options().addArguments('--headless=new');\n  const driver=await new Builder().forBrowser('chrome').setChromeOptions(options).build();\n  const element=css=>driver.wait(until.elementLocated(By.css(css)),10000);`:`const browser=await remote({logLevel:'error',capabilities:{browserName:'chrome','goog:chromeOptions':{args:['--headless=new']}}});\n  const element=async css=>{const el=await browser.$(css);await el.waitForExist({timeout:10000});return el;};`;
    const close=framework==='selenium'?'driver.quit()':'browser.deleteSession()';
    return `test(${name}, {timeout:60000}, async () => {\n  ${setup}\n  try {\n${body}\n  } finally { await ${close}; }\n});`;
  }).join('\n\n')+'\n';
}
export async function exportProject(contract,receipt,framework,out) {
  requireApproval(contract,receipt);
  const source=render(contract,framework);
  // A fresh directory prevents overwriting customer code or following an existing symlink.
  await mkdir(out,{mode:0o700});
  const playwright=framework==='playwright';
  const dependency=playwright?{'@playwright/test':'1.64.1'}:framework==='selenium'?{'selenium-webdriver':'4.51.0'}:{webdriverio:'10.1.0'};
  const files={
    'package.json':JSON.stringify({name:`exported-${framework}-tests`,private:true,type:'module',engines:{node:'>=22'},scripts:{test:playwright?'playwright test':'node --test tests.spec.js'},devDependencies:dependency},null,2)+'\n',
    'tests.spec.js':source,
    'traceability.json':JSON.stringify({schema:1,framework,sourceSha:contract.sourceSha,sourceLocator:receipt.sourceLocator || null,contractSha:sha(contract),review:receipt,tests:contract.tests.map(t=>({id:t.id,title:t.title,sourceSteps:t.steps.flatMap((step,index)=>step.sourceStepIds?[{stepIndex:index+1,sourceStepIds:step.sourceStepIds}]:[])})),executed:false},null,2)+'\n',
    '.gitignore':'node_modules/\n.env\ntest-results/\nplaywright-report/\n',
    '.env.example':[...new Set(contract.tests.flatMap(t=>t.steps.filter(s=>s.env).map(s=>s.env)))].map(x=>`${x}=`).join('\n')+'\n',
    'README.md':`# ${framework} export\n\nReviewed source contract: ${contract.sourceSha}\n\nInstall with npm install. ${playwright?'Install Chromium with npx playwright install chromium.':'Install Chrome; the framework manages its matching driver.'} Set required environment variables in your shell; .env is not auto-loaded. Read tests.spec.js and verify target access, selectors and side effects before npm test. Run in a disposable non-production workspace.\n\nGeneration is not an execution pass. Traceability contains local review provenance, not third-party certification.\n`
  };
  if(playwright) files['playwright.config.js']="export default {testMatch:'tests.spec.js',timeout:60000,workers:1,use:{headless:true,trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'}};\n";
  for(const [name,content] of Object.entries(files)) await writeFile(`${out}/${name}`,content,{flag:'wx',mode:0o600});
  return {framework,tests:contract.tests.length,steps:contract.tests.reduce((n,t)=>n+t.steps.length,0),executed:false,sourceSha:contract.sourceSha,contractSha:sha(contract)};
}
