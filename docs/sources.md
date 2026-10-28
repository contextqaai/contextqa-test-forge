# Source APIs, credentials and examples

Adapters read one explicit item only. They do not mutate the source, traverse links, download attachments or enumerate an entire workspace. Configuration examples live in `examples/config/`; response fixtures are `examples/fixtures/`. Tokens are looked up by environment-variable name at execution time and are not placed in URLs or output. Redirects are rejected, requests time out at 30 seconds and no automatic retry occurs. Use HTTPS, a trusted workstation and least privilege.

| Platform | Endpoint used | Credential and setup |
|---|---|---|
| ContextQA | `GET https://server.contextqa.com/test_cases/ID` and explicitly selected `/test_steps/ID` through `scripts/contextqa-workflow.js read-case` | `CONTEXTQA_API_TOKEN`; authorized superadmin obtains it in ContextQA Settings → API tokens. Separate case/step read scopes. See [primary API workflow](contextqa.md). Explicit parent checks; no native element/NLP-to-selector inference. |
| GitHub Issues | `GET https://api.github.com/repos/OWNER/REPO/issues/NUMBER` | Fine-grained personal access token with read access to Issues on the selected repository; set `GITHUB_TOKEN`. Pull requests returned by the issue API are rejected. |
| Jira Cloud | `GET https://SITE/rest/api/3/issue/KEY?fields=summary,description,updated` | Classic Atlassian API token plus account email, Basic authentication; set `JIRA_API_TOKEN` and `JIRA_EMAIL`. Requires Browse Projects and applicable issue security access. Scoped token gateway URLs and Server/DC are not supported by this adapter. |
| Linear | `POST https://api.linear.app/graphql`, query `issue(id:...)` | Personal API key in Authorization, `LINEAR_API_KEY`. For an existing OAuth access token use `oauth:true` to add Bearer. No OAuth login flow is implemented. |
| TestRail | `GET https://SITE/index.php?/api/v2/get_case/ID` | Enable API access in your TestRail installation, create an API key under your user settings and use account email + key as Basic auth. Set `TESTRAIL_EMAIL`, `TESTRAIL_API_KEY`. |
| Xray Cloud | `POST https://xray.cloud.getxray.app/api/v2/graphql`, query `getTest(issueId:...)` | Supply a current Xray Cloud bearer token as `XRAY_BEARER_TOKEN`. An authorized Xray administrator provisions client credentials; exchange them using Xray's documented `/api/v2/authenticate` flow outside this tool. A Jira API token is not interchangeable. |
| Generic JSON | Local file only | No key. Use `schema`-independent source fields `id`, `title`, `description`, optional `revision`, `steps`. Choose `--platform json`. |

Xray uses the Jira numeric issue ID, not issue key. The adapter imports action/data/expected result steps and Gherkin text but does not compile Gherkin, retrieve Jira summary fields or fetch attachments. Its title defaults to the Xray test ID. TestRail imports `custom_preconds`, `custom_steps`, `custom_expected` and `custom_steps_separated`; organization-specific fields need a mapper. Jira imports summary/description/updated only. GitHub and Linear acceptance criteria remain source prose until reviewed into a contract.

Do not use personal production-admin tokens. Test adapters first against a disposable known item. No live account reads have been performed for this release; fixtures and mocked transports validate shapes and headers. Custom Jira/TestRail origins are operator-trusted configuration; inspect them before sending Basic credentials. Do not expose the fetch function as an untrusted multi-tenant HTTP service. The excluded `indivatools` GitHub owner is rejected by the adapter.

## Import without connecting an account

```sh
node src/cli.js import --platform jira --input examples/fixtures/jira.json --out output-source.json
```

For another tool, write a small read-only adapter or transform its export into `examples/fixtures/json.json` shape. No CSV or spreadsheet parser is bundled. For many cases, explicitly enumerate and invoke per item with your own rate limiting and retention policy; automatic pagination/bulk sync is not implemented.

## Official documentation

- [GitHub get an issue](https://docs.github.com/en/rest/issues/issues#get-an-issue), [fine-grained token creation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Jira issue API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [Basic auth with API tokens](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)
- [Linear GraphQL and authentication](https://linear.app/developers/graphql)
- [TestRail cases API](https://support.testrail.com/hc/en-us/articles/7077292642580-Cases)
- [Xray getTest schema](https://xray.cloud.getxray.app/doc/graphql/gettest.doc.html), [Xray Cloud authentication](https://docs.getxray.app/display/XRAYCLOUD/Authentication+-+REST+v2)

These are independent third-party products. This repository does not imply certification or partnership, create provider accounts or initiate Google sign-in.

Live snapshots include a non-secret source locator and reject mismatched returned item IDs. Locally imported fixtures have a null locator; preserve their origin separately. Approval verifies snapshot contents and export traceability carries the known locator.
