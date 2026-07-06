# Fase 12 — Limpieza y release v1.10.0

> Cierra el track Cartografía: código muerto fuera, changelog, versión. NO taggea ni publica — eso lo hace Ale tras su QA visual. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Contexto: GitCron con las fases 10 y 11 mergeadas en main (y la fase 09-persistencia si ya
corrió). Esta fase NO agrega features: consolida, documenta y prepara la versión.

BRANCH: cartografia/fase-12-release desde main. Push y STOP. No merge, no tag, no release.

INVARIANTES (no romper — condición de aceptación):
- Cero cambios de comportamiento. Si borrar "código muerto" cambia un test o un flujo, PARÁ y
  preguntá.
- Cero cambios en lógica de Git y en el motor Electron, salvo eliminar exports muertos
  confirmados.
- codegraph_impact antes de cada borrado.

TANDA 1 — Código muerto:
- Correr Fallow (npx fallow, ya está como devDependency) y revisar dead exports y duplicación
  SOLO en el área Cartografía (components/cartography/, lib/carto-*, electron/carto/,
  electron/ai/carto/, electron/ipc/carto*). Eliminar lo que quedó muerto tras las fases 10-11,
  confirmando cada borrado con codegraph_impact.
- Fuera del área carto: NO tocar nada — solo listar hallazgos en el reporte.
- CHECKPOINT: lista de borrados propuestos ANTES de ejecutarlos. Esperá mi OK.

TANDA 2 — Documentación y versión:
- CHANGELOG.md: entrada [v1.10.0] resumiendo el track Cartografía completo (comprensión del repo
  con IA: lienzo único de tarjetas por rol con expand on-demand, "Explicame esto", "Preguntar a
  la IA" con citas, Panorama integrado, grounding CodeGraph, providers OpenRouter/LM Studio,
  caché SQLite), respetando el formato y tono de las entradas existentes.
- README.md: actualizar la sección de features con Cartografía tal como quedó (una vista, no
  tres).
- package.json: bump a 1.10.0.
- Barrido final de claves i18n huérfanas del área carto en ES/EN/ZH.

TANDA 3 — Cierre:
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/ con: borrados de Fallow ejecutados, hallazgos fuera del área carto
  (sin tocar), resumen de docs actualizados, resultado de los checks.
- Commit + push de la branch. STOP. El tag v1.10.0 y el GitHub Release los hace Ale después del
  QA visual.

CRITERIOS DE ACEPTACIÓN:
- [ ] Cero dead exports en el área carto según Fallow.
- [ ] CHANGELOG v1.10.0 + README + package.json 1.10.0 coherentes entre sí.
- [ ] Cero cambios de comportamiento. tsc/test verdes. Sin tag. Branch pusheada sin merge.
```
