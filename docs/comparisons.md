# Audience hypotheses and fair comparisons

Prepared October 26, 2026. Planning only; no launch, deployment, purchase or outreach is authorized by this document. Official external references below were read on this date. Repository observations are from the authorized local `contextqaai` projects, not a live customer evaluation. No comparative benchmark or market-demand study has been performed.

## Recommendation and evidence boundary

Select **QA leads and automation engineers converting a small, existing manual web-test backlog** as the primary ICP hypothesis. Select **implementation and solutions teams producing repeatable workflow evidence and handover documentation** as the adjacent hypothesis. Keep the second recipe within the same approved demo workflow and evidence model; do not open a second product or build general-purpose document automation.

The useful promise is: import a case, expose ambiguities, review an executable plan, preserve the source ID, and inspect assertions and evidence. AI drafting can help, but the product should work without an AI key or subscription. Code generation alone is insufficient differentiation: Playwright already supplies test tooling, configuration, browser support and reports. [Playwright installation and first test](https://playwright.dev/docs/intro).

**Commercial thesis, conditional until API and entitlement verification:** “We help QA teams turn existing manual web cases into repeatable, source-linked checks using a ContextQA workflow toolkit, and teams adopt paid ContextQA when they need its verified hosted execution and result capabilities.” Do not replace “verified” with an unconfirmed promise of self-service API access, automatic healing, native integrations, free execution or enterprise controls. The parent capability register must establish the exact supported execution path, available evidence, metering and paid entitlement before this becomes external copy.

The current repositories are foundations with different responsibilities:

- **ContextQA Test Forge:** local source normalization, reviewed contracts and exported Playwright/Selenium/WebdriverIO projects. Its README says source adapters are fixture/transport tested; real tenants are not tested. It does not expose a ContextQA SaaS execution endpoint.
- **ContextQA Docs Evidence:** local reviewed text/media packaging, Markdown/HTML, static iframe snippets and explicit before/after mapping; selected ContextQA results can be read. It does not drive browsers or perform partner publication.
- **ContextQA Browser Cloud:** runnable private Chromium pilot with a restricted REST action API and protected evidence. It has no public service, raw CDP connection, self-service signup, durable billing or certified hostile-tenant isolation.

These are current local-source observations, not proof of a hosted API contract. See the respective authorized README and deployment/product-scope documents. They are private prototypes; a public open-source license and release require a separate decision. Consolidate shared recipe documentation around one recommended path; do not imply that three separate services are required to run the sample.

## Evaluate four audiences as hypotheses

Every statement about demand, frequency, buyers, reach and support below is a hypothesis to test. The user’s Layerpath/EkLine documentation questions are a concrete use-case signal, but do not establish external customer demand or willingness to pay.

| Audience | Job, urgency and workaround | Frequency and cost hypothesis | User, champion and buyer hypothesis |
|---|---|---|---|
| A. QA leads and automation engineers | Convert accepted manual web cases into repeatable checks when a release backlog or recurring regression cycle exceeds available engineering time. Workaround: run manually, then translate selected cases into custom scripts and maintain source links separately. | Recurs around releases; cost is author/reviewer time, manual execution and repair. Baseline is unknown and must be measured per team. | User: automation engineer or technical QA. Champion: QA lead. Buyer: engineering/QA manager with release responsibility. |
| B. Product engineering teams with limited automation capacity | Add repeatable checks for a few important flows after a regression or before launch. Workaround: engineer-written scripts, ad hoc smoke tests and manual checklists. | Release-dependent; delay and context switching may matter more than raw execution minutes. No validated cost estimate. | User: developer or technical product engineer. Champion: tech lead. Buyer: engineering manager or founder. |
| C. Implementation and solutions teams | Produce customer handover guides or release evidence, then refresh affected screenshots and instructions when the app changes. Workaround: manually capture screens, annotate, paste into docs/tours and reconcile old versions. | Repeats across onboarding projects and releases. Cost is capture, permission review, editing and destination-specific refresh; amount unmeasured. | User: solutions engineer, technical writer or implementation specialist. Champion: solutions/documentation lead. Buyer: head of implementation, customer success or engineering. |
| D. Operations teams | Collect browser-only information and turn observations into a document when an operational deadline arrives. Workaround: manual portal access, spreadsheets, copy/paste and document templates. | Potentially frequent, but scope varies widely; authentication and exception handling can dominate cost. | User: operations analyst. Champion: process owner. Buyer: operations manager. Roles and purchasing authority vary by workflow. |

| Audience | Technical ability, setup tolerance and organic access | Fit, adoption path and support risk | Evidence that supports or weakens the hypothesis |
|---|---|---|---|
| A — **primary** | Can review selectors, assertions and CI changes. Likely to tolerate a documented Node CLI and JSON/CSV if first local output is clear. Reach through narrowly useful case-conversion examples, relevant technical communities and existing opted-in relationships; channel yield is unknown. | Best match to current normalization/export foundations. Path: local sample → own case → approved small live run → repeated regression checks → qualified evaluation, conditional on supported ContextQA execution. Medium support risk; bound initial actions, targets and imports. | Existing implementation makes this plausible; current real-tenant integration and SaaS execution evidence is missing. A team that already has strong Playwright ownership may prefer its current stack. |
| B | Developers can run CLI/CI but may have low tolerance for learning another contract format. Reach through concrete regression examples and existing developer documentation. | Adjacent to A but may need more debugging flexibility than a small action schema provides. Path through a repeatable smoke workflow; monetization remains unvalidated. Medium support risk from stack-specific requirements. | Playwright offers a capable direct path, weakening the claim that a wrapper is needed. Validate whether traceability/review solves a repeated problem rather than adding process. |
| C — **adjacent** | Some users can edit Markdown/JSON; others need a producer to supply evidence. Tolerance is moderate only if the capture/export steps are predictable. Reach through specific screenshot-refresh and handover guides; no audience-size claim. | Strong local packaging fit; capture and destination refresh are only partly established. Path: reviewed local guide → one live recapture → repeated owner-reviewed updates → evaluation of verified execution. Medium-to-high support risk from login, redaction and asset paths. | User-specified need is concrete; native Layerpath/EkLine execution and automated update integrations remain unproven. Prefer native destination features when they already solve the task. |
| D | Often low CLI tolerance; likely to need domain-specific templates and account help. Organic reach fragmented by process. | Weakest initial fit. High support and consequential-action risk; browser access, credentials and exception handling vary. Paid path uncertain. | No supplied customer evidence validates a narrow repeatable workflow. General browser automation is too broad for a lean first release. |

### Initial boundaries and validation

Avoid initially: unrestricted scraping/crawling; CAPTCHA or access-control workarounds; long-running high-concurrency agents; production payments or filings; highly sensitive portal collection; mobile/native applications; custom document formatting projects; and buyers requiring audited enterprise isolation before a pilot. These can create disproportionate usage, access and support costs. This is a scope decision, not a claim that those audiences lack value.

Propose a small consented study, not outreach execution: five qualified QA teams, one owner-approved staging target each, and three existing cases with explicit expected outcomes. Record whether the case is understandable, whether manual mapping is acceptable, time to first local and live result, repeated use, support minutes, and willingness to evaluate the verified paid path. For the adjacent ICP, test one guide and one controlled revision with two consenting teams. These are study sizes, not demand forecasts. Narrow or stop if the useful output depends on repeated bespoke authoring or an unavailable API.

## Comparison 1: Manual cases to executable checks

Scope: the same approved web flow, synthetic data, explicit assertions and inspectable result. Compare custom Playwright authoring with the proposed ContextQA recipe; do not rank Jira, renderers or hosted browsers as substitutes for a test framework.

| Dimension | Team-maintained Playwright scripts | ContextQA recipe with verified hosted execution |
|---|---|---|
| Best fit | Engineers who want direct code control and already own browser tests. | QA teams that repeatedly normalize cases and need source-to-plan-to-result continuity. Hypothesis. |
| Setup and skills | JavaScript/TypeScript, package/browser setup and target knowledge; code generation can assist initial authoring. | Node/CLI and source format; a human still resolves business rules, maps targets and approves expectations. ContextQA credentials and entitlement required for live mode. |
| Execution responsibility | Team runs and controls its local/CI browsers. Playwright documents a GitHub Actions path. | Hosted service performs only operations confirmed by its API contract; repository must supply bounded planning, result mapping and report assembly. Adapter not yet established in Test Forge. |
| Maintenance responsibility | Team updates selectors, fixtures, expectations and CI/browser versions. | Team still owns expected behavior and source changes; toolkit maintains schemas/adapter/reporting. No assumed automatic healing or free maintenance. |
| Evidence and reporting | Assertions, HTML reports and configurable traces already exist. Source-case IDs and a handover report require team conventions. | Proposed case → plan → run/result references plus available evidence. Missing/failed assertions must remain visible; a completed sequence is not a passing test. |
| Cost drivers | Author/reviewer/repair time, runner compute, artifact retention and optional AI. | Same human work categories, ContextQA execution charges when applicable, report retention and optional BYOK tokens. API unit/price and spending controls must be verified. |
| Deployment | Local or CI. | Local recipe plus separate hosted ContextQA dependency; not fully self-hosted. Current exports can run locally without ContextQA, but that is a different path. |
| When alternative is better | Mature existing suite, unusual browser/API hooks, unsupported toolkit steps, strict local execution needs or few one-off tests. | Only when reusable case handling, review and inspectable hosted results justify the added dependency; validate this. |

Sources: [Playwright assertions](https://playwright.dev/docs/test-assertions), [CI setup](https://playwright.dev/docs/ci-intro), [reports and traces](https://playwright.dev/docs/trace-viewer-intro), checked October 26, 2026. All ContextQA recipe advantages in the right column are proposals or local-foundation observations until the live adapter acceptance criteria pass.

For “I can build this with Claude,” acknowledge that a coding assistant can help author scripts and glue. Compare the resulting workflow: review time, assertion quality, maintenance after a controlled change, traceability, failed-run diagnostics and total measured cost. Do not compare model brands as if they were browser execution services, or claim that an assistant or script framework is obsolete. No assistant-vs-toolkit benchmark has been run.

## Comparison 2: Browser evidence plus local rendering

Scope: produce one guide/report whose statements can be traced to a controlled browser run. A template engine alone formats supplied facts; it does not establish that a browser task happened.

| Dimension | Manual screenshots plus local Markdown/HTML | Reusable browser evidence workflow plus local rendering |
|---|---|---|
| Best fit | Infrequent guide or a task that needs judgment at each step. | Repeated task/version captures with stable inputs and a named reviewer. |
| Setup and skills | Screen capture, editing and destination asset handling; little automation setup. | Reviewed capture producer, fixed role/data/viewport, step-to-artifact mapping and a local template. More initial setup. |
| Execution and maintenance | Author performs the task and maintains the guide. | Producer performs supported actions; repository packages observations; author validates accuracy, permissions, redaction and destination links. Recapture mappings need upkeep. |
| Evidence and reporting | Depends on the author retaining source evidence and timestamps. | Proposed timestamped run/result links, selected evidence, failed/incomplete steps and explicit before/after context. Current wrapper checks export digests and explicit step pairing; that does not prove behavioral correctness or perform visual regression. |
| Cost drivers | Capture/edit/review time, storage and destination tooling. | Capture execution, review/repair, storage and optional AI drafting. Local rendering adds no separate hosted rendering requirement. |
| Deployment and limits | Local files or existing documentation system. | Local renderer plus the selected evidence producer; no native PDF/DOCX claim, hosted iframe, automatic publishing or universal partner API assumption. |
| When alternative is better | Rare updates, sensitive content that cannot leave the workstation, unstable workflows or very customized editorial output. | Consider automation only after one repeat capture and reviewed refresh saves enough observed effort to justify upkeep. |

Playwright can record trace evidence for debugging, including DOM/network context; those artifacts need careful handling before sharing. This is distinct from a sanitized end-user guide. [Playwright trace documentation](https://playwright.dev/docs/trace-viewer-intro). Wrapper facts above were checked in the local README, `docs/product-scope.md` and `docs/completion-requirements.md` on October 26, 2026. No document-production speed comparison has been measured.

## Comparison 3: Browser Cloud pilot versus managed Browserbase sessions

Compare **only browser-session infrastructure**, not Test Forge, a test-management import, or a document renderer. Browserbase is a relevant named comparator because its official Playwright quickstart creates a cloud session and connects through CDP. [Browserbase Playwright quickstart](https://docs.browserbase.com/welcome/quickstarts/playwright).

| Dimension | ContextQA Browser Cloud current pilot | Browserbase documented managed sessions |
|---|---|---|
| Best fit | Controlled evaluation of allowlisted workflows by an operator who can maintain the runtime. | Developers seeking externally managed browser sessions. This is fit inference, not an independent quality rating. |
| Setup and skills | Operator provisions tenant keys, installs matching Chromium, configures exact hosts and operates the service. | Account/API key, SDK or API integration and client automation code. Existing Playwright code connects using the session connection URL. |
| Execution responsibility | Pilot operator owns machine/runtime and all public-hosting/security work. | Browserbase supplies the cloud session; developer owns task logic, cleanup, assertions and integration. |
| Maintenance | ContextQA team owns browser updates, proxy policy, capacity, storage and controls. | Vendor operates its service; client still maintains scripts and verifies behavior and API changes. |
| Evidence | Live frames, screenshots, bounded snapshots, finalized video and opt-in trace through pilot API. | Official docs describe session replay, dashboard inspection and asynchronous recording download. Recording is evidence of activity, not an assertion result. |
| Cost drivers | Host/browser compute, operational time, storage and optional model usage; no priced public service or billed ledger exists. | Subscription/included usage and metered browser usage; proxy and optional model/service usage can add cost. Check the current plan instead of assuming a hard spending cap. |
| Deployment | Local/private single-instance service. Public hosting, raw CDP, durable multi-worker operation and hostile-tenant isolation are absent. | Vendor-hosted sessions with a session API and connection URL. No self-hosted Browserbase deployment claim is made here. |
| When alternative is better | Choose the pilot only for bounded evaluation where operating responsibility is acceptable. | Prefer the managed option when a working externally hosted session/CDP path and vendor-operated capacity are needed now; verify the applicable plan and security requirements. |

Verified primary sources, October 26, 2026: [session creation](https://docs.browserbase.com/platform/browser/getting-started/create-browser-session), [session replay](https://docs.browserbase.com/platform/browser/observability/session-replay), [recording downloads](https://docs.browserbase.com/platform/browser/observability/recording-downloads), [pricing](https://www.browserbase.com/pricing). Pricing is time-sensitive; no purchase or recommended spend is implied. Do not call the private pilot a production-ready, public, cheaper or drop-in Browserbase replacement. No comparative availability, isolation, latency or cost test has been performed.

The Stripe Directory skill was consulted before named-vendor research. Its CLI was absent and no Directory connector was exposed; only its public setup page was read. No Directory result, provider ranking, provisioning or authentication is claimed. The comparison above uses only the named provider’s official public documentation.

## Reproducible evaluation specification

Proposed, not executed:

1. Freeze one synthetic staging application, case input and expected result. Use the same role, viewport, browser version where controllable, seeded state and geographic/network conditions. Document unavoidable hosted differences.
2. Implement the same five cases, including success, deliberately failed assertion and ambiguous/missing expectation. Keep human review mandatory; ambiguity should block execution rather than be silently guessed.
3. Record first-time install/setup separately from authoring, reviewer time, execution, evidence retrieval and repair after one controlled UI change. Run three bounded repetitions per executable variant after one separately reported warm-up. Count failures, timeouts and inconclusive outcomes in the denominator.
4. Success requires the expected assertion classification, source/case/run linkage and readable evidence. Screenshot or video existence alone does not qualify. Measure median/range and report raw counts; a small sample does not establish reliability at scale.
5. Sum actual billable usage from the selected service’s available records plus compute/storage and provider-reported AI usage. Missing metering remains unknown. Label allocated human-cost assumptions and price-based estimates; do not infer unavailable assistant/build tokens. Compare totals only for equivalent completed workflows, including failed attempts and maintenance.
6. Keep source snapshots, reviewed contracts, environment versions, raw machine-readable results and a limitations note. Publish nothing under this planning authorization. Run no paid comparison until access, approved target, budget and stop behavior are explicit.

The first adoption test is whether the intended QA user can reach a meaningful local result in roughly 10–15 minutes. That is a usability target to observe, not a measured result or a performance claim. The next test is a successful live workflow with inspectable assertions and evidence through the verified ContextQA path. Only then evaluate repeat usage, support burden and paid fit.
