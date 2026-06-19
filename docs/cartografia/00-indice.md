# Cartografía — Índice y plan (reordenado: comprensión primero)

Vista de GitCron para **entender** cualquier repo abierto. La estrella **no es el diagrama** de nodos y líneas (eso es lo que pierde a un no-experto): la estrella es que **la IA te explique el repo en castellano** y puedas **preguntarle**. El grafo y la estructura quedan abajo, alimentando y *verificando* esas explicaciones para que sean verdaderas y no inventadas.

## Principio rector
Separar **motor** (releva la estructura) de **consumo** (la vista que explica + deja preguntar). La vista habla un contrato normalizado propio (`CartoGraph`); cualquier motor (git, CodeGraph) se adapta a ese contrato. La IA es **opt-in** y corre con proveedor **local (LM Studio) u online**, intercambiable.

## Por qué el grounding estructural va antes que la IA
Si la IA explica sin leer la estructura real, **alucina relaciones con total seguridad** ("esto llama a aquello") y vos no podés verificarlo. CodeGraph (relaciones + impacto reales) es lo que mantiene **honesta** a la explicación. No es overhead: es lo que evita que la ventanita te mienta.

## Orden de fases (pegá una caja por vez · QA visual entre cada una)

| # | Fase | Archivo | Entrega |
|---|------|---------|---------|
| 1 | Andamiaje | `fase-01-andamiaje.md` | Flag + vista top-level + estado per-repo + panel vacío |
| 2 | Explorador | `fase-02-explorador-arbol.md` | Árbol de archivos = superficie de click |
| 3 | Grounding estructural | `fase-03-grounding-codegraph.md` | Embeber CodeGraph (relaciones + impacto) — mantiene honesta a la IA |
| 4 | Proveedor de IA | `fase-04-proveedor-ia.md` | Capa enchufable LM Studio local **u** online (costura híbrida) |
| 5 | ⭐ Explicame esto | `fase-05-explicar-nodo.md` | Click → explicación en castellano, contexto recortado, cacheada |
| 6 | ⭐ Ventanita de preguntas | `fase-06-ventanita-preguntas.md` | Q&A scoped al repo de la solapa activa |
| 7+ | (diferidas) | — | Grafo visual + métricas churn/co-change · persistencia de notas · vector store (preguntas difusas) · **agente meta cross-repo** |

Las fases 7+ se detallan al cerrar la 6 (misma disciplina: detallar lo cercano, diferir lo lejano). El grafo visual baja de prioridad a propósito.

## Multi-repo y agente meta (visión)
- **Subagente por repo = gratis:** el índice es per-repo (`repo_path`), así que la ventanita ya responde sobre el repo de la solapa activa. GitCron → habla de GitCron; OdontoPro → habla de OdontoPro.
- **Agente meta (último):** resume "en qué estado están tus repos" leyendo **digests compactos por repo** (estado git, actividad, salud, resumen corto cacheado) desde el SQLite global — **no** el código de todos. Sumarización jerárquica (resumir resúmenes) = ahorro de tokens. Mismo patrón que el dashboard Brier cross-repo. Arranca **determinista** (GitCron ya sabe el estado git de cada solapa) y la IA se suma encima.
- **Vectores:** sirven a nivel **hoja** (preguntas difusas por concepto dentro de un repo), no al meta. Capa aditiva y posterior.

## Flujo por fase
El agente crea una branch desde main → trabaja y commitea ahí → `tsc --noEmit` + `pnpm test` → pushea la branch (NO mergea) → reporta y PARA → **tu QA visual** → con tu OK, merge a main → la fase siguiente sale de main ya mergeada.
