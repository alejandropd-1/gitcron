## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (103 archivos / 759 tests antes de tocar nada)
- [x] 1.2 Medir cuánto pesarían las especificaciones en el snapshot antes de decidir cómo transportarlas:
      145 KB en quince archivos, con `pipeline-guided-workflow` en 84,9 KB
- [x] 1.3 Corregir la propuesta y escribir `design.md` con la decisión que sale de esa medición: lectura
      bajo demanda en vez de sumarlas al snapshot
- [x] 1.4 Confirmar que el lector sigue descartando el contenido tras contar requisitos, y que ese conteo
      no se toca

## 2. Canal de lectura

- [x] 2.1 Agregar `pipeline:read-specification` en `electron/ipc/pipeline-specs.ts`, en su propio módulo
      porque sólo lee
- [x] 2.2 Validar el identificador contra `/^[a-z0-9][a-z0-9-]*$/` antes de tocar el disco
- [x] 2.3 Componer la ruta en el proceso principal y resolverla contenida con `safeReadRepoFile`
- [x] 2.4 Aplicar un límite de 512 KB, con margen sobre los 84,9 KB de la más grande
- [x] 2.5 Devolver el motivo real del lector —`missing`, `rejected`, `too-large`— sin normalizarlo, y
      tratar el archivo vacío como contenido y no como fallo
- [x] 2.6 Exponer el canal en el preload y en `types/electron.d.ts`, recibiendo identificador y no ruta

## 3. Panel

- [x] 3.1 Renderizar cada especificación de la barra lateral como botón, con su estado seleccionado
- [x] 3.2 Pedir el contenido al abrirla y mostrarlo con `SafeMarkdown`
- [x] 3.3 Reservar el alto mientras carga, con el mismo criterio que los artefactos de un archivado
- [x] 3.4 Mostrar el fallo con su motivo y declarar el archivo vacío, sin dejar el visor en blanco
- [x] 3.5 Espaciar la vista con la escala `--sp-1..--sp-6` de `.dashboard`
- [x] 3.7 Dar a la vista `flex: 0 0 auto` para que tome su altura natural y empuje la franja de
      evidencia, en vez de encogerse y dejar que el texto la atraviese por detrás. Ale lo detectó
      probándolo con `pipeline-guided-workflow`, la más larga: la franja quedaba cortada a media
      pantalla con el markdown pasando por debajo
- [x] 3.6 Derivar el estado de carga de la identidad de la especificación en vez de marcarlo dentro del
      efecto, según lo que exige el linter, lo que además evita pintar el contenido de otra al cambiar

## 4. Tests

- [x] 4.1 Prueba: especificación legible devuelve su contenido
- [x] 4.2 Prueba: archivo vacío se distingue de un fallo de lectura
- [x] 4.3 Prueba: identificador fuera del alfabeto se rechaza sin llegar a resolver el repositorio
- [x] 4.4 Prueba: identificadores que intentan escapar del repositorio se rechazan
- [x] 4.5 Prueba del panel: elegir una especificación muestra su contenido renderizado y manda el
      identificador, no la ruta
- [x] 4.6 Prueba: la evidencia de especificaciones del snapshot sigue sin campo de contenido
- [x] 4.7 Prueba: elegir un cambio cierra la especificación abierta. Ale lo detectó probándolo: la
      especificación se quedaba en el centro y la barra lateral parecía no responder, sin más salida
      que "ver el repositorio". Se cierra también al abrir un artefacto, que es el otro camino que
      ocupa el centro

## 5. Cierre

- [x] 5.1 `pnpm exec tsc --noEmit` en cero
- [x] 5.2 `pnpm test` en verde: 105 archivos / 770 tests, cuatro corridas completas. Dos archivos y once
      tests más que la base, que son exactamente los agregados
- [x] 5.3 `pnpm exec eslint` limpio sobre los nueve archivos tocados
- [x] 5.4 `openspec validate read-specification-contents --strict` válido
- [x] 5.5 Reporte en `docs/reports/2026-08-07-read-specification-contents.md`
- [ ] 5.6 Ale valida en la aplicación que puede abrir y leer una especificación consolidada
