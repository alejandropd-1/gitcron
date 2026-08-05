## 1. Tipo de archivo

- [x] 1.1 Sumar en `lib/change-commit-scope.ts` una función pura que clasifique un archivo en código, prueba, documentación, configuración o artefacto a partir de su ruta
- [x] 1.2 Cubrirla con tablas de entrada y salida, incluido el caso que no encaja en ninguna y cae en código

## 2. Grupos que se explican

- [x] 2.1 Sumar a cada grupo una línea que declare qué contiene: el cambio que nombra, el archivado que nombra qué se archivó, y el que ningún cambio reclama
- [x] 2.2 Reemplazar la inicial del estado por la palabra —nuevo, modificado, borrado— conservando el color
- [x] 2.3 Declarar el tipo de cada archivo sólo en el grupo que ningún cambio reclama
- [x] 2.4 Convertir los controles de sumar y quitar grupo en botones con marco e ícono

## 3. Mensaje editable

- [x] 3.1 Reemplazar el `<code>` de sólo lectura por un campo editable cuyo valor sea el `commitMessage` del store, con la sugerencia derivada cuando está vacío
- [x] 3.2 Verificar que `prepareCommit` usa lo que hay en el campo y que la sugerencia sigue sin pisar lo escrito
- [x] 3.3 Test de que corregir el mensaje en el panel es lo que queda para confirmar

## 4. Textos

- [x] 4.1 Escribir en ES las claves de descripciones de grupo, estados con palabra y tipos de archivo
- [x] 4.2 Completarlas en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate explain-commit-groups --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que se entienda de dónde viene cada cosa, que no se haya vuelto verboso contra la invariante 11, y si el tipo de archivo conviene sólo en el grupo sin atribuir o en todos
