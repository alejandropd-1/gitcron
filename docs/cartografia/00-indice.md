# Cartografía · Tier 0 — Índice de fases

Vista nueva de GitCron para entender cualquier repo abierto: dónde están las cosas, qué se relaciona con qué, y qué se rompe si tocás algo. Documento de arquitectura completo: `GITCRON_CARTOGRAPHY_BRIEF.md`.

## Orden de las fases (pegá una caja por vez)

| # | Fase | Archivo | Qué entrega |
|---|------|---------|-------------|
| 01 | C0.1 — Andamiaje | `fase-01-andamiaje.md` | Flag `enableCartography` + vista top-level + lienzo vacío TCARS |
| 02 | C0.2 — Explorador | `fase-02-explorador-arbol.md` | Árbol de archivos del repo (filesystem) |
| 03 | C0.3 — Métricas git | `fase-03-metricas-git.md` | Churn + último toque + co-change (`git log`) |
| 04 | C0.4 — Lienzo nodos | `fase-04-lienzo-nodos.md` | Grafo React Flow + contrato normalizado + panel de detalle |
| 05 | C0.5 — Persistencia | `fase-05-persistencia-notas.md` | Notas por nodo persistidas por repo (cierra Tier 0) |

## Flujo por fase

1. Pegás **una** caja al agente → 2. trabaja y reporta → 3. corrés `tsc --noEmit` + `pnpm test` → 4. **tu QA visual** (gate distinto del CI) → 5. recién ahí pasás a la fase siguiente.

Cada prompt es **auto-contenido**: trae su contexto, invariantes y el estado asumido de las fases previas, así funciona aunque el agente arranque con la cabeza limpia.

## Después del Tier 0

Al cerrar C0.5 con OK visual → se redactan los prompts del **Tier 1 (CodeGraph: impacto real "qué se rompe")** y luego **Tier 2 (Fallow + IA + vista ER)**.
