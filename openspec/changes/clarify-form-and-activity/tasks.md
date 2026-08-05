## 1. El formulario declara su naturaleza

- [x] 1.1 Sumar arriba del formulario una frase que declare que lo escrito arma la instrucción para un ejecutor, no los artefactos
- [x] 1.2 Declarar junto a cada campo dónde termina lo que se escribe: objetivo y alcance como líneas de la instrucción, nombre como identificador y carpeta bajo `openspec/changes/`
- [x] 1.3 Ensanchar el cuerpo del formulario hasta el ancho que ya usan los demás paneles del centro, sin pasarlo

## 2. La columna declara qué está mostrando

- [x] 2.1 Declarar en el encabezado cuándo corrió la sesión, sin depender de que exista el selector
- [x] 2.2 Declarar, sólo cuando no hay cambio abierto, que lo mostrado es lo último del repositorio
- [x] 2.3 No cambiar qué sesión se elige mostrar: la decisión de `filter-activity-by-change` no se revisa

## 3. Textos

- [x] 3.1 Escribir en ES las claves nuevas, sin bloques explicativos
- [x] 3.2 Completarlas en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 4. Cobertura

- [x] 4.1 Test de que el formulario declara su naturaleza y el destino de cada campo
- [x] 4.2 Test de que la columna declara cuándo corrió la sesión con una sola sesión, sin selector
- [x] 4.3 Test de que sin cambio abierto declara que lo mostrado es del repositorio, y con cambio abierto no

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate clarify-form-and-activity --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que se entienda dónde termina lo que escribe, y que no se haya vuelto verboso contra la invariante 11
