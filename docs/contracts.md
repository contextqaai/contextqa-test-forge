# Contract, review and maintenance

A normalized source has `schema:1`, platform, ID, title, description, optional revision, source steps and `sourceSha`. Jira ADF is flattened to text; rich formatting, attachments and custom fields are not copied. Normalization is a snapshot, not a statement that all requirements are testable. Preserve the source configuration privately to disambiguate same-number issues from different projects.

A contract has `schema:1`, the normalized `sourceSha` and `tests`. Each test has a unique alphanumeric/dash/underscore `id`, title and 1–100 steps. Use no more than 100 tests per contract. Environment references are runtime values; never embed actual login credentials.

```json
{
  "schema": 1,
  "sourceSha": "COPY_THE_64_CHARACTER_SOURCE_HASH_HERE",
  "tests": [{
    "id": "save-preferences",
    "title": "Save an updated display name",
    "steps": [
      {"action": "navigate", "env": "STAGING_PREFERENCES_URL"},
      {"action": "fill", "selector": "[data-testid=name]", "env": "DEMO_DISPLAY_NAME"},
      {"action": "click", "selector": "[data-testid=save]"},
      {"action": "assertText", "selector": "[role=status]", "value": "Saved"}
    ]
  }]
}
```

For value-bearing actions use exactly one `value` or `env`. `select` means native `<select>` option value, not custom dropdown text. `check` ensures a checkbox is checked; there is no toggle/uncheck action in this version. Assertions compare exact displayed text/URL, not substring or regex. Navigation supports HTTP(S) and synthetic HTML data URLs. Real application URLs and all embedded data must be inspected before execution. Frameworks run with their normal network access, not Browser Cloud's outbound proxy.

`approve` hashes the complete contract and records the source hash, reviewer label and timestamp. `export` recalculates both. Editing a test or source hash invalidates approval. Approval verifies the supplied snapshot hash against its contents and the contract source hash. This does not attest reviewer identity or independently re-fetch the source. A new source must be re-imported and explicitly rebound to the contract. AI drafts do not bypass this gate.

For updates: fetch again → review changed requirements → update contract/source hash → `diff` old/new → review added, removed and changed tests → new approval → fresh export directory → compare code → run in staging → human-reviewed PR in your own repository. No deletion, remote push, source issue writeback or automatic merge occurs. Test IDs provide matching; renaming an ID appears as removal/addition.

Generated test projects are intentionally simple and editable. Playwright includes failure screenshot/video/trace configuration. Selenium and WDIO use Node's test runner and guaranteed session cleanup, but do not automatically collect equivalent media. Add reporting and evidence retention appropriate to your organization; do not assume parity. Output files use owner-only permissions on POSIX; Windows ACLs depend on the environment.
