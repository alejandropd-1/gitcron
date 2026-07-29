## Context

El modelo de evidencia de Pipeline nació para observar el kit multi-agente: leía `docs/ai/logs/gates.jsonl`, `delegations.jsonl` y `visual-diff-heights.jsonl`, y exponía un flag de conexión con Hermes. Esa carpeta ya no existe en el repositorio, así que hoy esos campos se alimentan siempre de nada: el lector devuelve listas vacías, el reducer las fusiona, el adaptador las proyecta y la UI muestra secciones que nunca tendrán contenido.

La cadena es larga y homogénea: `parsers` produce los registros, `reducer` los acumula y deriva eventos, `repo-evidence-reader` los lee del disco, `pipeline-adapter` los proyecta al renderer, `pipeline-view-state` los tipa, `PipelineDetails` los muestra y `lib/i18n` los rotula.

## Goals / Non-Goals

**Goals**

- Retirar `gates`, `delegations`, `visualDiffs` y Hermes del modelo, de punta a punta, sin dejar campos vestigiales.
- Que la suite quede verde por cobertura real, no porque se borraron las pruebas junto con lo que probaban.
- Dejar `pipeline-repo-evidence` describiendo lo que el lector efectivamente hace.

**Non-Goals**

- No se toca el workspace OpenSpec, el lanzador, `runtime-adapters`, `control-bus` ni las sesiones persistidas.
- No se cambia la lógica de Git ni ninguna feature viva de GitCron.
- No se retiran los fixtures de `docs/pipeline/f03`: son evidencia citada por los adaptadores y leída por la suite de conformance.

## Decisions

### D1 — Se retira de afuera hacia adentro

El orden es UI → adaptador → reducer → lector → parsers → tipos. Empezar por los tipos deja el árbol sin compilar durante todo el trabajo y convierte a `tsc` en ruido en vez de guía. Yendo de afuera hacia adentro, cada paso deja el árbol compilando y los tests corriendo, y el compilador va señalando el siguiente consumidor huérfano.

### D2 — No hay migración de datos

Se verificó que `electron/db/schema.ts` y `pipeline-repository.ts` no persisten gates, delegaciones ni diffs visuales: viven sólo en memoria dentro del snapshot y se releen del disco en cada lectura. El único riesgo era una migración de SQLite, y no existe. Las sesiones de runtime, que sí están persistidas, no se tocan.

### D3 — Los eventos derivados desaparecen con su fuente

`reducer` emite `gate.changed` cuando cambia el último gate. Ese evento pierde sentido junto con la fuente y se retira, en vez de dejarlo emitiendo contra una lista siempre vacía.

### D4 — Hermes sale del contrato, no se degrada a `false`

Dejar `hermesConnected: false` fijo sería conservar una afirmación sobre un sistema que ya no se consulta. El campo se retira del snapshot y de la vista. La cláusula de `pipeline-connection-security` que lo nombraba se reescribe para hablar de la degradación entre transportes sin mencionarlo.

### D5 — Las pruebas se recortan, no se borran en bloque

Varios archivos de test cubren a la vez lo que se va y lo que se queda, como ya pasó con el sanitizador de seguridad y la política de retención. En esos casos se quitan los casos correspondientes y se conserva el resto. Sólo se borran archivos completos cuando todo su contenido cubre superficie retirada.

## Risks / Trade-offs

- **Riesgo:** recortar un test de más y perder cobertura de algo vivo. Se mitiga comparando el conteo de pruebas antes y después y justificando la diferencia exacta en el reporte.
- **Riesgo:** dejar cadenas i18n huérfanas en uno de los tres idiomas. Existe una prueba de paridad de i18n que lo detecta.
- **Trade-off:** el snapshot pierde capacidad de mostrar historial de gates. Es intencional: ese historial describía un método retirado.

## Migration Plan

No aplica a datos. Para el código, el orden de D1 y una verificación de `tsc --noEmit` y `pnpm test` entre cada bloque.

## Open Questions

Ninguna. El alcance quedó cerrado al comparar los artefactos de `C:\www\scaffold` contra lo presente en el repositorio.
