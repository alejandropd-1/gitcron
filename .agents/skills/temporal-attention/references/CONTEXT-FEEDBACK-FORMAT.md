# Context Feedback Format

How the Temporal Agent **retroalimenta** — i.e. how the user's accept/reject/defer
decisions get stored and fed back into the next analysis so the agent narrows its
focus over time. This is the companion to `../SKILL.md`.

## Where it lives

Per-repo, in Electron `userData` (never the repo, never `localStorage`, never
plaintext secrets — secrets aren't stored here at all):

```text
{app.getPath('userData')}/temporal-agent/{repoHash}/
  ├── config.json   # skill profile + scope + frequency (machine state)
  ├── notes.json    # canonical decision log (SOURCE OF TRUTH)
  └── notes.md       # human/agent-readable mirror, regenerated from notes.json
```

`repoHash = sha256(path.resolve(repoPath))`. One source of truth (`notes.json`);
`notes.md` is rendered from it on every write so the two never drift.

## The data (notes.json)

```jsonc
{
  "repoName": "GitCron",
  "lastUpdated": "2026-05-28T19:00:00Z",
  "decisions": [                      // newest first, capped (default 200)
    {
      "date": "2026-05-28T19:00:00Z",
      "suggestionTitle": "Add Windows/macOS code signing",
      "type": "improvement",          // improvement | breakthrough | trend
      "outcome": "accepted",          // accepted | rejected | deferred
      "confidence": 0.82,             // what the agent claimed at the time
      "reasoning": "Already Tier 2 in the roadmap; SmartScreen hurts adoption.",
      "impact": "up-weight release/distribution topics"
    }
  ],
  "summary": {                        // older decisions, rolled up when capped
    "accepted": 0,
    "rejected": 0,
    "deferred": 0,
    "rejectedThemes": []              // recurring rejected themes, deduped
  }
}
```

The skill profile (in `config.json`) is the distilled lens:

```jsonc
{
  "skillProfile": {
    "focusAreas": ["security", "performance", "timeline"], // up-weight
    "avoidTopics": ["state-management rewrites"],           // down-weight
    "confidenceThreshold": 0.5                              // hide below this
  },
  "privacyScope": "metadata"          // metadata | metadata-plus-files
}
```

## The feedback loop

```text
agent proposes SpeculativeBranch[]  →  user accepts / rejects / defers each
        ▲                                         │
        │                                         ▼
        │                        recordDecision() appends to notes.json,
   next analysis reads            re-renders notes.md, rolls up overflow
   profile + recent decisions  ◀──────────────────┘
```

- **Accepted** → reinforces its `type`/theme; optionally widen `focusAreas`.
- **Rejected** → the title (and its theme) become a *do-not-repeat*; recurring
  rejected themes accrete into `summary.rejectedThemes` and should migrate into
  `avoidTopics`.
- **Deferred** → parked; may resurface only with a stated reason ("new context X").

## What gets injected into the prompt

The provider layer (in main) composes the system/user prompt as:

```text
[ SKILL.md body (the temporal-attention rules) ]
+
[ FORECASTING-DOCTRINE.md body (the 7 principles; entropy is the capstone) ]
+
[ FEEDBACK BLOCK, rendered from notes.json + config.json ]
+
[ REPO CONTEXT, gathered per privacyScope: commitMessages, languages,
  dependencies, (fileNames only if metadata-plus-files) ]
```

Order matters: **doctrine before feedback before context.** The doctrine sets the
method (estimate entropy → confidence → flight), the feedback narrows the focus,
and the context is the raw material the method runs on.

The **FEEDBACK BLOCK** is intentionally compact — recency + rules, not the whole
log — so the prompt stays cheap. It opens with an explicit cue to run the
entropy estimate (Principle 7) before anything else:

```text
## Forecasting stance (do this first)
Estimate how strongly this repo's history constrains what comes next.
- Low constraint (high entropy) → spread predictions wide, lower confidence.
- High constraint (low entropy) → cluster near the trajectory, higher confidence.
Confidence on every branch = inverse of that estimate, not a free guess.

## User preference profile
Focus areas: security, performance, timeline
Avoid topics: state-management rewrites
Confidence threshold: 0.5

## Do not re-propose (recently rejected)
- "Migrate state layer to Redux Toolkit"
- "Rewrite the SVG graph in Canvas2D"

## Recently accepted (lean into these)
- "Add Windows/macOS code signing" (improvement)

## Deferred (only if newly relevant; say what changed)
- "Pull request diff view"
```

## Rules for whoever writes the loop

- Append-only to `decisions`; never rewrite history. Cap + roll up; don't grow
  the prompt unbounded.
- Match a new suggestion against rejected titles/themes **before** showing it,
  so rejected ideas never reappear even if the model proposes them again.
- The feedback block is built in **main** and contains no secrets — safe to log
  via `sanitizeForLog()` if ever needed, though it shouldn't need logging.
- Keep the block in the repo's UI language (ES/EN) consistent with `lib/i18n.ts`.
