# Builder implementation and evidence

The SDET builder brief is applied to this private repository. Existing REST automation remains the primary managed execution path; Playwright is the first portable code journey. The separate QA Copilot discovery documents are not implemented or superseded by this work.

| Requirement | Implementation | Evidence boundary |
|---|---|---|
| Own a named agent | Builder owner/name/version, optional declared AI provider, approval-bound attribution | Self-declared labels; no forged Git author or verified identity claim |
| Build the right test | Source hash, business goal, criterion/assertion links, native case/step mappings, uncovered criteria | Mappings require review; prose is not automatically turned into valid tenant actions |
| Use ContextQA deeply | All 40 supplied-contract operations, raw authoring bundles, plan/config preflight, journaled execution and bounded results | Schema/transport tests use mocks; real tenant entitlement, billing and runs need acceptance |
| Know where tokens go | Blank `.env.example`, exact variable/scopes guide, read-only selected-plan connection check | Mock-tested 401/403/404/429 handling; no live key used in this change |
| Add your own style | Inline/POM Playwright, 2/4-space indentation, stable generated paths and custom-code separation | Fixed supported templates; no automatic conversion to an existing arbitrary POM |
| Maintain correctness | Locator-only proposal, evidence references, human approval, preserved original assertions, version and revalidation-required state | No verified native healing history/export interface; evidence labels alone are unverified |
| Keep GitHub current | Selected-source watches, review-required packets, hash-bound code, prefixed branches/files, private PR publisher/journals | Publisher mock-tested; default workflow only prepares artifacts; installation/credentials are explicit |
| Choose notifications | Event/channel/format/field settings; Markdown/JSON bug reports and deterministic delivery intents | No Slack/email/webhook adapter or durable delivery queue; no message sent |
| Measure value | Baseline/current windows, reviewed-to-verified timing, coverage denominator, maintenance, repairs, false failures, token/cost completeness | User-reported inputs are not independently authenticated; unknown costs/ROI remain unknown |
| Demonstrate the lifecycle | Deterministic expense-policy fixture: baseline, negative rule, stale locator, reviewed repair, behavior defect | Actual local browser evidence is separate from ContextQA SaaS acceptance |

The copy-ready profile is in `src/profile.js` and can be generated with `scripts/builder-profile.js init`. [Customization](customization.md) gives every supported setting and command. [The local/live acceptance guide](builder-acceptance.md) defines how to finish the remaining tenant checks without inventing results.

GitHub integration follows the official [Git tree API](https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#create-a-tree), [pull-request API](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request), and [workflow trigger documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), inspected October 27, 2026 Pacific. The implementation preserves the base tree, creates a new branch and PR, and does not update the destination branch or merge. Configure repository protections and actual token permissions before a live trial.

Build on [ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=builder_status) with a verified business workflow first. A local synthetic pass is useful engineering evidence, not a paid activation, native healing guarantee or measured business return.
