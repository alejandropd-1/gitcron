# Ofrecer los runtimes que están instalados

## Why

El desplegable de runtime ofrece **sólo Claude**, con `codex` y `opencode` instalados, resueltos
en el `PATH` y declarados lanzables por su propio adaptador. La spec consolidada
`pipeline-runtime-capabilities` ya dice lo que debería pasar —«Un runtime SHALL ser lanzable
cuando el adaptador lo declara lanzable y el binario está instalado»— y también qué hacer cuando
no lo es: «se lista con su motivo». Hoy no pasa ni una cosa ni la otra: no se ofrecen y tampoco
aparecen con una razón. El resultado es que la aplicación aparenta soportar un solo runtime.

Medición del 2026-09-03, `electron/pipeline/runtime/runtime-session-hub.ts:91`:

| Runtime | `launchable` en el registro | Resuelto en el `PATH` | ¿Aparece en el desplegable? |
|---|---|---|---|
| `claude` | `true` | sí | sí |
| `codex` | `true` | sí | **no** |
| `opencode` | `true` | sí | **no** |
| `agy` | `false` | sí | aparece con su diagnóstico |

`agy` en `false` es deliberado y queda fuera de alcance: es `make-agy-launchable`. El problema son
los otros dos. La línea 178 del hub compone `launchable: entry.launchable && discovered...`, así
que lo que falla está en el descubrimiento, no en el registro.

## What Changes

- Medir por qué el descubrimiento no encuentra `codex` ni `opencode` cuando la aplicación corre,
  y dejar la causa escrita antes de tocar nada.
- Ofrecer todo runtime instalado cuyo adaptador se declara lanzable.
- Cuando uno no se puede ofrecer, listarlo con el motivo medido, nunca omitirlo en silencio.
- Declarar cómo la aplicación resuelve un ejecutable de runtime, para que «instalado» signifique
  lo mismo en la spec, en el código y en pantalla.

## Capabilities

**Modified Capabilities**
- `pipeline-runtime-capabilities` — el requisito «Lanzabilidad basada en instalación, no en
  fixture» declara la condición de lanzamiento pero no dice cómo se establece que el binario está
  instalado, que es justo donde falla. Se agrega ese escenario.

**New Capabilities**
- Ninguna.

## Impact

- `electron/pipeline/runtime/runtime-session-hub.ts` — registro y descubrimiento.
- Los adaptadores de `codex` y `opencode` y su resolución de ejecutable.
- La superficie de arranque que hoy sólo muestra Claude.
- Sin dependencias nuevas. Sin cambios en el protocolo de sesión.
