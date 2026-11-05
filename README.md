# ContextQA Test Forge

For **SDETs building their own QA agents**: turn reviewed requirements into ContextQA workflows and owned Playwright tests. Selenium and WebdriverIO exports are also available.

[ContextQA setup](docs/tokens.md) · [Customize your agent](docs/customization.md) · [Technical guide](docs/POWERFUL.md) · [Real testing](docs/real-testing.md)

## Who does what?

| Role | Responsibility in this repo |
|---|---|
| **ContextQA** | Stores native cases/plans, executes an authorized saved plan using its configured settings, and returns results/evidence. |
| **Your custom agent** | Coordinates source intake, reviewed authoring, bounded result reads, portable exports and maintenance proposals using this toolkit. AI drafting is optional. |
| **Human in the loop** | Defines business assertions and mappings; approves writes and execution scope/cost; reviews evidence, repairs and PRs before accepting changes. |

```mermaid
flowchart TD
    A[Agent: prepare requirements and mappings] --> H{Human: approve intent and scope}
    H -->|Authorize run and cost| C[ContextQA: execute saved plan]
    H -->|Approve portable export| E[Agent: export test code]
    C --> R[Agent: collect actual results]
    E --> T[Human: review code and run tests]
    R --> V[Human: verify assertions and evidence]
    T --> V
    V -->|Change needs review| A
    classDef agent fill:#ede9fe,stroke:#7c3aed,color:#2e1065
    classDef platform fill:#ccfbf1,stroke:#0f766e,color:#134e4a
    classDef human fill:#fef3c7,stroke:#b45309,color:#78350f
    class A,E,R agent
    class C platform
    class H,T,V human
```

Approval gates apply to the selected action; **export is not execution**. The agent is your composed workflow, not an installed autonomous service. [Review checkpoints and an example](docs/POWERFUL.md#roles-and-human-review).

[Slide-style overview](assets/readme/overview.svg)

## Try it locally

Requires **Node 22+**. From the repository root, use a fresh output directory:

```sh
npm test
node examples/contextqa-workflow.js output/contextqa-first-look
```

This uses **mock ContextQA transport and synthetic IDs**: no account, model call or paid run. Inspect `result.json`; do not submit the sample bundle live.

**Know the boundary:** exports do not execute tests. Live tenant/billing acceptance and native auto-healing remain unverified; notifications are delivery intents. Review source, assertions and actual results.

**Private candidate:** no open-source license or public release yet. Optional AI and hosted execution use separate credentials and may incur charges.

[Developer instructions](AGENTS.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Capability evidence](docs/capability-register.md)
