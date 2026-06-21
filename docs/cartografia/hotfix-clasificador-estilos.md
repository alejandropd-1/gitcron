# Hotfix — Clasificador de estilos (SCSS/SASS/LESS) en Cartografía

> Patch chico e independiente de las fases. Arregla "ESTILOS · 0 archivos" en proyectos con SCSS. Plan general en `00-indice.md`. Cierra con `tsc` + `pnpm test` + `fallow` + push de la branch + STOP (no merge).

```
Trabajás en GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 + TS 5.9). La fase 7
agregó la lente "Grafo" con clasificación de archivos por ROL mediante la función pura
`classifyCartoRole()` en lib/carto-roles.ts. BUG: en proyectos que usan SCSS, la categoría
ESTILOS muestra "0 archivos" porque el clasificador solo reconoce `.css`. Hay que ampliarlo.

INVARIANTES (no romper): `classifyCartoRole` sigue siendo una función PURA y testeable; no
tocás lógica de Git; cero red; sin cambios de comportamiento fuera de la clasificación de rol.

Reconocimiento primero (leé esto ANTES de tocar nada):
- lib/carto-roles.ts → la función `classifyCartoRole` y cómo matchea hoy la categoría styles.
- lib/__tests__/carto-roles.test.ts → el patrón de tests a extender.
- Referencia: docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/hotfix-clasificador-estilos`.
- Commits en esa branch.
- Al cerrar (tsc + tests + fallow): pusheá la branch y PARÁ. NO mergees a main.
- El merge lo hace Alejandro tras su QA.

Tareas:
1. Ampliá la categoría `styles` en `classifyCartoRole` para reconocer, además de `.css`:
   `.scss`, `.sass`, `.less`, y módulos (`*.module.css/scss/less`). Si ya hay detección de
   tokens/globals, mantenela.
2. Agregá casos de test en carto-roles.test.ts: un `styles/foo.scss` y un `x.module.scss`
   deben clasificar como `styles`; verificá que no rompés las categorías existentes.
3. Verificá a ojo: en un repo con SCSS, la columna ESTILOS de la lente Grafo deja de dar 0.

Nota (no es parte del fix, dejala anotada en el reporte): CodeGraph no parsea CSS/SCSS, así que
estos archivos quedan como nodos sin relaciones internas — se clasifican y listan, pero su
"explicación profunda" es limitada. Mejorarla es trabajo futuro, fuera de este hotfix.

Aceptación: en un repo con `.scss`, ESTILOS lista esos archivos; tests nuevos verdes; sin
regresiones en las otras categorías.

Al terminar: tsc + pnpm test + fallow audit + push de la branch + STOP para QA. No mergees.
```
