# Observed local builder acceptance

Checked October 27, 2026 Pacific (October 28 UTC), using Node 25.6.1 and the pinned Playwright 1.64.1 package with the installed Chrome channel. A fresh disposable project received an actual npm installation; the Chromium installer did not complete, so browser acceptance explicitly selected Chrome and recorded that choice.

- 132 automated checks passed, including all existing source/ContextQA/BYOK tests plus identity, page objects, connection checks, maintenance, outcomes, subscription state, private PR transport and reporting.
- Inline lifecycle: all five expected scenarios observed in 15.110 seconds total runner time; preparation 9 ms.
- Page-object lifecycle: all five expected scenarios observed in 9.259 seconds total runner time; preparation 10 ms.
- Each lifecycle deliberately includes three failed test executions (wrong expectation, stale selector, behavior defect). Those expected failures were checked at the intended action/assertion; they are not suppressed failures.
- Both successful repair runs preserved original business assertions. An attempt to weaken an assertion was escalated.
- Zero ContextQA/model/source calls occurred in these local examples. Human review time, development-session token usage, native healing, delivery and business ROI were not measured.

These durations are single local observations, not performance comparisons or promises. Installation time is excluded. See the exact [inline receipt](builder-inline.json) and [page-object receipt](builder-page-object.json). Raw synthetic runner reports remain in the ignored local output directories; CI retains new run artifacts separately. The GitHub publisher is mock-tested, not demonstrated against a live customer repository.
