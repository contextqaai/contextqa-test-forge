# Bring your own AI provider

AI is optional. Import, review, diff and export work without any model calls. Requires Node 22+. No key is bundled, collected by ContextQA, written to generated tests or saved in a browser. Each person runs this CLI with their own environment or secret manager. Provider charges go directly to that person's provider account.

## Configure

Use a private terminal environment or a local `.env` copied from `.env.example`; keep it outside Git and set file permissions to owner-only. Never paste keys into issues, prompts, source fixtures or shared screenshots. Node does not automatically load `.env`; use `node --env-file=.env ...` or your secret manager's process launcher.

| Provider | Environment | Protocol |
|---|---|---|
| OpenAI | `AI_PROVIDER=openai`, `AI_MODEL=YOUR_MODEL`, `OPENAI_API_KEY=...` | Official Responses API `/v1/responses`; `store:false` |
| Claude | `AI_PROVIDER=anthropic`, `AI_MODEL=YOUR_MODEL`, `ANTHROPIC_API_KEY=...` | Anthropic Messages API `/v1/messages` |
| Compatible provider | `AI_PROVIDER=openai-compatible`, `AI_MODEL=YOUR_MODEL`, `AI_API_KEY=...`, `AI_BASE_URL=https://HOST/v1/`, `AI_ALLOW_CUSTOM_HOST=HOST` | Chat Completions `/chat/completions` |

A compatible provider must implement that protocol, bearer authentication and text responses. This does not support every vendor's native API, AWS request signing, Azure deployment-specific authentication, local HTTP endpoints or OAuth browser login. Compatibility varies by model. No model is silently chosen or substituted. `AI_MAX_OUTPUT_TOKENS` defaults to 2048, bounded to 8192; this limits output, not total monetary spend.

Create keys in your provider console: [OpenAI API keys](https://platform.openai.com/api-keys), [Anthropic Console](https://console.anthropic.com/). Select available models and set account budgets with that provider. No signup or Google SSO is initiated by this tool. A ContextQA REST token is not an AI provider key.

## Draft with explicit data-sharing approval

```sh
mkdir -p .ai-private
# First put only reviewed, non-secret requirements in .ai-private/reviewed.txt.
node --env-file=.env scripts/ai-draft.js \
  --input .ai-private/reviewed.txt --out .ai-private/draft.json \
  --approve-data-sharing
```

The flag authorizes sending this exact file to the configured provider. Inspect it first, including issue descriptions, account names and embedded links. A custom provider receives both your content and its API key. Request bodies are capped at 128 KB of source text, time out after 60 seconds, do not retry and reject redirects. A timeout can still incur a charge; check the provider before retrying. Provider error bodies are suppressed because they can echo secrets. The CLI writes a new owner-only file and refuses overwrite.

Review the returned draft manually. It is not an automation contract or approval receipt. Copy verified steps/selectors into your contract, bind its source hash, then approve. Model text is never evaluated, executed or published. Prompt instructions are defense in depth, not a guarantee against injection or confidential output. Do not render untrusted draft HTML or run suggested commands.

## Metrics and privacy

Draft files contain provider/model, elapsed milliseconds, one call count, input SHA-256, reported input/output/cache token counts and `estimatedCost:null`. Missing usage remains `null`, not zero. Cached/reasoning counts are subsets or provider-specific categories; do not blindly sum or price them. Anthropic cache creation/read tokens are reported separately. No pricing feed or billing integration exists. Determine cost from your exact provider/model pricing and invoice; no benchmark savings are claimed.

`store:false` requests no stored Responses object; it does not establish zero provider retention or replace your data processing agreement. All providers apply their own terms and retention rules. This integration makes no live paid AI calls in tests: transport mocks verify request shape, opt-in, error suppression and usage parsing. Operators must validate their chosen model/provider with approved demo content.

Primary protocol references: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [Anthropic Messages](https://platform.claude.com/docs/en/build-with-claude/working-with-messages). Reviewed 2026-10-26.
