## 1. Base y sondas

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Ruta A descartada por medición: cada commit cubre entre 7 y 15 tareas —3/30, 2/25, 4/22—, así
      que nombrar una sola tarea es precisión falsa
- [x] 1.3 Ruta B descartada por medición: los tres commits reales tocan todas las secciones de
      `tasks.md`, así que nombrarlas no discrimina nada
- [x] 1.4 Comprobado con un commit real: gemma-4-12b devolvió
      `feat(pipeline): implementar la atribución de archivos a cambios`, acertando el tipo
- [x] 1.5 Medido: 4.649 tokens de prompt para 12k caracteres de diff; 25–47 s con un 12B; un 27B con
      razonamiento superó los 240 s y hubo que abortarlo
- [x] 1.6 Medido: con 200 y con 1.200 tokens de techo la respuesta llega vacía con `finish_reason=length`
      por el razonamiento. Con 3.000 sale el contenido. `enable_thinking: false` fue ignorado
- [x] 1.7 Medido: `loaded_context_length` (65536, 69120) no es `max_context_length` (262144). Y con LM
      Link el catálogo mezcla dispositivos: casi todo vive en `Ale-CasaNew`
- [x] 1.8 Comprobado que `lms load -c --ttl --estimate-only` existe, que `lms` es `.exe` —`execFile` sin
      shell— y que no hace falta ninguna dependencia nueva
- [ ] 1.9 Medir la calidad con más de un modelo y más de un commit: cuántas veces acierta el tipo. Es el
      valor entero de la función y hoy hay una sola prueba

## 2. Proveedor local

- [ ] 2.1 Proveedor con endpoint configurable, hermano del de Cartografía, que hoy tiene `localhost:1234`
      escrito en el código
- [ ] 2.2 Leer el catálogo con estado, contexto cargado y dispositivo por modelo
- [ ] 2.3 Distinguir `loaded_context_length` de `max_context_length` en el tipo, no sólo en la vista
- [ ] 2.4 Tratar `finish_reason=length` sin contenido como «no contestó», con su propio resultado
- [ ] 2.5 Que el servidor caído degrade con un motivo legible y no con una excepción cruda
- [ ] 2.6 Cargar un modelo con `lms load -c <contexto> --ttl`, validando la clave contra el catálogo antes
      de que llegue al proceso
- [ ] 2.7 Declarar el costo con `--estimate-only` antes de cargar

## 3. Composición del pedido

- [ ] 3.1 Armar la entrada con el diff de lo elegido, el cambio, su intención y las tareas cerradas
- [ ] 3.2 Acotar el diff al presupuesto del contexto cargado, declarando cuando se recorta
- [ ] 3.3 Presupuesto de tokens que contemple el razonamiento, con el número medido como piso
- [ ] 3.4 Que la respuesta se valide contra la forma esperada —una línea, prefijo convencional— y que una
      respuesta que no la cumpla no se imponga en el campo

## 4. Panel

- [ ] 4.1 Selector de modelo con estado, contexto y dispositivo a la vista
- [ ] 4.2 Acción explícita para redactar, con estado visible y cancelación
- [ ] 4.3 Rotular el mensaje como redactado por el modelo, nombrándolo
- [ ] 4.4 Comprobar que no pisa lo que una persona escribió
- [ ] 4.5 Declarar el contexto insuficiente antes de intentar la redacción
- [ ] 4.6 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 5. Tests

- [ ] 5.1 Prueba del proveedor con respuestas de tabla: contenido, vacío por `length`, servidor caído
- [ ] 5.2 Prueba: la clave del modelo que no está en el catálogo no llega al proceso
- [ ] 5.3 Prueba del panel: el mensaje redactado se muestra rotulado con el modelo
- [ ] 5.4 Prueba del panel: lo escrito por una persona no se pisa
- [ ] 5.5 Prueba: sin modelo disponible, la sugerencia es exactamente la de hoy
- [ ] 5.6 Comprobar que sigue pasando `pipeline-prepare-commit.test.tsx` sin tocarlo

## 6. Cierre

- [ ] 6.1 `pnpm exec tsc --noEmit` en cero
- [ ] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.4 `openspec validate draft-commit-message-with-local-ai --strict` válido
- [ ] 6.5 Reporte en `docs/reports/`, con las mediciones y la calidad de 1.9
- [ ] 6.6 Ale valida que ningún mensaje redactado se lea como verificado por la aplicación
