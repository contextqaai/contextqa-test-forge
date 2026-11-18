# ContextQA hosted MCP

Connect a Streamable HTTP client to `https://mcp.contextqa.com/mcp`, complete ContextQA OAuth sign-in, then ask it to confirm the current organization and workspace before using tests. [Connection instructions](https://mcp.contextqa.com/docs).

This directory publishes metadata for the existing proprietary hosted service. It is not the server implementation and does not license that implementation. A ContextQA account is required; test execution can consume credits. Listing metadata is not a marketplace endorsement or proof of every tool's behavior.

The organization namespace is `io.github.contextqaai/contextqa`. Publication uses GitHub Actions OIDC, without a personal access token. The pinned official publisher archive is checked with Sigstore. The service health version must match `server.json` before publication.

The initial authorized publication runs when this manifest is pushed to `codex/mcp-registry-publication`. Manual dispatch is also available. Future version changes must follow an actual deployed service version; do not increment a version to bypass a failed duplicate publication.

[ContextQA](https://contextqa.com/?utm_source=github&utm_medium=developer_referral&utm_campaign=contextqa_test_forge&utm_content=mcp_setup) · [Create an account](https://ship.contextqa.com/)
