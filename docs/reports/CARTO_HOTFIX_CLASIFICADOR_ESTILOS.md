# Hotfix cartografia: clasificador de estilos SCSS

## Alcance

- Branch: `cartografia/hotfix-clasificador-estilos`
- Objetivo: asegurar que la categoria `styles` de la lente Grafo reconozca archivos SCSS y modulos SCSS.

## Cambios

- Se agrego cobertura de regresion en `lib/__tests__/carto-roles.test.ts` para:
  - `styles/foo.scss`
  - `components/x.module.scss`
- Se verifico que `lib/carto-roles.ts` ya mantiene `classifyCartoRole` como funcion pura y ya reconoce `.css`, `.scss`, `.sass`, `.less` y modulos `*.module.*` dentro de `STYLE_FILE_RE`.

## No tocado

- No se modifico logica de Git.
- No se modifico la lente visual ni componentes de UI.
- No se modificaron `README.md` ni `CHANGELOG.md`.

## Nota tecnica

CodeGraph no parsea CSS/SCSS. Estos archivos quedan como nodos sin relaciones internas: se clasifican y listan, pero su explicacion profunda es limitada. Mejorar esa lectura queda fuera de este hotfix.

## Validacion

- `npx.cmd tsc --noEmit`: OK
- `pnpm test`: OK, 29 archivos / 243 tests
- `pnpm exec fallow`: ejecutado, falla por deuda existente del repo.
  - Dead code: 6 exports + 1 type + 1 duplicate pair.
  - Duplicacion: 10 clone groups.
  - Complejidad: 338 funciones sobre threshold.
  - Metricas: 43.783 LOC, dead files 0.0%, dead exports 1.6%, maintainability 90.3.
  - Sin delta funcional atribuible al hotfix: solo se agregaron casos de test y este reporte; no se tocaron archivos productivos ni logica de Git.
