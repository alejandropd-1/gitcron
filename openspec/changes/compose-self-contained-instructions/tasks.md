## 1. Instrucciones autosuficientes

- [x] 1.1 Reescribir `composeApplyInstruction` para que nombre el cambio, la tarea y su texto, e indique consultar `openspec status` e `openspec instructions` antes de escribir
- [x] 1.2 Reescribir `composeProposeInstruction` para que indique crear el cambio con `openspec new change` y generar sus artefactos con `openspec instructions`, conservando objetivo y restricciones
- [x] 1.3 Reescribir `composeExploreInstruction` para que describa la exploración sin comprometer estructura, sin invocar un comando de extensión
- [x] 1.4 Verificar que ninguna de las tres empieza con `/`, y que `composeArchiveInstruction` queda intacta

## 2. Cobertura

- [x] 2.1 Actualizar los cuatro casos de `pipeline-next-action.test.ts` que fijan el texto con slash command
- [x] 2.2 Test: ninguna instrucción compuesta contiene un comando de extensión `/opsx:`
- [x] 2.3 Test: la instrucción de implementación nombra el cambio, el identificador de la tarea y su texto

## 3. Cierre

- [x] 3.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.2 `pnpm exec tsc --noEmit` en cero
- [x] 3.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 3.4 `openspec validate compose-self-contained-instructions --strict` válido
- [x] 3.5 Ale comprueba con la aplicación que "Continuar con la tarea" avanza con Claude, que antes fallaba
