# Contract, review and maintenance

A normalized source has `schema:1`, platform, ID, title, description, optional revision, source steps and `sourceSha`. Jira ADF is flattened to text; rich formatting, attachments and custom fields are not copied. Normalization is a snapshot, not a statement that all requirements are testable. Preserve the source configuration privately to disambiguate same-number issues from different projects.

A contract has `schema:1`, the normalized `sourceSha` and `tests`. Each test has a unique alphanumeric/dash/underscore `id`, title and 1–100 steps. Use no more than 100 tests per contract. Environment references are runtime values; never embed actual login credentials.

The first builder journey uses Playwright. Existing Selenium and WebdriverIO exports remain available. All metadata below is optional for existing contracts; for a new builder workflow, declare the builder, business goal, agreed criteria and assertion links before review.

Playwright defaults to inline JavaScript with semicolons and two-space indentation. Optional `"codeStyle":{"pattern":"page-object","indent":4}` selects plain JavaScript page classes; use `"pattern":"inline"` for the default arrangement. `pattern` is required when this object is supplied; `indent` is optional and accepts only `2` or `4`. These settings are inside the reviewed contract hash. No arbitrary templates, executable snippets or user-selected output paths are accepted. Explicit `codeStyle` is supported only for Playwright; omit it for Selenium/WDIO rather than expecting equivalent page models. This is not Java POJO generation.

A page-object export contains `tests.spec.js` and static paths such as `pages/workflow-1.js`. Each test instantiates its plain JavaScript class and calls every reviewed step in order; named step methods contain the same selectors, environment references, actions and exact assertions as an inline export. The classes do not infer application page boundaries, share state across tests, weaken assertions or add retries. Review and adapt the generated model to your team's conventions. Both layouts use a fresh output directory and refuse to overwrite existing code.

```json
{
  "schema": 1,
  "sourceSha": "COPY_THE_64_CHARACTER_SOURCE_HASH_HERE",
  "builder": {
    "agentName": "Preferences Guard",
    "ownerName": "Sample SDET",
    "version": "1.0.0"
  },
  "businessGoal": "Give the release reviewer evidence that profile updates persist.",
  "criteria": [{
    "id": "AC-1",
    "text": "Saving an updated display name shows the Saved confirmation.",
    "sourceReferences": ["description / acceptance criterion 1"]
  }],
  "tests": [{
    "id": "save-preferences",
    "title": "Save an updated display name",
    "steps": [
      {"action": "navigate", "env": "STAGING_PREFERENCES_URL"},
      {"action": "fill", "selector": "[data-testid=name]", "env": "DEMO_DISPLAY_NAME"},
      {"action": "click", "selector": "[data-testid=save]"},
      {"action": "assertText", "selector": "[role=status]", "value": "Saved", "criterionIds": ["AC-1"]}
    ]
  }]
}
```

For value-bearing actions use exactly one `value` or `env`. `select` means native `<select>` option value, not custom dropdown text. `check` ensures a checkbox is checked; there is no toggle/uncheck action in this version. Assertions compare exact displayed text/URL, not substring or regex. Navigation supports HTTP(S) and synthetic HTML data URLs. Real application URLs and all embedded data must be inspected before execution. Frameworks run with their normal network access, not Browser Cloud's outbound proxy.

`builder` requires `agentName`, `ownerName` and `version` when supplied. Names are nonblank strings up to 120 characters; version is a nonblank label up to 80 characters. Optional `aiProvider` is a nonblank label up to 80 characters, such as `anthropic` or `openai`. Declare it when that provider assisted the work. It does not configure a provider or prove a model call, token usage or manual authorship. Do not set it for a no-model synthetic sample. Builder identity is self-declared; the exporter never changes Git author configuration or commits anything.

`businessGoal` and each criterion's `text` are nonblank strings up to 4,000 characters. A supplied `criteria` array contains 1–100 entries. Each entry has a unique 1–120-character alphanumeric/dash/underscore `id`, `text`, and optional `sourceReferences`: 1–20 distinct, nonblank labels of up to 1,000 characters. Reference labels describe locations in the **same normalized snapshot bound by `sourceSha`**, for example `description / AC-1`. They are not independently checked against that text, resolved as URLs, or fetched. The reviewer must confirm the mapping. Omitted references stay visibly `not-provided` in traceability. Metadata rejects control and text-direction characters and unknown fields in its structured objects.

Only `assertText`, `assertVisible` and `assertUrl` may carry `criterionIds`: a nonempty, distinct list of up to 100 declared criterion IDs. Unknown IDs and links on navigation/click/fill steps are rejected. Each criterion may link to several assertions; an assertion may link to several criteria. A declared criterion with no assertion is **uncovered**, and an assertion with no criterion is **unlinked**. These are mapping states, not a measured percentage of correct business behavior. The existing rule that every test contains an assertion still applies.

For a reviewed ContextQA mapping, a test may include `"contextqa":{"caseId":"501"}` and a step may include `"contextqa":{"stepId":"1002"}`. IDs are positive decimal strings within JavaScript's safe-integer range. A step reference requires its test's case reference. Existing `sourceStepIds` remains supported; when both are supplied, the step's `contextqa.stepId` must appear in that reviewed list. These fields record the reviewer’s native mapping and do not fetch objects or prove case membership. The [ContextQA import and mapping workflow](contextqa.md) separately validates selected source objects. Do not invent native IDs for a live account. Portable exports do not automatically reproduce native data iteration, prerequisites, browser matrix, parallel scheduling or healing.

`approve` hashes the complete contract and records the source hash, reviewer label and timestamp. `export` recalculates both. Editing a test or source hash invalidates approval. Approval verifies the supplied snapshot hash against its contents and the contract source hash. This does not attest reviewer identity or independently re-fetch the source. A new source must be re-imported and explicitly rebound to the contract. AI drafts do not bypass this gate.

Builder names, version, goal, criterion text/references, assertion links and native references are all inside the contract hash. Changing any of them requires a new review. The generated header takes **Reviewed by** only from the matching approval receipt, never from builder/model metadata. A local receipt is an editable process record, not a signed identity claim. Headers escape untrusted text onto a single comment line; names, reviewer labels and source text cannot inject executable statements through those comments. No provider key belongs in any metadata field.

Each export includes `traceability.json` with the self-declared builder, local review record, business goal, criteria and their assertion locations, uncovered criterion IDs, unlinked assertions and reviewed native references. Each generated assertion has a static `codeMarker` comment, for example `CQA_ASSERTION_TEST_1_STEP_4`, and a `codeFile` reference (`tests.spec.js` inline or a generated `pages/` file). The report can identify its code location without copying selector values or test data. Criteria report `mapped-not-executed` or `uncovered`; assertion `observedResult` is `null`. The exporter always records `executed:false` and `execution:{"status":"not-executed","reference":null}`. Export does not import a previous run, claim a pass, certify business coverage or synchronize ContextQA results. A separate evidence workflow must correlate the approved contract, application build/environment and real run before reporting an observed outcome.

For updates: fetch again → review changed requirements → update contract/source hash → `diff` old/new → review added, removed and changed tests → new approval → fresh export directory → compare code → run in staging → human-reviewed PR in your own repository. No deletion, remote push, source issue writeback or automatic merge occurs. Test IDs provide matching; renaming an ID appears as removal/addition.

Generated test projects are intentionally simple and editable. Playwright includes failure screenshot/video/trace configuration. Selenium and WDIO use Node's test runner and guaranteed session cleanup, but do not automatically collect equivalent media. Add reporting and evidence retention appropriate to your organization; do not assume parity. Output files use owner-only permissions on POSIX; Windows ACLs depend on the environment.
