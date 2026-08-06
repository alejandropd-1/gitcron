## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
      (101 archivos / 736 tests)
- [x] 1.2 Registrar el estado de partida: `git branch --list "change/*"` da 0 sobre 35 ramas locales

## 2. La regla en el canal

- [x] 2.1 Escribir la regla en `openspec/config.yaml`. Va en `context` y no en `rules.proposal`: el CLI
      entrega `context` con cualquier artefacto que se pida, mientras que `rules` sólo viaja con el
      artefacto al que pertenece, y la rama se crea antes de escribir el primero
- [x] 2.2 Incluir el mando concreto de creación y el criterio para cuando la rama ya existe
- [x] 2.3 Comprobar con `openspec instructions tasks --change carry-branch-rule-in-config --json` —un
      artefacto que no es el primero— que la regla sale efectivamente por el canal

## 3. AGENTS.md

- [x] 3.1 Remitir al canal desde `AGENTS.md` sin duplicar la regla, coherente con lo que ese archivo declara

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 101 archivos / 736 tests, dos corridas en esta tanda, mismo conteo que
      la base. No se tocó código, así que la suite no podía moverse
- [x] 4.3 `openspec validate carry-branch-rule-in-config --strict` válido
- [x] 4.4 Reporte en `docs/reports/2026-08-06-carry-branch-rule-in-config.md`, con la salida del CLI
- [x] 4.5 Ale confirmó la redacción, con un ajuste: la regla no debe leerse como una atadura. Se quitó
      el cierre defensivo y se dejó que crear la rama es parte de abrir el cambio, no algo que haya que
      pedir. Commit y push siguen siendo de Ale, por decisión suya del 2026-08-06
