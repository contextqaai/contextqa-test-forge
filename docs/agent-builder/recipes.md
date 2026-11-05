# Choose an agent your team wants to own

[Builder hub](README.md) · [First agent](first-agent.md) · [Capability map](capabilities.md)

These are composition recipes, not six installed autonomous services. Reuse the linked implementations. Add only the team-specific decision logic and integrations that the recipe needs.

| Agent and useful outcome | ContextQA capabilities to reuse | What you build | Human contribution | Starting point and current boundary |
|---|---|---|---|---|
| **Business-rule guardian:** protect one critical rule | Native cases, configured plans, execution and evidence | Selected requirement → approved assertions → decision packet | Define the rule, review mappings, inspect negative controls and accept results | [First-agent exercise](first-agent.md); offline examples work, live acceptance is separate |
| **Release-readiness assistant:** give a release owner an evidence-backed recommendation | Existing regression plans and available results | Team-specific required journeys, missing-evidence checks and a release summary | QA lead chooses risk priorities; release owner decides go/no-go | [Custom-agent tutorial](../custom-agent.md), [measurement](../measurement.md); recommendation/policy composition is yours, no automatic deployment gate installed |
| **PR-impact coordinator:** connect selected changes to relevant coverage | Platform change-impact/context capabilities where accessible, selected native tests | Bind reviewed code-to-workflow mappings to a review packet | Review unknown impact, uncovered areas and execution scope | [Source subscriptions](../customization.md); selected watches exist, generalized impact-to-execution orchestration requires supported bindings |
| **Maintenance steward:** keep tests meaningful as UI changes | Available native diagnosis/healing evidence and existing test results | Triage policy, repair review queue and rerun evidence | Distinguish a locator issue from a business change; preserve assertions | [Maintenance](../maintenance.md); portable locator proposals exist, native healing integration is not established by this repo |
| **Documentation steward:** keep a workflow guide aligned with observed behavior | ContextQA execution and selected screenshots/results | Audience, wording, explicit step/media mappings and refresh handoff | Review accuracy, privacy, rights and final publication | [Docs Evidence agent recipe](https://github.com/contextqaai/contextqa-docs-evidence/blob/main/docs/how-to-use.md); local export/compare exist, automatic recapture/publishing do not |
| **Migration reviewer:** move an understood scenario into owned Playwright code | Selected native cases/results as context and verification evidence | Explicit mapping, preferred code style and parity checklist | Compare assertions and behavior before accepting migrated code | [Contracts](../contracts.md), [customization](../customization.md); this is a reviewed mapping recipe, not an arbitrary Selenium-code converter |

## A release-readiness decision packet

Give the reviewer a small, consistent artifact: selected release and environment; requirements and business assertions; required journeys and omitted coverage; accepted run IDs and observed outcomes; failed/partial/unknown results; evidence references kept appropriately private; recommendation with reasons; and the owner's recorded decision. Compute a recommendation only from the required evidence. A missing result stays unknown rather than becoming a pass.

## Add capability without rebuilding the platform

Choose a native ContextQA capability first. Confirm how your account can invoke it. If an existing repository adapter covers that interface, compose it. Otherwise define a small adapter or explicit human handoff; label it as integration work until validated. Keep product engines, diagnosis and native orchestration in ContextQA. Put business policy, selected context and team handoffs in your agent.

Start with manual invocation and a named owner. Enable event-driven preparation only after the team can explain and repeat the result. Installing schedules, sending notifications and publishing changes are separate actions; an example configuration does not do them.
