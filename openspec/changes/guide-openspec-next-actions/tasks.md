## 1. Base verificada

- [x] 1.1 Confirmar rama, HEAD limpio y `pwsh -NoProfile -File scripts/gates.ps1 fast` en VERDE antes de editar
- [x] 1.2 Verificar contra el CLI la regla exacta de slug que acepta `openspec new change` y fijarla en una constante única

## 2. Derivación pura del siguiente paso

- [x] 2.1 Crear `components/pipeline/pipeline-next-action.ts` con el tipo `PipelineNextAction` como unión discriminada por `kind`
- [x] 2.2 Implementar `derivePipelineNextAction` con el orden de prioridad de D2, devolviendo en el primer acierto
- [x] 2.3 Marcar cada acción con si es ejecutable, para que el render no vuelva a decidirlo
- [x] 2.4 Escribir una prueba por fila de la matriz de estados
- [x] 2.5 Probar la resolución de estados superpuestos según el orden declarado
- [x] 2.6 Probar que con fixture la derivación nunca devuelve una acción ejecutable
- [x] 2.7 Probar que validación fallida no habilita archivar y que sin cambio activo se distinguen Explore y Propose

## 3. Corrección del bloqueo por fixture

- [x] 3.1 Propagar `fixtureActive` de `PipelineWorkspace` a `OpenSpecDashboard`
- [x] 3.2 Pasar `blockedByFixture` desde `OpenSpecDashboard` a `PipelineRuntimeLauncher`
- [ ] 3.3 Probar que con fixture activo el lanzador queda bloqueado y no puede iniciar sesión real

## 4. Componente de guía

- [x] 4.1 Crear `PipelineNextStepGuide.tsx` que renderice el resultado de la derivación sin lógica de decisión propia
- [x] 4.2 Ubicarlo bajo el encabezado/lifecycle y antes de las pestañas Trabajo/Actividad
- [x] 4.3 Respetar el tope estructural: etiqueta, título, una frase, acción primaria, secundaria condicional
- [x] 4.4 Poner instrucción y detalles técnicos bajo `Ver instrucción` con divulgación progresiva
- [x] 4.5 Cubrir los estados sin cambio activo y cambio archivado en el área principal existente

## 5. Flujo guiado Explore y Propose

- [x] 5.1 Crear `PipelineNewChangeFlow.tsx` con el paso de elección de intención
- [x] 5.2 Implementar el formulario de Propose con objetivo requerido, slug validado y restricciones opcionales
- [x] 5.3 Implementar el paso de Explore con una sola descripción y `changeId` nulo
- [x] 5.4 Componer las instrucciones exactas de Propose y Explore, omitiendo líneas vacías
- [x] 5.5 Asociar errores a su campo con anuncio accesible y foco correcto
- [x] 5.6 Probar objetivo requerido, slug válido e inválido, instrucciones exactas y restricciones vacías

## 6. Lanzador en modo controlado

- [x] 6.1 Agregar a `PipelineRuntimeLauncher` las props opcionales de etiqueta de CTA y callback de arranque, sin alterar su comportamiento por defecto
- [x] 6.2 Mostrar runtime, versión y disponibilidad antes del CTA final
- [x] 6.3 Dejar la edición avanzada de la instrucción bajo divulgación progresiva
- [x] 6.4 Mostrar diagnósticos reales por runtime cuando ninguno es lanzable, con forma de reintentar la comprobación
- [x] 6.5 Probar que no se inicia con runtime no lanzable y que no se duplican sesiones

## 7. Continuación, resultado y refresco

- [x] 7.1 Componer la instrucción de Apply conservando `changeId` y `taskId` reales
- [x] 7.2 Exponer el refresco existente (`reloadToken`) de `PipelineWorkspace` al dashboard como callback
- [x] 7.3 Releer el progreso desde `tasks.md` al cerrar la sesión, sin inferir éxito por proceso terminado
- [x] 7.4 Informar el caso sesión terminada con tarea aún pendiente y ofrecer reintento con la misma instrucción
- [x] 7.5 Seleccionar el cambio recién creado sólo cuando pueda identificarse de forma verificable
- [x] 7.6 Dejar la sesión nueva seleccionada en Actividad mientras está activa
- [ ] 7.7 Probar continuación con contexto conservado, cierre que refresca evidencia y persistencia de sesión tras reinicio

## 8. i18n y accesibilidad

- [x] 8.1 Agregar todas las strings nuevas a `lib/i18n.ts` en ES, EN y ZH
- [x] 8.2 Verificar etiquetas, roles, foco y anuncio de errores en la guía y el formulario
- [x] 8.3 Reutilizar tokens, iconos, focus styles y container queries existentes, sin dependencias nuevas

## 9. Cierre

- [x] 9.1 `pnpm exec tsc --noEmit` en cero
- [x] 9.2 `pnpm test` verde con las pruebas nuevas incluidas
- [x] 9.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 9.4 `pnpm run package:build` correcto
- [x] 9.5 `pwsh -NoProfile -File scripts/gates.ps1 fast` y luego `full`, declarando PENDIENTE sin presentarlo como verde
- [ ] 9.6 QA visual en Electron real en dos anchos y con ambos sidebars abiertos y cerrados
- [x] 9.7 Escribir el reporte en `docs/reports/` con lo tocado, lo no tocado y evidencia de gates
- [x] 9.8 Frenar antes de staging, commit y push; entregar a Ale
