## 1. Concordancia de número

- [x] 1.1 Agregar en `lib/i18n.ts` las variantes de singular en ES, EN y ZH para lo que falta de un cambio, los archivados, los archivos preparados y el resumen tras preparar
- [x] 1.2 Resolver la elección entre singular y plural en una sola función, y hacer que todos los textos con número pasen por ella
- [x] 1.3 Sumar las claves nuevas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 2. Jerarquía de los controles

- [x] 2.1 Dejar la acción principal como el único relleno del panel
- [x] 2.2 Pasar las acciones de apoyo a marco claro sin relleno, reservando el cian para el estado activo
- [x] 2.3 Dar a los controles de lista —desplegar, sumar un grupo— un tercer tratamiento más liviano y con tono propio
- [x] 2.4 Verificar que los tres niveles se distinguen sin leer el texto

## 3. Tamaño y aire

- [x] 3.1 Subir un escalón el tamaño de los controles de acción, de lista y de la pastilla de rama, creciendo con padding y no con altura fija
- [x] 3.2 Separar el título de grupo de su descripción y de la primera fila de la lista
- [x] 3.3 Verificar que nada desborda: los controles viven en contenedores que envuelven

## 4. Cobertura

- [x] 4.1 Test de que con una unidad se usa la variante singular y con varias la plural
- [x] 4.2 Verificar que los tests existentes que buscan estos textos siguen pasando o se actualizan a la clave correcta

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate legible-panel-controls --strict` válido
- [ ] 5.5 Ale valida visualmente y marca esta casilla: que los tres niveles de control se distingan sin leer, que el escalón de tamaño haya alcanzado, y que el verde de los controles de lista no se confunda con el estado «hecho»
