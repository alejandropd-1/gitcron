## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo y `pnpm exec tsc --noEmit` en cero
- [x] 1.2 Recuperar la medición que funda el principio: ocho de dieciséis reglas duplicaban lo que el CLI
      entrega, retiradas en `prune-duplicated-rules`
- [x] 1.3 Recuperar el caso que lo hace necesario: `carry-task-form-in-config` agregó reglas para un
      problema que era otro —un ejecutor sin sus archivos instalados—

## 2. La declaración

- [x] 2.1 Escribir en `AGENTS.md` que la base es OpenSpec y que sus instrucciones no se duplican
- [x] 2.2 Declarar cómo se comprueba: contrastar con `openspec instructions` antes de escribir una regla
- [x] 2.3 Declarar el límite: OpenSpec es una implementación, no un estándar ratificado, así que ceder es
      el comportamiento por defecto y no un acto de fe
- [x] 2.4 Mencionarlo en `openspec/config.yaml` remitiendo a `AGENTS.md`, sin copiar el texto
- [x] 2.5 Declarar que ninguna regla se escribe sin aprobación explícita, y que proponerla sí se puede:
      una regla obliga a todo el que venga después, y así se acumularon las ocho que hubo que retirar

## 3. Cierre

- [x] 3.1 Comprobar por el canal que la mención sale con `openspec instructions`
- [x] 3.2 `pnpm exec tsc --noEmit` en cero
- [x] 3.3 `pnpm test` en verde: 108 archivos / 780 tests, sin variación —no se tocó código—
- [x] 3.4 `openspec validate found-method-on-openspec --strict` válido
- [x] 3.5 Reporte en `docs/reports/2026-08-07-found-method-on-openspec.md`
- [x] 3.6 Ale confirma que la redacción dice lo que quiere declarar, y en particular que el límite está
      donde corresponde
