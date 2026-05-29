# GitCron — Temporal Agent: Phase 0 Design

> **Status:** design + scaffolding only. This is the foundation layer for what
> `GITCRON_CHRONOMETRIC_AI_BRIEF.md` calls **Feature B (timelines especulativas
> con IA)**. Per the brief, B ships **after** A, A′ and C are accepted. Nothing
> here renders on the diagonal graph yet and nothing here touches Git logic.
>
> MCP integration is explicitly **deferred to the end** (see §7).

---

## 1. What this is

A **Temporal Agent**: an opt-in assistant that looks at a repo's history and
current state and proposes *speculative* future branches — security hardening,
new features, performance work, web trends. The user accepts, rejects, or defers
each idea. Those decisions are logged and fed back into the agent so it narrows
its focus over time.

Three new pieces:

1. **The "Temporal Attention" skill** — a constraint document that keeps the
   agent on-topic (only *temporal* reasoning about *this* project) instead of
   drifting into generic advice. See `temporal-attention.skill.md`.
2. **The decision-log / notes system** — a per-repo record of what the user
   wanted and rejected, so the agent learns this user's priorities. Canonical
   data in JSON, mirrored to a human-readable `notes.md`. See
   `temporal-agent-notes.template.md`.
3. **Scaffolding** — TypeScript types, main-process IPC handlers, preload
   bridge additions, and a Settings panel.

## 2. How it works (flow)

```text
User clicks "Analyze" (or a scheduled tick fires)
        │
        ▼
main process gathers context  ──► applies privacy scope (metadata | +filenames)
        │                          loads decision-log notes for this repo
        ▼
[Feature B proper] provider adapter builds prompt =
        Temporal-Attention skill  +  repo context  +  past decisions
        │
        ▼
provider returns SpeculativeBranch[]  (improvement | breakthrough | trend)
        │
        ▼
renderer draws them on the diagonal graph: dotted, semi-transparent,
opacity tied to confidence, labelled "predicción"
        │
        ▼
User accepts / rejects / defers each one
        │
        ▼
decision recorded → notes.json updated → notes.md re-rendered
        │
        └──► next analysis reads the updated notes → tighter focus
```

The **provider call itself** (the arrow marked *Feature B proper*) is **not**
built in Phase 0. Phase 0 builds everything around it: the skill, the storage,
the config, the types, the Settings UI. The adapter layer plugs in later and
respects the brief's multi-provider invariant (§6.1 of the brief).

## 3. Where files live (decided)

Per-repo, inside Electron `userData` — **not** in the repo, **not** in
`localStorage`:

```text
{app.getPath('userData')}/temporal-agent/{repoHash}/
  ├── config.json     # machine state: enabled, frequency, scope, skill profile
  ├── notes.json      # canonical decision log (source of truth)
  └── notes.md         # human + agent readable mirror, regenerated on every write
```

- `repoHash = sha256(path.resolve(repoPath))` — deterministic, filesystem-safe.
- Directory created with mode `0o700`.
- **One source of truth:** `notes.json`. `notes.md` is *rendered from it* on
  every write so the two never drift. The user can open `notes.md` to read it;
  the agent prompt is built from the same data.

Rationale: the temporal agent is a GitCron feature, not a project artifact, so
its memory belongs in GitCron's own space. A repo-tracked variant can be added
later without breaking this.

## 4. Security invariants honored (from brief §0 / SECURITY.md)

| Invariant | How this design respects it |
|---|---|
| Secrets encrypted by OS (`safeStorage`) | **No secrets in these files.** `config.json`/`notes.*` hold preferences and decisions only. AI API keys are a *separate* Feature-B concern handled by `safeStorage` in main — they never appear in this config. |
| Secrets never in the renderer | Config/notes contain no secrets, so they can travel to the renderer freely. When keys arrive (Feature B), they stay in main; the renderer only sees a boolean. |
| Secrets never logged | IPC handlers never `console.*` file contents. When the provider layer lands, extend `sanitizeForLog()` for its auth formats. |
| Strict CSP | Phase 0 makes **zero** network calls, so no `connect-src` change. The provider domain is added only when Feature B proper lands (brief §6.4). |
| Electron baseline | No change to `contextIsolation` / `sandbox` / `nodeIntegration` / `webSecurity`. New IPC follows the existing typed-bridge pattern. |
| Git functionality untouched | This feature reads repo metadata for context only. It never invokes commit/push/pull/merge/rebase/stash/cherry-pick/amend/squash. |

Extra hardening in the IPC layer:

- `repoPath` is resolved and hashed; file paths are built from the hash, never
  from raw user strings, so there's no path-traversal surface.
- Writes are size-guarded (notes can't grow unbounded) and the decision log is
  capped (configurable, default keep last 200 entries in full + a rolled-up
  summary).

## 5. Privacy scope (per-repo, from brief §6.3)

Stored in `config.json.privacyScope`. Default is the conservative one and it
**never** auto-escalates:

- `metadata` *(default)* — commit messages, detected languages, `package.json`
  dependencies. No paths, no filenames.
- `metadata-plus-files` *(explicit opt-in per repo)* — adds changed filenames.
  More predictive value, more leak surface.

## 6. What Phase 0 delivers vs defers

**Delivered now (this scaffold):**
- `temporal-attention.skill.md` — the focus-constraint skill.
- `temporal-agent-notes.template.md` — the decision-log shape.
- `types/temporal-agent.ts` — shared types.
- `electron/temporal-agent-ipc.ts` — main-process storage + IPC (no network).
- preload + `electron.d.ts` additions.
- `components/TemporalAgentSettings.tsx` — Settings UI (enable, frequency,
  scope, skill profile editor, view notes).

**Deferred (Feature B proper, after A+A′+C):**
- `AIPredictionProvider` adapter layer + concrete providers (brief §6.1).
- API keys in `safeStorage` (brief §6.5).
- `ai:predict-timelines` provider call + prompt assembly.
- Drawing speculative branches on the diagonal (depends on Feature A).
- CSP + SECURITY.md threat-model update (brief §6.4).

**Deferred to the very end (your call):**
- MCP integration as the transport for context/tools.

## 7. MCP — parked deliberately

You said MCP is a "nice to have, later." Noting the shape so the design doesn't
paint itself into a corner: when MCP lands, it becomes *another way to feed the
agent context* (repo tree, diffs, test output as MCP tools) sitting **behind**
the same `AIPredictionProvider` interface. It does not change the skill, the
notes system, or the storage layout. So building those now is safe — MCP slots
in under the abstraction later.

## 8. Open questions (ask before assuming — brief's rule)

- **Analysis frequency when "scheduled":** real background timer (like
  auto-fetch) or only on app focus? Default scaffold = `on-demand` + a
  `manual`/`daily`/`weekly` enum, timer not wired yet.
- **Decision-log cap:** keep-last-N full entries + summary rollup — what N?
  Scaffold default 200.
- **Notes visibility:** keep `notes.md` purely internal, or expose an "open
  notes" action in the UI? Scaffold includes a read-only viewer.

## 9. Centaur panel — bottom-center dialogue (human + AI)

Design philosophy: **Centaur** (Kasparov's advanced chess — human + AI beat
either alone; what wins is the *collaboration process*, not raw strength). The
user has *voz y voto*: the AI proposes futures, the human decides which are
real, the system learns from those decisions.

The bottom-center panel (where the HUD shows `TARGET_ACQUISITION // SCANNING`)
is where this collaboration is made legible:

- Clicking a speculative branch shows, in natural language, **why** the agent
  proposed it — the `rationale`, the repo evidence it used, the flight level, and
  an honest explanation of the confidence number (per the entropy principle, a
  confidence must be *explained*, not magic). This is cognitive safety: it
  counteracts the futuristic HUD's false sense of certainty.

**Forward-compatibility decision (important):** the panel is modeled as a
**thread** (`SpeculativeDialogue` with `turns[]`), never a single message.
- **Phase now (report):** the thread holds ONE agent turn (the explanation).
- **Phase later (conversation):** user/agent turns accrue — the human can ask
  "why not W?" and the agent answers. *Same data shape; zero rewrite.*

This is the one-message-vs-list distinction: building the report as "the first
turn of a thread" means the conversation is purely additive later. See
`openingTurnFromBranch()` in `types/temporal-agent.ts`.

## 10. Providers — OpenRouter & OpenCode (real, paid keys on hand)

The user holds an **OpenRouter** key (USD credit) and an **OpenCode GO** key.

- **OpenRouter is not a 4th sibling provider — it replaces the three cloud ones.**
  One key, one OpenAI-compatible endpoint (`openrouter.ai/api/v1`), access to
  Claude/GPT/Gemini/etc. Add a single `openrouter` adapter (nearly identical to
  `claude.ts`; different endpoint + auth header + a `model` field the user picks).
- **OpenCode** stays the local/gateway family: configurable endpoint, auth
  optional. Fits the existing `opencode` stub.
- **Recommended starting set:** `openrouter` (covers cloud-multi) + `opencode`
  (covers local/gateway). The standalone `openai`/`gemini`/`claude-direct`
  adapters can stay stubs unless a direct key is ever wanted.
- Keys are per-provider, encrypted via `safeStorage`, set from Settings, never
  returned to the renderer (only a boolean "key exists").
