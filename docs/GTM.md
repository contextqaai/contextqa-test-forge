# ContextQA developer recipes — strategy and release specification

Prepared 2026-10-26, America/Los_Angeles. Status: **local planning and implementation draft, not a launch approval**. Applies only to `contextqaai/contextqa-test-forge`, `contextqaai/contextqa-browser-cloud` and `contextqaai/contextqa-docs-evidence`. No publishing, deployment, account purchase, outreach or production change is authorized by this document. No `indivatools` resource is part of this work.

## 1. Executive recommendation

Use **ContextQA Test Forge** as the initial discovery and quickstart entry point for QA leads converting a small manual backlog into reviewable web tests. Keep Browser Cloud as a separate private execution experiment and Docs Evidence as the reusable evidence utility. Present one coherent journey with two recipes; do not launch three competing automation brands or merge their security boundaries. Working collection description: **ContextQA Automation Recipes**, subject to product-owner naming approval. Existing repo names remain unchanged; Ship is an existing ContextQA product and must not be renamed or represented as these utilities.

Commercial thesis: **We help QA leads turn existing manual cases into reviewed, traceable web checks using ContextQA's reusable recipe utilities, and teams can evaluate paid ContextQA when they need its documented hosted test-plan execution and run-result workflow, once API access and billing fit are confirmed.**

Useful value comes first: an account-free synthetic example, readable input, editable contract, portable code and inspectable reports. The primary Forge route now integrates the actual ContextQA token API through a catalog client, reviewed authoring bundles and saved-project execution. Its transports and configuration gates are fixture-tested; live tenant access, payload suitability and billing acceptance remain P0. The no-key sample is still labeled “mocked ContextQA transport”; neither local framework runs nor the separate browser pilot are represented as hosted ContextQA executions.

Do not call Claude or existing frameworks obsolete. Optional Claude/OpenAI drafting is part of this workflow; repeatable review, source traceability, updates and evidence are the hypothesis to test. No measured competitive advantage or customer demand has yet been established.

## 2. Evidence, uncertainty and product discovery

Read the accompanying [capability register](capability-register.md). Source priority: supplied API contract → source implementation/tests → observed demo/run receipt → official product documentation → marketing description. A marketing statement is not an API entitlement or execution test.

Observed website paths on 2026-10-26: [ContextQA homepage](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=gtm_reference) links to [Ship](https://ship.contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=gtm_reference) and [Book a demo](https://contextqa.com/book-a-demo/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=gtm_reference). Ship advertises signup and plans, but that alone does not establish that a new account receives this REST API, a compatible token or the same execution meter. No signup, purchase or provider trial was exercised. Use the existing demo/contact route for API evaluation until product confirms the exact non-Google access path. Do not promise free API credits, self-service REST access, purchase completion or a shared browser-session API.

The supplied API contract documents tenant-scoped bearer tokens, test-plan execution, result polling and evidence references. Token creation is described in product settings; no token-creation/signup endpoint is present in the reviewed contract. The Docs Evidence utility implements selected existing-result reads. The independently implemented Browser Cloud pilot has its own operator-issued keys and local session API; it does not inherit SaaS authorization, billing, reliability or isolation guarantees. Native source adapters are fixture/transport-tested, not marketplace certifications.

P0 unknowns: account entitlement; exact supported plan creation/mapping payload; terminal result and assertion mapping on real runs; accessible artifact semantics; cost meter applicability to this API; stop/cancellation and idempotency; server execution/retention limits; current token onboarding; current license decision. Unknowns block live-spend claims, not useful local examples.

## 3. Audience hypotheses and selection

These are product hypotheses, not market research or measured willingness to pay.

| Audience | Job, urgency and workaround | Users, champion and buyer | Setup, reach and paid path | Burden, evidence and decision |
|---|---|---|---|---|
| A: QA manual backlog | Convert repeatable cases before a release; currently manual execution, spreadsheets or handwritten scripts. Usually each release; hours/cost must be measured in pilot interviews. | Automation engineer uses; QA lead champions; engineering/quality budget owner buys. | Comfortable with JSON/CLI and staging. Reach through existing engineering/QA networks and precise examples. Portable local success → repeated run need → confirmed hosted execution evaluation. | Medium selector/requirements support. Strongest fit with documented test-plan/results API; demand unverified. **Primary.** |
| B: Product engineering with limited QA | Check one changed journey before merge; ad hoc assistant-generated scripts/manual smoke checks. Frequency follows releases; no quantified cost evidence. | Developer uses; tech lead champions; head of engineering buys. | Good code ability, low setup patience. Reach through source-linked issue/PR examples. Paid path only if maintenance/execution handoff solves a repeated problem. | Medium/high competition from existing scripts; avoid forcing replacement. Secondary research cohort, not another MVP. |
| C: Solutions/implementation/docs teams | Produce current workflow evidence and handover instructions after an app change; screenshots and docs updated manually. Per onboarding/release; cost unknown. | Solutions engineer or technical writer uses; enablement/docs lead champions; product/solutions leader buys. | Can run a prepared command; limited tolerance for browser infrastructure. Reach through documentation workflows and existing consenting partners. Repeated approved captures → evaluate confirmed execution/evidence service. | Medium media/privacy/review support. Existing evidence wrapper and explicit Layerpath/EkLine use case support relevance; native lifecycle demand and paid conversion unproven. **Adjacent.** |
| D: General browser operations | Collect information and generate arbitrary documents; urgency and frequency vary; manual browsing/RPA. | Ops analyst uses; operations lead champions; department budget owner buys. | Highly variable skills, target auth and anti-bot needs. Broad distribution creates weak qualification. | High bespoke support and potentially high run costs; general browser-session API not verified in SaaS. **Defer.** |

Avoid initially: mass scraping, CAPTCHA/anti-bot evasion, credential-sharing services, production payments/deletions, unlimited unattended agents, personal admin automation and unbounded high-volume tasks. They add support/cost exposure without demonstrated conversion. Prefer teams that own staging, can supply 3–5 explicit cases and can review assertions.

## 4. Brand, open-source boundary and license

Keep ContextQA in names, first paragraphs, examples, package descriptions and handoffs. Use the supplied unchanged logo at `assets/brand/contextqa/contextqa-logo.svg`; place it on a dark background with its original proportions. Do not redraw it or imply partner endorsements.

Recommend **Apache-2.0** for reusable adapters, workflow schemas, examples and local rendering: it permits commercial use and includes an explicit patent grant. It does not license the separate hosted ContextQA service, trademarks or customer content. MIT is shorter but lacks that explicit patent language. This is a recommendation for owner approval, not a legal conclusion or license adoption. Inventory direct/transitive dependencies and copied assets before public release. Current repositories remain private and have not adopted a public open-source license; do not label them “released open source.”

Core samples require no LLM, signup or paid execution. Provider keys are optional and belong to the user. Generated portable scripts can run on infrastructure the user controls. A future hosted recipe would require ContextQA credentials and may incur charges; local utilities organizing results are separate from hosted browser operations. Browser Cloud currently runs its own local Chromium; do not call it a generally available hosted Browserbase replacement or proof of ContextQA SaaS session support.

## 5. Small MVP and implementation choice

Choose **Node 22+ JavaScript** for the new recipe coordinator because Test Forge, Browser Cloud and all three export targets already use JavaScript. No verified official ContextQA SDK was established in this review; use a small contract-based adapter after schema validation. Retain the existing Python evidence utility as a standalone compatibility tool; do not build every recipe twice or add an orchestration framework.

Initial MVP: (1) JSON manual cases → reviewed test plan → inspectable result, and (2) completed run evidence → Markdown/HTML guide. Start with JSON; CSV is an optional later mapper with explicit quoting/encoding tests. Keep the existing named-platform import prototypes clearly marked as additional, unverified with real tenants. Do not expand them into OAuth apps or bulk synchronization for launch.

No new dashboard, accounts, billing, marketplace, scheduler or agent runtime. Reuse existing CLI and static docs. Browser Cloud's existing console remains a private pilot and is not a prerequisite for the initial ContextQA API recipe.

Implemented integration: `ContextQAClient.request(operationId,args)` uses the supplied 40-operation catalog; `validateRequest` preflights actual request DTOs, `waitForRun` preserves status/verdict and `executePlanOnce` journals a non-idempotent start. Source-bound authoring bundles preserve reviewed raw account fields; project profiles check existing saved configuration before a run. See docs/contextqa.md and docs/contextqa-platform.md for the runnable commands. These are repository client methods, not a separately deployed service or an official SDK certification. Prefer an existing plan; tenant-specific action/template IDs are never generated from arbitrary prose.

## 6. Recipe 1 specification — manual cases to a meaningful result

**Reader:** QA lead/engineer with a small repeatable web regression. Use when an owned staging environment and expected outcomes exist. Existing mature scripts may be better when no managed execution need exists; keep portable exports.

**Inputs:** JSON case ID/title; preconditions; synthetic test data references; ordered action and expected-result text; optional priority/tags; source revision/hash; explicit target mapping/selectors; reviewed staging target; optional mapping to an existing ContextQA plan. The current generic importer preserves ID/title/description/revision/steps; preserving typed priority/tags/preconditions/data as first-class fields is P0 schema work before claiming lossless ingestion.

**Concrete example:** `PREF-001`, “Save display name,” precondition “disposable demo account,” step “enter Demo reviewer and save,” expected “Saved appears.” Current runnable fixture is `examples/fixtures/json.json` plus `examples/demo.js` in Test Forge; it uses a synthetic data-page form. It is not a ContextQA run.

**Flow:** validate bounded JSON → normalize source and hash → flag absent assertions/ambiguous actions/missing selectors → review contract/source → approve unchanged digest → choose the primary ContextQA saved-plan API route or complementary portable export → attempt exactly one authorized execution → poll known result ID with limits → inspect per-step/case assertions → map result → write machine-readable JSON and escaped human report. Source IDs/hashes, contract hash, run ID, assertion evidence and timestamps must remain linked.

**State model:** `imported`, `plan_generated`, `blocked_needs_review`, `execution_attempted`, `execution_running`, `execution_completed`, `assertion_passed`, `assertion_failed`, `inconclusive`. Represent lifecycle and verdict separately. Completed without expected assertions or required evidence is inconclusive. Source import/plan generation are never reported as test passes. Current exporters write `executed:false`; they do not yet generate the hosted run report.

**Output specification:** `result.json` with schema version, case/contract/source/run references, producer (`local_fixture`, framework or hosted API), lifecycle state, verdict, observed assertion list, error class, evidence references, timing, documented usage or null. `report.md`/`report.html` show the same facts. Example success: completed + observed exact “Saved” assertion → passed. Example failure: observed “Unsaved” → failed. Example partial: polling deadline before terminal state → inconclusive; retain run ID and do not start another run.

**Steps now:** run the no-key Test Forge quickstart, inspect generated contract/approval/test and run an exported project deliberately. **ContextQA steps now implemented:** confirm account access/meter → review a scoped token → bind a saved project profile → `project-check` the actual native settings → explicitly authorize `project-run` with a fresh journal → inspect bounded results. Raw authoring uses separate source-bound review and write approval. The commands exist and are mock-tested; an authorized live acceptance receipt and known cost envelope are still required before claiming a successful hosted workflow.

**Acceptance:** fixture success and wrong expected text produce different real assertion outcomes; ambiguous case blocks; source/contract edits invalidate approval; failed/partial result retains diagnostics; secret never appears in report. Launch claims require one approved live hosted run and corresponding assertion evidence. Troubleshooting: 401/403 check token scopes/tenant, 404 verify plan ownership, 429 respect documented Retry-After within the read deadline, timeout preserve ID, missing artifact report unavailable. Never retry a start blindly.

**Cost/CTA:** local normalization/export has zero service/model calls; local browser compute is the operator's responsibility. Live execution can bill. Use a local-first “Try your own case” CTA, then an API evaluation link only after the useful output.

## 7. Recipe 2 specification — run evidence to a useful document

**Reader:** solutions engineer/technical writer refreshing a workflow guide. Use when a known workflow/run and media rights exist. A text-only template is better when browser verification is unnecessary.

**Inputs:** successful or partial run/case/step result IDs; purpose; preconditions; ordered stable steps; observed outcomes; timestamp/version; approved screenshot/media selection and rights; human-reviewed change context. Current Docs Evidence supports existing result collection, trace candidate import, reviewed export and explicit before/after step mapping. Collection alone does not validate or download every referenced artifact.

**Flow:** read selected existing results → preserve raw material privately → extract only useful observations/media → human inspection and rights/privacy review → bind approval digest → render escaped Markdown/HTML and JSON manifest → retain failed/incomplete steps and limitations. ContextQA would perform the browser execution in the proposed hosted recipe; local code organizes and renders evidence. Neither PDF nor DOCX generation is claimed. Browser Cloud local captures must be labeled with that independent producer.

**Document template:** title; purpose; preconditions; source case/run/version; generated timestamp; per-step expected/observed result with evidence path; failed/incomplete steps; limitations; reviewer and manifest hash. A failed or evidence-incomplete run must be labeled “partial/unverified workflow draft.” Existing wrapper exports are “reviewed static walkthroughs,” not assertion-certified guides. Adding a verified-run verdict gate is P0 before using “verified guide.”

**Example now:** `python examples/demo.py NEW_PRIVATE_OUTPUT` in Docs Evidence yields a synthetic text walkthrough. It proves rendering/review plumbing, not native Layerpath/EkLine execution. The native partner lifecycle runbooks remain pending actual capture/change/refresh evidence. Example failure: omitted review or changed media digest blocks export; missing screenshot cannot be replaced with an invented image or successful narrative.

**Refresh:** supply an owner-approved real diff or clearly labeled controlled content revision → explicitly map every before/after step including removals/additions → recapture the same task → inspect evidence → compare text/media hashes → draft updates → review native docs/tour changes. Hash changes do not establish semantic correctness or visual regression; media inspection remains required. AI drafting reads approved text only and cannot approve or publish.

**Acceptance:** all document claims trace to observed evidence or explicit human context; missing/failed steps are visible; HTML escapes untrusted text; raw traces, signed media URLs and secrets stay out of public export; unchanged review receipt is enforced. Troubleshooting covers expired artifact references, unavailable media, timestamp/viewport differences and unmatched step pairs.

**Cost/CTA:** local rendering/model-free export needs no subscription. Recapture may consume execution resources; storage/media review has a real labor cost. CTA after usable guide: evaluate repeatable ContextQA capture for your team using the confirmed API evaluation route, not a forced registration.

## 8. Repository and AI-agent usability

Keep compact source, examples, fixtures, schemas, output templates and meaningful tests. Existing Test Forge is the Node coordinator; Docs Evidence owns media review/rendering and Browser Cloud owns its independent session service. Add only missing pieces rather than empty directories.

Recommended files: `README.md`, proposed `LICENSE` after approval, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `.env.example`, source adapter/schema/report modules, deterministic sample/failure fixtures, `docs/{GTM,capability-register,backlog,ai,...}.md` and low-cost fixture CI. No official SDK wrapper names or live commands are documented as implemented until shipped.

Current commands: Test Forge `import`, `fetch`, `approve --source`, `export`, `diff`, and optional `scripts/ai-draft.js`; Browser Cloud existing REST/session demo commands; Docs Evidence `init`, `collect`, `approve`, `export`, `compare`. See each README for exact arguments. Proposed coordinator commands `validate`, `preview`, `run-sample`, `run-live`, `export-results` remain backlog, not runnable examples. Proposed exits: 0 valid/success; 2 validation/review blocked; 3 execution failed; 4 inconclusive/pending; 5 auth/config/cost gate. Current CLIs generally use 0/1; alignment needs implementation/tests.

Agent instructions must identify local vs live paths, interpretation of results, exact checks, official references, excluded organizations, secret rules and human authorization before billing/publication. Users do not need an AI agent. Optional BYOK: explicit provider/model; environment/secret manager keys; consent to send exact input; no autoexecution; usage reported or null; bounded response/input/time; no retry. Provider output is a draft. Current implementation supports OpenAI Responses, Anthropic Messages and compatible Chat Completions; not every native vendor API.

## 9. Reliability, spending and data controls

Local fixtures call no paid services and use synthetic data. API limits from the supplied contract must be recorded, not generalized to the independent pilot. The implemented ContextQA client uses explicit write/execute gates, no automatic request retries, bounded reads/polls and persistent run intent. A reusable saved-project profile checks actual plan/case/suite/step settings first. One active pilot run/approved plan is an operator policy; separate processes/journals require coordination. A timeout is not cancellation. If a start returns an ambiguous network outcome, hold for reconciliation; do not submit again. If the server exposes no stop endpoint, client timeout cannot stop billing.

Proposed pilot ceiling: one existing plan of at most one case/ten reviewed steps, one live attempt per approval, one concurrent run, 120-second read deadline with at most 30 polls spaced four seconds apart, and no automated retries except bounded idempotent result reads within that same deadline. These are client policy proposals, not verified provider guarantees. A hard monetary ceiling cannot be promised until applicable metering/server termination are confirmed. Keep paid starts disabled while that dependency is unknown. Never infer REST prices from Ship's marketing meter.

Redact nothing by assumption: store source/trace/media privately, suppress request/response bodies in logs, review every image/video including audio, and never append UTMs to technical URLs. Preserve useful error codes/run IDs without secrets. Routine CI uses mocks and synthetic fixtures; no provider key or live-run job by default. Add tests for empty/malformed input, unsupported action, source hash mismatch, wrong resource ID, unbounded response, auth/rate/error handling, success vs failed assertions, partial result and evidence omission. Exact paid-run gates require meaningful failure tests before activation.

## 10. README opening and 10–15 minute quickstart target

Suggested opening after license/hosted gates are complete: “ContextQA Automation Recipes helps QA teams turn existing manual cases into reviewed web checks and readable evidence reports. Run the account-free local example, then connect an authorized ContextQA test plan when you need hosted execution.” Until live acceptance, add “ContextQA API integration is implemented and mock-tested; account-free samples use mocked transport.” Explain optional AI costs and current private/license status immediately.

Quickstart outline: problem → concrete PREF-001 JSON → visible sample report → Node/Python prerequisites by repo → installation → no-key deterministic sample → interpret imported/generated/executed/assertion status → inspect output and failures → exact credential route → bounded live example only when implemented → adapt one staging case → troubleshooting → contextual next action. Show the useful result before a signup CTA. Target first local result in 10–15 minutes with five consenting testers; not measured yet. Dependency/browser install time must count.

## 11. Six substantial content hypotheses

No search volume or ranking promise. Technical repo docs are the source of truth; a separate website page is justified only after repeated local success and a distinct audience/discovery need, not to duplicate every README.

| Page hypothesis | Reader/intent/problem | Original evidence and outline | Recipe, next action, home and upkeep |
|---|---|---|---|
| Manual test case to a reviewed web check | QA engineer trying to automate an existing case | PREF-001 input → ambiguity → contract → assertion vs completion → failed case | Recipe 1; run sample. Repo guide first; re-run on schema/export change. |
| JSON test imports without losing expected outcomes | QA lead migrating a backlog | Before/after source mapping, preserved/unsupported fields, invalid input | Recipe 1; try one own case. Repo schema guide; revisit field mappings. CSV only after parser exists. |
| Release validation with inspectable browser evidence | QA/release lead needs trustworthy report | Success, failed assertion and timeout reports from same controlled task | Both; inspect failure then request API evaluation if relevant. Repo example; update on result schema. |
| Refresh screenshots after an application change | Docs/solutions owner handling stale instructions | Explicit before/after mapping, missing evidence and review boundary | Recipe 2; run reviewed export. Docs Evidence guide; native partner claims only after actual lifecycle proof. |
| Portable scripts versus hosted execution | Tech lead deciding what to maintain | Same task and responsibilities, source-backed limitations, no fabricated benchmark | Recipe 1; choose own script or scoped evaluation. Repo comparison; quarterly/source-change review. |
| Bring your own Claude/OpenAI key safely | Automation engineer wants drafting without lock-in | Mock transport examples, exact consent and unknown-usage case | Both; optional draft after deterministic success. Repo AI guide; test protocol changes before release. |

## 12. Comparison discipline

Compare within workflows, not a ranking of unrelated categories. For manual cases: a maintained Playwright/Selenium/WDIO script vs this reviewed-contract/export path vs a future confirmed hosted ContextQA execution path. For documentation: local template alone vs approved browser observations plus template. For Browser Cloud only: compare managed-browser infrastructure with the private pilot using current official documentation. Do not imply parity, API availability or a generally hosted alternative.

Every comparison records best-fit audience, setup and skills, who owns execution/maintenance, evidence/reporting, cost drivers, verified deployment options, limitations, when the other approach wins and checked date. Official framework docs are linked in Test Forge's technical docs; hosted comparisons require current primary sources. No comparative benchmark has been run. Reproducible proposal: five fixed cases and one controlled change, same app/data/environment, three measured runs, exact assertions, active author/reviewer time, maintenance correction count, runner logs and actual billed usage; report all failures and the small sample size.

## 13. Conversion journey and supported CTAs

| Stage | User question and asset | Action/friction | Observable signal and test |
|---|---|---|---|
| Qualified discovery | Does this solve my manual-case problem? Focused guide/example | Open guide; avoid generic claims | Aggregate referrers where available; test specific problem title. |
| Useful material | What do I get? Input and sample report | Inspect output; unclear pass semantics | Docs views if existing consented analytics supports them; usability observation. |
| Local success | Can I run it? No-key fixture | Run and inspect; dependency/setup friction | Voluntary sample receipt, not hidden CLI telemetry; test clean-machine setup. |
| ContextQA connection | Can my account use API? Capability/access guide | Follow confirmed settings/access route; entitlement unknown | Consented product connection event only if implemented; operator checklist otherwise. |
| Meaningful live run | Did it validate my expected outcome? Assertion/evidence report | Inspect result; auth/meter/reliability friction | Activation = one meaningful live workflow with observed assertion outcome and inspectable report, not merely API200/start. |
| Repeat use | Will it survive the next release? Diff/update guide | Reapprove/rerun; maintenance friction | Distinct authorized repeat run on a later day/version, linked by opaque team ID if instrumented. |
| Qualified evaluation | Is managed execution worth adopting? Responsibility/cost worksheet | Existing API evaluation/demo route; avoid forced meeting for local use | Owner-confirmed fit, repeated need, budget/path; CRM receipt if manually entered with authorization. |
| Paid adoption | Can we justify and provision it? Verified plan/contract | Confirm commercial terms and entitlement; no assumed purchase route | Actual paid customer record and attributed cohort; do not count signup as revenue. |

Use run-sample and try-your-own-case as current primary CTAs. Link API setup to the repo's guide. Until access is verified, “Evaluate API access” can link the existing ContextQA demo page with transparent intent; it is not a self-service token endpoint. Ship is a separate visible product route whose API entitlement is unconfirmed. No purchase/free-tier claim is needed.

## 14. Attribution and minimal measurement

Human-facing ContextQA links use `utm_source=github`, `utm_medium=developer_referral`, repo-specific campaigns `contextqa_test_forge`, `contextqa_browser_cloud`, `contextqa_docs_evidence`, and placement-specific content such as `readme_overview`, `recipe_api_evaluation`, `guide_recorder`. No emails, issue text, customer IDs or secrets in URL values. No UTMs on API/auth/callback/signed artifact links. Existing relevant recorder/visual-baseline articles were checked 2026-10-26; links do not prove API functionality.

Keep a small weekly aggregate worksheet using existing authorized tools. GitHub traffic provides limited repository aggregates subject to retention/access; it does not expose every visitor's identity, CLI success, signup or revenue. Docs visitors/CTA clicks require an already supported analytics setup and appropriate consent; do not assume availability. Signups/account connections/live assertions/repeat use require explicit product instrumentation or voluntary receipts. Qualified evaluations and paid customers need matched, authorized commercial records. These signals are currently not joined by the repos. Do not install trackers to claim measurement is complete.

Proposed events: sample_completed, api_connected, live_assertion_result, repeat_run, evaluation_qualified; names are specifications only. Include only consented opaque IDs, repo campaign, schema version and categorical outcome—not payloads or keys. Never add hidden CLI telemetry. Report cohorts and denominators: activated consenting teams / eligible consenting teams who attempted live setup; successful meaningful runs / all authorized attempts including errors/timeouts; paid customers / qualified evaluation cohort at 60–90 days. At tiny n, publish counts and uncertainty, not confident percentage gains.

## 15. Budget and maintenance

Proposed incremental ceiling **$100/month**, excluding existing ContextQA spend; no spending authorization. Start at $0 additional hosting/tools with local samples, existing repository docs and existing CI allowance. Suggested planning allocation: $0–20 CI/storage if within approved existing limits, $0–30 optional static hosting only after need, $0–20 explicitly approved demo AI usage, $30–100 unused contingency within the same total cap (not additive entitlements). Prefer no new vendor. Validate actual organizational CI/private-repo quotas before release.

Effort estimates, not quotations: initial engineering 36–56 hours; documentation/product review 16–24; API validation owner 4–8; recurring maintenance 2–4 hours/week during pilot; support target at most 30 minutes per activated team/week, measured. Existing implementation now includes the token API adapter, authoring and saved-project routes; live acceptance and richer evidence/report gaps remain. ContextQA execution cost is unknown until metering is confirmed and is budgeted separately; no unlimited live free example. AI cost varies by chosen model and usage, optional and user-paid; current metrics leave estimates null. Stop paid starts on missing/unclear budget, authentication errors, ambiguous start result, repeated failure or missing cancellation/meter guard.

First month deliberately excludes public browser infrastructure, CDP parity, billing/accounts, marketplace apps, bulk sync, recurring agents, automated outreach, native mobile, PDF/DOCX, broad scraping, automatic healing and partner publishing.

## 16. Four-week delivery and decision gates

All effort is a proposal; no recurring task has been created. Detailed P0/P1/P2 backlog is linked separately and includes owner/dependency/observable done criteria.

| Week | Deliverable and owner | Effort/dependencies/cost | Acceptance and decision |
|---|---|---|---|
| 1 | Product/QA owner validates API/access/meter; engineer closes schema/adapter preview gates | 16–24h total; scoped demo account and contract owner. No paid start until cap known. | Capability register resolves execution/meter unknowns or hosted path remains blocked; choose primary ICP after 3–5 consenting interviews. |
| 2 | Engineer + technical writer complete two recipes, failure reports, agent docs and checks | 20–28h; verified schema, approved synthetic/staging target. Local CI first. | Clean-machine local success within target, failed/partial reports truthful, one separately approved live run if safe; otherwise release only labeled local utilities. |
| 3 | Product owner prepares license/release review; writer prepares at most six guides | 12–20h; rights/dependency/security review, API path evidence. No distribution spending. | Reviewable release candidate and exact proposed launch copy; no publication without separate approval. |
| 4 | Product/QA owner observes consenting pilot, fixes repeated friction, reviews commercial signals | 8–16h; approved voluntary participants and explicit measurement method. | Cohort counts, support time and costs; continue/narrow/stop decision. Stars alone cannot justify expansion. |

Suggested distribution, only after authorization: existing consenting QA/developer relationships; one useful issue-linked example in an appropriate community with its rules respected; existing ContextQA technical resources. Prepare copy, never send automatically. Draft launch sentence: “Turn one manual regression into a reviewed web check, keep the generated code, and inspect what passed or failed. Start with ContextQA's no-key synthetic recipe; hosted API access is a separate evaluation.” Update claims only when actual release gates pass.

## 17. Experiment targets, diagnoses and expansion

Targets, not forecasts: 4/5 consenting testers reach local output in 15 minutes; median first approved live result within 30 minutes *after access is provisioned*; at least 8/10 authorized live attempts yield conclusive assertion results; 3/5 eligible teams activate; 2/3 activated teams repeat within 14 days; at least 1 qualified evaluation from five activated teams; observe paid conversion at 60–90 days rather than declare a four-week revenue win. Execution cost per meaningful successful workflow = all related execution charges including failed attempts / successful meaningful workflows; no target currency until actual meter is verified. Support target <=30min/activated team/week.

Weak discovery: right audience cannot find specific guide → improve one title/distribution. Wrong audience: visitors cannot name a repeated owned workflow → narrow ICP. Positioning: users misread local as hosted or completion as pass → fix opening/output. Setup: correct users fail dependencies/auth → shorten setup and clarify entitlement. Missing API: target operation/schema/evidence absent → hold hosted claims and escalate exact gap. Reliability: conclusive result rate below target → fix result mapping/execution before adding recipes. Poor paid fit: repeated local use without managed execution need → keep utility small, interview; no forced upsell.

Continue after five eligible teams if at least three activate, two repeat and support/cost are acceptable. Narrow if one role/use case succeeds and the rest do not. Expand only after repeated usage plus credible qualified evaluation, not traffic. Stop or retain minimal static utility if zero repeat need after five activated teams, unresolved cost/isolation risk, or support exceeds two hours/team/week after focused repair. Treat small cohorts as directional, not statistical proof.

At most three next recipes, ranked: **release evidence pack** after >=3 teams repeatedly assemble the same run artifacts; **test execution summary** after >=3 teams need the same status/report schema; **customer onboarding guide** after >=2 consenting solutions teams complete a real capture/change/refresh lifecycle. SOPs, generic form filling, more native imports and workflow marketplaces remain deferred until a bounded task, usable API and credible buyer are demonstrated.

## 18. Material open decisions

Who owns REST access and applicable meter? Is the contract's token onboarding current for new customers? Can reviewed imported cases be mapped/created through supported APIs without losing assertions? Which terminal statuses and verdict fields are authoritative? What artifacts can be retrieved safely, for how long and with what rights? Is cancellation or server budget enforcement available? Which license and dependency notices are approved? Which single ICP cohort can volunteer, and which existing analytics/commercial records may be used with consent? Can optional model vendors process the selected data under the team's agreement? Which native Layerpath/EkLine permissions are actually enabled?

These questions affect live execution, commercial claims or release—not local sample preparation. Do not ask for a fresh general permission to continue reversible drafting. Resolve only the specific missing boundary before it matters.

## Repository-specific application: contextqa-test-forge

Primary QA/manual-backlog entry point. The implemented ContextQA token client, source-bound authoring bundles and saved-project execution are the primary API route; portable exports remain complementary. Mocked transport/configuration checks pass, while live tenant and billing acceptance remain outstanding.

Current human-facing campaign: `contextqa_test_forge`. Do not use this campaign on technical URLs. Useful local commands and implemented capabilities are in this repository's README. The common strategy does not turn proposed commands or endpoints into shipped behavior. Read [prioritized backlog](backlog.md), [audience and fair comparisons](comparisons.md) and [optional AI provider configuration](ai.md).

After useful local output: [Discuss ContextQA API evaluation](https://contextqa.com/book-a-demo/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=recipe_api_evaluation). This is the existing evaluation/demo page, not an automatic API-access grant.
