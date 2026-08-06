## 1. El parser reconoce los seis niveles

- [x] 1.1 Reemplazar las tres comparaciones de prefijo por una expresión que cuente de una a seis almohadillas y guarde el nivel en el bloque
- [x] 1.2 Mapear el nivel del documento al de la página corrido dos posiciones, sin pasarse del último disponible
- [x] 1.3 Verificar que los tres niveles que ya funcionaban producen los mismos elementos que antes

## 2. Las listas se ven como listas

- [x] 2.1 Declarar el marcador en `.pipeline-markdown__list`, sin tocar el reajuste global de la aplicación
- [x] 2.2 Dar tamaño y peso a los niveles de encabezado nuevos

## 3. Cobertura

- [x] 3.1 Test de que un encabezado de cuatro almohadillas se renderiza como encabezado y no como texto
- [x] 3.2 Test de que los niveles del documento encajan en la página sin saltos
- [x] 3.3 Test de que una lista conserva sus ítems

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real: **101 archivos / 736 tests, verde en dos corridas seguidas** con el entorno de desarrollo apagado. Con `electron:dev` encima caían de cinco a siete archivos, siempre por `Test timed out in 5000ms` y nunca por aserción — era carga, confirmado.
- [x] 4.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 4.4 Dejar `openspec validate render-openspec-markdown --strict` válido
- [x] 4.5 Ale valida abriendo una spec con escenarios y marca esta casilla: que se lea como documento y no como fuente
