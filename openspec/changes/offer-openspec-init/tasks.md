## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Ale confirma la decisión de `design.md`: la aplicación ejecuta `openspec init`, en vez de
      entregar el mando para correrlo a mano
- [ ] 1.3 Rehacer la sonda sobre un repositorio de prueba sin `openspec/` y registrar la salida real de
      `openspec new change` + `openspec instructions` sin `init`
- [ ] 1.4 Registrar qué archivos escribe `openspec init` en un repositorio limpio, para poder enumerarlos
- [ ] 1.5 Registrar cómo queda el `config.yaml` recién inicializado, para probar que sale sin reglas
- [ ] 1.6 Ale aprueba el juego de reglas base que se va a sembrar, antes de escribirlo en repos ajenos

## 2. Evidencia

- [ ] 2.1 Distinguir en el lector "sin `openspec/`" de "con `openspec/` y sin cambios activos"
- [ ] 2.2 Transportar esa distinción en el snapshot, sin que la vista tenga que inferirla de contadores

## 3. Reglas base

- [ ] 3.1 Redactar el juego mínimo de reglas base, genérico y sin contexto de gitCronos
- [ ] 3.2 Incluir la numeración jerárquica de tareas y la redacción autosuficiente
- [ ] 3.3 Sembrarlas en el `config.yaml` como parte de la inicialización
- [ ] 3.4 Comprobar sobre un repositorio de prueba que `openspec instructions` devuelve esas reglas
      después de inicializar, y pegar la salida en el reporte

## 4. Panel

- [ ] 4.1 Declarar el estado sin OpenSpec en la pantalla de arranque, con su consecuencia nombrada
- [ ] 4.2 Ofrecer la acción de inicializar, enumerando antes los archivos que se van a escribir
- [ ] 4.3 Exigir acción humana explícita, sin preselección ni disparo automático
- [ ] 4.4 Informar el error real si la inicialización falla, sin normalizarlo, y releer la evidencia

## 5. Tests

- [ ] 5.1 Prueba del lector: repositorio sin `openspec/` → estado distinguible del vacío
- [ ] 5.2 Prueba del panel: estado sin OpenSpec declara su consecuencia y ofrece inicializar
- [ ] 5.3 Prueba del panel: repositorio con OpenSpec y sin cambios activos no ofrece inicializar
- [ ] 5.4 Prueba: nada se escribe sin la acción humana
- [ ] 5.5 Prueba: fallo de inicialización informa el motivo real
- [ ] 5.6 Prueba: la inicialización deja el `config.yaml` con reglas, no vacío

## 6. Cierre

- [ ] 6.1 `pnpm exec tsc --noEmit` en cero
- [ ] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.4 `openspec validate offer-openspec-init --strict` válido
- [ ] 6.5 Reporte en `docs/reports/`, con las salidas de las sondas de 1.3, 1.5 y 3.4 como evidencia
- [ ] 6.6 Ale valida abriendo un repositorio sin OpenSpec y llegando a inicializarlo con reglas
