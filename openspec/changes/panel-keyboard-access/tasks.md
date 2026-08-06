## 1. Foco visible

- [x] 1.1 Definir un token de contorno de foco en `.dashboard`, junto a la escala de espaciado
- [x] 1.2 Declarar `:focus-visible` en los siete controles del panel que hoy sólo tienen `:hover`
- [x] 1.3 Corregir `.messageField input`: sacar `outline: none` y declarar el contorno en `:focus-visible`, conservando el resaltado de borde

## 2. La acción alcanzable

- [x] 2.1 Pasar «Preparar» de `disabled` a `aria-disabled`, conservando su apariencia de no disponible
- [x] 2.2 Verificar que el manejador ya corta solo cuando no hay archivos elegidos, sin agregar guardas nuevas
- [x] 2.3 No extender `aria-disabled` al resto de los controles deshabilitados: en las casillas durante una preparación, saltarlas es lo correcto

## 3. Cobertura

- [x] 3.1 Actualizar el caso que verifica la acción deshabilitada para que compruebe `aria-disabled`
- [x] 3.2 Test de que preparar sin archivos elegidos no llama a `stageFiles`

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 4.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 4.4 Dejar `openspec validate panel-keyboard-access --strict` válido
- [ ] 4.5 Ale valida recorriendo el panel con Tab y marca esta casilla: que se vea siempre dónde está el foco, y que el contorno no moleste al usar el mouse
