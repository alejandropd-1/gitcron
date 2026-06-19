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
- **H2**: prune de branches. **Auditado 2026-06-18:** ~30 locales mergeadas a `main` (candidatas), varias bloqueadas por worktrees `.claude/worktrees` activos, y `imagined/*` + `feature/chronometric*`/`tcars*` sin mergear → conservar. Prune pendiente de tu OK explícito.
- **H3**: deuda de tests señalada — PredictionDetail render/state, materializedRef active/deleted, rename de `centauroExpanded`.
- **H4**: fix del bug SVG `calc()` en el grafo cronométrico (computar en JS).

---

## 🗺️ Track nuevo — Vista Cartografía (comprensión visual del repo)

Tercera vista, par de Classic/Cronométrica, para entender cualquier repo abierto: estructura,
qué se relaciona con qué, y qué se rompe si tocás algo. Genérica (cualquier repo, no solo GitCron).
Separación estricta **motor (releva) vs. vista (dibuja + anota)**; la vista consume un grafo
normalizado propio (`CartoGraph`).

**Reordenado (comprensión primero):** la estrella es que la IA te EXPLIQUE el repo en castellano, no que mires un diagrama. El grafo visual baja de prioridad.

- **C1** Andamiaje (flag + vista + estado per-repo).
- **C2** Explorador (árbol de archivos = superficie de click).
- **C3** Grounding estructural: embeber CodeGraph (relaciones + impacto) — mantiene honesta a la IA.
- **C4** Proveedor de IA enchufable (LM Studio local u online; costura híbrida).
- **C5** ⭐ Panel "explicame esto" (click → castellano, contexto recortado, cacheado).
- **C6** ⭐ Ventanita de preguntas (Q&A scoped al repo de la solapa activa).
- **C7+** (diferidas, prompts al cerrar C6): grafo visual React Flow + métricas churn/co-change; persistencia de notas; vector store opcional (preguntas difusas por concepto); y el **agente meta cross-repo** (ver Notas).

Prompts por fase en `docs/cartografia/` (C1–C6 redactados; C7+ al cerrar C6). Un checkpoint por vez con QA visual.

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

**Multi-repo + agente meta (visión):** Cartografía ya es per-repo (índice keyed por `repo_path`), así que la ventanita de preguntas es automáticamente "subagente por repo" (GitCron responde de GitCron; OdontoPro de OdontoPro). Encima, un **agente meta cross-repo** resume "en qué estado están tus repos" leyendo **digests compactos por repo** (estado git, actividad, salud, resumen corto cacheado) desde el SQLite global — NO el código de todos. Resumir 5 repos = leer 5 resúmenes chicos (sumarización jerárquica). Mismo patrón que el dashboard Brier cross-repo; arranca determinista y la IA se suma encima. Los vectores sirven a nivel HOJA (preguntas difusas por repo), no al meta.

**Veredicto:** la comprensión con IA se integra por fases en Cartografía; el agente meta va ÚLTIMO (depende de los digests per-repo). Guía de armado RAG local + LM Link en el archivo de notas de Ale.

---

## Flujo de trabajo (recordatorio)

1. Pegás el brief de la fase al ejecutor (Claude Code / Codex / Antigravity / OpenCode).
2. El agente trabaja por tandas, cierra con tsc + tests + fallow + reporte en `docs/reports/` y PARA.
3. Vos hacés QA visual — tu OK es la compuerta vinculante.
4. Recién ahí me pedís el brief de la fase siguiente (lo escribo con el reporte a la vista).
