# GitCron — Roadmap de fases (documento de Ale — NO pegar a agentes)

> Los agentes reciben SOLO los briefs de `docs/briefs/`. Este archivo es tu tablero.
> Orden = cadena de dependencias + relación valor/riesgo. Un checkpoint por vez.

## Estado: dónde estamos hoy (2026-06-18, v1.9.1)

✅ La cadena completa **F1→F6 está cerrada y shippeada.** GitCron cubre hoy el grueso del
workflow tipo GitKraken/SourceTree + Temporal Agent end-to-end con SQLite + dashboard Brier.
El roadmap "clásico" de features Git quedó esencialmente completo; lo que sigue es housekeeping,
backlog sin priorizar, y un **track nuevo de comprensión (Cartografía)**.

---

## ✅ Completado (F1–F6)

| Fase | Qué | Versión |
|---|---|---|
| F1 | Cierre de descomposición de `page.tsx` | v1.8.1 |
| F2 | Staging por hunk / línea | v1.8.2 |
| F3 | File history + blame | v1.8.2 |
| F4 | Interactive rebase visual | v1.8.3 |
| F5 | Remotes + worktrees + submódulos (operaciones) | v1.8.4 |
| F6 | Dashboard estadístico Brier del Temporal Agent | v1.9.0 |
| — | Fix visual del toast de Pull exitoso | v1.9.1 |

Detalle por versión en `CHANGELOG.md` (el ledger fiel). Reportes de cierre en `docs/reports/_done/`.

---

## 🔧 Housekeeping (fases chicas, intercalables) — lo que queda vivo

- **H1**: verificar y retirar el write path JSON paralelo del Temporal Agent (`prediction.json` per-repo) si SQLite ya es única fuente de verdad.
- **H2**: prune de las branches viejas ya integradas. **Re-auditar primero con `git branch -vv`** y pasar lista — no borrar sin tu OK explícito.
- **H3**: deuda de tests señalada — PredictionDetail render/state, materializedRef active/deleted, rename de `centauroExpanded`.
- **H4**: fix del bug SVG `calc()` en el grafo cronométrico (computar en JS).

---

## 🗺️ Track nuevo — Vista Cartografía (comprensión visual del repo)

Tercera vista, par de Classic/Cronométrica, para entender cualquier repo abierto: estructura,
qué se relaciona con qué, y qué se rompe si tocás algo. Genérica (cualquier repo, no solo GitCron).
Separación estricta **motor (releva) vs. vista (dibuja + anota)**; la vista consume un grafo
normalizado propio (`CartoGraph`).

- **Tier 0 — base (git + filesystem, sin parsing):** árbol de archivos + churn + último toque + co-change, lienzo de nodos (React Flow) + panel de detalle + notas persistidas. **Prompts por fase ya redactados (C0.1–C0.5)** — pendiente copiarlos a `docs/cartografia/`.
- **Tier 1 — grafo estructural:** embeber CodeGraph en el main (SQLite local), aristas reales de import/llamada + **impact radius** ("qué se rompe"), auto-sync.
- **Tier 2 — capa semántica + salud:** overlay Fallow (riesgo/complejidad/dead exports), narración con IA por nodo (opt-in), vista ER del modelo de datos. Ver "Notas / referencias" para el camino de IA local.

Brief de arquitectura completo: `GITCRON_CARTOGRAPHY_BRIEF.md`. Orden estricto Tier 0 → 1 → 2, un checkpoint por vez con QA visual.

---

## 📥 Backlog sin priorizar

Git LFS · commit signing (GPG/SSH) · patch/apply · archive/export · drag&drop de branches en el grafo para merge/rebase · búsqueda avanzada (autor/archivo/pickaxe) · reflog viewer / undo basado en reflog · web viewer (Octokit, repos remotos) como producto portfolio.

---

## 🧠 Notas / referencias — IA local y RAG (LM Studio u/o MCP)

Referencia para cuando llegue el **Tier 2 de Cartografía** y el ítem ya presente en el README
**"Local AI via LM Studio for commit messages, changelog drafting, project-history notes…"**.
La comprensión asistida por IA se puede entregar por **dos caminos compatibles (u/o, no excluyentes):**

- **Vía LM Studio (proveedor local enchufable):** un proveedor `lmstudio`/local junto a los stubs openrouter/openai/gemini/opencode. Apunta a `localhost:1234` (API compatible OpenAI). Costo cero (GPU propia), privacidad total, nada sale de la máquina. Alimenta: mensajes de commit, borradores de changelog y el "explicame este nodo" del Tier 2. No puede ser dependencia dura para otros usuarios → siempre opcional/enchufable. Requiere sumar `localhost:1234` (o LM Link) al `connect-src` del CSP como cambio documentado.
- **Vía MCP (motor RAG compartido por agentes):** un RAG sobre los repos expuesto como MCP server (mismo patrón motor/consumidor que Cartografía y que el CodeGraph MCP que ya usás). Lo consumen Claude Code / OpenCode / Cowork por igual. Su mayor valor está **fuera de GitCron**: hace más inteligentes a todos los agentes sobre tu código en todos los proyectos. Ojo: se solapa parcialmente con CodeGraph (que ya da búsqueda + impacto de código); el valor distinto del RAG es docs/PDFs/notas + generación en prosa.

**Veredicto:** el RAG va por separado de Cartografía (no es prerrequisito ni la bloquea); el único cruce real es el narrador del Tier 2. Guía completa de armado en el archivo de notas de Ale (RAG local + acceso remoto vía LM Link).

---

## Flujo de trabajo (recordatorio)

1. Pegás el brief de la fase al ejecutor (Claude Code / Codex / Antigravity / OpenCode).
2. El agente trabaja por tandas, cierra con tsc + tests + fallow + reporte en `docs/reports/` y PARA.
3. Vos hacés QA visual — tu OK es la compuerta vinculante.
4. Recién ahí me pedís el brief de la fase siguiente (lo escribo con el reporte a la vista).
