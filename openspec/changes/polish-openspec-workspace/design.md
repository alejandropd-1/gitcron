## Context

Los cuatro puntos son independientes entre sí y tienen tamaños muy distintos. Dos agregan valor visible —leer los artefactos y desfragmentar la narrativa—, dos retiran peso muerto. Se agrupan en un change porque comparten el mismo objetivo, dejar el workspace coherente con lo que hace, y porque tres de los cuatro tocan los mismos archivos.

El contenido de los artefactos ya se lee del disco: `repo-evidence-reader` abre `proposal.md` para extraer el intent y lo descarta. No hay que agregar acceso a disco, sólo dejar de tirar lo que ya se leyó.

## Goals / Non-Goals

**Goals**

- Poder leer proposal, design y tasks del cambio seleccionado sin salir de la app.
- Que un mensaje del runtime se lea como un mensaje.
- Que el snapshot no transporte campos que nadie consume.
- Que las specs describan lo que el código hace.

**Non-Goals**

- No se edita ningún artefacto desde la app: es lectura.
- No se toca el lanzador, los adaptadores ni las sesiones persistidas.
- No se cambia la estética ni el layout de tres zonas.

## Decisions

### D1 — El contenido viaja en la evidencia, no se relee en el renderer

`OpenSpecChangeEvidence` incorpora el markdown de los tres artefactos. La alternativa era exponer un IPC de lectura de archivos al renderer, y se descarta: multiplicaría la superficie que hay que validar contra escapes de path, cuando el lector ya resuelve eso con `safeReadRepoFile` y contención al repositorio.

El costo es que el snapshot crece. Se acota conservando el contenido **sólo del cambio seleccionado**, no de todos los activos.

### D2 — El markdown se renderiza con `SafeMarkdown`, que ya existe

No se agrega ninguna dependencia. `SafeMarkdown` ya se usa para la pestaña Propuesta y aplica el saneo que exige la spec de parsers sin render inseguro.

### D3 — Los deltas se acumulan en la proyección, no en el adaptador

El adaptador emite `agent.message.delta` tal como llega del runtime, y eso está bien: es la observación cruda. Coalescer ahí perdería fidelidad y rompería los fixtures auditados.

La acumulación va en `runtime-projection`, que es quien construye la vista: los deltas consecutivos del mismo agente se concatenan en una entrada, y se cierra cuando cambia el agente, llega un evento de otra clase o termina el mensaje. El `entryId` de la entrada resultante es el del primer delta, así la deduplicación existente sigue funcionando.

### D4 — La tabla se elimina en una migración nueva, sin editar las anteriores

`pipeline_cursor` se dropea en una migración `version: 6`. No se toca `CREATE_PIPELINE_TABLES` de la versión 4: editar una migración ya distribuida dejaría bases existentes en un estado que ninguna versión describe. Una instalación limpia crea la tabla en la 4 y la elimina en la 6, que es más ruidoso pero correcto.

### D5 — `stations` y `now` se retiran del contrato, no se dejan vacíos

Igual que con Hermes en el change anterior: un campo que siempre viene vacío es una afirmación sobre algo que no se observa. Se retiran del snapshot, de `pipeline-domain` y de la vista.

## Risks / Trade-offs

- **Riesgo:** el snapshot crece con el markdown de tres archivos. Se mitiga acotándolo al cambio seleccionado y reutilizando el truncado del sanitizador de persistencia.
- **Riesgo:** la coalescencia esconde el orden real si un delta llega intercalado con otro evento. Se mitiga cerrando la acumulación ante cualquier evento que no sea un delta del mismo agente.
- **Riesgo:** la migración corre sobre bases con datos. `DROP TABLE IF EXISTS` es idempotente y no afecta a las demás tablas.
- **Trade-off:** `stations` describía una vía de siete estaciones que fue parte del diseño original. Retirarlo cierra esa puerta; reabrirla exigiría rederivarlo desde evidencia de OpenSpec.

## Migration Plan

Una sola migración aditiva, `version: 6`, con `DROP TABLE IF EXISTS pipeline_cursor`. `LATEST_SCHEMA_VERSION` pasa a 6. El resto del change no toca datos.

## Open Questions

Ninguna.
