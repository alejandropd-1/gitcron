## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Medir cuánto pesarían las especificaciones en el snapshot antes de decidir cómo transportarlas:
      145 KB en quince archivos, con `pipeline-guided-workflow` en 84,9 KB
- [x] 1.3 Corregir la propuesta y escribir `design.md` con la decisión que sale de esa medición: lectura
      bajo demanda en vez de sumarlas al snapshot
- [ ] 1.4 Confirmar en el código que el lector ya descarta el contenido tras contar requisitos, y que ese
      conteo no se toca

## 2. Canal de lectura

- [ ] 2.1 Agregar el canal que devuelve el contenido de una especificación por su identificador
- [ ] 2.2 Validar el identificador contra `/^[a-z0-9][a-z0-9-]*$/` antes de tocar el disco
- [ ] 2.3 Componer la ruta en el proceso principal y resolverla contenida al repositorio
- [ ] 2.4 Aplicar un límite de tamaño explícito en la lectura
- [ ] 2.5 Distinguir en la respuesta el contenido leído, el archivo vacío y el fallo
- [ ] 2.6 Exponer el canal en el preload, sin exponer rutas

## 3. Panel

- [ ] 3.1 Renderizar cada especificación de la barra lateral como botón, no como `<div>`
- [ ] 3.2 Pedir el contenido al abrirla y mostrarlo en el visor de artefactos, reutilizando el
      renderizador de markdown
- [ ] 3.3 Mostrar el estado de carga con la misma reserva de espacio que ya usan los artefactos de un
      archivado, para que la vista no salte
- [ ] 3.4 Mostrar el fallo con su motivo, sin dejar el visor en blanco
- [ ] 3.5 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 4. Tests

- [ ] 4.1 Prueba: especificación legible devuelve su contenido
- [ ] 4.2 Prueba: archivo vacío se distingue de un fallo de lectura
- [ ] 4.3 Prueba: identificador fuera del alfabeto se rechaza sin tocar el disco
- [ ] 4.4 Prueba: un identificador que intenta escapar del repositorio se rechaza
- [ ] 4.5 Prueba del panel: elegir una especificación muestra su contenido renderizado
- [ ] 4.6 Comprobar que el snapshot no engordó: la evidencia de especificaciones sigue sin contenido

## 5. Cierre

- [ ] 5.1 `pnpm exec tsc --noEmit` en cero
- [ ] 5.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base de 1.1
- [ ] 5.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 5.4 `openspec validate read-specification-contents --strict` válido
- [ ] 5.5 Reporte en `docs/reports/`, con la medición de 1.2 y la decisión que produjo
- [ ] 5.6 Ale valida en la aplicación que puede abrir y leer una especificación consolidada
