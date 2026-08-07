## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (106 archivos / 777 tests antes de tocar nada)
- [x] 1.2 Confirmar la versión real de Electron en vez de suponerla: `42.0.1`, declarada e instalada
- [x] 1.3 Confirmar que no existe `CLAUDE.md` en el repositorio, así que `AGENTS.md` es el archivo que
      las herramientas van a encontrar

## 2. La política

- [x] 2.1 Escribir en `AGENTS.md` que la aplicación corre sobre Electron 42 y empaqueta su propio Chromium
- [x] 2.2 Declarar que una función del navegador ya disponible de forma amplia se usa sin respaldo, con
      el motivo: un respaldo por las dudas es código que nunca se ejecuta y hay que mantener
- [x] 2.3 Declarar qué **no** habilita: funciones experimentales o detrás de banderas, y reescribir
      código que ya funciona
- [x] 2.4 Nombrar la versión y decir cuándo revisar la declaración

## 3. El canal

- [x] 3.1 Mencionar la política en `openspec/config.yaml`, remitiendo a `AGENTS.md` sin copiar el texto
- [x] 3.2 Explicar en la mención por qué vive allá y no en el canal: las herramientas que responden
      consultas sobre prácticas web buscan la política en ese archivo
- [x] 3.3 Comprobar con `openspec instructions design --change declare-electron-runtime-policy --json`
      que la mención sale efectivamente por el canal

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde, con el conteo comparado contra la base de 1.1
- [x] 4.3 `openspec validate declare-electron-runtime-policy --strict` válido
- [x] 4.4 Reporte en `docs/reports/2026-08-07-declare-electron-runtime-policy.md`
- [x] 4.5 Ale confirma que la redacción declara lo que quiere declarar, y en particular que el límite
      está donde corresponde
