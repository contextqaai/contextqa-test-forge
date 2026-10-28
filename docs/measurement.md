# Measure whether the agent helps

Define the decision, scope and baseline before measuring. A useful first question is: “For the same agreed critical requirements, how long did our team need to reach inspectable verification and a release decision, and how much hands-on work did that take?” Keep the application build, environment, data, browser policy, review requirements and observation window comparable. Record differences rather than attributing every change to the agent.

Test Forge provides deterministic arithmetic over **local user-reported records**. It does not retrieve telemetry, authenticate evidence, query billing, verify identity or measure a business benefit automatically. Both JSON and Markdown reports retain that limitation. Source and input hashes identify content; they are not server signatures.

## Run the illustrative report

Requires Node 22+. No account or API key is needed:

```sh
node scripts/outcomes.js --input examples/outcome-input.example.json --out output/NEW-outcome-report
```

The parent directory must exist and the output directory must be new. The CLI creates `result.json` and `report.md`, with owner-only directory/file modes on POSIX. Check Windows ACLs separately. Input is bounded to 1 MB; output never overwrites an existing directory. For real observations, store input and output under ignored `private/` or outside the repository.

The shipped input is explicitly `synthetic-example`: invented dates, effort, model usage and costs. It illustrates a disclosed retry, a known token subtotal with an unknown total, and maintenance that takes **more** effort in the current window. None is a measured ContextQA/customer result. Do not relabel it as an observation.

## Use a fixed protocol

1. Select one workflow and agreed critical criteria with a business/release owner. Give each reviewed requirement version a stable ID.
2. Define baseline and current windows in UTC, including a follow-up window for slower results. Decide which builds, data and environment changes are comparable.
3. Record every independent attempt and retry, including failed and inconclusive attempts. Allocate human effort once to the attempt where it occurred.
4. Correlate the approved source/contract, native case/step or Playwright assertion, build/environment and actual result. Review the evidence privately before entering a verification time.
5. Classify false failures on unchanged builds and repairs with an owner. Preserve unknown classifications.
6. Capture actual provider usage/cost when available, declare tracking completeness and retain missing values as `null`.
7. Review the report with its denominators, missingness and scope differences. Explain which business decision the evidence supported.

Do not select only final passing runs. Shared work must be allocated once; repeating the same authoring minutes on a retry overstates effort. A changed requirement needs a new `requirementId`; a retry of the same requirement retains its original `reviewedAt`.

## Input schema 1

[`examples/outcome-input.example.json`](../examples/outcome-input.example.json) is the full copyable schema example. Unknown structured fields are rejected. Optional absent numbers/booleans normalize to `null`; absent record lists normalize to empty lists and do not establish complete tracking.

| Object | Fields and meaning |
|---|---|
| Root | `schema:1`; `kind` is `synthetic-example` or `reported-observation`; `experiment`; optional `baseline`; required `current` |
| `experiment` | Required `id`, `title`, `businessGoal`; nullable `matchedTaskAndScope` and `comparabilityNotes`. Matching is a reviewer claim, not a computed fact. |
| Each group | `window:{start,end}`, `attemptsComplete`, `attempts`, optional `coverage`, `repairs`, `modelUsageComplete`, `modelUsage`, `executionCostComplete`, `executionCosts` |
| Attempt | Required safe IDs `id`, `workflowId`, `requirementId`; optional `changeId`, `buildId`, `retryOf`; nullable `attempted`, `assertionOutcome`, `reviewedAt`, `verifiedAt`, `releaseDecisionAt`, effort/runtime fields, `unchangedBuild`, `falseFailure`; `evidenceRefs` |
| Coverage | Nullable integer `agreedCriticalCriteria`, `mappedCriticalCriteria`, `verifiedCriticalCriteria`; `evidenceRefs` |
| Repair | Required `id`, `workflowId`; nullable `accepted`, `applied`, `revalidated`, `rolledBack`; `evidenceRefs` |
| Model call | Required `id`, `provider`, `model`; `usageSource` (`provider-reported`, `estimate`, `unavailable` or null); nullable integer `inputTokens`, `outputTokens`, `cachedInputTokens`; optional `cost`; `evidenceRefs` |
| Cost | Required `id`; nullable `amount`, uppercase three-letter `currency`, `source` (`provider-reported`, `invoice`, `estimate`, `unavailable` or null); `evidenceRefs` |

Attempt `assertionOutcome` is `passed`, `failed`, `inconclusive`, `not-run` or null. Passing/failing requires `attempted:true`. `verifiedAt` requires a reported passing assertion, but a timestamp and evidence label still do not prove the assertion. Repair application requires acceptance; known revalidation/rollback requires application.

Use ISO timestamps with an explicit `Z` UTC suffix, such as `2026-10-27T09:00:00Z`. Review timestamps fall in `[start,end)`; a verification/release decision after the end is excluded from the window's lead-time calculation. Times cannot precede review. All attempts for the same workflow/requirement version use one review time. Retry links must identify another attempt of that same workflow/requirement and cannot form cycles.

Each list allows at most 1,000 records, each evidence list at most 30 labels. IDs are bounded alphanumeric/dot/dash/underscore strings. Numeric observations must be finite, nonnegative and at most 10¹²; token/count values are safe integers. Evidence references are bounded private labels such as `private/run-17-assertions.json`, without HTTP URLs, query strings or fragments. No referenced file is opened, hash checked or result fetched. Keep tokens, signed artifact URLs, user/customer data and secrets out of these records; credential-pattern rejection is only a secondary check.

## Definitions and denominators

| Measure | Calculation and interpretation |
|---|---|
| Reviewed → reported verified | Per workflow/requirement, earliest passing `verifiedAt` at or before window end with a nonempty evidence label, minus the common review time. Retries do not create extra requirements. Missing/unreferenced/late verification remains excluded and counted. |
| Reviewed → release decision | Per workflow/requirement, earliest reported decision time at or before window end minus review time. This records timing, not the decision's correctness. |
| Authoring/review effort | Sum allocated minutes across attempts of one workflow/requirement, then summarize requirements. Any missing component leaves that requirement's total unknown. |
| Hands-on effort | Authoring + review + maintenance minutes per requirement. Exclude passive model/browser waiting; do not count concurrent work twice. |
| Generation/execution runtime | Reported `generationMs` and `executionMs` per attempt, kept separate from human minutes. A fast export is not a fast end-to-end release. |
| Maintenance per workflow/change | Sum reported maintenance minutes across attempts sharing `workflowId` + `changeId`, then summarize those pairs. Records without a change ID are not maintenance observations. |
| Critical criteria mapped/verified | Reported mapped or verified agreed-critical count divided by the agreed denominator. Verified ≤ mapped ≤ agreed when provided. A source link alone is mapping, not verification. |
| Assertion pass fraction | Reported passing attempts / all `attempted:true` records. Failed, inconclusive and unknown outcomes stay in the denominator. This is not business success or a population reliability estimate. |
| Unchanged-build false-failure fraction | Human-classified false failures / attempted records with `unchangedBuild:true`. Unknown classifications and unknown build selection are exposed separately. A retry pass alone does not establish a false failure. |
| Repair acceptance | Accepted / proposals with a known acceptance decision; pending decisions are separately counted. |
| Revalidation / rollback | Reported successful revalidations or rollbacks / all applied repairs. Unknown outcomes remain in the denominator and are disclosed; 0 with unknowns does not establish failed revalidation or no rollback. |

Statistics include mean, median, min, max, known count, missing count and total count. Requirement counts distinguish reported requirements, known review timestamps and unknown review times. Zero denominators produce `null`, never 0% or 100%. `attemptsComplete:false` or null means observed-record fractions cannot describe the full population. The Markdown table is a summary; inspect `result.json` for complete sample sizes, allocation, unknown states and normalized records.

## Tokens and cost

Only `usageSource:"provider-reported"` supplies actual token observations. Complete totals require `modelUsageComplete:true` and known provider-reported values for every reported call; otherwise `value` is null and the known subtotal/count remain visible. Cached input is a subset of total input and is never added again. Do not infer a provider's total from output length or substitute one local assistant session's usage for the hosted ContextQA service's usage.

Cost totals require complete tracking and actual `invoice` or `provider-reported` amounts. Estimates are retained but excluded from actual totals. Currencies stay separate; no exchange rate or model price is inferred. Missing costs, empty incomplete records and missing bills do not establish free execution. Model-provider and ContextQA execution costs remain separate to avoid hidden double counting; determine whether an invoice already includes an AI component before calculating a combined budget outside this report.

The module does not use provider keys or inspect provider receipts. Even a `provider-reported` label is an unverified user assertion until separately reviewed. Record only the calls actually made by the measured workflow; an empty complete model list can describe no local calls, not prove that an upstream managed service used no model.

## Compare carefully

The report emits absolute `currentMinusBaseline` mean differences only when `matchedTaskAndScope:true` and both groups have complete known observations for that metric. It does not automatically match tasks, equalize windows, check population completeness or confirm comparable coverage. Review those conditions before interpreting a difference. No saving percentage, ROI, revenue attribution or causal improvement is calculated.

Escaped defects need a separately defined follow-up window, release cohort, exposure and attribution review; this schema does not calculate them. Business outcomes such as less manual regression work or faster release decisions need observed operational evidence beyond assertion passes. Record neutral or worse results as faithfully as improvements.

For integration, import `buildOutcomesReport(input)` and `renderOutcomesMarkdown(report)` from `src/outcomes.js`. The functions make no live calls, read no evidence and add no clock-derived timestamp. Equal validated input produces equal output and a stable `inputSha256`. Review before sharing: normalized records remain in the private JSON report.

[Builder journey](sdet-builder.md) · [Custom agent](custom-agent.md) · [Maintenance](maintenance.md) · [ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=outcome_measurement)
