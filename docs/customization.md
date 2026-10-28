# Start with defaults, then make the agent yours

Use one reviewed workflow first. Then customize the agent's identity, Playwright style, generated-code location, update subscriptions and report content. Settings describe what your workflow may prepare; they do not authorize a provider charge, enable a schedule, deliver a notification or merge code.

Credentials belong in the server/CLI environment described in [token setup](tokens.md), never in the profile. The profile is distinct from `contextqa-project.example.json`: the builder profile controls your local agent/export process, while the ContextQA project profile checks saved native configuration.

Try the complete offline example first: `node examples/customize-agent.js output/my-flavor`. It creates a fictional owned agent with page objects, four-space indentation, custom prefixes, a bug report, unsent notification intents, a local GitHub sync plan and a workflow draft. It makes no network calls. Inspect the outputs before adapting them to real sources.

## Create and validate a builder profile

Run at the repository root, with an existing ignored `private/` directory and new output files:

```sh
node scripts/builder-profile.js init --name 'Your reviewed owner name' --agent 'Expense Policy Guardian' --out private/forge.profile.json
node scripts/builder-profile.js validate --profile private/forge.profile.json
```

Edit the profile locally before using it with a real repository. `init` uses the repository defaults below; it does not create accounts, validate your identity or change a Git remote.

```json
{
  "schema": 1,
  "builder": {
    "agentName": "Expense Policy Guardian",
    "ownerName": "Your reviewed owner name",
    "version": "0.1.0"
  },
  "codeStyle": {"pattern": "inline", "indent": 2},
  "repository": {
    "owner": "contextqaai",
    "repo": "contextqa-test-forge",
    "baseBranch": "main",
    "branchPrefix": "qa/",
    "filePrefix": "qa-",
    "generatedDirectory": "tests/generated",
    "customDirectory": "tests/custom",
    "autoMerge": false
  },
  "subscriptions": {
    "events": ["test.created", "test.updated"],
    "mode": "manual"
  },
  "versioning": {
    "newTest": "minor",
    "locatorRepair": "patch",
    "behaviorChange": "major"
  },
  "notifications": {
    "events": ["test.failed", "maintenance.escalated"],
    "channels": ["artifact"],
    "format": "markdown",
    "include": ["summary", "reproduction", "expected", "actual", "environment", "evidence", "owner", "severity"]
  }
}
```

Add `builder.aiProvider` only when that provider actually assisted. These labels are declarations, not authentication or a claim of manual authorship. Copy the chosen `builder` and `codeStyle` into your contract **before review**. The sync planner rejects an otherwise approved contract whose builder/style differs from its selected profile; updating either requires reapproval.

## Choose readable Playwright code

`codeStyle.pattern` accepts `inline` or `page-object`; `indent` is 2 or 4 spaces. Inline keeps actions/assertions in `tests.spec.js`. Page-object output adds generated page classes and has the test call their methods; assertion markers and criterion links remain in traceability. This is the exporter's fixed pattern, not a discovery tool for an existing team's arbitrary POM architecture. Explicit style configuration currently applies to Playwright only.

Keep handwritten helpers and existing app abstractions under `customDirectory`, separate from `generatedDirectory`. Review integration imports explicitly. Regeneration is for generated artifacts; it must not overwrite the custom-code directory. The basic exporter already refuses an existing output directory. Do not hand-edit a generated project and expect later exports to merge those edits automatically.

## Name repository artifacts predictably

Select the actual authorized owner, private repository and base branch. `branchPrefix` is one safe lowercase segment ending in `/`, such as `qa/` or `expense-guardian/`. `filePrefix` ends in `-`, such as `qa-` or `expense-guardian-`. Nested custom branch prefixes are not accepted by this schema.

The planner appends the normalized source identity and a content fingerprint to the branch, for example `qa/github-42-<source-identity>-<fingerprint>`. It places files under a source-specific directory such as `tests/generated/qa-github-42-<source-identity>/`. The source-identity digest includes platform, case-sensitive ID and source locator, so issue #42 in different repositories cannot share a generated folder. The exact suffix is generated from reviewed inputs; it is not a Git identity. No workflow in this repository changes `git config user.name` or `user.email` to impersonate the declared builder.

`autoMerge` must remain `false`. A generated update belongs in a human-reviewed pull request with the applicable checks and repository protections. Source/contract hashes and native/run references describe lineage; an agent version describes your code release, not an npm/GitHub publication or independently verified execution.

## Subscribe to source changes deliberately

`subscriptions.events` selects `test.created`, `test.updated` or both. The sync planner derives creation versus update from the prior source state; these labels do not establish a live webhook subscription to Jira, Linear or another service.

| Mode | What configuration means |
|---|---|
| `manual` | Prepare on an explicit operator action; the default. |
| `github-dispatch` | The generated workflow includes `repository_dispatch` type `contextqa-test-changed`. A trusted caller must send it; this repo does not install a source-platform webhook. |
| `scheduled` | The generated workflow includes one supported UTC cron: `0 9 * * 1-5`, `0 9 * * *` or `0 9 * * 1`. Installing/enabling the workflow is a separate reviewed action. |

Only scheduled mode accepts `schedule`. Generate a reviewable workflow file without installing or enabling it:

```sh
node scripts/builder-profile.js workflow --profile private/forge.profile.json --sources contextqa --out private/NEW-subscribed-updates.yml
```

The default source secret selection is ContextQA only. Use `--sources github` or a comma-separated selection such as `--sources contextqa,jira` to include only the secrets for your selected watches. Review its trusted runner, selected source configuration, secret injection, artifact retention and visibility before installing it. A source may contain confidential test data; even a review-only packet can disclose that data if uploaded to an inappropriate repository or artifact audience. No billing or automatic execution permission follows from a source subscription. Default workflow preparation does not start ContextQA plans.

### Register the exact sources to watch

The watch file has `schema:1` and 1–20 explicit `items`. Each item has a unique safe `key`, a `source` configuration and optional relative JSON paths `contract`, `approval`, `previous`. Contract and approval must be supplied together. Relative paths resolve from the process working directory, not from the watch file's location. Use the existing adapter configurations in `examples/config/`; no local source key is needed for the separate JSON import workflow.

Example shape for an authorized GitHub issue, **with placeholder owner/repository/issue values to replace before use**:

```json
{
  "schema": 1,
  "items": [{
    "key": "expense-policy",
    "source": {
      "platform": "github",
      "owner": "YOUR_ORG",
      "repo": "YOUR_PRIVATE_REPO",
      "id": "42",
      "tokenEnv": "GITHUB_SOURCE_TOKEN"
    },
    "contract": "private/contract.json",
    "approval": "private/approval.json"
  }]
}
```

For a selected native ContextQA case, the source shape is `{"platform":"contextqa","caseId":123,"stepIds":[701,702]}` with **real authorized IDs**, at most 20 explicitly selected steps and the corresponding read scopes. This reuses case/step reads, not a tenant-wide discovery crawler. The other supported read adapters are GitHub Issues, Jira Cloud, Linear, TestRail and Xray Cloud. New source items outside the watch list require registration or a separately implemented trusted event bridge; a new test anywhere is not automatically discovered.

After reviewing the selected sources and private credentials, this command makes bounded **live source reads** and prepares local plans; it does not write remotely, call an AI model or execute tests:

```sh
node --env-file=.env scripts/subscriptions.js --profile private/forge.profile.json --watch private/forge.watch.json --out output/NEW-subscribed
```

The generated consumer workflow expects `forge.profile.json` and `forge.watch.json` at its repository root. Adapt the paths before installing it if you use the private local paths above. The toolkit is private code, not an installed npm service: the consuming private repository/runner needs authorized access to these scripts and their source files. Do not expose it by forking publicly. Inject only the selected source's secrets into the job; GitHub source reads in the generated template use `GITHUB_SOURCE_TOKEN` when the watch configuration names that variable.

Install and run the subscription workflow on the selected target repository's base branch. The Actions entry point checks `GITHUB_REPOSITORY` and `GITHUB_REF` against the profile before source reads, so a manual run on another branch stops. For local subscriptions, use the reviewed target/base checkout or explicitly supply the correct previous state; a separate toolkit checkout cannot see another repository's merged state.

### Deduplicate without approving changed requirements

For an explicitly selected source snapshot and matching approved contract:

```sh
node scripts/sync.js plan --profile private/forge.profile.json --source private/source.json --contract private/contract.json --approval private/approval.json --out private/NEW-sync-plan.json
```

Pass `--previous private/previous-sync-state.json` on later comparisons when you have the reviewed state for that same source identity. Keep the previous state's source ID/hash and approved contract hash accurate. The subscription runner automatically looks for this source’s merged `sync-state.json` under its generated directory in the base checkout when no explicit previous path is supplied. An absent file means a first observation. Persisted state is updated by merging the reviewed PR; preparing a plan does not advance it. The plan is local and makes no external writes.

The planner returns `unchanged`, `ready` or `review-required`. An unchanged source, contract and profile fingerprint do not generate another update; an unsubscribed event is also suppressed. A new/changed source without a matching approved contract produces a review packet, not replacement executable code. Existing generated code on the base branch remains stale until a reviewed replacement is approved and merged. Resolve changed criteria and mappings, bind the new source hash, record a fresh approval and plan again.

The branch fingerprint includes profile/source/contract inputs for repeatable planning. A hash does not prove that a source is current, that the reviewer is who they claim to be or that the test ran. Keep successful publication receipts separately; a prepared plan alone is not a created PR.

### Publish a reviewed plan as a private pull request

The guarded publisher supports the exact selected **private** repository and only generated-directory children. It checks a stable plan hash, safe paths and a new branch, recognizes an exact matching open PR as `existing-pr-needs-review` without writing again, rejects mismatched existing branches instead of overwriting, and keeps a private no-replay journal. Current bounds are 1–30 text files, 1 MB per file and 2 MB total. It never changes the custom directory, executes generated code, overrides Git authorship or merges a PR. A review-required source packet may contain only its permitted review files; it does not replace executable tests.

First inspect every planned path/content, base branch, source privacy and approval. Put a fine-grained `GITHUB_SYNC_TOKEN` with Contents write and Pull requests write on that selected private repository in your private process environment. This is separate from read-only source and ContextQA tokens. Then, only when publication of that exact packet is authorized:

```sh
node --env-file=.env scripts/sync.js publish --plan private/NEW-sync-plan.json --journal private/NEW-github-write-intent.json --approve-github-write
```

The command creates a branch/commit/PR if accepted and returns the actual receipt. It does not auto-merge. A stop after writes may leave accepted remote objects; preserve and reconcile the journal rather than retrying or choosing a new journal to bypass uncertainty. Local planning alone does not exercise this authenticated path. Live GitHub publishing/permissions need their own acceptance evidence.

For an opt-in consumer workflow containing the publish step, generate a **different new** file:

```sh
node scripts/builder-profile.js workflow --profile private/forge.profile.json --out private/NEW-reviewed-publication.yml --include-publish-step
```

This still only writes a draft workflow. Before installation, configure the private repository's `qa-sync-publication` environment with required reviewers and scoped `GITHUB_SYNC_TOKEN`, review the checked-out code/configuration and each publication packet, and retain the normal PR review. GitHub environment protection is something the owner must configure; the generator cannot establish it. No recurring workflow is installed/enabled by generating a file, and this tool does not send the configured Slack/email/webhook notifications by creating a PR; GitHub may send its normal repository notifications.

## Version the owned agent

The profile uses plain `major.minor.patch` versions. Ask for a recommendation:

```sh
node scripts/builder-profile.js version --profile private/forge.profile.json --change locatorRepair
```

The default recommendation is minor for a new test, patch for a locator repair, major for a behavior change. Configure those three bump classes to match your team's policy. The command does not edit the profile, contract, Git history or package version. A human chooses and approves the actual version; changing builder metadata changes the contract hash and requires reapproval. A behavior change needs requirement review even if a version number was bumped.

## Customize bug reports and notification intents

The local `renderBugReport(facts, settings)` formatter in `src/reports.js` provides Markdown and structured JSON. Its allowlisted fields form the current report template; arbitrary executable templates, custom CSS/HTML and arbitrary provider payloads are not supported. `settings.include` selects optional summary, reproduction, environment, owner and severity fields. Expected behavior, actual behavior, source, run and evidence remain visible even if omitted from `include`; missing facts display as unknown.

Facts are supplied by your coordinator after reviewing the actual failure. Do not invent severity, reproduction steps or cause from a screenshot alone. Use opaque source/run/evidence IDs or supported structured references; the formatter does not fetch or authenticate them. It rejects URLs and common credential patterns so signed artifacts and secrets are not copied into a shareable report. Review content before any external delivery.

`notifications.events` selects the events of interest, `channels` selects delivery intents and `format` chooses `markdown` or `json`. `artifact` is the default. `slack`, `email` and `webhook` are currently **intent labels**, not configured or delivered integrations. No recipient, webhook URL or service key belongs in this profile.

`notificationIntent` evaluates an explicit event and creates pending per-channel payloads with stable event-ID/channel deduplication keys. It does not persist a delivery ledger, authenticate evidence, send a message, retry delivery or verify arrival. Persist/check those keys in an authorized sender if you build one. Do not call a pending intent a sent notification. Use a stable event ID for the same observation and a new ID for a genuinely new event.

Supported notification event labels are `test.created`, `test.updated`, `test.passed`, `test.failed`, `maintenance.proposed`, `maintenance.escalated`, `sync.review-required` and `sync.pr-created`. Your coordinator supplies an event and reviewed facts; settings alone do not install event producers or monitor runs. Event selection is the supported condition mechanism; arbitrary severity predicates, escalation delays and per-recipient routing need a separately reviewed adapter.

Default conditions therefore mean “prepare an artifact intent for an explicitly supplied failure or escalated-maintenance event.” They do not mean “monitor every test,” “send automatically” or “start another run.” [Outcome observations](measurement.md) keep reported evidence and provider usage separate from notification delivery.

[Custom-agent tutorial](custom-agent.md) · [Source-bound contracts](contracts.md) · [ContextQA token setup](tokens.md) · [ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=customization_guide)

The opt-in workflow prepares and uploads the concrete plans first. Its separate `publish` job downloads those same plans and waits on the `qa-sync-publication` environment; configure required reviewers there before enabling it. Inspect the prepared artifact before approving publication. A declared environment name alone does not create a required-reviewer rule. Existing matching PRs are surfaced for review, without claiming their generated files have been independently revalidated.
