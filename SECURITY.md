# Security and deployment boundaries

This release is a local CLI/library, not an internet-facing multi-tenant service. Keep it on a trusted workstation or isolated CI runner. API origins and environment configuration are trusted operator inputs. Source descriptions and model responses are untrusted data. No arbitrary code action, eval, source writeback, attachment traversal, browser login, key creation, background schedule or automatic commit is provided.

Source keys use environment variable references, known API paths, HTTPS and no redirects/retries. Jira/TestRail custom origins receive their configured Basic credentials; review the destination. The AI adapter sends the key only to the configured official endpoint or explicitly allowed compatible hostname. Never share one environment across unrelated tenants. A malicious configured endpoint remains unsafe; the local CLI is not a network sandbox.

Human approval binds the exact contract hash, but local receipts are not signatures and a malicious local user can forge them. Review is a process control. Exported browsers have normal workstation network access and may perform real side effects through clicks/fills. A checked-in test can navigate to external resources; inspect all URLs, literals and assertions. Run disposable staging accounts with scoped secrets. Generated code is editable and must undergo normal code review before CI. This is not a browser execution sandbox or a compliance certification.

Do not put secrets in requirements, selectors, literals or AI prompts. Redaction is not a guarantee; this repo does not attempt automatic PII removal. Provider retention and billing depend on the chosen provider. Keep `.env`, private source snapshots, artifacts and AI drafts out of Git. Owner-only output permissions are POSIX controls, not encryption. No analytics or paid requests occur without an explicit command.

Report issues privately through your existing ContextQA contact. Do not attach credentials, production traces or personal information to GitHub issues. Rotate a leaked key at its provider and remove exposed artifacts through your incident process.
