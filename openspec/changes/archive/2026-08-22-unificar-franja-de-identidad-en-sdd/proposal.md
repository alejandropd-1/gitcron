## Why

La vista SDD encabeza su contenido con una barra propia, escrita por separado y anterior al
encabezado unificado. Lleva casi lo mismo que la franja de identidad del grafo —la rama actual y el
estado del árbol de trabajo— y agrega el control que le corresponde, preparar el commit, más el
título de la práctica, dos contadores y la insignia del motor de OpenSpec. Seis piezas en una
línea, resueltas con una grilla propia de cuatro pistas.

No entran. En la aplicación se lee hoy `18 e·Repositorio en 0%en estado`: los contadores desbordan
su pista y se encima con el estado del repositorio. Ya había pasado antes, y el comentario que
encabeza esa grilla lo cuenta —se pasó a cuatro columnas justamente para evitarlo—. Volvió porque el
problema no es cuántas pistas hay sino cuánto se le pide a una sola línea.

Esa barra además declara su propio fondo y su propio borde inferior, fuera de la pieza que el resto
de la aplicación ya comparte. Es la última vista que quedó afuera del encabezado unificado.

## What Changes

- **SDD adopta la franja de identidad.** La misma pieza que usa el grafo, con la rama actual y los
  indicadores de estado del árbol y de sincronización a la izquierda, y `Preparar commit` a la
  derecha, donde el grafo ubica su selector de modo.
- **La barra propia de SDD se retira**, con su grilla de cuatro pistas, su fondo y su borde.
- **Los contadores y la insignia del motor bajan al cuerpo del panel**, donde se leen sin competir
  por el ancho de una línea que ya tiene dueño.
- **El título de marca se retira.** El selector de vistas ya nombra a SDD; repetirlo en la línea
  siguiente, en dos renglones y en caja alta, es lo que hoy le come el ancho a los contadores.

**Fuera de alcance, explícitamente:** la disposición de las tres columnas del cuerpo de SDD y el
reparto de los paneles laterales entre vistas, que es un trabajo aparte y mayor; las 218
declaraciones de borde y los 320 usos de tokens propios `--os-*` de su hoja de estilos, que resuelven
`unificar-paleta-carbon-soul` y ese trabajo aparte; y el nombre interno de la vista, que sigue
diciendo `pipeline`.

## Capabilities

### Modified Capabilities
- `ui-content-header`: la franja de identidad deja de ser del grafo y pasa a ser común a toda vista
  que necesite nombrar la rama y el estado del repositorio, con el control de su alcance a la
  derecha.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx`: retiro de `summaryBar`, del título de marca, y
  reubicación de contadores e insignia del motor.
- `components/pipeline/OpenSpecDashboard.module.css`: retiro de las reglas de `summaryBar`, `brand`,
  `summaryFacts` y `repoHealth` que dejen de tener consumidor.
- `components/RepoMainView.tsx` o donde viva la franja común: alojar la vista SDD.
- `lib/i18n.ts`: sólo si algún rótulo reubicado necesita clave nueva.
