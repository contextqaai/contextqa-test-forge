# Connect ContextQA and keep credentials separate

ContextQA is Test Forge's default automation layer. Start with **read access to one saved plan**; add authoring or execution permissions only when your reviewed workflow needs them. The connection check below does not start a run, write objects, call an AI provider or read an entire workspace.

This guide describes the current repository and supplied API-token contract. Unit tests use fake credentials and mocked responses. No live token, account entitlement or billed execution was tested to prepare this guide. A key being present is not proof that an integration works.

## First, run the no-key sample

Requires Node 22+. These commands need no ContextQA, model or source-platform credential:

```sh
npm test
node scripts/contextqa.js operations
node examples/contextqa-workflow.js output/NEW-contextqa-simulation
```

Use a new output directory. The example uses simulated ContextQA transport and fictional IDs. Do not submit its authoring bundle or IDs to a real tenant. Local JSON import also needs no source key. Generated Playwright code is not an execution result.

## Obtain a scoped ContextQA token

The supplied contract says an authorized **superadmin** creates a token in the ContextQA application under **Settings → API tokens**. If you lack that role, request a token for the specific workflow from your workspace administrator. The API does not create or manage tokens. Signup does not establish API access, credits, a trial, execution capacity or a paid entitlement.

Prefer a supported non-Google sign-in. Never initiate Google single sign-on for anyone without explicit permission for that particular sign-in. This CLI does not initiate any sign-in flow.

The only ContextQA credential variable used here is **`CONTEXTQA_API_TOKEN`**. The client sends `Authorization: Bearer ...` to the fixed cloud origin `https://server.contextqa.com`; tenant identity comes from the token, with no extra tenant header. Do not add UTM parameters to API/authentication/signed-artifact URLs. There is no ContextQA base-URL override in this client.

| Task | Minimum selected permission(s) |
|---|---|
| This one-plan connection check, `getTestPlan` / `GET /test_plans/{id}` | `TEST_PLANS_READ` |
| Inspect saved cases, suites, steps in a project profile | Add `TEST_CASES_READ`, `TEST_SUITES_READ`, `TEST_STEPS_READ` only for objects actually read |
| Read run summary/plan results | `TEST_PLAN_RESULTS_READ` |
| Read selected suite/case/step results | Corresponding `TEST_SUITE_RESULTS_READ`, `TEST_CASE_RESULTS_READ`, `TEST_STEP_RESULTS_READ` |
| Execute an existing reviewed saved plan | `TEST_PLAN_EXECUTE`; the separate read/preflight/result calls need their own read scopes |
| Reviewed authoring of cases/steps/suites/plans | Corresponding `TEST_CASES_WRITE`, `TEST_STEPS_WRITE`, `TEST_SUITES_WRITE`, `TEST_PLANS_WRITE` only where needed |

Scope names come from the operation catalog, not a guess about UI checkbox labels. Running an existing saved plan does not itself require write scopes. Do not request audit/media-upload/all-privilege scopes merely to check a connection. The contract has no environment/data-profile catalog management, token management or stop/cancel route; obtain the relevant configured IDs through your authorized administrator/UI. See [API workflow](contextqa.md), [platform configuration](contextqa-platform.md) and [capability evidence](capability-register.md).

## Put the credential in the process that uses it

At the repository root, create an ignored `.env` **only if it does not already exist**. This command is usable from macOS/Linux shells or PowerShell and refuses overwrite:

```sh
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; writeFileSync('.env',readFileSync('.env.example'),{flag:'wx',mode:0o600});"
```

If `.env` exists, keep it and edit it privately; do not replace its other settings. On macOS/Linux also run:

```sh
chmod 600 .env
```

On Windows, store the checkout in your private user directory and check the file's Security permissions so only your account and authorized administrators can read it. Unix mode bits do not replace Windows ACLs.

Open `.env` in your local editor and fill only `CONTEXTQA_API_TOKEN=` for this first check. The tracked `.env.example` must keep its credential values blank. A supported secret-manager launcher can inject the same variable instead, without a local file. Never paste the key into a chat, prompt, issue, test case, generated script, command argument, screenshot or browser local/session storage.

**Node does not automatically load `.env`.** The examples use `node --env-file=.env ...`, relative to the current working directory. Existing process environment variables take precedence over values in that file. If an old shell variable is present, update/remove it privately before testing; changing `.env` alone may not change the key used. A separate process or already-open terminal does not automatically receive your new configuration. Only load environment files you trust: Node configuration variables can also be present in them. [Official Node environment-file documentation](https://nodejs.org/api/cli.html#--env-filefile).

## Check one known plan without executing it

Ask the administrator for a plan you may read. Replace `123` with **that actual plan ID**; it is a placeholder, not an example tenant resource.

```sh
node --env-file=.env scripts/contextqa-connection.js --plan-id 123
```

The helper uses the existing server-side client and performs at most one `getTestPlan` request. It requires the returned integer ID to match the selection. It returns a safe status, HTTP status, request count and required permission; it omits the token, plan body/name, upstream error body, signed URLs and redirect destination. It rejects token arguments and unknown/duplicate flags without echoing their contents. There is a 10-second request deadline through the client's abort signal, bounded response reading, manual redirect handling and no automatic retry.

Example shape **only**, not a live receipt:

```json
{
  "status": "read_access_verified",
  "planId": 123,
  "readAccessVerified": true,
  "requestCount": 1,
  "executionAuthorization": "not_checked",
  "liveResultVerification": "not_checked",
  "paidExecutionStarted": false
}
```

| Status | Meaning and next action |
|---|---|
| `not_configured` | No usable key is present in this process. Load the private file or secret-manager environment; no request was sent. |
| `configuration_invalid` | Missing/invalid plan selection or locally invalid credential configuration; no request was sent. Inspect locally, without printing the key. |
| `read_access_verified` | This selected plan was returned. Other objects, writes, execution, billing and result access remain untested. |
| `credential_rejected` / HTTP 401 | Authentication was rejected; the key may be invalid, expired or inactive. Have the authorized administrator check/replace it. |
| `permission_missing` / HTTP 403 | Read access is blocked. Check `TEST_PLANS_READ`, tenant/role and token IP restrictions. A 403 alone does **not** establish which condition failed. |
| `plan_unavailable` / HTTP 404 | Check the plan ID, tenant and object access. Do not conclude that the object exists elsewhere or grant yourself broader access. |
| `rate_limited` / HTTP 429 | No retry occurred. Respect returned `retryAfterSeconds` before a later safe read and coordinate shared-token callers. |
| `unexpected_response` | A successful HTTP response did not confirm the selected plan's identity; read access was not verified. |
| `connection_error` | Transport, redirect, server or response parsing failed; raw details are suppressed. Check connectivity/service health privately. |

CLI exit codes: **0** selected read verified; **2** setup/access/rate-limit/usage action needed; **1** transport or unexpected-response failure. A nonzero result is not a reason to try an execution URL. The contract states 120 requests/minute/token; the shared client spaces starts by 550 ms, but separate processes still need coordination. This checker does not probe every scope or run an execution just to test permission.

If you need to review the actual configuration, create a private directory and save one separately selected response. The output file must be new:

```sh
node --input-type=module -e "import {mkdirSync} from 'node:fs'; mkdirSync('private',{recursive:true,mode:0o700});"
node --env-file=.env scripts/contextqa.js request --operation getTestPlan --id 123 --out private/plan-review.json
```

Review actual environment/data/prerequisite/suite/browser/parallel/rerun settings. Then copy and adapt `examples/contextqa-project.example.json` outside tracked files and perform a read-only project preflight:

```sh
node --env-file=.env scripts/contextqa.js project-check --profile private/approved-project.json --out private/NEW-project-check.json
```

The supplied profile IDs are fictional. Replace them and the expected response fields with authorized values first; read and write DTOs can differ. A passing profile check does not lock server configuration against later edits.

## Progress to execution and evidence separately

Keep these states distinct in your agent/UI:

1. **Credential configured:** local presence only.
2. **Read access verified:** the check above returned one matching plan.
3. **Execution authorized:** the builder has approved the exact bounded workflow/target and potential charge, and the actual request has been accepted with a durably recorded run ID. Do not infer this from a read check or token presence.
4. **Live result verified:** inspect the correct completed run, consistent positive counts, actual assertions and selected member evidence for the requirement. Missing, failed or contradictory evidence is not a pass.

The new checker always leaves execution/result verification `not_checked`. Use the [journalled API workflow](contextqa.md) and [live acceptance recipe](real-testing.md) for those later steps. `GET /test_plans/{id}/execution` is potentially billed and **non-idempotent despite being GET**. Never prefetch or use it as a connectivity probe. Do not retry an ambiguous start or create a new journal to bypass reconciliation. A polling timeout does not stop the upstream run, and no token-accessible cancellation or cost cap is established.

## Optional AI: different keys, account and billing

AI is optional; it does not replace the ContextQA connection or authorize browser actions. Select one provider and an account-available model in `.env`, leaving all real key values out of documentation:

```dotenv
# OpenAI direct API
AI_PROVIDER=openai
AI_MODEL=YOUR_ACCOUNT_AVAILABLE_MODEL
OPENAI_API_KEY=
```

```dotenv
# Claude direct API
AI_PROVIDER=anthropic
AI_MODEL=YOUR_ACCOUNT_AVAILABLE_MODEL
ANTHROPIC_API_KEY=
```

Create/manage OpenAI API keys through the dashboard linked from the [official OpenAI quickstart](https://developers.openai.com/api/docs/quickstart#create-and-export-an-api-key). For Claude, follow the [official API-key guide](https://platform.claude.com/docs/en/get-api-key). The present adapter sends a direct Messages request using `x-api-key` and its configured API version; use a **workspace-scoped** Claude API key. Current Claude documentation says broader keys can need `anthropic-workspace-id`, which this adapter does not configure. Workload/cloud-provider credentials are not interchangeable with this direct-API key. [Claude authentication and workspace requirements](https://platform.claude.com/docs/en/api/overview#authentication).

For an explicitly trusted **OpenAI-compatible Chat Completions** endpoint only:

```dotenv
AI_PROVIDER=openai-compatible
AI_MODEL=YOUR_PROVIDER_MODEL
AI_API_KEY=
AI_BASE_URL=https://YOUR_TRUSTED_HOST/v1/
AI_ALLOW_CUSTOM_HOST=YOUR_TRUSTED_HOST
```

That endpoint must support the adapter's protocol/authentication/text shape; “compatible” does not mean every vendor. `AI_API_KEY` takes precedence over the provider-specific key in the existing adapter. Leave it, `AI_BASE_URL` and `AI_ALLOW_CUSTOM_HOST` blank for native providers, and clear stale values when switching. `AI_MAX_OUTPUT_TOKENS` defaults to 2048, allowed 1–8192; it is not a monetary cap.

No provider call occurs merely because keys are set. Drafting requires the exact input file's explicit `--approve-data-sharing`; inspect the file first. Read [AI configuration, usage and privacy limits](ai.md). Provider charges are separate; missing usage/cost stays unknown. ContextQA REST tokens, model API keys and a separately authenticated MCP connection cannot substitute for each other. This guide does not create or configure an MCP connection.

## Only configure the source you chose

The shipped `examples/config/` files name these variables; an adapter can reference a different environment name only when its trusted config explicitly says so. Require no source credential for local JSON import.

| Source | Variables and current adapter boundary |
|---|---|
| GitHub Issues | `GITHUB_TOKEN`; fine-grained token with read access to Issues on the explicitly selected repository. Pull-request objects are rejected. |
| Linear | `LINEAR_API_KEY`; personal API-key Authorization by default. A current OAuth access token works only with the existing `oauth:true` configuration; no OAuth browser login is implemented. |
| Jira Cloud | `JIRA_EMAIL`, `JIRA_API_TOKEN`; account email plus classic API token using Basic auth against the configured site, with Browse Projects/issue security access. Scoped-token gateway and Server/DC are not supported here. |
| TestRail | `TESTRAIL_EMAIL`, `TESTRAIL_API_KEY`; email/key Basic auth with API enabled in the selected installation. |
| Xray Cloud | `XRAY_BEARER_TOKEN`; a current bearer obtained through the provider's documented client-credential exchange outside this adapter. Jira credentials are not interchangeable. |

See [source endpoints, official references and limitations](sources.md). Each adapter reads one explicit item; it does not crawl attachments or write back. Keep source credentials out of ContextQA DTOs and model input files.

For a subscription watch, you may use a separate `GITHUB_SOURCE_TOKEN` with **Issues: read** on only the selected source repositories. The source adapter does not automatically discover that alternate name: each GitHub watch's trusted `source` configuration must explicitly contain `"tokenEnv":"GITHUB_SOURCE_TOKEN"`. The subscription workflow injects the corresponding Actions secret under that name. The ordinary single-item source examples still default to `GITHUB_TOKEN`; these are separate choices, not interchangeable implicit fallbacks.

Optional private-repository pull-request publication uses **`GITHUB_SYNC_TOKEN`**, separate from source reads, ContextQA and AI. Give a fine-grained token access only to the explicitly reviewed private destination repository, with **Contents: read and write** and **Pull requests: read and write**. The adapter reads the base commit and creates a tree, commit, branch and pull request. It rejects public, archived, disabled or mismatched repositories, does not merge, and does not require workflow-write permission. Use a fresh durable journal and explicit `--approve-github-write` only after reviewing the complete local plan and source privacy. Token possession alone does not authorize publication; ambiguous writes require reconciliation before another attempt.

Keep `GITHUB_SYNC_TOKEN` out of ordinary tests and artifact-only subscription jobs. If you deliberately generate a publication workflow with `--include-publish-step`, configure it only in the trusted, reviewed consumer repository with the separate protected `qa-sync-publication` environment and its selected-repository secret. Reviewers/approval protections must be configured by that repository's administrator; naming an environment in a generated file does not prove those protections exist. Merely generating this workflow does not install or enable it. It is not a source-result writeback or notification delivery credential.

## CI: inject only the required secret into a trusted job

Ordinary `npm test` and synthetic examples need no account secrets. For a separately approved read-only check, configure a repository or protected environment **Actions secret** named `CONTEXTQA_API_TOKEN`; keep the selected plan ID as a non-secret reviewed input. Inject the secret through the step's `env` rather than an argument. [Official GitHub Actions secrets guidance](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

Proposed example fragment, **not an enabled workflow or execution approval**:

```yaml
- name: Check the selected ContextQA plan read
  env:
    CONTEXTQA_API_TOKEN: ${{ secrets.CONTEXTQA_API_TOKEN }}
    CQA_SELECTED_PLAN_ID: ${{ inputs.plan_id }}
  run: node scripts/contextqa-connection.js --plan-id "$CQA_SELECTED_PLAN_ID"
```

Place it only in a trusted manually requested job with reviewed code, timeout and the intended environment protections. An absent secret is an empty string and produces `not_configured`. Do not expose secrets to untrusted pull-request code or use elevated workflow events to bypass fork restrictions. An automatic Actions `GITHUB_TOKEN` is not a general token for a different source repository; configure the explicitly scoped source credential separately when needed. AI credentials belong only in a separately approved drafting job, never a global environment shared by routine tests. Real execution requires its own exact target/configuration, journal and known cost boundary; this fragment only reads.

## Rotate, revoke and remove

Stop launching new live actions while replacing a credential. Ask the authorized ContextQA administrator to create a replacement with the minimum scope/expiry appropriate to the work; update the secret-manager value or ignored `.env`, restart/relaunch the consuming process, then verify the selected read again. Existing shell values may override `.env`. Have the administrator revoke/expire the old token using the supported account management process; token management is excluded from this REST surface, and the exact current revocation UI is not verified here. Use the corresponding provider/source console for those separate keys.

If a key was exposed, treat deletion from a file as insufficient: rotate/revoke it and inspect any affected logs/artifacts through your existing incident process. Remove unused credentials from local files and Actions secrets, and stop processes that still hold them. Do not forward the ContextQA bearer to artifact storage hosts, even when an API response contains a signed URL. Nothing in this guide asks you to paste a key into an AI conversation or to authorize Google SSO.

Implementation and official key/environment references reviewed October 27, 2026. The connection tests are mocked, not live acceptance evidence. Useful next step: [review the ContextQA workflow](contextqa.md), or [discuss API evaluation](https://contextqa.com/book-a-demo/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=tokens_api_evaluation) if access/entitlement remains unavailable; that page does not automatically grant API access.
