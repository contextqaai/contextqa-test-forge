# ContextQA Test Forge

ContextQA Test Forge helps QA teams turn requirements from Jira, Linear, TestRail, Xray Cloud, GitHub Issues or a JSON export into reviewed, source-linked **Playwright, Selenium or WebdriverIO** projects. Keep the editable generated code in your own project. Optionally bring your own **OpenAI, Claude or OpenAI-compatible API key** to draft test cases.

Built under `contextqaai` for [ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=readme_overview). This is a private, runnable first release. It is not a hosted service, marketplace-certified connector, universal natural-language-to-working-test guarantee or replacement for checking application behavior.

**Release status:** private candidate; an open-source license and public release are pending owner approval. Core local samples make no model or ContextQA SaaS calls. Optional AI and hosted execution use separate credentials and may incur provider charges.

## Run an end-to-end example

Requires Node 22+. The core has no npm runtime dependencies and needs no source account or AI key.

```sh
npm test
node examples/demo.js output/demo
```

This imports six synthetic source fixtures and exports **18 projects**: each source in each of the three frameworks. Inspect `output/demo/metrics.json`, the source snapshot, structured contract, approval receipt and generated test. The fixture is an invented HTML preferences form, not customer data.

Run one exported project explicitly:

```sh
cd output/demo/github-playwright
npm install
npx playwright install chromium
npm test
```

For `github-selenium` or `github-webdriverio`, install Chrome, then `npm install` and `npm test`. Projects pin framework versions. Exporting never runs tests. [CI run 40601770497](https://github.com/contextqaai/contextqa-test-forge/actions/runs/40601770497) passed the unit job and real synthetic browser tests in all three frameworks for commit `4f6417f` on October 27, 2026. That historical run did not test live source credentials, AI providers or hosted ContextQA execution. [Fresh installation, positive/negative browser controls and live acceptance steps](docs/real-testing.md) explain how to verify your current checkout. A generated file is not a passing result.

## Your real workflow

1. Choose an explicit source item and read-only key; use [source endpoint and token setup](docs/sources.md).
2. Fetch it or import an existing JSON response.
3. Optionally use [your AI key](docs/ai.md) to draft requirements from content you explicitly approve sharing.
4. Author a structured contract with verified CSS selectors, staging URLs, environment references and expected results. The demo contains a complete example.
5. Review the source and contract, record approval, export and inspect the project.
6. Run only in an authorized disposable test workspace. Retain runner logs and reports as execution evidence.
7. When the source or app changes, re-fetch, update selectors/expectations, compare contracts, reapprove and re-run.

```sh
node src/cli.js fetch --config examples/config/github.json --out source.json
# Or import a saved response:
node src/cli.js import --platform github --input examples/fixtures/github.json --out imported.json
# After authoring contract.json with sourceSha from source.json:
node src/cli.js approve --contract contract.json --source source.json --reviewer 'Your Name' --confirm-reviewed --out approval.json
node src/cli.js export --contract contract.json --approval approval.json --framework playwright --out new-project
node src/cli.js diff --before old-contract.json --after contract.json --out change-report.json
```

Output files and directories must be new. Store real source, contracts, credentials and results outside the repo or in ignored `private/`, `.ai-private/` or `output/`. No customer test source is needed to try the example.

## What works, and what remains manual

| Capability | Current implementation |
|---|---|
| Jira Cloud, Linear, TestRail, Xray Cloud, GitHub Issues | Single-item read adapters; fixture/transport tested. Real tenant credentials not tested here. |
| Other platforms | Map their export into the canonical JSON source shape; no universal live connector claim. |
| AI | Optional local drafting with OpenAI Responses, Anthropic Messages or compatible Chat Completions; mock-tested, not live-billed. |
| Three automation frameworks | JavaScript projects with real assertions, waits, pinned dependencies and guaranteed cleanup for Selenium/WDIO. |
| Review and provenance | SHA-256-bound contract approval; changed contracts require approval again; traceability per project. |
| Maintenance | Added/changed/removed test diff; manual selector/source mapping and rerun. No automatic healing claim. |
| Reporting | Measured import/export/demo duration and provider-reported AI usage. No fabricated coding-time or token savings. |
| Not implemented | Bulk pagination, custom Jira fields, Xray Server/DC, source writeback, result synchronization, secret vault hosting, live browser discovery, automatic PR creation, mobile/native, file upload, shadow DOM/frame mappings or arbitrary code steps. |

Supported steps: navigate, click, fill, native-select by value, checkbox check, exact text, visibility and exact URL assertions. CSS selector semantics and displayed text can differ across engines; verify on your app. Each test requires at least one assertion. Missing selectors, unsupported actions and changed approval hashes fail closed. Review receipts are local process controls, not cryptographic identity signatures.

Read [installation and real testing](docs/real-testing.md), [contract schema and lifecycle](docs/contracts.md), [source APIs and keys](docs/sources.md), [AI configuration](docs/ai.md), [use cases and comparisons](docs/use-cases.md), [metrics](docs/metrics.md), [security](SECURITY.md), and [contributing](CONTRIBUTING.md).

Related ContextQA reading: [recording browser workflows](https://contextqa.com/tutorials/no-code-test-automation-recorder/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=readme_recorder) and [reviewing visual baselines](https://contextqa.com/blog/visual-regression-testing-ui-stability/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=readme_visual_blog). Related repos: [browser sessions and evidence](https://github.com/contextqaai/contextqa-browser-cloud), [documentation evidence handoffs](https://github.com/contextqaai/contextqa-docs-evidence). This repo does not require either service or expose a ContextQA SaaS endpoint.

## Product strategy and release plan

[Growth strategy and two-recipe specification](docs/GTM.md) · [Capability evidence](docs/capability-register.md) · [Prioritized implementation backlog](docs/backlog.md) · [Audience and fair comparisons](docs/comparisons.md). These are local release drafts; proposed API flows, commands and commercial claims are explicitly gated. No public open-source release or hosted service is implied.

## Install and test for real

Follow the [fresh-install and real-testing guide](docs/real-testing.md) for observed test coverage, a reproducible local path, expected failures and the remaining live-account acceptance checks. Synthetic browser results are separate from real source/AI credentials and customer staging workflows.
