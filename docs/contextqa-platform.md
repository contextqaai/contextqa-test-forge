# Build on ContextQA

ContextQA is the managed test authoring/execution/result provider for these three tools. The implementation follows the user-supplied **ContextQA API tokens OpenAPI 3.0.3, v1.0.0** contract, SHA-256 `e8b3afefcb6eba18172081a8daad8f962cb28a95a284a33acb3369ff928531fa`. Adapter behavior is tested against simulated responses; a live tenant acceptance run has not yet been recorded. A documented field is not a guarantee of an account's entitlement, device availability or runtime behavior.

## One configured ContextQA project, several products

1. Configure the workspace, environments, data profiles, prerequisites, suites and browser/device matrix in ContextQA, or submit reviewed authoring payloads for the objects supported by its token API.
2. Keep a private project profile with the saved plan ID and expected configuration. Read the actual plan/cases/suites/steps and review the profile before execution. A profile contains references and expectations, never credentials or real data-profile values.
3. Start the saved plan once with explicit execution approval and a new private intent journal. ContextQA owns prerequisite ordering, data iteration, environment resolution, parallel scheduling and browser/device execution.
4. Persist the returned run ID before polling. Separate queued/completed from passed/failed; an empty, partial or inconsistent result stays inconclusive.
5. Retrieve selected result hierarchy and artifact references privately. Review approved media before documentation export or before/after comparison. Native provider URLs, raw results and customer screenshots are not public by default.

**Test Forge** connects requirements, source-bound authoring and portable exports. **Browser Cloud** offers the managed saved-plan workflow alongside an optional local browser service. **Docs Evidence** collects selected hosted results and turns reviewed evidence into documentation. Portable exporters, static HTML/iframe rendering, optional BYOK drafting and the independent local browser are wrapper capabilities. Their implementation is not evidence that an equivalent hosted ContextQA endpoint exists.

## Capability mapping

| ContextQA capability | Documented configuration or API | How the solutions use it |
|---|---|---|
| Workspace/version | `workspaceVersionId` on cases, suites and plans | Bind authoring and expected project configuration to a selected version; preserve returned IDs. |
| Environments | Case/plan `environmentId`; `environment` query on the saved-plan trigger | Inherit the plan's default. An explicit trigger override is a reviewed string, not an environment-creation call. There is no environment CRUD/discovery endpoint in this token contract. |
| Data profiles and data-driven tests | Case `isDataDriven`, `testDataId`; step `testDataId`, `forLoopTestDataId`; plan `forLoopTestDataId` | Reference existing tenant profiles. Keep profile content and secrets in ContextQA. There is no profile CRUD/discovery endpoint in the supplied contract; content/version cannot be independently verified through those missing APIs. |
| Case prerequisites | `preRequisite`, `prerequisiteTestCaseIds` in `TestCaseRequest` | Keep configured prerequisites, rather than flattening a case into unrelated local steps. |
| Step prerequisites/conditions | `preRequisiteStepId`, parent/group IDs, `conditionType`, `conditionIf`, documented step types | Preserve reviewed relationships and control flow. Tenant action/template/element identifiers must come from ContextQA; prose and CSS selectors do not establish a valid NLP action ID. |
| Suite composition/order | `TestSuiteRequest.testCaseIds`, `preRequisite`; plan device `suiteIds` / `planSuites` | Author or reuse suites. `planSuites` supports documented order/selection metadata; runtime semantics still need tenant acceptance. Read DTOs use different fields, such as `testCasesDto` and `suiteList`; do not PUT a read DTO unchanged. |
| Plans | Read/create/update `/test_plans` and `/{id}` | Reuse a complete saved plan where possible, or submit a reviewed complete request DTO. Partial plan PUT behavior is not established; no automatic merging or destructive replacement is performed. |
| Parallel execution | `TestPlanRequest.parallelNode` and device/suite configuration | Delegate scheduling to ContextQA. This is requested parallelism, not a promise that the account has that many available nodes. |
| Cross-browser testing | `testPlanType: CROSS_BROWSER`; `testDevices` entries with browser/platform/version references | Preserve the saved matrix and verify the expected entries. Device/browser catalog APIs are absent, so supported combinations must be selected in ContextQA. Never substitute a local Chromium-only run for that matrix. |
| Mobile/device execution | `TestDeviceRequest` app/device fields; documented build-upload and multipart execution routes | JavaScript low-level adapter exposes the documented build helpers and bounded inline APK/IPA request. No automatic upload, storage PUT, arbitrary file execution or verified mobile recipe is implied. |
| Retry/recovery | `reRunType`, `retrySessionCreation`, recovery and prerequisite failure settings | Preserve ContextQA's reviewed policy. Platform reruns may create additional activity/cost; the client never retries an ambiguous trigger. A polling timeout does not cancel a platform run. |
| Evidence capture | Case `videoRecording`, `captureAllStepScreenshots`; plan `screenshot`; optional result screenshot/video/trace/report fields | Request capture through approved authoring, then record actual returned references. A trace viewer URL does not establish a downloadable Playwright ZIP, and screenshots may be absent. |
| Existing result hierarchy | Plan/suite/case/step list/detail and `/test_plan_results/{id}/results` | Retrieve selected records, validate parent membership, preserve raw results privately and attach explicit run provenance. Avoid whole-tenant crawls or guessed filter syntax. |
| Audit visibility | Documented `/api/v1/system-audits...` read operations | Available in the JavaScript operation catalog with a separate `VIEW_SYSTEM_AUDIT` scope. Opt in only when needed; audit counts are not a billing or model-token ledger. |

The JavaScript adapter catalog lists **all 40 documented operations**, including multipart and upload-URL request helpers. That is callable adapter coverage, not 40 live acceptance tests. Docs Evidence exposes the 26 JSON authoring/result operations relevant to evidence plus its dedicated saved-plan trigger; it does not duplicate the audit/mobile/storage surface. No unsupported environment/profile/browser catalog, delete, bulk, copy, clone, stop or token-management route is invented.

## Credentials and scopes

Use the ContextQA app **Settings → API tokens** as an authorized superadmin. The supplied contract does not establish a universal signup-to-token entitlement or a programmatic token-creation route. Inject `CONTEXTQA_API_TOKEN` from a secret manager or ignored owner-only environment file. The wire header is `Authorization: Bearer ...`; the token identifies the tenant, so no extra tenant header is sent. The API origin is **https://server.contextqa.com**. Do not add marketing UTM parameters to API or signed URLs.

| Task | Required permission families |
|---|---|
| Read configuration | `TEST_PLANS_READ`, plus `TEST_CASES_READ`, `TEST_SUITES_READ`, `TEST_STEPS_READ` for resources checked |
| Author selected objects | Matching `TEST_CASES_WRITE`, `TEST_STEPS_WRITE`, `TEST_SUITES_WRITE`, `TEST_PLANS_WRITE`; no write scope needed just to run an existing plan |
| Execute saved plan | `TEST_PLAN_EXECUTE` |
| Read outcomes/evidence | `TEST_PLAN_RESULTS_READ`; case/step/suite result read scopes only when selected |
| Optional upload/audit helpers | `MEDIA_UPLOAD` / `VIEW_SYSTEM_AUDIT` as indicated by the catalog |

ContextQA tokens, local browser tenant keys, source-platform credentials and OpenAI/Anthropic BYOK keys are separate. Optional model drafting does not approve a payload, start a test or replace ContextQA charges. Hosted model tokens/cost remain unknown unless the platform supplies an actual meter; local request counts and elapsed time must not be presented as that meter.

## Reusable saved-plan profile

The shared JavaScript profile uses schema 1: a name; `plan: {id, expect: {...}}`; optional `cases`, `suites`, `steps` lists of `{id, expect: {...}}`; and bounded `execution` polling options plus explicit trigger `query`. Expectations use **read response DTO fields**, not authoring DTO fields. Objects match the specified subset; arrays require the full expected count/order, with subset objects per entry. Additional unmentioned scalar fields are not claimed verified. A missing or changed expectation stops before triggering. This read check is not a server-side transaction: configuration can still change after preflight; use a controlled plan/version for a run.

`examples/contextqa-project.example.json` in the JavaScript repositories contains **fictional IDs** showing environment, a data profile, prerequisites at three levels, suite membership, parallelism and two browser entries. Replace every fictional ID and expected setting with reviewed values from your tenant. Do not run that sample against a real account unchanged.

```sh
# JavaScript repositories; secret manager has already injected CONTEXTQA_API_TOKEN.
mkdir -p private
node scripts/contextqa.js operations
node scripts/contextqa.js request --operation getTestPlan --id PLAN_ID --out private/plan.json
# Prepare private/project.json from the sample after inspecting real read DTOs.
node scripts/contextqa.js project-check --profile private/project.json --out private/preflight.json
# The next command may incur ContextQA charges. Use only an approved target/policy.
node scripts/contextqa.js project-run --profile private/project.json --journal private/run-intent.json --approve-execution --out private/run-result.json
# If polling stops, resume reads with its accepted run ID; never replay the trigger.
node scripts/contextqa.js wait --run RUN_ID --max-polls 30 --out private/resumed-result.json
```

These are operator CLI commands, not public HTTP endpoints. Upstream tokens are not passed to the local browser server or its tenants. Docs Evidence supports the same profile with `cqa-artifacts contextqa-project-check --profile private/project.json --out private/preflight.json`; `contextqa-run --plan-id PLAN_ID --profile private/project.json --journal private/run.jsonl --approve-execution` checks it again before starting. Its bounded run/poll/collect/review commands are documented in its ContextQA integration guide. Its `contextqa-collect --profile` option separately records supplied capture metadata; that metadata alone does not establish a preflight occurred. The Python execution wrapper supports an explicit environment override but not mobile build query overrides.

## Execution and acceptance boundaries

The documented trigger is **GET `/test_plans/{id}/execution`**, despite having a side effect. It may be billed and is non-idempotent. Do not turn it into a clickable link, prefetch it or auto-retry it. Each CLI attempt needs explicit approval and a fresh exclusive private intent file; a local journal is a replay guard, not upstream exactly-once delivery. After an unknown outcome, reconcile in ContextQA. The token contract contains no stop/cancel API.

Safe JSON reads also have no hidden retries. A 429 exposes `Retry-After` metadata; resume the known read after that delay. The adapter spaces requests by default, but operators must coordinate the documented **120 requests/minute/token** limit across processes. No concurrency/retention/SLA/price is inferred from the contract.

Before recording a public success claim, use one approved non-production plan: verify its environment/data/prerequisites/browser configuration, read a known run, approve a single potentially billed execution, save the accepted ID, verify terminal outcome and per-case/step evidence, inspect actual media availability/redaction, and test a deliberate failure. Confirm account entitlement, parallel capacity and charging with the platform owner. Until such a receipt exists, examples remain **simulated API transport** and local-browser evidence remains **local-browser evidence**.

## Extending the platform

Keep three boundaries: source/partner adapters supply reviewed requirements; the ContextQA adapter owns documented authoring/configuration/execution/result calls; output adapters produce portable code or reviewed documentation. Partner adapters must not duplicate scheduling, data iteration, prerequisite handling or a cross-browser runner when a saved ContextQA plan already supplies it. Existing plan configuration is the reusable service contract for each solution.

When the product adds an API for environment/profile/browser discovery or another capability, update the source-backed operation/schema catalog, permission/effect classification and transport tests first. Add a typed adapter and private acceptance recipe next; only then expose the capability in the product workflow. Do not reach undocumented application routes with a token, silently fall back to a local engine, or send extra upstream scopes merely to claim feature coverage. MCP/OAuth discovery is a separate interface and has not been verified by this REST adapter work.
