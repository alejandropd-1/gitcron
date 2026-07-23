# F00 — Fixtures sanitizados y procedimientos de captura

Nunca se copian `.env`, auth stores, cookies, prompts privados o logs históricos crudos. Todos los
fixtures usan entradas ficticias o conservan sólo metadata segura.

## Inventario

| Fixture | Tipo | Estado | Sustenta |
|---|---|---|---|
| `fixtures/runtime-versions.json` | salida sanitizada | verified | versiones/roles instalados. |
| `fixtures/claude-planner-result.sanitized.json` | ejecución real resumida | verified | modelo efectivo, duración, usage y costo runtime-reportado. |
| `fixtures/lmstudio-classification.sanitized.json` | inferencia local real | verified/degraded | endpoint/model/usage; contenido útil vacío. |
| `fixtures/opencode-zai-review.sanitized.json` | ejecución estructurada real resumida | verified | provider/model solicitado, tools, usage, costo 0 y veredicto. |
| `fixtures/delegation-template-output.jsonl` | productor real con inputs ficticios | verified | schema actual del template. |
| `gates.jsonl` | procedimiento/productor | pending fixture de ejecución | schema exacto del echo; no se corrió build/gates. |
| `visual-diff-heights.jsonl` | procedimiento/productor | pending fixture de ejecución | schema del script; requiere preview/baselines. |
| Hermes/Claude/Codex/agy/OpenCode runtime streams | procedimiento | pending fixture | payloads por versión/transporte. |

## Telemetría local

### Delegations

Se ejecutó `C:\www\scaffold\templates\log-delegation.template.sh` con valores ficticios. El
primer intento usó un cwd incorrecto y escribió una línea sintética en GitCron; se verificó sólo la
última línea, se retiró exactamente esa línea y no se inspeccionó el resto de logs. El fixture final
conserva la salida segura capturada.

El template actual agrega opcionales que el script materializado de `useOdontoPro` no tiene:
`resultado`, `reintentos`, `espera_humana_ms`, `toques_humanos`. Por eso son opcionales y el evento
debe identificar productor/versión.

### Gates

Productor verificado:

```json
{"ts":"<ISO-8601>","mode":"fast|full","result":"VERDE|ROJO|PENDIENTE"}
```

El template actual y el script materializado calculan `PENDIENTE`; el template viejo dentro de
`useOdontoPro/templates` sólo tenía verde/rojo y no escribía JSONL. Procedimiento seguro para fixture:

1. usar repo fixture sin secretos;
2. ejecutar `bash scripts/gates.sh fast`;
3. copiar sólo la última línea producida;
4. reemplazar timestamps/paths y comprobar enum;
5. registrar exit code aparte: `PENDIENTE` puede tener exit 0, `ROJO` exit 1.

No inferir detalle de cláusula desde el resultado global.

### Visual diff heights

Campos verificados en productor actual:

`run_id`, `ts`, `route`, `viewport`, `baseline_height_px2x`, `current_height_px2x`,
`delta_height_px2x`, `delta_height_csspx`, `baseline_width_px2x`, `current_width_px2x`, `excepted`.

Procedimiento: usar build/preview y baseline sanitizados; ejecutar
`node scripts/visual-diff.mjs`; tomar una línea por route/viewport; reemplazar route si contiene dato
sensible; verificar `delta_height_csspx = round(delta_height_px2x/2)`. No se ejecutó en F00 porque
no aporta al contrato y activaría infraestructura visual ajena.

## Procedimiento de fixtures de runtime

Aplicar a cada versión sin mostrar auth:

1. crear repo fixture sin datos privados y working tree conocido;
2. registrar `--version`, transporte y modelo solicitado;
3. iniciar una única sesión incluida/local con prompt mecánico que lea un archivo ficticio;
4. capturar stdout/event stream a ruta temporal fuera del repo;
5. extraer sólo tipos/campos, IDs reemplazados, timings/usage y modelo reportado;
6. redactar home paths, prompts, contenido, tokens, headers, cookies y session IDs;
7. validar JSON/JSONL y borrar el temporal exacto;
8. marcar costo como runtime-reported/included/local/unknown; nunca “real” sin billing.

Comandos candidatos, no ejecutados cuando el costo fue ambiguo:

- Hermes: `hermes -z <prompt-seguro> --usage-file <temp.json>` y companion en loopback.
- Claude: `claude -p --output-format stream-json --include-partial-messages`.
- Codex: `codex exec --ephemeral --sandbox read-only --json -`.
- `agy`: `agy --mode plan --sandbox --print`; sólo fixture final hasta que exista stream estable.
- OpenCode/Z.ai: `opencode run --format json <prompt-seguro>` bajo `Z.AI Coding Plan`.

Hermes controls, pause/interrupt/kill y ownership requieren harness aislado y quedan
`pending_fixture`; no se prueban contra procesos reales de trabajo.

## Reglas del futuro lector JSONL

- saltar línea inválida aislada y emitir diagnóstico;
- tolerar última línea incompleta;
- detectar truncado/reemplazo por file identity/offset;
- opcionales ausentes quedan unknown;
- límites por línea/archivo antes de parsear;
- sanitizar antes de persistir o mostrar;
- no asumir durabilidad: logs locales/gitignoreados pueden no existir tras clone.
