# Cartografia Fase 08 - Panorama

Fecha: 2026-06-21  
Branch: `cartografia/fase-08-panorama`

## Alcance implementado

- La vista Cartografia abre por defecto en la lente `Panorama`; `Explorador` y `Grafo` quedan como lentes de drill-down.
- `Panorama` construye sin IA ni red un mapa por roles desde el contrato normalizado `CartoGraph`: grupos, conteos, archivos clave por grado de relaciones y flechas top-K grupo -> grupo.
- La orientacion IA del proyecto agrega una frase, un parrafo corto y 2-3 recorridos guiados. Se genera solo si Cartografia AI esta activa y se cachea por `repoPath + structureHash + lang`.
- El boton `Refrescar IA` fuerza regeneracion y actualiza cache; sin cambios de estructura se reutiliza cache.
- Click en grupo despliega sus archivos; click en archivo abre `CartoNodeDetail` reutilizado.
- Modo `Simple/Tecnico` persistido en `localStorage`: Simple arranca con detalles tecnicos colapsados; Tecnico los muestra abiertos.
- Strings agregados en `lib/i18n.ts` para ES/EN/ZH.

## Archivos principales

- `lib/carto-panorama.ts`: constructor determinista de panorama.
- `components/cartography/CartoPanoramaLens.tsx`: nueva lente top-down.
- `electron/ai/carto/panorama.ts`: orquestador IA/cache.
- `electron/db/carto-cache.ts` + `electron/db/schema.ts`: tabla `carto_panorama` y helpers.
- `electron/ai/carto/prompts.ts`, `lmstudio.ts`, `openrouter.ts`, `provider.ts`: prompt y metodo de panorama en proveedores existentes.
- `components/cartography/CartographyView.tsx`: entrada por defecto, selector de lente y toggle Simple/Tecnico.
- `components/cartography/CartoNodeDetail.tsx`: detalles tecnicos colapsables.

## Validacion

- `npx.cmd tsc --noEmit`: OK.
- `pnpm test`: OK, 30 archivos / 248 tests.
- `pnpm exec fallow`: falla por baseline de deuda; no hay dead files y MI sigue en 90.2.

## Fallow final

- Dead files: 0.0% (0 de 165).
- Dead exports/type/duplicate pair: 5 exports + 1 type + 1 duplicate pair.
- Duplicacion: 10 clone groups, 2,414 lineas duplicadas (5.4%).
- Complejidad: 346 funciones sobre umbral, MI 90.2 (good).
- Nuevo riesgo visible: `components/cartography/CartoPanoramaLens.tsx` queda marcado como complejo por concentrar estados de carga, IA y render de la lente. Se dejo asi para no abrir una fase de refactor visual adicional antes de QA.

## Notas

- `docs/00_FUENTE_DE_VERDAD.md` todavia dice que Cartografia no tiene codigo; el codigo actual ya tiene fases de Cartografia previas y esta fase 08. No se actualizo ese documento en esta pasada para mantener el cierre focalizado en el reporte de fase.
- No se toco `README.md` ni `CHANGELOG.md`, respetando la invariante local de no actualizarlos durante fases de codigo.
- No se mergeo a `main`; queda para QA visual de Alejandro.
