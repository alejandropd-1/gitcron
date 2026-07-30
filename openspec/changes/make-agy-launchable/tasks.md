## 1. Base verificada

- [ ] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Confirmar cómo `agy` acepta una instrucción no interactiva (`agy --help`) para definir argv/stdin

## 2. Implementar start/events/shutdown

- [ ] 2.1 Implementar `start()`: spawn de `agy` con la instrucción, crear sesión con identidad
- [ ] 2.2 `events()`: drenar stdout/stderr como eventos de lifecycle + texto crudo; emitir `started`/`completed`/`failed`
- [ ] 2.3 `shutdown()`: matar el proceso vía AbortController (grace, como los demás adaptadores)
- [ ] 2.4 Descriptor: `session.start` como `available`, `events.stream` como `degraded` con constraint de observación gruesa

## 3. Hub

- [ ] 3.1 Cambiar `agy` a `launchable: true` y `modifiesRepo: true` en el hub

## 4. Tests

- [ ] 4.1 Prueba: `start()` ejecuta el proceso y `events()` emite lifecycle + texto
- [ ] 4.2 Prueba: `shutdown()` termina el proceso
- [ ] 4.3 Prueba: no se emiten deltas estructurados inventados (la salida cruda llega tal cual)

## 5. Cierre

- [ ] 5.1 `pnpm exec tsc --noEmit` en cero
- [ ] 5.2 `pnpm test` en verde, con la diferencia de conteo justificada
- [ ] 5.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 5.4 `openspec validate make-agy-launchable --strict` válido
- [ ] 5.5 Reporte en `docs/reports/`
- [ ] 5.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
