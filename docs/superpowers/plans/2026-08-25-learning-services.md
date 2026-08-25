# Learning Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evidence-backed Wikipedia search, a safe C teaching compiler simulation, and deterministic course-grounded resource generation to the FastAPI application.

**Architecture:** Each feature has Pydantic contracts, a framework-independent service, and a thin route. Network access is isolated behind an injected fixed-provider client; compiler simulation uses an allowlisted AST walker without executing code; resources transform only existing `KnowledgePointContent`.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic 2, httpx, standard-library `ast`, pytest.

## Global Constraints

- Do not execute arbitrary source code, create subprocesses, call `eval`/`exec`, or rely on Docker.
- Network search is named “Wikipedia learning search”; it is not a general web crawler.
- Upstream errors must not expose request headers, internal URLs, or response bodies.
- Resource generation mode is exactly `course_template`; it must not be described as LLM output.
- Course and knowledge-point isolation remain mandatory.
- Every route returns Pydantic response models and enforces input bounds.

## File map

- Create `apps/api/app/network/`: search models, provider contract, Wikipedia provider, service, exports.
- Create `apps/api/app/lab/`: compiler contracts and pure simulator.
- Create `apps/api/app/resources/`: resource contracts and deterministic service.
- Create `apps/api/app/api/routes/network.py`, `lab.py`, and `resources.py`.
- Modify `apps/api/app/api/__init__.py`: include the three routers.
- Add `apps/api/tests/test_network_search.py`, `test_compiler_simulator.py`, `test_resource_generation.py`, and `test_learning_services_api.py`.

---

### Task 1: Wikipedia provider and network search service

**Files:**
- Create: `apps/api/app/network/models.py`
- Create: `apps/api/app/network/provider.py`
- Create: `apps/api/app/network/wikipedia.py`
- Create: `apps/api/app/network/service.py`
- Create: `apps/api/app/network/__init__.py`
- Test: `apps/api/tests/test_network_search.py`

**Interfaces:**
- Produces: `NetworkSearchRequest(query: str, limit: int = 4, language: Literal['zh','en']='zh')`.
- Produces: `NetworkSearchResult(title, summary, url, source_domain)` and `NetworkSearchResponse(provider, query, results)`.
- Produces: `WikipediaSearchProvider(client: httpx.AsyncClient | None = None)` with `async search(...)`.
- Produces: `NetworkSearchService(provider)` with `async search(request)`.

- [ ] **Step 1: Write failing provider tests with MockTransport**

```python
async def scenario():
    provider = WikipediaSearchProvider(
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )
    return await provider.search("银行家算法", 2, "zh")

results = asyncio.run(scenario())
assert results[0].title == "银行家算法"
assert results[0].source_domain == "zh.wikipedia.org"
assert "<span" not in results[0].summary
```

The handler asserts host `zh.wikipedia.org`, path `/w/api.php`, `generator=search`, `prop=extracts|info`, `explaintext=1`, `gsrlimit=2`, and a non-empty User-Agent. Add separate tests for English host, empty pages, timeout, non-2xx, malformed JSON, and missing title/fullurl.

Run: `uv run --project apps/api pytest apps/api/tests/test_network_search.py -q`

Expected: collection FAIL because `app.network` does not exist.

- [ ] **Step 2: Implement Pydantic models and provider protocol**

Use `Field(min_length=2, max_length=100)` for query and `Field(default=4, ge=1, le=6)` for limit. Define `NetworkSearchUnavailable(RuntimeError)` as the only error exposed by provider/service boundaries.

- [ ] **Step 3: Implement the fixed Wikipedia provider**

Select the base URL from an internal `{'zh': 'https://zh.wikipedia.org', 'en': 'https://en.wikipedia.org'}` map. Request `/w/api.php` with:

```python
params = {
    "action": "query",
    "generator": "search",
    "gsrsearch": query,
    "gsrlimit": limit,
    "prop": "extracts|info",
    "inprop": "url",
    "exintro": 1,
    "explaintext": 1,
    "exchars": 420,
    "format": "json",
    "formatversion": 2,
    "utf8": 1,
}
```

Use `httpx.Timeout(6.0)`, `follow_redirects=False`, and User-Agent `EducationMind/0.1 learning-search`. Parse only `query.pages`, normalize whitespace, cap summaries at 420 characters, verify returned URLs use HTTPS and the chosen host, and sort by upstream `index` then title. Convert all `httpx`/JSON/protocol failures to `NetworkSearchUnavailable("Wikipedia learning search is temporarily unavailable")`.

- [ ] **Step 4: Implement the service and pass tests**

`NetworkSearchService.search` delegates to the provider and wraps results with `provider='wikipedia'` and the original normalized query.

Run: `uv run --project apps/api pytest apps/api/tests/test_network_search.py -q`

Expected: all network tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/api/app/network apps/api/tests/test_network_search.py
git commit -m "feat: add trusted Wikipedia learning search"
```

### Task 2: Safe C teaching compiler simulator

**Files:**
- Create: `apps/api/app/lab/models.py`
- Create: `apps/api/app/lab/compiler_simulator.py`
- Create: `apps/api/app/lab/__init__.py`
- Test: `apps/api/tests/test_compiler_simulator.py`

**Interfaces:**
- Produces: `CompileSimulationRequest(language: Literal['c-edu']='c-edu', code: str)`.
- Produces: `CompileSimulationResponse(success, language, mode, stages, diagnostics, stdout, safety_notice)`.
- Produces: `TeachingCompilerSimulator.simulate(request) -> CompileSimulationResponse`.

- [ ] **Step 1: Write failing behavior tests**

Cover this valid example and exact output `5\n`:

```c
#include <stdio.h>
int main(void) {
  int x = 2;
  int y = 3;
  printf("%d\n", x + y);
  return 0;
}
```

Also assert stable error codes for missing main (`C1001`), unsupported statement (`C1002`), undeclared variable (`C2001`), duplicate declaration (`C2002`), division by zero (`C3001`), too much source (`C0001`), and output truncation (`C3002`). Assert later stages are `skipped` after a compile error.

Run: `uv run --project apps/api pytest apps/api/tests/test_compiler_simulator.py -q`

Expected: collection FAIL because `app.lab` does not exist.

- [ ] **Step 2: Define exact models**

Use enums/literals for stage names (`preprocess`, `syntax`, `semantic`, `link`, `run`), stage status (`passed`, `failed`, `skipped`), severity (`error`, `warning`), and `mode='simulation'`. Request code has `min_length=1`, `max_length=4000`.

- [ ] **Step 3: Implement line parser and safe expression evaluator**

Strip `//` comments, allow only `#include <stdio.h>`, identify a single main block, and match each statement with anchored regular expressions. Parse arithmetic via `ast.parse(expression, mode='eval')`; recursively evaluate only `Expression`, integer `Constant`, `Name`, unary `+/-`, and binary `+ - * // / %`. Reject every other node before evaluating. Implement C integer division as truncation toward zero. Never call Python `eval` or compile.

Core whitelist:

```python
_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: lambda a, b: int(a / b),
    ast.FloorDiv: lambda a, b: int(a / b),
    ast.Mod: operator.mod,
}
```

- [ ] **Step 4: Implement deterministic stages and output**

Preprocess validates include lines; syntax validates structure/statements; semantic tracks variables; link passes when main exists; run evaluates assignments and the two allowed `printf` forms. Cap at 80 logical lines and 2,000 output characters. Every failure adds one structured diagnostic and deterministically marks remaining stages skipped.

- [ ] **Step 5: Run tests and static source guard**

Run:

```powershell
uv run --project apps/api pytest apps/api/tests/test_compiler_simulator.py -q
Select-String -Path apps/api/app/lab/*.py -Pattern 'subprocess|os\.system|\beval\(|\bexec\('
```

Expected: tests PASS and the source guard returns no matches.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/api/app/lab apps/api/tests/test_compiler_simulator.py
git commit -m "feat: add safe teaching compiler simulation"
```

### Task 3: Course-grounded resource generation

**Files:**
- Create: `apps/api/app/resources/models.py`
- Create: `apps/api/app/resources/service.py`
- Create: `apps/api/app/resources/__init__.py`
- Test: `apps/api/tests/test_resource_generation.py`

**Interfaces:**
- Produces: `ResourceType` values `study_sheet`, `flashcards`, `quiz`, `mind_map`, `study_plan`.
- Produces: `ResourceGenerationRequest(course_id, knowledge_point_id, resource_type)`.
- Produces: `GeneratedResource(title, resource_type, format='markdown', content, generation_mode='course_template', source_sections, filename)`.
- Produces: `ResourceGenerationService(repository=None).generate(request)` and `KnowledgeResourceNotFound`.

- [ ] **Step 1: Write failing tests for every resource type**

Use a two-section in-memory `KnowledgeDocument`. For all five types assert deterministic identical output across two calls, both section titles in `source_sections`, `generation_mode == 'course_template'`, and no text outside the supplied title/section content except fixed template labels. Assert another course and missing point raise `KnowledgeResourceNotFound`.

Run: `uv run --project apps/api pytest apps/api/tests/test_resource_generation.py -q`

Expected: collection FAIL because `app.resources` does not exist.

- [ ] **Step 2: Implement models and filename normalization**

Pydantic validates non-empty IDs. Filename format is `<knowledge_point_id>-<resource_type>.md` after replacing every non `[A-Za-z0-9_-]` character with `-`; never accept a filename from the client.

- [ ] **Step 3: Implement deterministic renderers**

- `study_sheet`: H1 title, source declaration, one H2 per section, normalized source content, and a checklist using section titles.
- `flashcards`: one numbered card per section with front=section title and back=first 240 normalized characters.
- `quiz`: one question per section asking the learner to explain that section, followed by a collapsed-looking “参考要点” Markdown block containing the first 240 characters.
- `mind_map`: title root, one nested bullet per section, and up to three sentence bullets derived by Chinese punctuation splitting.
- `study_plan`: ordered tasks with 10-minute estimate, reading objective, and completion checkbox per section.

All renderers use only `KnowledgeRepository.get_point_content` and fixed labels.

- [ ] **Step 4: Run focused tests**

Run: `uv run --project apps/api pytest apps/api/tests/test_resource_generation.py -q`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/api/app/resources apps/api/tests/test_resource_generation.py
git commit -m "feat: generate grounded learning resources"
```

### Task 4: Route contracts and application integration

**Files:**
- Create: `apps/api/app/api/routes/network.py`
- Create: `apps/api/app/api/routes/lab.py`
- Create: `apps/api/app/api/routes/resources.py`
- Modify: `apps/api/app/api/__init__.py`
- Test: `apps/api/tests/test_learning_services_api.py`

**Interfaces:**
- Produces: `POST /api/network/search`.
- Produces: `POST /api/lab/compile-simulate`.
- Produces: `POST /api/resources/generate`.
- Produces: `get_network_search_service()` dependency for test overrides.

- [ ] **Step 1: Write failing API contract tests**

Override `get_network_search_service` with a fake async service. Assert successful snake_case JSON for all three endpoints; 422 for short query, limit 7, source over 4,000 chars, invalid language/type; 404 for unknown knowledge point; and 503 with exactly `{"detail":"Wikipedia learning search is temporarily unavailable"}` for upstream failure.

Run: `uv run --project apps/api pytest apps/api/tests/test_learning_services_api.py -q`

Expected: FAIL with 404 routes.

- [ ] **Step 2: Implement thin routes**

The network route uses `Depends(get_network_search_service)`, catches only `NetworkSearchUnavailable`, and maps it to 503. The lab route instantiates the stateless simulator and returns its response. The resource route catches `KnowledgeResourceNotFound` and maps to 404 without exposing repository details.

- [ ] **Step 3: Register routers**

Import `lab`, `network`, and `resources` in `apps/api/app/api/__init__.py`; include all three after `knowledge` and before learner-state write routes.

- [ ] **Step 4: Run focused and full backend tests**

Run:

```powershell
uv run --project apps/api pytest apps/api/tests/test_learning_services_api.py -q
uv run --project apps/api pytest -q
```

Expected: focused tests PASS; full suite PASS with no new warnings.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/api/app/api apps/api/tests/test_learning_services_api.py
git commit -m "feat: expose learning workshop services"
```

