# Build an agent your team can trust

Test Forge's first builder journey is Playwright: take a requirement, make its meaning explicit, approve automation, inspect its results and maintain it when the product changes. You name the agent and own its code and decisions. ContextQA supplies the supported managed automation layer; Claude, OpenAI or another supported coding assistant can help you draft and reason.

The useful skill is deciding what the team needs, connecting its tools, operating the result in the team's environment and showing whether it helps. These are practical AI builder and forward deployed engineering responsibilities. Generated code is one part of that work.

## Start with a small, important workflow

Choose one workflow with a release owner, an agreed business rule and a disposable staging environment. Identify the expected benefit before generating code: for example, give the release reviewer reliable evidence that an expense requiring approval cannot bypass the approver. Record a baseline for the same scope using the [measurement guide](measurement.md).

The built-in journey is:

1. Import one requirement or test case from GitHub Issues, Jira, Linear, TestRail, Xray Cloud or local JSON. Keep its normalized source snapshot.
2. Clarify ambiguous behavior with the owner. Agree on critical criteria, data, prerequisites, environment and permitted side effects.
3. Name the agent, identify its builder/owner and version, and link each criterion to an assertion. Unmapped criteria remain visible.
4. Reuse a reviewed ContextQA saved plan and its native configuration. Add reviewed case/step/suite/plan authoring only when needed. Use verified application details; an unknown selector or unsupported action needs work before execution.
5. Review source-bound payloads and the proposed Playwright mapping. A provider draft cannot approve itself. Source, contract or ownership changes require a new review.
6. Review the generated code. Separately authorize execution against the selected environment, including any managed execution charge.
7. Inspect the correct run, original assertions and member evidence. Keep failures, inconclusive results, retries and uncovered criteria alongside successful checks.
8. Following a change, classify the failure, review any maintenance proposal, rerun the original checks and retain a rollback version.

This repository implements the local review/export tools and a mock-tested ContextQA API adapter. Live ContextQA tenant, entitlement, evidence and billing acceptance remain separate checks. There is no automatic healing or universal requirement-to-working-test guarantee.

## Try the complete local example

Requires Node 22+. These preparation commands need no account, model key or paid service. Use a new output directory:

```sh
npm test
node examples/builder-lifecycle.js output/NEW-expense-guardian
```

The example creates a fictional expense policy, source/contract/approval records, synthetic HTML applications and five Playwright projects: `baseline`, `negative-rule`, `stale-locator`, `repaired` and `behavior-defect`. Preparation does **not** run a browser. Its fixture reviewer label is scripted and must never be reused as customer approval. Native object IDs are synthetic and must not be submitted to ContextQA.

Run the browser acceptance procedure in [maintenance and the worked lifecycle](maintenance.md) and [real testing](real-testing.md). The verifier checks actual process outcomes, including expected failures; inspect its receipt for the current checkout. The outcome input in `examples/outcome-input.example.json` is separate, invented arithmetic data, not a measurement of this browser example.

## The example's decisions

The source says expenses over $500 require manager approval. The fictional builder resolves USD currency, the exactly-$500 boundary and reset behavior before approving the test. Its two agreed criteria are:

| Criterion | Intended assertion |
|---|---|
| An unapproved $1,000 expense is blocked | The application displays `Manager approval required` |
| An approved $1,000 expense may proceed | The application displays `Approved` |

The original synthetic app should pass both assertions. The deliberate negative control changes the first expected result to `Approved`; it must fail at the intended policy assertion. That demonstrates that a wrong expectation is detectable. It is a test of the test, not a customer defect or proof of complete policy coverage.

Next, the app changes its button ID while preserving its meaning. The original locator should fail. A reviewed locator-only proposal changes the selectors, preserves actions, data, criterion links and assertions, and exports a new Playwright project awaiting rerun. Finally, a defective synthetic app allows the unapproved expense. The repaired test must still fail; a proposal that changes the expectation to accept that behavior is escalated. Green status is never the repair's objective by itself.

The current maintenance module evaluates portable contract differences and supplied evidence references locally. It does not retrieve a ContextQA healing decision, discover a locator, authenticate evidence or apply a managed repair. See [maintenance boundaries](maintenance.md).

## Connect your real ContextQA workflow

Use [token setup and the one-plan read-only connection check](tokens.md) before live work. An authorized superadmin creates a scoped token under **Settings → API tokens**; the CLI receives it through `CONTEXTQA_API_TOKEN` in a private environment. Node requires an explicit loader such as `node --env-file=.env ...`. ContextQA, source-platform and model-provider credentials are separate.

Prefer existing saved configuration for environments, data profiles, prerequisites, suite order, browser/device matrix, parallelism and reruns. [Native configuration](contextqa-platform.md) explains supported fields and request/read differences. [The API workflow](contextqa.md) covers source-bound raw authoring, preflight checks, journaled execution and results. [Build a custom agent](custom-agent.md) describes how to compose those pieces.

ContextQA executes the saved native plan. A portable Playwright export runs on your Playwright infrastructure; this API contract does not upload or execute an arbitrary Playwright script. Native data iteration, prerequisites, browser scheduling and healing do not automatically transfer to the export. Review any required equivalence explicitly.

## Keep ownership and results explainable

The contract can record `builder.agentName`, `builder.ownerName`, `builder.version` and optional `builder.aiProvider`. Generated headers and `traceability.json` retain those self-declared values, the actual local reviewer label, source/contract hashes, criterion mappings and native references. Export reports `executed:false`; observed results remain unknown until a separate execution is correlated. These records do not verify a person's identity or change Git authorship.

An accurate handoff sounds like: “I built Expense Policy Guardian, reviewed its requirements and Playwright mapping, and own its maintenance. These approved assertions were observed on this build and environment; these other criteria still need evidence.” Include the AI provider only when used. Link the actual approval and result records rather than implying every generated line was manually written.

Use [customization](customization.md) for agent style, versioning, repository placement and notification planning. Use [outcome observations](measurement.md) to compare lead time, hands-on effort, critical coverage and maintenance with a defined baseline. A passing assertion supports a specific check; a business outcome needs its own observation and owner review.

[ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=sdet_builder_guide)
