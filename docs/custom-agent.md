# Build your own ContextQA agent

An agent here is your owned workflow around the existing library and review tools. You can compose it in a Node script, your CI or a separately configured coding assistant. Test Forge does not require a model, install an MCP server or grant an assistant permission to start browser work. ContextQA is the primary managed automation path; Playwright is the first portable code path.

Start with [the builder journey](sdet-builder.md), [token setup](tokens.md), [native configuration](contextqa-platform.md) and [the exact API workflow](contextqa.md). The current adapter has 40 cataloged operations and mocked transport tests; live tenant/evidence/billing acceptance remains pending.

## 1. Build without accounts first

Requires Node 22+. Each output directory must be new:

```sh
npm test
node scripts/contextqa.js operations
node examples/contextqa-workflow.js output/NEW-api-simulation
node examples/builder-lifecycle.js output/NEW-builder-example
```

The first example demonstrates simulated native authoring and explicit mappings. The second prepares the Playwright-first expense policy lifecycle. Neither calls a live source, model or ContextQA service. Follow [maintenance](maintenance.md) and [real testing](real-testing.md) to run the actual synthetic browser checks. Never apply the examples' fictional tenant IDs or scripted reviewer labels to customer data.

## 2. Connect one real saved plan read-only

An authorized superadmin creates a scoped token in ContextQA **Settings → API tokens**. Store it as `CONTEXTQA_API_TOKEN` in an ignored, private `.env` or server secret manager. Read the full [token guide](tokens.md), including connection errors and rotation. Use only the read scopes needed for your selected objects. No key belongs in a contract, profile, prompt, generated code or browser storage.

After private setup, replace `123` with an authorized real plan ID:

```sh
node --env-file=.env scripts/contextqa-connection.js --plan-id 123
```

This makes at most one read and verifies a matching plan ID. It does not verify writes, execution capacity, billing, all result access or every configuration field. Keep configured, read-verified, permission-missing, execution-authorized and result-verified states distinct. Optional `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` and the chosen source's token are separate credentials with separate sharing/charging decisions.

## 3. Keep ContextQA's configuration reusable

Copy `examples/contextqa-project.example.json` into ignored `private/approved-project.json`. Replace every synthetic ID and expected field with your reviewed tenant configuration. The profile's `expect` objects describe **read response DTOs**. They are selected drift checks, not authoring payloads. Include the native settings your workflow depends on:

| Capability | Preserve or check the configured references |
|---|---|
| Workspace/environment | Plan/case `workspaceVersionId`, `environmentId`; empty execution query reuses saved configuration. An explicit approved `query.environment` is a name/reference override, not an assumed environment ID. |
| Data-driven behavior | Case `isDataDriven`, `testDataId`; step data/loop IDs and plan data-loop references where returned. Provision existing IDs through the authorized UI/admin when no management API is supplied. |
| Prerequisites/order | Case `prerequisiteTestCaseIds`, step `preRequisiteStepId`, suite `preRequisite`; suite membership and nested device `planSuites` ordering. |
| Matrix/parallel/reruns | Plan `testPlanType`, `parallelNode`, `reRunType`, selected rerun/failure policy, device browser/platform/version references. Account limits still require verification. |

Read/write shapes differ. For example, suite writes use `testCaseIds` while the read DTO uses `testCasesDto`; nested device writes can use `suiteIds`/`settings`, while read expectations must use actual returned fields such as `suiteList`/`planSuites`. Never send a read DTO unchanged as a PUT or assume omitted PUT fields remain intact. [The platform map](contextqa-platform.md) gives the full distinctions.

Run a read-only selected-object check:

```sh
node --env-file=.env scripts/contextqa.js project-check --profile private/approved-project.json --out private/NEW-project-preflight.json
```

The check compares configured objects before a run and rejects drift. It does not lock the server against a later edit. In custom code the same API is `inspectProject(client, profile)` from `src/contextqa-project.js`.

## 4. Give your assistant narrow tools

For example, save this read-only tool factory as `examples/my-plan-agent.js`. It deliberately has no write or execution tool:

```js
import {ContextQAClient} from '../src/contextqa.js';
import {inspectProject} from '../src/contextqa-project.js';

export function createPlanReviewTool(reviewedProfile) {
  const profile = structuredClone(reviewedProfile);
  const client = new ContextQAClient(); // reads server process environment
  return async function reviewSelectedConfiguration() {
    const check = await inspectProject(client, profile);
    return {status: check.checked ? 'configuration-matches' : 'review-required'};
  };
}
```

An authorized caller must load its private profile, inspect the full private check and decide what sanitized status to share with an AI provider. The sketch does not supply a model transport or approve data sharing. Do not expose arbitrary operation IDs, bodies or paths as an unrestricted model tool; upstream source text and model output are untrusted data. Keep credentials, signed references, application data and raw API errors out of the model context.

For richer tools, use `ContextQAClient.request(operationId, options)` with a deliberate operation/object allowlist and server-owned configuration. The client fixes its origin to `https://server.contextqa.com`, sends a bearer token and derives tenant identity from that token. It has no tenant-header/base-URL switch. Never share one operator token across untrusted tenants.

## 5. Author only the required native objects

Prefer an existing case/suite/plan. If a requirement needs authoring, construct a raw DTO bundle using actual verified IDs and application details. The [API workflow](contextqa.md) shows the exact preview, source-bound approval and apply commands:

```sh
node scripts/contextqa-workflow.js preview-bundle --source private/source.json --bundle private/reviewed-bundle.json --out private/NEW-bundle-preview.json
node scripts/contextqa-workflow.js approve-bundle --source private/source.json --bundle private/reviewed-bundle.json --reviewer 'Actual automation reviewer' --confirm-reviewed --out private/NEW-bundle-approval.json
```

After reviewing the complete source, payloads, targets and side effects, the operator can separately apply those exact approved bytes with `apply-bundle --approve-write` and a **new** private authoring journal. The bundle supports reviewed create/update/patch operations and created-ID references. All operations are preflighted before the first write; accepted/failed/unknown writes remain journaled. There is no replay/resume or automatic rollback for partial authoring. A provider cannot create the human review record on its own behalf.

## 6. Execute a bounded approved plan, then inspect evidence

Only after the owner authorizes the selected configuration, environment, data, permitted side effects and potential charge:

```sh
node --env-file=.env scripts/contextqa.js project-run --profile private/approved-project.json --journal private/NEW-run-intent.json --approve-execution --out private/NEW-run-result.json
```

`runProject` preflights, delegates to `executePlanOnce`, and polls within the profile bounds. The helper durably records intent before the trigger and the accepted run ID before returning. Do not replay a journal or create another to evade an ambiguous start. `GET /test_plans/{id}/execution` is potentially billed and non-idempotent despite being GET. No automatic retry or token-accessible stop/cancel is supplied. A local timeout does not stop the hosted run.

A summary verdict requires terminal completion, consistent success and positive counts. It does not prove a business criterion. Inspect the matching plan result, then selected suite/case/step members and assertion evidence. When using generic result reads, **your coordinator must validate identity and parent membership** before treating a reference as evidence: selected run → plan, suite/case → that run, step → that case result. The generic request method does not authenticate the whole hierarchy for you.

Store raw results privately. Artifact fields may contain signed screenshot, recording, trace or report references; existence is not proof of current access or content. Inspect only authorized artifacts and never forward the ContextQA bearer to their storage hosts. This repo does not automatically download or sanitize every media reference. Keep source → native objects → accepted run → member results → reviewed portable mapping in your own private handoff.

## Relevant operations and permissions

Paths below are relative to `https://server.contextqa.com`. `scripts/contextqa.js operations` and `src/contextqa-operations.json` contain the complete catalog. A permission label is not proof that your account has it.

| Purpose | Operation / method and path | Minimum permission |
|---|---|---|
| Read saved plan | `getTestPlan` · GET `/test_plans/{id}` | `TEST_PLANS_READ` |
| Read case/suite/step | `getTestCase` / `getTestSuite` / `getTestStep` · GET `/test_cases/{id}`, `/test_suites/{id}`, `/test_steps/{id}` | Corresponding `TEST_CASES_READ`, `TEST_SUITES_READ`, `TEST_STEPS_READ` |
| Author case | `createTestCase`, `updateTestCase`, `patchTestCase` · POST `/test_cases`, PUT/PATCH `/test_cases/{id}` | `TEST_CASES_WRITE` |
| Author step | `createTestStep`, `updateTestStep` · POST `/test_steps`, PUT `/test_steps/{id}` | `TEST_STEPS_WRITE` |
| Author suite/plan | `createTestSuite` / `updateTestSuite`, `createTestPlan` / `updateTestPlan` · POST collection, PUT `/{id}` | `TEST_SUITES_WRITE` or `TEST_PLANS_WRITE` |
| Start saved plan | `triggerRun` · GET `/test_plans/{id}/execution` | `TEST_PLAN_EXECUTE`; separate explicit execution approval |
| Summary / plan result | `getRunSummary` / `getTestPlanResult` · GET `/test_plan_results/{id}/results`, `/test_plan_results/{id}` | `TEST_PLAN_RESULTS_READ` |
| Suite/case/step result | `getTestSuiteResult` / `getTestCaseResult` / `getTestStepResult` · GET `/test_suite_results/{id}`, `/test_case_results/{id}`, `/test_step_results/{id}` | Corresponding `TEST_SUITE_RESULTS_READ`, `TEST_CASE_RESULTS_READ`, `TEST_STEP_RESULTS_READ` |

Maximize meaningful reuse rather than calling all operations. Audit/media/mobile routes are unnecessary for a simple web plan. There are no supplied environment/data-profile catalog CRUD, raw browser/CDP, token-management, arbitrary Playwright upload/execution, cancellation or healing-decision endpoints. When one is required, record the gap instead of inventing an API.

## 7. Export the reviewed Playwright mapping

Read selected native case/step IDs with `read-case`, which checks selected steps belong to the case. Manually map all selected source step IDs to supported portable actions, selectors and assertions; the importer does not infer CSS from NLP or element IDs. Then:

```sh
node scripts/contextqa-workflow.js map-portable --source private/case-snapshot/source.json --mapping private/portable-mapping.json --reviewer 'Actual automation reviewer' --confirm-reviewed --out private/NEW-mapped
node src/cli.js export --contract private/NEW-mapped/contract.json --approval private/NEW-mapped/approval.json --framework playwright --out output/NEW-playwright-project
```

The source and mapping must be genuinely reviewed; example IDs are placeholders. Add builder metadata, business goal, criteria and assertion links **before** approval. [Contracts](contracts.md) explains their hashes and `traceability.json`. Export produces code, not an execution result. Your local runner and reporting infrastructure need deliberate configuration; native prerequisites/data/matrix/retries do not automatically transfer.

## 8. Operate and improve it

Use the [reviewed maintenance module](maintenance.md) for portable locator-only proposals. It preserves business intent and rejects assertion/action/data changes as locator repair; business behavior changes are escalated for a new requirement review. Revalidation and rollback decisions remain yours. No ContextQA automatic-healing result is claimed.

Use [customization](customization.md) to choose ownership, style, repository rules and subscriptions. Use [measurement](measurement.md) for actual lead time, effort, coverage, false failures and repair observations. Build notification or issue-writing adapters only with explicitly approved destinations/content; a local report is not a delivered message. A changed source or contract requires new approval before the next export or write.

[ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=custom_agent_guide)
