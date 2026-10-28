# Run the builder lifecycle

This example lets an SDET inspect an owned test with a named agent, meaningful assertions, approval history, a maintenance proposal and actual browser results. It uses a repository-owned expense-policy app with fictional names and synthetic ContextQA IDs. No customer API, model or paid ContextQA execution occurs.

From the repository root, use Node 22+ and a fresh output directory:

```sh
npm test
node examples/builder-lifecycle.js output/my-builder
cd output/my-builder/baseline
npm install --ignore-scripts --no-audit --no-fund
npx playwright install chromium
cd ../../..
node scripts/verify-builder-lifecycle.js output/my-builder
```

The runner only accepts the deterministic repository-owned source, contracts and HTML. It launches the installed pinned Playwright version, passes no account keys, disables retries and saves JSON reports. It refuses altered fixture inputs. If Chromium is unavailable but Chrome is already installed, pass `--channel chrome` and record that choice when comparing results. The local browser must be allowed to launch in your environment.

For the same lifecycle using Page Object Model, generate a fresh directory with `node examples/builder-lifecycle.js output/my-pom --page-object`, install its baseline project dependencies as above, then run `node scripts/verify-builder-lifecycle.js output/my-pom --page-object`. The verifier compares every generated page-class file before execution. Both inline and page-object journeys are included in CI.

| Scenario | Required observed result |
|---|---|
| Baseline | A $1,000 expense is blocked without manager approval and accepted after approval. |
| Wrong business expectation | The deliberately wrong expectation fails at its text assertion. A startup error does not count. |
| Locator drift | The old submit selector fails after the fixture changes its button ID. |
| Reviewed locator repair | A new reviewed selector passes both unchanged policy assertions. |
| Behavior defect | A fixture that wrongly permits an unapproved expense fails the original assertion; an attempt to weaken the assertion is escalated. |

Read `acceptance.json`, each `*.runner.json`, `before.json`, `after.json`, `maintenance-proposal.json`, `maintenance-approval.json`, `behavior-escalation.json` and each exported `traceability.json`. Approvals in this fixture are scripted and clearly labeled; customer approvals must come from the responsible reviewer. The generated native IDs illustrate mapping only and must never be sent to ContextQA.

Measured generation and runner duration are separate. The fixture has zero model calls/tokens; that says nothing about the tokens spent building this repository. Human review time and business benefit remain unknown. Record a real team baseline and observation window using [the measurement guide](measurement.md).

## Complete live ContextQA acceptance

1. Set a scoped token using [token onboarding](tokens.md). Read one selected safe plan; retain the actual read-check status.
2. Select the authorized non-production workspace, reachable target, plan, environment, data, prerequisites and browser matrix. Replace all synthetic IDs with reviewed real ones. A local HTML data URL is not a hosted ContextQA target.
3. Import one real requirement, resolve ambiguities, record the agent owner/version, map criteria to assertions and known native case/step IDs, then obtain approval. Use the existing reviewed authoring bundle only if needed.
4. Obtain the execution budget/target approval. Run `project-check`, then `project-run` with a fresh journal. Record the accepted result ID. A timeout does not cancel an accepted run.
5. Poll boundedly, verify terminal status and consistent counts, inspect selected case/step parent relationships and original assertions. Record actual evidence; no artifact is guaranteed merely by a DTO field.
6. Demonstrate an intentional negative business control in the safe target. Review one locator change and rerun without changing assertions. Verify native healing separately only if a real interface and evidence support it.
7. Review the proposed Playwright/GitHub update and retain source, contract, approval, agent version and run references. A portable local pass does not prove hosted configuration parity.

Hosted execution, live provider billing, native healing, notification delivery and a business ROI claim are not established by this local example. These are explicit remaining acceptance items, not simulated successes.
