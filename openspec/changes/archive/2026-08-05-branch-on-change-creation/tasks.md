## 1. La rama al empezar

- [x] 1.1 Sumar al formulario de propuesta la casilla que declara que se va a trabajar en `change/<slug>`, marcada por defecto
- [x] 1.2 Crear la rama con el canal `git:create-branch` existente al validar el formulario, antes de entregar la instrucción al lanzador
- [x] 1.3 No ejecutar ninguna operación de Git cuando la casilla está desmarcada
- [x] 1.4 Informar el motivo real cuando la creación falla, sin normalizarlo, y no entregar la instrucción al lanzador

## 2. Textos

- [x] 2.1 Escribir en ES la casilla, su ayuda y el error
- [x] 2.2 Completarlos en EN y ZH, y sumarlos a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 3. Cobertura

- [x] 3.1 Test de que con la casilla marcada se crea `change/<slug>` y recién después aparece el lanzador
- [x] 3.2 Test de que desmarcada no se llama a ninguna API de Git
- [x] 3.3 Test de que un fallo muestra el motivo real y no deja arrancar la sesión

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 4.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 4.4 Dejar `openspec validate branch-on-change-creation --strict` válido
- [x] 4.5 Ale valida creando un cambio real y marca esta casilla: que la rama se cree y quede parado en ella, y que desmarcar no toque Git
