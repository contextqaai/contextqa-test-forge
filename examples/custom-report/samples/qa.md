# Test plan investigation

**SYNTHETIC EXAMPLE - not a live run**

Expense workspace regression · SAMPLE-RUN-008 · Fictional staging

Audience: QA and automation engineers

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

## Failure analysis

| Category | Initially failed | Recovered | Still failed | Unresolved |
| --- | --- | --- | --- | --- |
| Locator change | 1 | 1 | 0 | 0 |
| Transient environment issue | 1 | 1 | 0 | 0 |
| Application defect | 1 | 0 | 1 | 0 |

## Run history

| Run | Date | Cases | Initial pass rate | Final pass rate |
| --- | --- | --- | --- | --- |
| No history supplied | unknown | unknown | unknown | unknown |

## Case results

| Case / area | Initial → final | Recovery | Owner / category | Evidence |
| --- | --- | --- | --- | --- |
| S-01: Sign in / Access | passed → passed | none | QA / none | sample-result-01 |
| S-02: Create expense / Expenses | passed → passed | none | QA / none | sample-result-02 |
| S-03: Attach receipt / Expenses | passed → passed | none | QA / none | sample-result-03 |
| S-04: Search expenses / Search | passed → passed | none | QA / none | sample-result-04 |
| S-05: Sign out / Access | passed → passed | none | QA / none | sample-result-05 |
| S-06: Submit expense after button rename / Expenses | failed → passed | reviewed-fix | Automation engineer / Locator change | sample-initial-06, sample-final-06, sample-repair-06, sample-rerun-06 |
| S-07: Load expense list / Expenses | failed → passed | rerun | DevOps / Transient environment issue | sample-initial-07, sample-final-07, sample-rerun-07 |
| S-08: Require approval above the policy limit / Approvals | failed → failed | none | Application team / Application defect | sample-initial-08, sample-final-08 |

## Proposed next actions

| Action | Review status |
| --- | --- |
| Review the approval-policy defect with the product owner. | For human review |
| Preserve the original business assertion when proposing a change. | For human review |
| Rerun the corrected workflow only after scope and execution approval. | For human review |

Rates use all selected cases, including not-run and inconclusive. Recovery does not erase the initial attempt. Classifications are supplied inputs. Evidence references are not fetched or authenticated by this renderer. History may have different scope; compare before interpreting trends.
