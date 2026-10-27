# Use cases and a fair comparison

## GitHub issue → portable regression

A developer adds acceptance criteria to issue 42. Fetch the explicit issue using a repository-scoped read token. Review the source, map staging controls to CSS selectors and turn each acceptance criterion into an assertion. Export Playwright for the application team, Selenium for an existing WebDriver suite, or WDIO for a JavaScript team. The same source hash and test IDs travel with every export. The complete synthetic preferences example runs through this path in `examples/demo.js`.

## Jira/Linear story → QA handoff

A product owner describes a changed preference or checkout rule. Optionally ask Claude/OpenAI to propose positive, negative and boundary cases from reviewed text. Confirm missing business rules with the owner. Use environment references for approved demo data. Review actual selectors and assertions before approving the contract. Keep ambiguous payment, deletion or account changes out of automated execution until the application owner authorizes a safe test environment.

## TestRail/Xray manual case → maintained code

Preserve action, data and expected-result text in the source snapshot. Translate each step into supported actions. Unsupported uploads, iframes and custom widgets stay manual or require a reviewed extension to the exporter. Run an exported test against staging, inspect assertions and retain the runner output. Source writeback/result synchronization is not bundled; link the run artifact from your own process after review.

## Layerpath and EkLine documentation workflows

Use an approved application test to identify navigation and evidence checkpoints. Export Playwright to retain failure traces/screenshots/video, or use the separate Browser Cloud service for screenshots and session evidence. Feed selected, reviewed media and step text into `contextqa-docs-evidence`. Layerpath authors can manually import approved media into a demo; EkLine authors can use the reviewed text as a documentation brief. Refresh after a product change by re-fetching the requirement, updating the contract, rerunning, reviewing before/after evidence and updating the native documentation/draft. Test Forge itself does not publish to Layerpath/EkLine or prove their native lifecycle integration.

## “I can build this with Claude”

Yes: a coding assistant can create useful tests, and this repository can use Claude. Evaluate the repeatable workflow rather than claiming a model is obsolete. This project's concrete value is source snapshots, a common reviewed contract, multiple portable exports, change detection, safe key handling and observable usage. It still needs good requirements, application access and human review. A one-off prompt may be faster for a simple test; no universal speed or cost advantage is claimed.

For a controlled experiment, use the same five approved cases, same app version and same success criteria. Record active authoring minutes, wall-clock time, provider-reported token usage, corrections, executable assertions, first-run pass/failure reasons and maintenance time after one controlled change. Compare against a real assistant baseline rather than estimates. Count human correction and review time in both paths. Keep generated files, runner logs and measured metrics private until reviewed for sharing.

## Growth experiment

Offer a no-key synthetic quickstart and portable code before asking for signup. Measure aggregate quickstart completion, successful staging executions, repeated exports, maintenance runs and qualified ContextQA referrals. This repo installs no analytics, tracking pixel, background job or outbound telemetry. Only developer resource links carry campaign UTMs without PII. Do not interpret clicks as revenue or publish customer evidence without authorization.

## Extension contract

Add source normalization and a mock transport test first. Add one reviewed action definition, then implement equivalent behavior in all three renderers and run a synthetic success and failure fixture for each. Do not insert arbitrary model-generated JavaScript or silently skip unsupported steps. Keep user configuration, provider selection and source content separate from trusted instructions. Use ordinary reviewed PRs in your own repositories; there is no autonomous commit/merge feature.
