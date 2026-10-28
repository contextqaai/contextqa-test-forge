# Install, run and verify real tests

The repository has been tested at several levels. A local generation result, an actual browser assertion and an authenticated production integration are separate evidence. The primary [ContextQA API workflow](contextqa.md) now implements reviewed authoring, saved-plan execution and result retrieval; its acceptance checks use mocked API transport, not a live tenant. Complementary portable tests run on your own browser infrastructure and are not relabeled as ContextQA executions.

## What has actually passed

On **2026-10-27**, [GitHub Actions run 40601770497](https://github.com/contextqaai/contextqa-test-forge/actions/runs/40601770497) passed for commit **`4f6417f2badf5b83c4d6ab0bb276c0d583c0a492`**. The recorded workflow ran:

| Check | Actual scope |
|---|---|
| Unit job | Node 22 unit tests and generation of the six source fixtures into 18 projects. Source/API/model transports are mocked. |
| Playwright browser job | Installed the exported project's pinned dependency and Chromium, then executed the synthetic GitHub preferences test in a real headless browser. |
| Selenium browser job | Installed the pinned WebDriver dependency and executed the same synthetic test using Chrome on the runner. |
| WebdriverIO browser job | Installed the pinned dependency and executed the same synthetic test using Chrome on the runner. |

The unit job took about six seconds and the observed workflow elapsed time was about 52 seconds; these are historical CI observations, not installation or performance guarantees. The synthetic test fills a name, selects a theme, checks a checkbox, saves, and asserts visibility and `Saved` text. It navigates to a repository-owned HTML data URL, not a customer service. Six source formats were normalized; only the GitHub-derived browser project was executed for each framework. The source variants share this fixture, so that does not establish six live connector tests.

That run did **not** include the negative-control command below, live source authentication, a paid AI call or ContextQA SaaS execution. It does not certify later local changes. The current workflow adds the negative control; it requires its own subsequent passing run before claiming that CI coverage is proven. Use a checkout containing this guide and `scripts/verify-export-failure.js`; the historical commit predates those additions.

## Fresh installation and positive control

Use Node **22+**, npm, Git and a private checkout you are authorized to access. Selenium and WDIO need Chrome installed; their framework manages its driver and may download it. Playwright installs its own Chromium. Package/browser installation requires network access and disk space; no AI or ContextQA key is needed. Commands below use a POSIX shell on macOS/Linux. Windows users can run them in WSL, or use equivalent PowerShell paths and commands.

```sh
git clone git@github.com:contextqaai/contextqa-test-forge.git
cd contextqa-test-forge
node --version
npm install --ignore-scripts --package-lock=false
npm test
mkdir -p output
FORGE_RUN_DIR="$(mktemp -d "$(pwd)/output/acceptance.XXXXXX")"
node examples/demo.js "$FORGE_RUN_DIR"
```

The core has no npm runtime dependencies. The first `npm test` is a unit/mock test, not a browser run. The demo writes a normalized source, a reviewed structured contract and approval receipt for each synthetic source, plus 18 exported projects and generation metrics. Save the printed output path. Every new attempt should use a fresh ignored directory; exports refuse to overwrite a project.

From the repository root, execute the positive and negative controls for each framework:

```sh
for FORGE_FRAMEWORK in playwright selenium webdriverio; do
  (
    cd "$FORGE_RUN_DIR/github-$FORGE_FRAMEWORK" || exit 1
    npm install || exit 1
    if [ "$FORGE_FRAMEWORK" = playwright ]; then
      npx playwright install chromium || exit 1
    fi
    npm test || exit 1
  ) || exit 1
  node scripts/verify-export-failure.js \
    --demo "$FORGE_RUN_DIR" --framework "$FORGE_FRAMEWORK" || exit 1
done
```

On a clean Linux host, Playwright may also need OS libraries: use its documented `npx playwright install --with-deps chromium` setup when you have permission to install them. A missing browser/library or driver download failure is a setup failure, not an assertion test result.

The positive control must exit **0** and report a passed browser test for each framework. Review `tests.spec.js` and `traceability.json` before running your own target. Generation's `executed:false` remains a generation fact; the browser runner's result is separate and does not rewrite that manifest.

## Deliberately failing assertion

`scripts/verify-export-failure.js` is a test harness for the repository-owned synthetic demo, not customer automation approval. For the selected framework it:

1. Verifies the source/contract's existing approval and recognized fixture source.
2. Preserves all original actions and successful assertions, then appends a deliberately impossible text expectation on `#result`.
3. Creates a **new** contract, source-bound synthetic approval and exported project in `negative-FRAMEWORK-*` under your demo directory. It does not edit the positive export or bypass `approve`/`exportProject`.
4. Reuses the positive project's installed dependency directory. It performs no second install, source API request or model call.
5. Executes the negative project, requires a nonzero runner exit and a precise failure location at the appended assertion or Selenium's unique static test/step timeout marker. A launch/import error, timeout of the harness, unexpected pass or failure earlier in the test makes the harness fail.

Successful verification prints `negativeControlPassed:true` and exits **0**, while its child test runner must exit nonzero. Inspect the saved `contract.json`, `approval.json`, `runner.log`, `result.json` and `project/traceability.json`. This establishes that a wrong expected result can fail the synthetic check; it does not measure failure coverage on your real app.

Playwright retains failure evidence under the negative project's `test-results/` according to the exported configuration. Selenium/WDIO currently save runner output but do not automatically capture equivalent screenshots, video or traces. Keep these differences visible in any how-to video or comparison.

## Accept a real source item and staging target

Live source access remains untested by the fixture CI. Use one disposable, authorized item first. [Source setup](sources.md) lists exact read endpoints, key creation requirements and limitations. The adapter reads a token from the configured environment-variable name; it does not create an account or token.

| Source | Environment names in example config | Expected access |
|---|---|---|
| GitHub Issues | `GITHUB_TOKEN` | Selected repository's Issues read permission. |
| Jira Cloud | `JIRA_EMAIL`, `JIRA_API_TOKEN` | Authorized issue visibility; currently use the issue key in config. |
| Linear | `LINEAR_API_KEY` | Authorized issue read; personal key or explicitly configured OAuth token. |
| TestRail | `TESTRAIL_EMAIL`, `TESTRAIL_API_KEY` | API enabled and selected case readable. |
| Xray Cloud | `XRAY_BEARER_TOKEN` | Current Cloud bearer token for the selected numeric issue ID; not a Jira API token. |

Use a secret manager to inject credentials, or an owner-only ignored `.env` file and Node's `--env-file=.env`. Never paste a real token into a command argument, issue, source fixture, screenshot, model prompt or committed file. No Google SSO is performed by the CLI.

```sh
mkdir -p private
# Copy the appropriate examples/config file into private/ and edit its item/owner/site.
# Inject its credential environment variables with your secret manager first.
node src/cli.js fetch --config private/source-config.json \
  --out "$FORGE_RUN_DIR/live-source.json"
```

Inspect the source ID, locator, content and hash. Author a contract using that `sourceSha`, verified staging selectors, non-production data and real expected behavior. Review source and contract together, then approve with `--source` as shown in the README. Export into a new directory and inspect the generated test before installing/running it. Record the actual source/contract hashes, environment/version, runner exit, assertions and approved evidence. Do not treat an HTTP 200, successful export or completed click sequence as a passing requirement.

Source adapters are read-only, but generated browser actions run with the workstation's normal network access and can change the target app. Use a disposable staging account and obtain the application owner's authorization for actions and any third-party costs. Unsupported selectors/widgets/actions require a reviewed implementation change; never silently skip them.

A `CONTEXTQA_API_TOKEN` is **not used by this repository's portable export path**. The primary ContextQA route now uses that environment token through `scripts/contextqa.js` and `scripts/contextqa-workflow.js`; see [API authoring/execution](contextqa.md) and [reusable saved project settings](contextqa-platform.md). Its client/catalog/profile/authoring tests use mocked transports. The no-key `node examples/contextqa-workflow.js output/NEW_RUN` covers nine authoring operations, explicit case/step reads and manual portable mapping. It performs no live API call or paid execution. Validate actual configuration with `project-check`, then separately authorize a bounded `project-run` before claiming a live ContextQA acceptance pass. Do not add a billed execution call to ordinary CI.

## Optional live AI acceptance

The automated tests validate OpenAI, Anthropic and compatible request/usage formats with mocked responses. To test an actual model, follow [AI setup](ai.md), select a model available to your account and provide your own environment key. Use one reviewed, non-secret synthetic input and explicitly approve sharing that exact file with the configured provider. The request may be billed. Save reported token usage/latency, inspect the draft and keep missing usage unknown. Do not claim this live test has happened until its receipt exists.

AI text is a draft, not execution evidence. It must not approve a contract, run browser actions or publish a guide. Provider keys, ContextQA API tokens and source-platform credentials are distinct.

## Record evidence and create the how-to

Keep one short receipt with the checkout commit, Node/npm/browser versions, commands, timestamps, install duration, positive and negative runner outcomes, generation metrics and each untested integration. Save logs/media under ignored `output/` or `private/`, review them before sharing, and exclude raw keys, signed URLs, internal issue text and customer pixels. No telemetry is installed by these examples.

For a reproducible guide or recording: show the synthetic requirement → inspect its contract and source-bound approval → run one exported browser test → show the passed assertions → run the negative control → show the deliberate failure → explain the live-source and AI steps separately. Label historical CI, your current local run and future acceptance work explicitly. A script or workflow file alone is not proof that the current run passed.
