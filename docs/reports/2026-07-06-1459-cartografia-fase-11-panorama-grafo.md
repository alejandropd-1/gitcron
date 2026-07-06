# Cartografia Fase 11 - Panorama como grafo

Fecha: 2026-07-06
Branch: `cartografia/fase-11-panorama-grafo`

## Objetivo

Fusionar Panorama y Grafo en un unico lienzo de Cartografia. La entrada inicial
ya no es una nube de archivos: es un conjunto acotado de tarjetas por rol, con
flechas ponderadas entre grupos y expansion on-demand de cada barrio.

## Cambios

- `lib/carto-groups.ts`: nuevo modelo puro `buildGroupModel(graph)` con
  `groups` y `groupEdges`, reutilizando `buildCartoPanorama` para no duplicar
  la agregacion de flechas entre grupos.
- `components/cartography/SemanticGraphLens.tsx`: el lienzo inicial renderiza
  tarjetas de grupo como nodos React Flow; al expandir un rol aparecen solo sus
  archivos acotados por `MAX_OVERVIEW_NODES_PER_ROLE`.
- `lib/git-store.ts`: persistencia por repo de `cartographyExpandedRoles`, para
  sostener el estado al cambiar de tab.
- `components/cartography/CartographyView.tsx`: se elimino el nav de lentes y
  la vista renderiza una unica superficie: header "Que es", lienzo y paneles
  existentes.
- `components/cartography/CartoPanoramaHeader.tsx`: bloque colapsable "Que es"
  reutilizando el markup del resumen de Panorama, sin llamadas a IA.
- `components/cartography/CartoPanoramaLens.tsx`: eliminado como vista separada.
- `lib/i18n.ts`: nuevas cadenas ES/EN/ZH para grupos expandidos y limpieza de
  claves huerfanas de lentes/panorama anterior.

## Invariantes

- Sin cambios en logica Git.
- Sin IPC nuevo.
- Sin cambios de CSP.
- Sin tocar internamente `CartoNodeDetail`, `CartoRelationsPanel` ni
  `CartoAskBox`.
- La vista nueva no llama `cartoAi.panorama`; evita disparar proveedores de IA
  en dev/test. El header muestra solo datos deterministas del panorama.

## Evidencia visual

Verificacion local con Playwright + mock de `window.api`:

- Estado inicial: 6 tarjetas de grupo, 0 archivos sueltos, sin nav Panorama/Grafo.
- Expansion Maqueta/UI: 6 tarjetas de grupo, 4 archivos visibles.
- El mock falla si se invoca `cartoAi.panorama`; no se invoco.

## Validacion

```text
pnpm exec tsc --noEmit
OK
```

```text
pnpm test
Test Files  31 passed (31)
Tests       238 passed (238)
```

Busqueda final en codigo fuente (`components`, `lib`, `app`, `types`,
`electron`): sin referencias a `CartoPanoramaLens`, `cartography.lenses`,
`cartography.lens.*` ni claves huerfanas del Panorama/lente anterior.

## Ajuste QA posterior

- Header "Que es" plegado por defecto; ya no muestra el mensaje protagonista
  "IA desactivada" en la entrada al lienzo.
- La expansion reserva altura por fila segun los grupos abiertos para que los
  nodos de archivo no queden por detras de tarjetas grandes.
- Los nodos del lienzo son draggables y conservan su posicion manual durante la
  sesion de la vista.
- Los nodos internos ya no muestran una barra decorativa tipo progreso, y el
  lienzo ya no renderiza la grilla movil pegada al viewport de React Flow.
- En tarjetas de grupo, expandir/colapsar pasa por un boton real `nodrag/nopan`;
  el cuerpo de la tarjeta queda para arrastrar y el contador de archivos
  ocultos deja de parecer una accion clickeable.
- Verificacion Playwright con mock: 0 textos "IA desactivada" en el header, 0
  archivos sueltos al entrar, 10 archivos visibles tras expandir 2 grupos, 0
  solapes tarjeta/archivo, drag manual confirmado (+164 px, +99 px).
