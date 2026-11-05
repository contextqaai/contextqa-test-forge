# Build your first owned agent

[Builder hub](README.md) · [Recipes](recipes.md) · [Human loop](human-loop.md)

Start with an **Expense Policy Guardian**: protect the rule that expenses above an agreed limit require manager approval. Your custom contribution is the business rule, chosen evidence and escalation policy. ContextQA supplies the native automation path; Test Forge supplies reusable source, approval, configuration and reporting tools.

## 1. Define the job before choosing tools

Copy the [agent brief](agent-brief.md) into a private project note. Name the owner, requirement, expected result, selected workflow and failure decision. For this example, a wrong business result must be escalated; it cannot be repaired by weakening the assertion. Decide who can approve a run and who accepts the result.

## 2. Inspect a complete offline example

Run from the repository root with Node 22+, using new output directories:

```sh
node examples/customize-agent.js output/my-first-agent
node examples/contextqa-workflow.js output/my-first-native-flow
```

The first command creates profile, contract, approval, source, local sync-plan, report and notification-intent examples. The second exercises the existing ContextQA adapter with mock transport and synthetic IDs. Neither performs a live run. Read each output directory's files before adapting them; scripted fictional reviewers are not approval for your own requirements.

| Inspect | Decide what to customize |
|---|---|
| `output/my-first-agent/profile.json` | Your owner/agent name, version, Playwright style, generated/custom folders and report preferences |
| `output/my-first-agent/contract.json` | Business criteria, assertions and explicit mappings |
| `output/my-first-agent/sync-plan.json` | Proposed generated artifacts and source lineage |
| `output/my-first-agent/notification-intents.json` | Desired handoff; these messages have not been sent |
| `output/my-first-native-flow/result.json` | Mocked operations and explicit non-execution status |

## 3. Create your profile

```sh
node scripts/builder-profile.js init --name 'Your name' --agent 'Expense Policy Guardian' --out output/my-first-agent/owned-profile.json
node scripts/builder-profile.js validate --profile output/my-first-agent/owned-profile.json
```

Edit `owned-profile.json` for your team, then validate it again. Follow [customization](../customization.md) for supported settings. A builder profile controls the local workflow; it is not the native saved-plan execution profile. Keep customer requirements and credentials private. Copy approved builder/style settings into the actual contract before review; do not relabel the fictional sample as a customer result.

## 4. Compose existing tools around one decision

| Your coordinator's step | Existing building block | Human checkpoint |
|---|---|---|
| Read selected requirements | `src/sources.js`; selected source import/read commands | Confirm source, business intent and expected result |
| Check the selected native configuration | `inspectProject` in `src/contextqa-project.js` | Review drift, environment, prerequisites and data references |
| Author only needed changes | Existing preview/approve/apply bundle workflow | Review exact payload and authorize writes |
| Run the approved saved plan | Existing journaled `project-run` workflow | Authorize scope, side effects and cost separately |
| Retrieve and interpret results | Existing bounded polling/result APIs | Inspect actual assertions and selected member evidence |
| Propose a repair or code update | Existing maintenance and sync tools | Preserve intent; review and rerun; merge deliberately |

Use the [custom-agent tutorial](../custom-agent.md) for a concrete read-only tool factory and exact native configuration, authoring and execution commands. It already demonstrates how to compose the client. Add a small policy function around those tools rather than copying their transport, journal or exporter implementations. Keep tool allowlists and approved configuration outside untrusted requirement/model text.

For MCP, inspect the connected tool catalog, scopes and input schema and bind only selected tools. MCP authentication is separate from REST tokens. The REST example is not an MCP server, and this guide does not invent equivalent MCP method names. If a desired capability is available only through an authorized UI/operator workflow, use that handoff until a supported interface is established.

## 5. Prove that it catches a problem

Follow [builder acceptance](../builder-acceptance.md) to run the existing synthetic browser lifecycle: baseline, negative business control, stale locator, reviewed repair and behavior defect. These local browser checks are separate from ContextQA SaaS acceptance. A generated project is not a passing test.

Then move to one separately authorized real workflow using [token setup](../tokens.md) and the live-acceptance steps in [the custom-agent tutorial](../custom-agent.md). Replace all fictional IDs and targets, record the accepted run ID, inspect evidence and preserve unknowns. Never retry an ambiguous start; a polling timeout is not cancellation.

## 6. Optimize with the team

Record setup effort, reviewer corrections, meaningful assertions checked, failures caught, review time and known execution/provider costs. Compare repeat runs of the same scoped task. Let the owner decide which repeated preparation steps are worth automating next. Keep release decisions and unresolved business ambiguity visible. Use [the human-loop guide](human-loop.md) and [outcome measurement](../measurement.md) to turn observations into a better agent.
