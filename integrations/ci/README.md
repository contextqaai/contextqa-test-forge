# ContextQA CI integration candidates

Run a reviewed saved plan and retain repository, exact commit and deployment identity alongside its verdict. This implementation reuses the existing token API client. It does not infer test scope from a diff; GitHub/GitLab native PR-impact enrollment is a separate product setup.

**Release status:** local synthetic acceptance only. Not yet an approved Marketplace Action, GitLab Catalog component, CircleCI orb, Azure extension, Jenkins plugin or Bitbucket Pipe. Validate against an authorized tenant before enforcing a production gate. The repository retains its existing UNLICENSED status; a distribution-license decision is still required before a reusable marketplace release.

## Connection and first run

1. Create an account at [Ship](https://ship.contextqa.com/) and manually validate a plan against a controlled test deployment.
2. Obtain a scoped API token from the authorized administrator. The adapter needs plan/result reads and execution, plus case/suite/step reads for the resources in your profile. See [token setup](../../docs/tokens.md). This adapter uses the inspected cloud contract at `https://server.contextqa.com`; it does not support arbitrary tenant URLs or internal service keys.
3. Create a reviewed profile following [saved-project configuration](../../docs/contextqa-platform.md). Replace every synthetic ID in the example. Include environment and suite/case expectations sufficient to detect drift.
4. Have the trusted deployment job write the context JSON shown below. Read `deployedCommit` from the actual deployed build/manifest. Do not copy the expected commit into both fields merely to satisfy validation. Restrict the job to an approved deployment origin and verify that plan step URLs target that environment.
5. Install Node 22+ and check out an immutable reviewed revision of this toolkit in a separate directory. Configure the environment variables below, then run `node /path/to/toolkit/scripts/ci-gate.js`.
6. Inspect `receipt.json`, `intent.json` and `junit.xml` in the new private output directory. Only an exact positive expected count and a passing terminal result yield exit 0. All other results block with exit 2.

```json
{
  "schema": 1,
  "provider": "github",
  "repository": "your-org/your-app",
  "commit": "1111111111111111111111111111111111111111",
  "deployedCommit": "1111111111111111111111111111111111111111",
  "deploymentId": "preview-123",
  "expectedTotal": 3
}
```

This JSON is illustrative; the commit is synthetic. Allowed providers: github, gitlab, circleci, jenkins, azure, bitbucket, other. The pipeline attests build identity. The adapter does not independently query the deployed application, re-check moving branch heads, map ticket context, or enforce provider branch protection. Use an immutable preview build and your provider's current-head policy. The returned result summary alone does not prove per-case identities or every matrix cell; retain native evidence and validate scope before treating this as a release control.

| Variable | Meaning |
|---|---|
| `CONTEXTQA_API_TOKEN` | Protected scoped secret, never a workflow literal |
| `CONTEXTQA_PROFILE_FILE` | Reviewed saved-project JSON path |
| `CONTEXTQA_CONTEXT_FILE` | Deployment-job context JSON path |
| `CONTEXTQA_OUTPUT_DIR` | New private directory; parent must exist |
| `CONTEXTQA_APPROVE_EXECUTION` | `true` under your approved execution policy |

An execution may consume credits. The trigger is sent once; a timeout does not cancel it. A new CI worker has no shared journal: do not automatically retry or rerun an uncertain start. Reconcile the native run and private intent first. JUnit contains **one gate assertion**, not fabricated per-test results. Receipts contain repository/build IDs and must use access-controlled artifact retention; raw provider responses and credentials are not published.

## GitHub Actions

The root `action.yml` is a candidate action using the same adapter. In a trusted workflow, check out application configuration from a protected ref, verify the deployment, then invoke:

```yaml
- uses: contextqaai/contextqa-test-forge@REVIEWED_FULL_COMMIT_SHA
  with:
    token: ${{ secrets.CONTEXTQA_API_TOKEN }}
    profile-file: private/project.json
    context-file: private/context.json
    output-directory: ${{ runner.temp }}/contextqa-run
    approve-execution: 'true'
```

Replace the placeholder with a reviewed full SHA containing this implementation. Do not expose secrets to fork PR code or use privileged `pull_request_target` to execute untrusted code/configuration. Set the ContextQA job as a required check only after controlled pass, fail, empty and timeout acceptance. Runtime requires a GitHub runner supporting Node 24 actions.

## Other providers

- **GitLab:** `templates/contextqa.yml` is a CI/CD component candidate. Check out the reviewed toolkit before this job and pass its directory as `toolkit-directory`. To publish, use an organization-owned GitLab project, put the component under its `templates/`, enable CI/CD Catalog and publish a tested semantic release through a release job. This GitHub path itself is not a GitLab Catalog listing.
- **CircleCI:** `circleci/orb.yml` is an orb candidate with a `run` command. It requires Node 22+ and a previously checked-out, pinned toolkit. Use a restricted context for the token. Validate with CircleCI's CLI and a controlled project before publishing into an owned namespace.
- **Jenkins:** `examples/Jenkinsfile` uses credentials binding and the shared runner. No Jenkins plugin is installed or claimed. Supply a trusted toolkit path and reviewed files, then collect the single JUnit gate.
- **Azure Pipelines:** `examples/azure-pipelines.yml` is a job snippet, not a Marketplace extension. An extension needs its own task packaging and publisher validation after live acceptance.
- **Bitbucket:** `examples/bitbucket-pipelines.yml` is a pipeline step, not a published Pipe. A Pipe needs a versioned public container and complete metadata/testing before submission.

All examples assume the deployment and immutable toolkit checkout have already happened. They intentionally do not silently download executable code from a moving branch.

## Acceptance and marketplace package

Run `npm test` for synthetic behavior. Before listing: verify token entitlement and the current API contract; run a known pass and deliberate failure on a controlled target; confirm count/empty/timeout handling, drift rejection, build binding, no duplicate start, private evidence retention, and actual CI gating. Record run IDs and costs. Resolve license/maintainer ownership and include support, privacy, setup and compatibility information. Partner inquiries are separate from technical acceptance or certification.

[ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=ci_integration) · [MCP connection guide](https://mcp.contextqa.com/docs)
