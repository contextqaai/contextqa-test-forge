# Your evidence, your report

Create an executive brief or a QA investigation report from the same selected results. Change the audience, title, color, section order and case detail without changing the facts. The supplied four-page PDF inspired the summary, failure analysis, history and case-detail views; the bundled data is entirely fictional and is not copied customer evidence.

## Try two styles

From the repository root with Node 22+, choose new output directories:

```sh
node examples/custom-report/render.mjs examples/custom-report/sample-results.json examples/custom-report/executive.json output/report-executive
node examples/custom-report/render.mjs examples/custom-report/sample-results.json examples/custom-report/qa.json output/report-qa
```

Open each `report.html` in your browser, or read `report.md`. `metrics.json` records derived counts. The script makes no network/model calls and runs no tests. The example contains eight fictional cases: five initially passed, two recovered and one still failed, with a final 7/8 (87.5%) pass rate. Its release decision stays **pending**. One recovery is a reviewed repair; one is an unchanged rerun. Neither establishes live ContextQA healing.

[Executive Markdown sample](samples/executive.md) · [Executive HTML sample](samples/executive.html) · [QA Markdown sample](samples/qa.md) · [QA HTML sample](samples/qa.html). GitHub displays HTML source; download/open locally to view the report. No hosting is configured.

## Customize the profile

Copy `qa.json`, then edit it and pass the new path to the same command:

| Setting | Supported values | Example customization |
|---|---|---|
| `title` | Nonempty text | “Checkout release decision packet” |
| `audience` | Nonempty text | Product leadership, QA, support or a customer handoff |
| `accent` | Six-digit hex color | `#4338ca` or `#0f766e` |
| `sections` | Unique ordered selection of `summary`, `failures`, `trends`, `cases`, `actions` | Executive: summary + actions + failures; QA: all sections |
| `caseDetail` | `all` or `exceptions` | Show every selected case or only cases with non-pass initial/final outcomes |

The selected scope, initial/final rates, failed/not-run/inconclusive counts, evidence mode and human decision remain visible in every profile. Edit the renderer if you need additional presentation features; preserve those factual invariants. These sample profiles are for this local renderer, not new settings in `src/reports.js` or ContextQA itself.

## Use the skills with your assistant

The reusable skills live at [report builder](../../skills/contextqa-report-builder/SKILL.md) and [report review](../../skills/contextqa-report-review/SKILL.md). An assistant can read the exact `SKILL.md` path for a task. For Codex discovery in your own project, copy the chosen skill folder into that project's `.agents/skills/` directory, preserving its folder name. Keep the Test Forge checkout available to use the example renderer. A skill is instructions, not an installed ContextQA integration, credential grant or background agent.

Example requests:

> Use the ContextQA report-builder skill with my reviewed run results. Make a one-page leadership brief, show open application defects first, keep the release decision pending, use our purple accent, and produce HTML plus Markdown.

> Use the same evidence to make a QA report with case details and comparable history. Keep initial failures separate from recoveries. If history is missing, say so.

> Customize this report for our team: move actions above charts, use our terminology and include only exceptions. Preserve the denominator, evidence gaps and human review status.

> Use the report-review skill to check this report against the selected input. Flag arithmetic errors, unsupported healing claims and any release recommendation presented as an approved decision.

These are prompt examples, not claims that a particular assistant automatically discovers this repo. To make reusable skills portable, keep their task-specific input and profile paths explicit when invoking them.

## Supply your own reviewed results

The renderer accepts a **normalized report input**, not a raw ContextQA API response. Collect selected results using the existing [ContextQA client workflow](../../docs/contextqa.md) or an authorized connected tool. Validate run/case membership and normalize the fields below. No new API adapter is included.

- `schema: 1`; `mode`: `synthetic` or `observed`; text `title`, `runId`, `environment`.
- `cases`: the complete selected scope with unique opaque `id`, `title`, nullable `area`, `category`, `owner`, `initial` and `final` (`passed`, `failed`, `not-run`, `inconclusive`), and `evidence` as opaque reference IDs. Final pass/fail needs evidence references. These references are not fetched or authenticated by the renderer.
- `recovery`: null, or `{kind, applied, revalidated, evidence}` for an initial failure/final pass. `kind` is `reviewed-fix` (applied true) or `rerun` (applied false); `revalidated` must be true with references. Without a known mechanism, leave it null and report “mechanism unknown.”
- `releaseDecision`: `status` (`pending`, `go`, `no-go`), nullable `owner`, and `reason`. A recorded go/no-go needs a supplied decision owner; this is a record, not an authenticated approval signature.
- `history`: empty when unavailable, or rows `{runId, date, total, initialPassed, finalPassed}`. Supply comparable scope and keep each denominator. Do not treat differing suite populations as an automatic improvement.
- `nextActions`: proposed action text for human review.

Rates divide passed cases by **all selected cases**, including not-run and inconclusive. Lift is final minus initial rate in percentage points. Case recovery count is not necessarily equal to net lift: other cases can regress. Failure analysis groups initially failed cases by supplied classification; case details and the always-visible totals also retain final failures. No model infers root causes, owners or healing from the numbers.

Review all free text before sharing; the renderer escapes markup but is not a general secret/PII sanitizer. Do not include credentials, signed URLs or raw traces. Opaque evidence references must resolve through an appropriately authorized workflow outside the report.

## PDF and other output choices

The example directly writes Markdown, HTML and metrics JSON. For PDF, open the HTML in a browser and choose **Print → Save as PDF**, enabling background graphics if desired. Inspect page breaks and long tables before sharing. An assistant with PDF tooling can perform that step. DOCX, slides and spreadsheets need their respective authoring tools; no such exporter is implied here. Keep screenshots and videos reviewed and explicitly selected before adding them to a richer template.

This is a small presentation example. Reuse [existing bug-report formatting](../../src/reports.js), [outcome measurement](../../src/outcomes.js), and [Docs Evidence](https://github.com/contextqaai/contextqa-docs-evidence) for their established responsibilities. Human review controls release acceptance and external delivery.
