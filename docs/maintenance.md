# Maintain the right assertion

ContextQA remains the managed automation service. Reuse its saved plans, environments, data profiles, prerequisites, suites, browser matrix and retry policy. Read selected results through `getRunSummary`, `getTestCaseResult` and `getTestStepResult`, and inspect the corresponding private evidence. See the exact paths/scopes in [the API guide](contextqa.md) and [capability register](capability-register.md).

The supplied REST contract does **not** expose a verified healed-selector history or repair decision endpoint. This repo therefore implements a **reviewed portable locator repair**, not automatic ContextQA-to-Playwright healing. A native case or element ID is not a CSS selector. An authenticated MCP capability could extend this later after its schemas and behavior are verified. Existing MCP discovery files are a separate workstream.

## Classify before changing code

| Classification | Action |
|---|---|
| `locator-drift` | Inspect observed current UI/evidence. Propose only locator changes while retaining source, target, data, all steps, assertions, criteria and native mappings. |
| `behavior-change` | Escalate the defect or changed requirement. Do not change an expected value to make a failing test green. |
| `data-environment` | Check the chosen environment, permissions, data/profile and prerequisites before changing code. |
| `unknown` | Preserve failure/evidence and investigate. |

`src/maintenance.js` permits only selector differences and a builder version change in the locator-repair route. Removing steps, weakening assertions, changing values or remapping native step IDs makes the proposal ineligible. A new legitimate requirement goes through ordinary source/contract review instead.

## Review, export, rerun

Save selected evidence references in an ignored JSON file. Example shape: `[{"kind":"contextqa-step-result","ref":"12345"}]`. Use your actual selected result ID; this example is not an account record. Local evidence uses `{"kind":"local-artifact","ref":"private/failure-report.json"}`. References are supplied labels, not independently fetched proof. Keep signed artifact URLs out of this file.

```sh
node scripts/maintenance.js propose --before private/old-contract.json \
  --after private/proposed-contract.json --source private/source.json \
  --evidence private/evidence.json --classification locator-drift \
  --reason 'Reviewed current button locator; original policy assertions unchanged' \
  --out private/repair-proposal.json
node scripts/maintenance.js approve --proposal private/repair-proposal.json \
  --reviewer 'Your name' --confirm-reviewed --out private/repair-approval.json
node scripts/maintenance.js export --proposal private/repair-proposal.json \
  --approval private/repair-approval.json --out output/repaired-test
```

All output paths must be fresh. Inspect the complete proposal and source before approval. Export remains `reviewed-awaiting-rerun`: it does not run the app, update ContextQA or assert that a repair succeeded. Separately approve a ContextQA authoring bundle if native configuration needs changing; do not send a read DTO as a partial PUT. Then separately authorize the saved-plan run and collect its results. Keep the same original business expectations in the Playwright rerun and negative control.

For an uncertain trigger, keep the durable execution journal and reconcile the run ID. There is no token-accessible cancellation API and no safe automatic replay. For rollback, retain the previous contract, approval, source snapshot, generated-code commit and run evidence; create a reviewed revert PR. No upstream delete or rollback is implied.

The [builder lifecycle](builder-acceptance.md) exercises a local synthetic locator update and a behavior defect with real Playwright. It makes no native self-healing claim. [Outcome reporting](measurement.md) keeps accepted repair, observed revalidation and rollback distinct.
