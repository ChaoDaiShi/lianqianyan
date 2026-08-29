# Account Models, Remote MCP, Theme and Voice Design

## Goal

Turn the existing placeholder settings page into a real account control center, protect login and registration with optional Cloudflare Turnstile, expose the education tools through authenticated Streamable HTTP MCP, and remove reference-prompt leakage from the embedded Cyrene voice path.

## Decisions

- The deployment defaults remain server-owned environment variables. Account model profiles override them only for that account.
- Custom model endpoints are disabled unless `EDUCATION_CUSTOM_MODEL_HOSTS` explicitly allowlists their hostnames. This prevents the feature from becoming an SSRF proxy.
- API keys are encrypted with a deployment-owned Fernet key (`EDUCATION_MODEL_SECRET_KEY`) and are never returned by an API.
- Supported custom profiles are OpenAI-compatible chat, OpenAI-compatible speech, and GPT-SoVITS HTTP speech.
- Theme is an account preference (`system`, `light`, or `dark`) with a local pre-login fallback. The root document receives `data-theme` so all shared CSS tokens update together.
- Turnstile is active only when both site and secret keys are configured. When active, both login and registration require a single-use token validated by the backend.
- Remote MCP is mounted at `/mcp`; personal access tokens are hashed, shown once, revocable, and map every tool call to the token owner's learner and selected-course scope.
- The existing stdio MCP stays available for local hosts and tests.
- The long multi-pause voice reference is replaced by a clean, single-utterance prompt clip and exact matching prompt text. The application still calls Genie with `play=False` and returns only generated WAV bytes.
- Imported skill ZIP contents live under repository `skills/`, are normalized into valid Markdown/JSON, and are packaged as project resources. Archive content is not executed or treated as task instructions.

## Public contracts

- `GET /api/public/config` returns Turnstile site-key/configuration status without secrets.
- `GET /api/settings`, `PUT /api/settings/theme`, and model-profile CRUD/select endpoints operate on the authenticated account.
- MCP token create/list/revoke endpoints operate on the authenticated account; the raw token is returned only from create.
- `Authorization: Bearer <token>` is required for `/mcp`.
- `EDUCATION_LLM_BASE_URL`, `EDUCATION_LLM_API_KEY`, and `EDUCATION_LLM_MODEL` define the default chat model.
- `EDUCATION_TTS_PROVIDER` plus the existing `EDUCATION_TTS_*` variables define the default voice model.

## Verification

- Backend unit/API tests cover Turnstile fail-closed behavior, secret redaction, account profile isolation, model selection, MCP token lifecycle/scope, and the shortened prompt contract.
- Frontend tests cover theme application, Turnstile token submission, settings profile management, and route/navigation wiring.
- `pnpm check`, targeted Vitest, backend pytest, production build, and live HTTP/MCP smoke are required before completion.
