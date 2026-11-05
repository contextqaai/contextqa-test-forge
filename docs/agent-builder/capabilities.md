# From ContextQA capabilities to your custom agent

[Builder hub](README.md) · [Recipes](recipes.md)

The owner-supplied system map organizes ContextQA into **54 capabilities across eight phases**. Treat it as a menu of platform capabilities to reuse. Your custom agent adds the task-specific objective, selected context, business policy and handoff; humans steer the loop and improve it.

This is a product-to-builder map, not a claim that all 54 capabilities are callable through this repository. The integration notes below describe the inspected toolkit boundary. A missing toolkit binding does not mean a capability is absent from ContextQA. Confirm the supported product interface and account access before implementing a binding.

## Pick an integration surface

| Surface | How it helps a builder | What to verify |
|---|---|---|
| ContextQA MCP | Lets a tool-using assistant compose supported tools and context | Connected tool catalog, input schemas, permissions and actual result semantics; separate OAuth/access setup |
| ContextQA APIs | Lets scripts and CI reuse native objects, saved plans and results | Exact operation, scope, IDs, write semantics and account access; see [API workflow](../contextqa.md) |
| Existing skills and repositories | Reusable instructions, code, examples and review patterns | Actual shipped behavior and licensing; these private repos currently grant no open-source license |
| Native product plus operator handoff | Uses capabilities without a supported programmatic binding | Named operator, exact task and evidence returned to the agent |

The Forge client catalogs 40 operations from its supplied token contract; Docs Evidence implements 26 contract-derived operations. These numbers describe client catalogs, not the 54 product capabilities. Read [capability evidence](../capability-register.md) and [native configuration](../contextqa-platform.md) before expanding a binding. MCP and REST are separate interfaces; no universal one-to-one mapping is assumed.

## Eight phases, one reusable foundation

### Onboard

**Capabilities in the supplied map:** Sign up and SSO; Create org and workspace; Connect GitHub; Connect Jira or Azure DevOps; Connect CI/CD and monitoring; Add app and environments; Give requirements or intent.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse account, application and integration setup. |
| Customize your agent | Choose the business journey, owner and approved scope. |
| Human contribution | Confirm access, environment, roles and data. |
| Current repository binding | Use authorized product/admin setup; the token adapter does not provision accounts, SSO or environment catalogs. |

### Sense

**Capabilities in the supplied map:** Requirements and Ticket Reader; Design and Spec Reader; Code and PR Watcher; Crawl and Coverage Scout; User Session Miner; Production Signal Reader; Support Bug Intake.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse available context and signals from the platform. |
| Customize your agent | Select the context relevant to your team and normalize it into a bounded task. |
| Human contribution | Resolve ambiguity and decide which signals deserve action. |
| Current repository binding | Selected source adapters and explicit watches exist in Forge; general crawl/session/production connectors are not exposed by this toolkit. |

### Plan

**Capabilities in the supplied map:** Requirement Quality Reviewer; Test Strategy Planner; Risk Prioritiser; Change Impact Analyst; Coverage Gap Analyst; Semantic Duplicate Finder; Regression Planner.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse available planning, impact and coverage capabilities. |
| Customize your agent | Apply team-specific business criticality and coverage policy. |
| Human contribution | Choose tradeoffs, review uncovered areas and set success criteria. |
| Current repository binding | Source-bound contracts and manual mappings are concrete building blocks; these product capability names are not token-operation IDs. |

### Create

**Capabilities in the supplied map:** Test Generation Agent; Edge-Case Designer; Test Data and Mock Builder; Non-Functional Test Designer; Developer Test Assistant; Test Review and Approval.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse native test creation and supported generation capabilities. |
| Customize your agent | Add business rules, naming, code style and selected authoring payloads. |
| Human contribution | Review assertions, expected outcomes, data and full write payloads. |
| Current repository binding | Raw case/step/suite/plan authoring and portable exporters exist; generation/edge-case/data-model capabilities need their own confirmed interface. |

### Orchestrate

**Capabilities in the supplied map:** ContextQA Orchestrator; Context Graph and Decision Memory; Custom Agents and Skills; Confidence and Human Policy Gate; Pipeline and Schedule Manager.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse native orchestration and configured dependencies. |
| Customize your agent | Compose a small coordinator for team policy and cross-tool handoffs. |
| Human contribution | Set review boundaries, route decisions and optimize sequencing. |
| Current repository binding | Saved-plan configuration checks, execution journals and workflow generation exist; no general context-graph API, installed schedule or automatic confidence gate is implied. |

### Execute

**Capabilities in the supplied map:** Web Automation Agent; Mobile Device Agent; API and SDK Agent; Visual and Accessibility Agent; Performance and Security Agent; Enterprise App Agent; AI-Agent Evaluation Agent; Manual, Exploratory and UAT Assistant.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse the native execution capability appropriate to the selected workflow. |
| Customize your agent | Select supported plans and assemble the evidence your audience needs. |
| Human contribution | Authorize targets/effects/cost and review actual behavior. |
| Current repository binding | Saved-plan start and bounded result reads are available; do not infer callable interfaces or account entitlement for every execution category from the map. |

### Diagnose and heal

**Capabilities in the supplied map:** Session Replay Reader; Screenshot and Video Analyst; Trace Reader; Network and Console Log Reader; RCA and Flaky Classifier; Self-Healing Agent; Bug Reproduction Agent; Auto-Fix Agent.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse available native diagnostics, artifacts and healing capabilities. |
| Customize your agent | Build a review queue and evidence-backed escalation or maintenance packet. |
| Human contribution | Separate application defects, locator drift and uncertain evidence; review any repair. |
| Current repository binding | Portable locator-only maintenance exists; native healing/auto-fix decisions are not established through this repo. Docs Evidence supports selected-media intake, not semantic media diagnosis. |

### Deliver and learn

**Capabilities in the supplied map:** Verify and Regression Agent; Defect, Result and PR Publisher; Release Gate Agent; Quality Insights; Suite Optimiser; Production Monitor.

| Responsibility | Builder interpretation |
|---|---|
| Reuse ContextQA | Reuse available verification, reporting and learning capabilities. |
| Customize your agent | Format the team decision, proposed PR, documentation or next coverage experiment. |
| Human contribution | Accept/merge/publish, decide release readiness and tune the suite. |
| Current repository binding | Forge supports local reporting and guarded private PR publication; notifications are intents. Docs Evidence exports local files. Universal source writeback, automatic release gates and production monitoring are not installed. |

## Compose journeys across phases

The supplied map names eight journeys: sign-up to first value; story to done; pull request to merge; release regression; beyond functional; customer bug to fix; self-heal and suite health; production to coverage. Choose the smallest useful slice of one journey for a first agent. For example, a release-readiness assistant composes selected planning, execution and reporting capabilities with a human-owned release decision. A documentation steward reuses execution/evidence and adds the audience-specific guide workflow in Docs Evidence.

**Source and status:** owner-provided ContextQA system-map image, reviewed November 5, 2026; the [pilot deck](https://docs.google.com/presentation/d/1Y8Z2Gkh3awvq1UUd2a3tDifxNZ1qudlwhifflToqxqk/edit?slide=id.p6#slide=id.p6) supplies the composition and ownership framing. Exact callable behavior is grounded in the current repository docs/code, not inferred from the product labels. No additional live capability acceptance was performed for this guide.
