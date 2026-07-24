# Pipeline F03 — CHECKPOINT 1 · Claude Code y Codex

Fecha: `2026-07-24`
Orquestador/builder: `Codex Desktop / Codex / direct`

## Resultado

- Runner main-only con executable/args separados, `shell: false`, cwd realpath equivalente, entorno mínimo, stdin acotado, ownership interno, timeout, AbortSignal, límites independientes y cleanup esperado.
- Decoder JSONL incremental con `StringDecoder`, parciales UTF-8, última línea sin newline, líneas inválidas aisladas y límites de línea/stream/eventos.
- Adapter Claude sobre `stream-json` y adapter Codex sobre `exec --json`, ambos read-only en F03 y sin IPC/control público.
- Parsers ligados a versión exacta de fixture: una versión instalada diferente degrada a `pending_fixture` y no inicia el parser viejo.
- Procedencia separada: eventos CLI `runtime`; lifecycle medido del proceso `derived`.

## Capturas reales sanitizadas

| Runtime | Versión | Resultado | Eventos crudos | Exit | Usage/costo |
|---|---|---|---:|---:|---|
| Claude Code | `2.1.206` | Respuesta ficticia exacta | 33 | 0 | input 1.280, output 187, cache-create 163.478; USD 0,988127 runtime-reported, billing unknown. |
| Codex CLI | `0.143.0` | Respuesta ficticia exacta; tool read-only falló y quedó como evidencia | 8 | 0 | input 41.220, cache 20.224, output 252, reasoning tokens 141; costo/contexto/modelo unknown. |

Claude requirió dos intentos de harness. El primero terminó antes de inferencia porque flags variádicos absorbieron el prompt. El segundo fue exitoso pero reportó una creación de cache desproporcionada; no se repitió la llamada.

## Seguridad y límites

- La instrucción viaja por stdin, no por argv.
- Los eventos de tools omiten command, output, paths e inputs crudos.
- Reasoning sólo se marca `emitted` para deltas/blocks explícitos de Claude; los reasoning tokens de Codex no se convierten en texto.
- Los crudos vivieron en un directorio temporal ficticio fuera del repo y se eliminaron después de crear fixtures curados.
- No se agregó dependencia, SQLite, preload, IPC, renderer, UI ni CSS.

## Validación focalizada

- `pnpm exec tsc --noEmit`: exit 0.
- 5 archivos focalizados, 25 tests: verde.
- Fixtures JSON/JSONL parseables y sin paths de usuario, auth, bearer, cookies o API keys.
