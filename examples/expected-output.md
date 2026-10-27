# Sample output interpretation

`node examples/demo.js output/NEW_RUN` creates source snapshots, reviewed synthetic contracts, approval receipts and 18 project folders. Open `metrics.json` and a `traceability.json`. These are **generation** records: `executed:false`, zero model calls, source/contract hashes. They are not test passes.

Example report states for the proposed hosted-report adapter (templates, not observed runs):

| Case | Lifecycle | Assertion | Evidence | Verdict |
|---|---|---|---|---|
| PREF-001 | completed | expected Saved; observed Saved | selected authorized step screenshot | passed |
| PREF-001 | completed | expected Saved; observed Unsaved | selected authorized step screenshot | failed |
| PREF-001 | polling deadline | not observed | result ID retained, no selected screenshot | inconclusive |

A failed browser sequence must not generate a “verified guide.” Missing assertion evidence is inconclusive. The current local export has no hosted report/run ID until an actual supported execution adapter is implemented and tested.

To demonstrate a real assertion failure yourself, use a disposable generated project, change the final expected string from Saved to Deliberately wrong, and run its normal test command. Expect a nonzero runner outcome; keep that log. Do not fake it by editing a report. This candidate has not run that browser experiment; the implementation backlog includes success/failure execution acceptance.
