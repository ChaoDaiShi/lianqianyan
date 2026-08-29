# GraphRAG Learning Experience Design

## Objective

Upgrade EducationMind's visual and learning experience without replacing its account, course, evidence, diagnosis, plan, Agent, MCP, or database truth boundaries. The release fixes the disappearing knowledge graph, turns course retrieval into a small course-grounded GraphRAG pipeline, compacts page chrome, and makes Xiaolian history, memory, resource creation, search, portrait, settings, and onboarding usable end to end.

## Chosen approach

Use a minimal real full-stack extension. Keep the current FastAPI, SQLAlchemy, React, Zustand, and account-selected LLM architecture. Add only the persistence and provider adapters required by the requested functions. Do not add a vector database, a second frontend state framework, synthetic learner metrics, or demo-only results.

Two alternatives were rejected:

- Presentation-only UI with localStorage history would be fast but would not provide account-scoped, cross-session long-term memory or real provider integration.
- A full GraphRAG platform with entity extraction, embeddings, communities, and a graph database would exceed the scope of a personal learning product and duplicate the structured course graph already present.

## Knowledge graph and GraphRAG

The current click path filters section nodes, recomputes a custom force layout, and renders all coordinates directly. Certain filtered node/link combinations can make the unbounded simulation diverge; non-finite SVG coordinates make every node and edge disappear while the inspector remains visible.

The layout will clamp acceleration, velocity, and coordinates during every iteration, restore a deterministic safe position if a value becomes non-finite, and expose a pure `buildGraphFocus` function. A regression test will select every node in the real course-shaped fixture and assert that the focused scene is non-empty and every coordinate is finite and in bounds.

The backend GraphRAG layer remains course-grounded:

1. Lexical retrieval selects seed chunks from the existing course material.
2. The course graph expands each seed to directly connected knowledge-point neighbors.
3. One best chunk per neighbor is merged with the seed results and reranked, with duplicates removed and `top_k` still enforced.
4. API responses expose `retrieval_mode: graph_rag_course_grounded`; the graph exposes the same generation mode.

This is not a claim of open-domain graph reasoning or automatically inferred mastery. Node relationships still come only from existing course documents.

## Global layout and visual language

Reduce the top bar and AppShell vertical offsets, and define reusable compact page-intro styling. Major pages use shorter headers and denser spacing. Panel, surface, input, tab, and button radii increase consistently; controls keep visible focus rings and minimum touch sizes.

The Xiaolian conversation workspace begins directly below the top bar with a shorter identity header. Technical provider traces remain available per answer, but old voice runtime attribution and inference-package copy disappear.

## Xiaolian history and long-term memory

Add one account/course-scoped `companion_threads` table. Each row stores thread metadata, ordered message JSON, and user-controlled memory JSON. The API supports list, create, read, rename, delete, append-message, list-memory, add-memory, and delete-memory operations. Message and memory payload sizes are bounded.

The chat page adds a collapsible conversation rail, new-conversation action, thread switching, deletion, and a memory drawer. A user can save an assistant or user message as a memory, add a short memory manually, and remove it later. The active thread id is sent to `/api/agents/chat`; the backend loads only that account/course's memories and gives them to the tutor as a clearly delimited context block. Memory use appears in `context_used` and never changes mastery, diagnosis, or evidence.

## MiniMax voice output

Browser speech recognition remains available for voice input. Voice output becomes MiniMax-only:

- `/api/voice/status` reports `minimax` or `unavailable`.
- `/api/voice/synthesize` directly uses the deployment MiniMax provider.
- Browser speech synthesis, GPT-SoVITS, Genie-TTS, account TTS profiles, attribution notices, inference-package copy, embedded runtime startup, and related dependencies are removed.
- A MiniMax failure produces an explicit unavailable state; it never silently switches voice.

## Resource generation and preview

Resource generation remains traceable to course sections and adds an optional parallel MiniMax illustration request. The server sends `model=image-01`, a bounded prompt, selected aspect ratio, `response_format=url`, `n=1`, and prompt optimization. Returned URLs are labeled as temporary provider URLs and are not persisted as permanent assets.

Markdown resources render through a safe React rich preview: headings use larger type, bold spans remain bold, and explicit `重点`/`注意` callouts use red emphasis. Source text remains editable in a side-by-side editor. No raw HTML is injected.

An AI optimization endpoint uses the existing selected account LLM to improve structure and emphasis while preserving course claims. If the LLM is unavailable or returns empty content, the UI shows an honest error and keeps the original text.

## AnySearch

Replace the Wikipedia-only provider with AnySearch's official `POST /v1/search` JSON API. Use `general.general`, language `zh-CN` or `en`, optional bearer authentication, and the deployment zone. Map `title`, `url`, and `snippet`/`content` to the existing safe frontend result model. Provider errors never fall back to fabricated offline entries.

## Learner portrait and AI summary

Expand the radar from four to six evidence-derived dimensions:

- overall mastery;
- profile confidence;
- evidence coverage;
- scored assessment performance;
- evidence depth, calculated from the actual average evidence count and a documented saturation threshold;
- knowledge balance, calculated from dispersion among assessed mastery values.

Unknown dimensions remain `null` and do not become zero. The radar geometry becomes dynamic for six axes. A profile-summary endpoint uses the selected LLM with actual profile, diagnosis, and assessment aggregates. No LLM means no AI summary; the deterministic metrics remain visible.

## Settings and onboarding

Rebuild settings as a compact sidebar workspace with four user-facing areas: appearance, AI model, MiniMax services, and account/integrations. Remove user-configurable legacy TTS providers. MiniMax voice/image and AnySearch are deployment status cards; secrets never return to the browser.

Replace the new-account subject picker with a short initialization workspace. It includes display-name greeting, learning goal, weekly pace, interaction preference, theme, and a recommended learning-space selection. A user may accept recommended defaults instead of manually choosing a subject. Submission saves onboarding settings and the selected course in one authenticated operation. Existing accounts are not forced through onboarding again.

## Error handling and truthful states

- Graph layout always returns a finite fallback coordinate set.
- Missing GraphRAG neighbors return seed lexical results, not invented relations.
- Missing MiniMax/AnySearch/LLM configuration is shown as unavailable.
- Provider timeouts and invalid payloads map to bounded 502/503 responses without leaking secrets.
- Chat persistence failure does not discard the text currently visible in the browser; the UI marks it unsaved and offers retry.
- Unknown profile dimensions remain absent from the polygon and are labeled `暂无`.

## Verification scope

Testing is intentionally proportional to a personal project. Use targeted red/green tests for the graph regression and each new pure/API service boundary, then run the required `pnpm check`, a focused Vitest set, focused backend pytest files, `pnpm build`, and `git diff --check`. Perform one desktop and one narrow browser smoke pass over Knowledge, Xiaolian, Resources, Portrait, Settings, and onboarding. Do not run unrelated exhaustive deployment or database mutation audits.

