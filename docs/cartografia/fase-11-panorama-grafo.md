# Fase 11 — Panorama-como-grafo: lienzo único con tarjetas de grupo

> Fase 11 de Cartografía. Fusiona Panorama y Grafo en un solo lienzo: el estado inicial son tarjetas por rol (estilo Understand-Anything) que se expanden on-demand. Requiere fase 10 mergeada. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Contexto: GitCron, vista "Cartografía". Tras la fase 10 quedan 2 lentes: Panorama (narrativa IA,
grupos por rol, flechas entre grupos con peso) y Grafo (nodos React Flow agrupados por rol via
classifyCartoRole en lib/carto-roles.ts, con MAX_OVERVIEW_NODES_PER_ROLE y "vista acotada").
DECISIÓN de producto: pasa a haber UNA SOLA VISTA. El estado inicial del lienzo son TARJETAS DE
GRUPO (una por rol) con el contenido que hoy muestra el Panorama; al clickear una tarjeta se
expande su barrio de nodos. Referencia visual: Understand-Anything — pocas tarjetas de capa con
resumen, conteo de archivos y edges con peso entre grupos. NUNCA una nube de nodos al entrar.

BRANCH: cartografia/fase-11-panorama-grafo desde main (con fase 10 ya mergeada). Push y STOP.

INVARIANTES (no romper — condición de aceptación):
- Cero cambios en lógica de Git y CERO IPC NUEVO: todos los datos necesarios (grafo, roles,
  resumen de panorama, flechas entre grupos) ya llegan por los IPC existentes. Si te falta un
  dato, PARÁ y preguntá antes de tocar Electron.
- El resumen IA del Panorama se lee SIEMPRE del caché. Prohibido disparar llamadas a proveedores
  de IA en dev/test.
- Strings nuevas via lib/i18n.ts en ES/EN/ZH.
- codegraph_context / codegraph_impact antes de grep.
- El panel derecho (CartoNodeDetail, CartoRelationsPanel, CartoAskBox) NO se modifica por dentro:
  solo se reubica si hace falta. "Explicame esto" y "Preguntar a la IA" deben seguir funcionando
  exactamente igual.
- Secretos en main process (safeStorage). CSP no se toca.

TANDA 1 — Modelo puro:
- Crear lib/carto-groups.ts con funciones puras + tests Vitest:
  buildGroupModel(graph) -> { groups: [{ role, count, keyFiles (top 5 por grado), summary? }],
  groupEdges: [{ from, to, weight }] }.
- La agregación de flechas entre grupos YA existe para el Panorama: reutilizala o movela a esta
  lib compartida — NO la dupliques. Si vive en el proceso Electron, consumí el dato que ya viaja
  por IPC.
- CHECKPOINT: firma de las funciones + tests en verde. Esperá OK.

TANDA 2 — Lienzo:
- En SemanticGraphLens.tsx: estado inicial = tarjetas de grupo como nodos React Flow (nombre del
  rol con su color, resumen breve del panorama cacheado si existe, conteo de archivos, key
  files), y edges agregados entre tarjetas con label de peso.
- Interacción: click en una tarjeta expande SOLO ese grupo (sus nodos, respetando
  MAX_OVERVIEW_NODES_PER_ROLE con un "ver más"); los edges hacia grupos colapsados apuntan a la
  tarjeta del grupo. Acción clara para colapsar de nuevo. Seleccionar un nodo sigue abriendo el
  panel derecho como hoy.
- Persistir el set de grupos expandidos POR REPO en el store Zustand (mismo patrón que graphMode).
- CHECKPOINT: screenshot del estado inicial y de un grupo expandido. Esperá mi OK.

TANDA 3 — Fusión y limpieza:
- El bloque "QUÉ ES" del Panorama pasa a un header colapsable arriba del lienzo, reutilizando el
  componente/markup existente del Panorama (no reescribir).
- Eliminar CartoPanoramaLens como lente y el nav LENTES: CartographyView renderiza lienzo + panel
  derecho, nada más. El botón Refrescar y el toggle Simple/Técnico se conservan donde corresponda.
- Eliminar claves i18n huérfanas (3 idiomas). tsc --noEmit en 0, pnpm test verde.
- Reporte en docs/reports/ + commit + push. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] Al entrar a Cartografía se ven <= 8 tarjetas de grupo y cero nodos sueltos.
- [ ] Expandir/colapsar por grupo funciona y el estado persiste al cambiar de tab.
- [ ] Flechas entre grupos con peso visibles en el estado colapsado.
- [ ] "Explicame esto", relaciones y "Preguntar a la IA" funcionan igual que antes.
- [ ] No existe más el nav LENTES ni CartoPanoramaLens como vista aparte.
- [ ] Panorama IA solo desde caché. tsc/test verdes. Reporte + branch pusheada sin merge.
```
