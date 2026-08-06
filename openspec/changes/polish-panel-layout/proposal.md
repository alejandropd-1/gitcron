## Why

Cinco defectos de maquetado observados por Ale sobre el panel funcionando, después de validar
`legible-panel-controls`. Ninguno es de contenido: todos son de cómo está puesto.

**La interfaz salta al elegir archivos.** «Sumar todos» pasa a «Quitar todos» y el conteo pasa de
«Elegidos: 0 de 5» a «5 de 5»: las dos cosas cambian de ancho y arrastran a lo que tienen al lado. El
título del panel y su descripción se reacomodan cuando lo único que ocurrió fue tildar una casilla.

**El texto de los artefactos se lee apretado.** `.pipeline-markdown` tiene `line-height: 1.6` y
`gap: 0.75rem` entre bloques, sin distinción entre un párrafo y el siguiente encabezado. En
`proposal.md` y `design.md`, que son documentos largos de prosa densa, todo pesa igual y no hay dónde
descansar la vista.

**«15 especificaciones» queda pegado al botón de archivados.** En el bloque CERRADOS, `.startNote`
arranca inmediatamente después del control, sin separación, y las dos líneas se leen como una.

**El control del encabezado no cierra con el resto.** «Repositorio con cambios locales» con la rama
debajo en chico, dentro de una caja con marco propio y una pastilla al costado: son tres tratamientos
apilados en un control que hace una sola cosa. El marco exterior sobra —ya está sobre la barra de
resumen, que tiene su propio fondo— y la rama, que es el dato que define a dónde va el commit, queda
como texto secundario.

## What Changes

Los controles que cambian de texto dejan de mover lo que tienen al lado: reservan el ancho de su
variante más larga y los números se alinean por columna.

El texto de los artefactos gana aire y jerarquía: más interlineado, separación entre bloques, y los
encabezados se despegan del párrafo anterior en vez de flotar a la misma distancia que todo lo demás.
Las listas, el código y las citas se ajustan al mismo ritmo.

El bloque de cerrados separa su cuenta de especificaciones del control de archivados.

El control del encabezado se rediseña en una sola línea, sin marco exterior: el punto de estado, la
frase, la rama destacada con su propio tono, y la acción. La rama deja de ser texto secundario y pasa
a ser lo que es —el destino del commit— con el mismo tratamiento que ya tiene dentro del panel de
preparación.

Queda **fuera de alcance**: poder leer el contenido de las especificaciones, que hoy no se puede
porque el snapshot no las transporta y exige tocar el proceso principal; el ancho de los paneles de
artefactos, que sigue sin poder reproducirse; y la atribución de archivos de código a un cambio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que un control no desplace a los demás al
  cambiar de texto o de cuenta.

## Impact

En `components/pipeline/OpenSpecDashboard.module.css` se reservan anchos en los controles que cambian
de texto, se separa la cuenta de especificaciones y se rediseña el control del encabezado. En
`app/globals.css` se ajusta el ritmo tipográfico de `.pipeline-markdown`. En
`components/pipeline/OpenSpecDashboard.tsx` el control del encabezado pasa a una sola línea con la rama
destacada.

En pruebas, se conserva lo que ya verifica ese control y se suma que la rama sigue siendo alcanzable.
No hay claves de i18n nuevas: los textos no cambian.

No se agregan dependencias. No se toca el proceso principal.
