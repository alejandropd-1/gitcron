## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Registrar el estado de partida: `git branch --list "change/*"` y el total de ramas locales

## 2. La regla en el canal

- [ ] 2.1 Escribir la regla en `openspec/config.yaml`, en el artefacto que el ejecutor pide al empezar
- [ ] 2.2 Incluir el mando concreto de creación y el criterio para cuando la rama ya existe
- [ ] 2.3 Comprobar con `openspec instructions <artefacto> --change carry-branch-rule-in-config --json`
      que la regla sale efectivamente por el canal, y pegar la salida en el reporte

## 3. AGENTS.md

- [ ] 3.1 Remitir al canal desde `AGENTS.md` sin duplicar la regla, coherente con lo que ese archivo declara

## 4. Cierre

- [ ] 4.1 `pnpm exec tsc --noEmit` en cero
- [ ] 4.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 4.3 `openspec validate carry-branch-rule-in-config --strict` válido
- [ ] 4.4 Reporte en `docs/reports/`, con la salida del CLI como evidencia de que la regla viaja
- [ ] 4.5 Ale confirma que la redacción de la regla es la que quiere que reciban los ejecutores
