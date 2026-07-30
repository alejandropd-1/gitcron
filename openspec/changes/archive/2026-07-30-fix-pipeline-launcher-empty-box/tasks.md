## 1. Base verificada

- [x] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde, y registrar el conteo de pruebas de partida
- [x] 1.2 Confirmar que el síntoma (panel con marco vacío mientras `discover` no resolvió) se reproduce leyendo el código del launcher y el panel contenedor

## 2. Estado de carga del launcher

- [x] 2.1 Reemplazar `if (!discovery) return null` por una rama que renderice un estado de carga accionable (mensaje + reintentar) mientras `discover` no resolvió
- [x] 2.2 Agregar la clave i18n `pipeline.launcher.discovering` en ES, EN y ZH
- [x] 2.3 Hacer que el panel contenedor `.launcherPanel` no pinte su marco cuando el launcher está cargando, para no ofrecer un cajón vacío
- [x] 2.4 Prueba: al montar el launcher con `discovery === null` no se renderiza un panel con marco vacío, y aparece el estado de carga

## 3. Remontaje estable

- [x] 3.1 Evaluar cambiar el `key` del launcher para que un cambio de tarea no fuerce un remontaje y un reseteo de `discovery`
- [x] 3.2 Si la conversión de `initialInstruction` a prop controlada añade superficie, descartar 3.1 y dejar el `key` actual (2.x ya resuelve el síntoma)

## 4. Limpieza del diagnóstico de scaffold

- [x] 4.1 Reescribir el diagnóstico de `repo-evidence-reader.ts` que dice "no tiene scaffold" para describir la causa real sin nombrar andamiaje retirado
- [x] 4.2 Buscar y, si existen, actualizar tests que asertan el string anterior

## 5. Retiro de sección de AGENTS.md

- [x] 5.1 Retirar de `AGENTS.md` la sección "Honestidad de la evidencia" íntegramente
- [x] 5.2 Verificar que no queden referencias rotas a esa sección en otros docs

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde, con la diferencia de conteo justificada
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate fix-pipeline-launcher-empty-box --strict` válido
- [x] 6.5 Reporte en `docs/reports/`
- [ ] 6.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
