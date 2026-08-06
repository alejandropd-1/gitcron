## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Medir el peso actual del snapshot en un repositorio real, para poder comparar después

## 2. Contrato y lectura

- [ ] 2.1 Agregar el campo de contenido a `OpenSpecSpecificationEvidence` en `types/pipeline/index.ts`
- [ ] 2.2 Conservar el contenido leído en `repo-evidence-reader.ts` en vez de descartarlo tras contar
      requisitos, con `maxBytes` explícito
- [ ] 2.3 Dejar `null` cuando la lectura falle, distinguido del archivo vacío, con su diagnóstico

## 3. Panel

- [ ] 3.1 Renderizar cada especificación de la barra lateral como botón, no como `<div>`
- [ ] 3.2 Mostrar la especificación elegida en el visor de artefactos, reutilizando el renderizador de markdown
- [ ] 3.3 Mostrar el caso sin contenido sin dejar el visor en blanco

## 4. Tests

- [ ] 4.1 Prueba del lector: la evidencia incluye el contenido de la especificación
- [ ] 4.2 Prueba del lector: archivo ilegible → contenido `null` y diagnóstico
- [ ] 4.3 Prueba del panel: elegir una especificación muestra su contenido renderizado

## 5. Cierre

- [ ] 5.1 Volver a medir el peso del snapshot y reportar la diferencia real contra 1.2
- [ ] 5.2 `pnpm exec tsc --noEmit` en cero
- [ ] 5.3 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 5.4 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 5.5 `openspec validate read-specification-contents --strict` válido
- [ ] 5.6 Reporte en `docs/reports/`
- [ ] 5.7 Ale valida en la aplicación que puede abrir y leer una especificación consolidada
