---
name: contextqa-report-builder
description: Generate and customize a ContextQA test-plan report from selected results or reviewed local evidence, with audience-specific summaries, failures, trends and case details.
---

# Build a report the team can use

Use the user's requested audience, structure and format. Treat a reference report as layout/content inspiration, not evidence of a real run or a required fixed template. The bundled example offers executive and QA profiles; users may choose different sections, wording, colors and destinations.

## Reuse first

Locate the repository's existing report and evidence tools. In Test Forge, `src/reports.js` handles individual bug reports and `src/outcomes.js` handles outcome observations; retain their provenance/unknown-value semantics. `examples/custom-report/` adds a small local plan-report presentation example, not a ContextQA API client or new execution engine. When this repository is available, read `examples/custom-report/README.md` for commands and the normalized input contract. If installed elsewhere, locate that repository or use available authoring tools with the user’s selected evidence; the skill does not depend on a fixed checkout path.

For local evidence, work from the selected files. For live results, use the authorized connected ContextQA tool or existing API client, validating plan/run/case membership. Fetch only the requested scope. Do not start a run to fill a report unless that execution was separately requested and authorized. Keep credentials and signed artifact URLs out of output. Opaque references can identify evidence without publishing private media.

## Keep the meaning stable while changing presentation

- Distinguish initial outcome, final outcome, recovery, failed, not-run and inconclusive. State the denominator for each rate; unknown results are not passes. Do not silently drop skipped or missing cases.
- Call something recovered only when an initially failed case has a supported final pass. Claim auto-fix/healing only when the supplied evidence identifies an applied change and successful revalidation; distinguish unchanged reruns. Never infer causation from two counts.
- Treat failure category, severity, owner and root cause as supplied/reviewed classifications. Unavailable values remain unknown. Keep the original attempt visible.
- Trends require comparable history, dates, scope and denominators. If no history is supplied, say so rather than drawing an invented sparkline. Distinguish percent from percentage-point change.
- A recommendation is an agent output; release approval is a named human decision. Preserve pending or disputed decisions. Changing a display profile cannot approve a release.

Create a useful default from the available facts. Use the sample's summary → failure analysis → trends → cases as one option, not a mandatory four-page layout. Do not reproduce customer data or attach the reference PDF to a repository unless requested.

## Generate and hand over

With the bundled example, edit a profile and run the local renderer to create Markdown and print-friendly HTML. PDF can be produced from reviewed HTML using an available PDF/browser tool. Other formats need the appropriate authoring tool; do not imply the example exports them directly. User instructions may override the example layout or renderer choice.

Check arithmetic, evidence references, unknown states, review status and output privacy. Open the generated output; verify long labels and tables fit the chosen layout. Deliver the requested artifact with its profile and input provenance so the team can reproduce and customize it. Publishing or messaging is separate from local generation unless the user requested it.
