## Why

El cuerpo de la vista del ciclo se rehizo dos veces sin que nadie decidiera cómo se presenta lo que
quedó. `compartir-paneles-laterales-entre-vistas` le retiró las columnas y le dio encabezado a sus
bloques; `unificar-paleta-carbon-soul` le está unificando el color y la escala. Ninguno de los dos
resolvió **dónde va cada cosa**, porque ninguno de los dos es eso.

Alejandro lo dijo el 2026-08-24 mirando la aplicación: «el contexto no condice con el trabajo pulcro
que venimos haciendo de cómo mostrar la info». Y desde entonces se acumularon ocho observaciones
suyas, todas concretas, todas de disposición y no de color.

La diferencia con los dos changes anteriores es lo que hace a éste necesario y aparte: **color y
escala se miden contra una norma declarada** —hay una paleta, hay una escala de siete escalones, y
una verificación automática puede decir si se cumplen—. **La disposición no tiene norma contra la
cual medirse**: son decisiones, una por una, y las toma Alejandro. Mezclarlas produce un change donde
lo verificable y lo opinable se estorban, que es exactamente lo que pasó con el de los paneles y sus
ochenta y siete tareas.

## What Changes

- **El cuerpo se ordena por lo que se va a hacer, no por lo que hay que saber.** Hoy la cabecera
  —volver, nombre, fecha, intención cortada, tres solapas y tres botones— ocupa el primer tercio de
  la pantalla, y la lista de tareas queda abajo del pliegue.
- **Los controles declaran su jerarquía.** «Continuar con X» es la acción; «Archivar» y «Ver diff»
  no, y hoy los tres pesan igual.
- **Las solapas se ven como solapas.** Ya lo son por dentro —`role="tab"` sobre un `role="tablist"`,
  en `PipelineDetails.tsx:61`—, pero cada una lleva borde, fondo y radio propios, así que se leen
  como cinco botones sueltos.
- **Lo que se repite deja de repetirse.** El avance aparece dos veces; el aviso de rama dice lo que
  la franja ya dice; la ficha de tarea informa «No informado» tres de cuatro veces.
- **El panel de evidencia se muda a donde vive el resto.** Está en `app/globals.css`, con reglas que
  estuvieron duplicadas, mientras la vista tiene su propia hoja.

**Fuera de alcance, explícitamente:** el color y la escala tipográfica, que resuelve
`unificar-paleta-carbon-soul`; la geometría del lienzo cronométrico, protegida por el invariante 12;
y agregar información que hoy no exista. Este change mueve, agrupa y jerarquiza lo que ya está.

## Capabilities

### New Capabilities

Ninguna. La información y las acciones son las mismas: cambia cómo se presentan.

### Modified Capabilities

- `ui-visual-system`: incorpora la jerarquía de presentación —qué se lee primero, qué pesa más y qué
  no se repite— como parte del sistema visual, junto a la escala y la accesibilidad que ya norma.

## Impact

**Componentes.** `components/pipeline/OpenSpecDashboard.tsx` es el grueso. También
`components/pipeline/PipelineDetails.tsx` y `components/pipeline/PipelineArtifactGraph.tsx`.

**Estilos.** `components/pipeline/OpenSpecDashboard.module.css` y las reglas `.pipeline-details__*` y
`.pipeline-artifact-graph*` que hoy viven en `app/globals.css`.

**Riesgo declarado.** Mover un bloque de lugar es barato; decidir dónde va no. Cada decisión de este
change necesita el ojo de Alejandro sobre la aplicación corriendo, y ninguna prueba puede
reemplazarlo. La verificación automática sólo puede sostener lo que ya se decidió —que un bloque no
vuelva a duplicarse, que un rótulo no vuelva a faltar—, no decidir.
