## 1. Derivación pura

- [x] 1.1 Crear el módulo que, dado el identificador del cambio y los archivos modificados, devuelve cuáles pertenecen al cambio y cuáles quedan fuera
- [x] 1.2 Derivar el alcance del mensaje del segmento común de los directorios tocados, omitiéndolo cuando no hay uno común
- [x] 1.3 Componer el mensaje sugerido como `<tipo>(<alcance>): <identificador>`, con `chore` como tipo
- [x] 1.4 Devolver la sugerencia sólo cuando el campo de commit está vacío, para no pisar lo que alguien escribió

## 2. Preparación desde la guía

- [x] 2.1 Ofrecer la preparación en el panel sólo cuando el cambio tiene archivos modificados
- [x] 2.2 Al pedirla, preparar los archivos del cambio con `stageFiles` y escribir el mensaje con `setCommitMessage`
- [x] 2.3 Mostrar los modificados que quedan fuera, y permitir sumarlos uno por uno antes de preparar
- [x] 2.4 Verificar que la guía no ejecuta el commit: confirmar sigue siendo del flujo existente

## 3. Cobertura

- [x] 3.1 Test: los archivos del cambio se derivan del identificador, y los de otro cambio quedan fuera
- [x] 3.2 Test: el alcance sale del directorio común, y se omite cuando los directorios son dispares
- [x] 3.3 Test: el mensaje sugerido tiene la forma esperada para un cambio típico
- [x] 3.4 Test: con el campo de commit ya escrito, la sugerencia no lo reemplaza
- [ ] 3.5 Test: preparar deja archivos y mensaje listos y no llama a confirmar

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate confirm-work-in-git --strict` válido
- [ ] 4.5 Ale comprueba con la aplicación que preparar deja el commit listo y que confirmar sigue siendo suyo
