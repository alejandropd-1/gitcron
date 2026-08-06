## 1. Que nada salte

- [x] 1.1 Reservar el ancho de la variante más larga en los controles que alternan «Sumar todos» / «Quitar todos», sin fijar un ancho exacto en píxeles
- [x] 1.2 Reservar el ancho del conteo del panel y alinear sus cifras por columna
- [x] 1.3 Verificar que tildar una casilla no desplaza el título del panel ni su descripción

## 2. Ritmo del texto de los artefactos

- [x] 2.1 Subir un escalón el interlineado de `.pipeline-markdown` en `app/globals.css`
- [x] 2.2 Separar los encabezados de lo que los precede más que de lo que introducen, en vez de tratar todos los bloques por igual
- [x] 2.3 Ajustar listas, código y citas al mismo ritmo

## 3. Cerrados

- [x] 3.1 Separar la cuenta de especificaciones del control de archivados

## 4. Encabezado en una línea

- [x] 4.1 Retirar el marco propio del control: va sobre la barra de resumen, que ya tiene fondo y borde
- [x] 4.2 Poner punto de estado, frase, rama y acción en una sola fila
- [x] 4.3 Dar a la rama el mismo tratamiento de pastilla que tiene dentro del panel de preparación
- [x] 4.4 Conservar la acción con su forma de control, distinguible de la frase

## 5. Segunda pasada de la validación de Ale

- [x] 5.1 Alinear a la izquierda el conteo y las acciones del panel, en su propia fila, para que su posición no dependa del ancho de la ventana
- [x] 5.2 Renderizar el campo del mensaje siempre, vacío mientras no haya archivos elegidos, para que no empuje la lista al aparecer
- [x] 5.3 Sumar aire vertical entre el mensaje, los títulos de grupo y sus descripciones
- [x] 5.4 Sacar la línea bajo el título de grupo, que quedaba a un pelo de la descripción, y dejar la separación al cierre del encabezado del grupo
- [x] 5.5 Definir una escala de espaciado en el panel y espaciar todos sus bloques con ella, en vez de seguir ajustando valores sueltos
- [x] 5.6 Dar alto mínimo accesible a los controles chicos del panel, que quedaban por debajo del objetivo de 24px de WCAG 2.2
- [x] 5.7 Usar propiedades lógicas en las separaciones nuevas

## 6. Cobertura

- [x] 6.1 Verificar que los tests que abren el panel desde ese control siguen pasando
- [x] 6.2 Test de que la rama sigue declarándose en el encabezado

## 7. Cierre

- [x] 7.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 7.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 7.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 7.4 Dejar `openspec validate polish-panel-layout --strict` válido
- [x] 7.5 Ale valida visualmente y marca esta casilla: que nada salte al tildar, que un documento largo se lea, y que el tono de la rama la distinga sin competir con la acción
