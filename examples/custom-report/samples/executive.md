# Release review brief

**SYNTHETIC EXAMPLE - not a live run**

Expense workspace regression · SAMPLE-RUN-008 · Fictional staging

Audience: Engineering and product leaders

Human release decision: PENDING \| Owner: Example QA lead \| Review the remaining business-rule failure before any release decision.

Scope: 8 selected cases. Initial: 5/8 (62.5%); final: 7/8 (87.5%). Still failed: 1; not run: 0; inconclusive: 0.

## Run summary

| Measure | Value |
| --- | --- |
| Selected cases | 8 |
| Initial pass rate | 62.5% \(5/8\) |
| Final pass rate | 87.5% \(7/8\) |
| Change | 25.0 percentage points |
| Recovered from initial failure | 2 |
| Still failing | 1 |
| Not run / inconclusive | 0 / 0 |

## Proposed next actions

| Action | Review status |
| --- | --- |
| Review the approval-policy defect with the product owner. | For human review |
| Preserve the original business assertion when proposing a change. | For human review |
| Rerun the corrected workflow only after scope and execution approval. | For human review |

## Failure analysis

| Category | Initially failed | Recovered | Still failed | Unresolved |
| --- | --- | --- | --- | --- |
| Locator change | 1 | 1 | 0 | 0 |
| Transient environment issue | 1 | 1 | 0 | 0 |
| Application defect | 1 | 0 | 1 | 0 |

Rates use all selected cases, including not-run and inconclusive. Recovery does not erase the initial attempt. Classifications are supplied inputs. Evidence references are not fetched or authenticated by this renderer. History may have different scope; compare before interpreting trends.
