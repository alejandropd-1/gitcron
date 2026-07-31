# Design — Capacidad `testing-harness` y limpieza de temporales

## Context

Dos problemas, uno técnico y uno de método.

**Técnico:** seis archivos de test crean directorios temporales con repositorios Git o bases
SQLite y los borran con `fs.rmSync(dir, { recursive: true, force: true })` en su `afterEach`. En
Windows eso choca contra handles todavía abiertos y tira `EBUSY`. Se manifestó en
`git-hunks-ipc.test.ts`, pero los seis tienen la misma exposición: los otros cinco pasaban por
suerte de scheduling.

**De método:** este trabajo no cambia comportamiento de producto, así que no modifica ningún spec
existente. Y un change sin deltas no valida en `--strict`:

> Change must have at least one delta. No deltas found.

Quedaba entonces la opción de dejarlo fuera de OpenSpec —trabajo sin registrar— o forzar un
requirement dentro de una capacidad de producto que no le corresponde. Ale eligió la tercera:
darle al arnés su propia capacidad.

## Goals / Non-Goals

**Goals**

- Que una prueba que pasó no pueda fallar por su propia limpieza.
- Que los seis archivos expuestos queden cubiertos, no sólo el que falló.
- Que el arnés de pruebas tenga dónde vivir en OpenSpec, con un límite claro.

**Non-Goals**

- No se cambia ninguna aserción ni se relaja ninguna comprobación.
- No se toca código de producto.
- No se declaran garantías del arnés que hoy no se cumplen. La capacidad nace con lo que es
  verdad y verificable, no con una lista de deseos.

## Decisions

### 1. Qué entra en `testing-harness` y qué no

El riesgo evidente de una capacidad así es volverse el cajón donde va a parar todo lo que no
encaja en otro lado. El límite es:

**Entra** — propiedades del arnés que determinan si su resultado es creíble: liberación de
recursos, aislamiento entre pruebas, determinismo frente a orden y concurrencia, honestidad del
reporte de resultados.

**No entra** — nada que se pueda observar usando la aplicación. Si un requirement se puede
comprobar abriendo GitCron, pertenece a una capacidad de producto, no acá. Tampoco entran
preferencias de estilo de tests, elección de framework, ni cobertura como número.

**Regla práctica:** si el requirement se pudiera romper sin que ningún usuario note nada, pero
haría que dejemos de confiar en un "verde", es de esta capacidad.

### 2. Reintento en la limpieza, no `try/catch` que traga

`fs.rm`/`fs.rmSync` aceptan `maxRetries` y `retryDelay`, y Node los aplica exactamente a los
errores de esta condición (`EBUSY`, `EMFILE`, `ENFILE`, `ENOTEMPTY`, `EPERM`). Se usa eso.

*Alternativa descartada:* envolver el borrado en `try {} catch {}`. Silencia el error pero deja el
directorio en disco, acumulando basura en `%TEMP%` corrida tras corrida, y ocultaría un problema
real de handles filtrados si alguna vez lo hubiera. El reintento resuelve la condición de carrera
sin tragarse nada: si después de diez intentos sigue fallando, falla y se ve.

*Alternativa descartada:* `await` de un `setTimeout` antes de borrar. Elige un número mágico que o
es demasiado corto —y sigue fallando— o demasiado largo, pagado por cada test de la suite.

### 3. Un helper compartido, no la opción repetida seis veces

`test-utils/temp-dir.ts` con `removeTempDir(target)`. El comentario explica la condición de
Windows una sola vez, y el próximo test que cree un repositorio temporal tiene qué usar sin tener
que redescubrir el problema. Vive fuera de `lib/` a propósito: es utilería de pruebas, no código
de la aplicación.

## Risks / Trade-offs

- **La capacidad se convierte en un cajón de sastre** → Mitigado con el límite explícito de la
  decisión 1, escrito acá para que se pueda citar al revisar un change futuro.
- **El reintento enmascara un handle realmente filtrado** → No lo enmascara: reintenta y, si el
  recurso nunca se libera, falla igual. Lo que deja de hacer es fallar por una carrera de
  milisegundos.
- **La segunda requirement (determinismo bajo concurrencia) es exigente** → Es la que hace
  explícito el defecto que ya nos mordió: se declaró la suite verde mientras existía una prueba
  que sólo fallaba bajo carga. Se deja escrita justamente para que eso no vuelva a pasar callado.

## Migration Plan

No hay migración. No cambia código de producto ni datos persistidos.

## Open Questions

Ninguna.
