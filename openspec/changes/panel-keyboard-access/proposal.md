## Why

El panel se validó siempre mirándolo, nunca recorriéndolo con el teclado, y eso dejó tres huecos que
la revisión visual no puede destapar. Salieron de auditarlo contra la guía de accesibilidad del
proyecto, que hasta esta sesión no se había consultado.

**Ningún control del panel declara su estado de foco.** `.primaryAction`, `.secondaryAction`,
`.groupToggle`, `.fileChoice`, `.startPendingToggle`, `.startArchived button` y `.backToStart` tienen
todos su regla `:hover` y ninguno tiene `:focus-visible` —cinco apariciones en todo el módulo, y
ninguna sobre ellos—. Queda el anillo por defecto del navegador, que sobre un botón relleno de cian en
tema oscuro casi no se ve, mientras el resto del panel se estila explícitamente. Recorrerlo con el
teclado es perder de vista dónde se está parado.

**El campo del mensaje apaga el contorno.** `.messageField input:focus` declara `outline: none` y lo
reemplaza por un cambio de color de borde de un píxel. La guía es explícita: no se desactiva el
contorno sin un reemplazo suficiente. Además está sobre `:focus` y no `:focus-visible`, así que también
se dispara al hacer clic, donde no aporta.

**La acción principal desaparece del recorrido cuando está deshabilitada.** «Preparar» usa el
`disabled` nativo, que saca el elemento del orden de foco. Con nada elegido —el estado en que se abre
el panel— alguien que recorre con teclado nunca se entera de que esa acción existe. La guía pide ser
deliberado entre `disabled` y `aria-disabled`: el segundo conserva el foco para que se pueda llegar y
escuchar que no está disponible.

## What Changes

Todos los controles del panel declaran su foco con un contorno de contraste suficiente, tomado de un
token compartido para que no se repita el valor en cada regla.

El campo del mensaje deja de apagar el contorno y pasa a declararlo en `:focus-visible`, conservando el
resaltado de borde que ya tenía.

«Preparar» pasa a `aria-disabled`: sigue viéndose y comportándose como no disponible —el manejador ya
no hace nada cuando no hay archivos elegidos— pero se puede alcanzar con el teclado y se anuncia como
deshabilitado en vez de no existir.

Queda **fuera de alcance**, y conviene decir por qué: no se agrega `role="list"` a las listas que usan
`display: flex`, porque esa pérdida de semántica es de Safari y esta aplicación corre sobre Chromium
—agregarlo sería ARIA redundante—; no se marcan los íconos como decorativos uno por uno, porque van
dentro de controles que ya tienen texto y no se anuncian; y no se retira el rol de región de las dos
secciones del centro, que son áreas mayores y navegables a propósito.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que los controles del panel sean recorribles
  con teclado, declaren su foco, y que una acción no disponible siga siendo alcanzable.

## Impact

En `components/pipeline/OpenSpecDashboard.module.css` se suma un token de contorno de foco y su regla a
los siete controles, y se corrige el contorno del campo del mensaje. En
`components/pipeline/OpenSpecDashboard.tsx`, «Preparar» pasa de `disabled` a `aria-disabled`.

En pruebas, el caso que hoy verifica que la acción está deshabilitada sin archivos elegidos pasa a
comprobar `aria-disabled`, y se suma que preparar sin nada elegido no llama a `stageFiles`.

No se agregan dependencias. No hay claves de i18n nuevas. No se toca el proceso principal.
