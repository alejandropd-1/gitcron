## 1. Auditoría

- [x] 1.1 Traer la `instruction` de OpenSpec para `proposal`, `design`, `specs` y `tasks` con
      `openspec instructions <artefacto> --json`
- [x] 1.2 Contrastar las dieciséis reglas del proyecto contra esas instrucciones, una por una
- [x] 1.3 Registrar cuáles duplican: seis. Formato de tareas, casilla verificable, cuatro almohadillas,
      MODIFIED con bloque entero, alternativa por decisión, riesgo con mitigación
- [x] 1.4 Comprobar si alguna **contradice** a OpenSpec: ninguna. Hay una tensión, no contradicción,
      entre «prosa densa» y el «Keep it concise (1-2 pages)» de la instrucción de propuesta
- [x] 1.5 Ale revisó la lista y decidió qué sacar, incluidas dos que no duplicaban pero nacieron de un
      diagnóstico equivocado

## 2. Poda

- [x] 2.1 Retirar las seis reglas duplicadas
- [x] 2.2 Retirar «no agregar marcas propias a las casillas» y «la forma rige al retro-documentar»:
      nacieron del ejecutor sin skill instalada, que es un problema de instalación y no de reglas
- [x] 2.3 Conservar las once que dicen algo que OpenSpec no dice
- [x] 2.4 Declarar el criterio en el propio archivo, para que la próxima regla se mida antes de escribirse

## 3. Comprobación

- [x] 3.1 Confirmar por el canal que quedan las esperadas: `tasks` 3, `proposal` 4, `specs` 3, `design` 1
- [x] 3.2 Ale confirmó las once reglas que quedan, incluida la de quién marca una validación humana

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 107 archivos / 779 tests, sin variación —no se tocó código—
- [x] 4.3 `openspec validate prune-duplicated-rules --strict` válido
- [x] 4.4 Reporte en `docs/reports/2026-08-07-prune-duplicated-rules.md`, con la comparación regla por regla
