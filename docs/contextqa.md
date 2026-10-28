# ContextQA API workflow: reuse, author, execute and export

ContextQA is the primary automation service for this workflow. Reuse an existing, reviewed ContextQA test plan whenever possible: its environments, data, prerequisites, suites and browser/device settings already belong to the account. The adapters below call the actual documented token API, not an invented `/v1/automations` facade. Local Playwright/Selenium/WebdriverIO exports are an optional portability path.

**Implementation status:** request/schema/approval/journal behavior and the end-to-end authoring example are tested with mocked transports. No live ContextQA account, authored object, paid run or billing rule has been acceptance-tested by these examples. A client method's existence does not prove the tenant entitlement or payload is execution-ready.

## Account and keys

Follow the complete [token setup and read-only connection check](tokens.md) for blank configuration, exact scopes, separate provider/source keys and troubleshooting. Use [builder profiles](customization.md) for code/notification/GitHub preferences; saved native settings remain in the distinct ContextQA project profile.

The supplied OpenAPI contract identifies `https://server.contextqa.com` as the cloud base. A superadmin obtains a token in ContextQA **Settings → API tokens**. Set `CONTEXTQA_API_TOKEN` through your secret manager or an owner-only ignored environment file. The bearer token identifies the tenant. Do not put keys in arguments, issue text, bundles, screenshots or generated scripts. Do not append UTMs to API/auth/artifact URLs.

Read scopes and write/execute scopes differ. Ask the account administrator for the minimum selected case/step/plan/result permissions. Signup entitlement, evaluation credits and pricing remain unverified; the tool does not sign up, initiate Google SSO or manage tokens.

## First run without an account

From the repository root with Node 22+:

```sh
npm test
node scripts/contextqa.js operations
node examples/contextqa-workflow.js output/contextqa-new-sample
```

Use a new ignored output directory each time. The sample uses the actual client and schema validation with a **mock `fetchImpl`**. It imports a synthetic manual requirement, approves a raw authoring bundle, resolves returned created IDs, journals nine mocked create/update/patch operations, reads an existing mock case/step, manually maps its step to selectors, and exports three portable projects. `result.json` states `liveNetworkCalls:0`, `paidExecutionStarted:false`, `browserExecuted:false`. It is not a hosted run.

Every ID, browser-version selection and authoring action in `examples/fixtures/contextqa-settings.synthetic.json` and this sample is fake. Never submit the sample bundle to a live tenant. The schema permits fields but does not prove which combinations or tenant action/template identifiers are required. Retrieve and review actual account configuration before authoring.

## Prefer an existing plan and its settings

Once authorized credentials are injected, an explicit read is:

```sh
mkdir -p private
node scripts/contextqa.js request --operation getTestPlan --id 123 \
  --out private/plan-review.json
```

Replace `123` with an account-owned plan ID. Read its cases, suites and steps using `getTestCase`, `getTestSuite` and `getTestStep` similarly. `operations` lists the catalog's exact operation IDs, paths, scopes and effects. The JavaScript `ContextQAClient` covers all **40 documented operations**, including result/audit/media/build-upload surfaces. The generic CLI supports JSON read/write requests and journaled GET saved-plan execution; multipart execution uses the library's documented `appFile` argument. A presigned upload's separate storage PUT must not carry the ContextQA bearer token.

Keep the existing plan's default environment unless an explicitly reviewed `environment` query override is needed. Do not create duplicate plans, data profiles or browser definitions merely to use this toolkit. The token contract has no environment/data-profile/device-discovery CRUD; obtain valid IDs from existing ContextQA UI/configuration. Do not invent endpoints for them.

For reusable execution, start with the [shared ContextQA platform guide](contextqa-platform.md) and `examples/contextqa-project.example.json`. A reviewed project profile names an existing plan and selected cases/suites/steps, with expected subsets of their **response DTOs**. Its checks compare actual saved configuration before starting:

```sh
node scripts/contextqa.js project-check --profile private/project.json \
  --out private/project-preflight.json
node scripts/contextqa.js project-run --profile private/project.json \
  --journal private/project-run-intent.json --approve-execution --out private/project-run.json
```

Replace all synthetic IDs with actual reviewed account configuration first. Drift blocks execution; a passed preflight does not guarantee budget, capacity, successful assertions or artifact availability. Profile `expect` fields use read/response shapes; raw authoring bundles below use write/request shapes. For example, a suite read can expose `testCasesDto`, while `TestSuiteRequest` writes `testCaseIds`. Do not copy a complete read response unchanged into a write payload.

| Reusable setting | Documented authoring fields | Required review |
|---|---|---|
| Workspace/environment | Case `workspaceVersionId`, `environmentId`; plan `workspaceVersionId`, `environmentId`; trigger optional `environment` string | IDs and named execution override must refer to the intended non-production account configuration. An ID and override string are distinct fields. |
| Data-driven cases | Case `testDataId`, `isDataDriven`; step `testDataId`, `forLoopTestDataId`; plan `forLoopTestDataId` | Copy a real approved data profile and its case/step semantics; this client does not provision or infer datasets. |
| Prerequisites | Case `prerequisiteTestCaseIds` / `preRequisite`; step `preRequisiteStepId`; suite `preRequisite` | Review actual dependency order and tenant field conventions. The synthetic example demonstrates field shapes, not that both case prerequisite representations should be applied together. |
| Suite membership | Suite `testCaseIds`; device `suiteIds` or `planSuites` (`suiteId`, `orderIndex`, optional documented fields) | Preserve the native account's mapping/order. Do not merge alternative representations blindly. |
| Browser matrix | Plan `testPlanType: CROSS_BROWSER` or `DISTRIBUTED`, `testDevices`; device `browser`, `platformBrowserVersionId`, `platformOsVersionId`, `platformScreenResolutionId`, `deviceId`, `agentId` and other catalog fields | Existing reviewed device/version IDs are required; a browser name alone does not establish supported versions, capacity or availability. |
| Parallel/retry policy | Plan `parallelNode`, `reRunType`, `retrySessionCreation`, `retrySessionCreationTimeout` | Account limits and timeout units need validation. Native configured reruns/session retries can add work/cost; client “no trigger retry” does not disable plan settings. The sample uses `reRunType:NONE` and disabled session retries. |

## Reviewed source → raw ContextQA authoring bundle

Fetch/import one Jira/Linear/TestRail/Xray/GitHub/JSON requirement through the existing source CLI, then inspect its normalized content and `sourceSha`. Author an API bundle yourself from known ContextQA schemas and tenant configuration. The tool does not translate free text into valid tenant action/template IDs, elements, data profiles or plan devices.

A bundle has `schema:1`, the normalized `sourceSha` and 1–50 `operations`. Each operation has a unique `label`, exact `operationId`, raw JSON `body`, and `id` for updates. Supported authoring operations are `createTestCase`, `updateTestCase`, `patchTestCase`, `createTestStep`, `updateTestStep`, `createTestSuite`, `updateTestSuite`, `createTestPlan`, `updateTestPlan`. Execution is deliberately excluded from authoring bundles.

The contract does not establish that **partial PUT** preserves omitted fields. Assemble a complete reviewed write DTO for your object, retaining environment, data, prerequisites, memberships, device/browser matrix and policy fields. The mock example reuses its full original request DTO for each PUT and changes only the intended field; case PATCH is separately demonstrated. Never automatically GET a response and PUT it back: read and write DTOs differ, and response-only fields are rejected. Validate these semantics in a safe tenant before updating existing configuration.

An explicit `{"$createdId":"prior-create-label"}` may appear only in numeric ID fields, ID arrays or an update's path `id`. It is replaced with the earlier server response's positive `id`; no other interpolation, model-generated code or implicit name lookup occurs. Existing environment/template/element IDs must already be supplied and reviewed. Preview substitutes positive sentinel IDs only to validate schema shape; it does not claim those IDs exist.

```sh
node scripts/contextqa-workflow.js preview-bundle \
  --source private/source.json --bundle private/reviewed-bundle.json \
  --out private/bundle-preview.json
node scripts/contextqa-workflow.js approve-bundle \
  --source private/source.json --bundle private/reviewed-bundle.json \
  --reviewer 'Account automation owner' --confirm-reviewed \
  --out private/bundle-approval.json
```

Preview is offline and needs no key. The receipt binds the complete bundle and unchanged source hash. After inspecting payloads, prerequisites, IDs, target, permissions and side effects, an authorized operator may deliberately apply that bundle:

```sh
node scripts/contextqa-workflow.js apply-bundle \
  --source private/source.json --bundle private/reviewed-bundle.json \
  --approval private/bundle-approval.json --journal private/authoring-intent.json \
  --approve-write
```

Every operation is schema-preflighted before the first write. An exclusive owner-only journal is created; each intent is flushed before its request, and responses/returned IDs are recorded before continuing. It stops on an unknown request outcome or missing created ID. Partial writes are **not rolled back**: token-accessible deletes are unavailable. An existing journal is never resumed or replayed. Inspect the private journal and tenant state to reconcile; do not make a new journal merely to retry uncertain creates. This is a client guard, not server idempotency or exactly-once delivery. Journals may contain private API responses and must stay outside Git.

## Saved-plan execution and result retrieval

Authoring approval is not execution approval. Starting a plan may bill and the trigger is non-idempotent; the token contract has no stop API. Review the actual plan/environment/data/browser/parallel/rerun settings and obtain an appropriate cost/target authorization first. A client timeout does not cancel the run.

```sh
node scripts/contextqa.js run --plan 123 \
  --journal private/run-intent.json --approve-execution
# Use the returned run ID; this next command only polls that known run.
node scripts/contextqa.js wait --run 456 --max-polls 30 --interval-ms 1000 \
  --out private/run-result.json
```

The run intent prevents replay at the same path and records a returned ID. An ambiguous start must be reconciled, not automatically resubmitted. Polling is finite; status, result and counts are separate. `passed` requires terminal completion, `SUCCESS`, a positive test count and consistent passing counts; failure, incomplete or missing/conflicting counts never become a pass. The CLI exits 2 for non-passing waits. It does not certify each assertion or artifact; inspect selected case/step results before making outcome claims.

The client uses the fixed cloud origin, per-instance request spacing, bounded responses/timeouts, no redirects and no automatic retries. Respect the contract's token/IP/rate controls and coordinate other clients sharing a token. No account cost, token-use or retained-artifact guarantee is inferred; model tokens and billed cost remain unknown unless reported elsewhere.

## Existing ContextQA case → complementary portable code

Select explicit step IDs; the importer verifies each step belongs to the requested case:

```sh
node scripts/contextqa-workflow.js read-case --case-id 123 --step-ids 701,702 \
  --out private/case-snapshot
```

This writes a normalized `source.json` and private raw records. The normalized hash includes selected native case environment/data/prerequisite settings and step data/prerequisite IDs; full API responses remain in the private raw file. It does **not** infer CSS selectors from ContextQA element IDs or compile NLP/AI steps. Create a separate mapping with `schema:1`, the source hash and the normal contract `tests` array. Each portable step additionally lists reviewed `sourceStepIds` as strings. All selected source IDs must be accounted for; each action, selector and expectation must be explicitly reviewed. Unsupported behavior stays blocked.

```sh
node scripts/contextqa-workflow.js map-portable \
  --source private/case-snapshot/source.json --mapping private/portable-mapping.json \
  --reviewer 'Account automation owner' --confirm-reviewed --out private/mapped
node src/cli.js export --contract private/mapped/contract.json \
  --approval private/mapped/approval.json --framework playwright --out output/new-portable-project
```

Use `selenium` or `webdriverio` for the other exporters. Read [real testing](real-testing.md) before executing. This is a reviewed local mapping of API case data, not an official ContextQA code-export endpoint or automatic conversion of every native action. Optional OpenAI/Claude drafting remains separate, requires content-sharing approval and never approves a bundle, starts a run or replaces provider billing.

The exported traceability manifest retains each portable step index and its reviewed native `sourceStepIds`, without selectors or data values. Source binding preserves the native configuration for review; **native prerequisite chains, data-driven iteration and browser/parallel/retry policy do not automatically acquire equivalent local-framework semantics**. Implement and review those explicitly in your own framework project when needed. No parity claim follows from a successful code export.
