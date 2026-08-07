## Why

Marcar una tarea como hecha ocurre con un solo clic y sin ninguna confirmación, mientras que
desmarcarla abre un diálogo. La asimetría fue una decisión deliberada, escrita en
`components/pipeline/OpenSpecDashboard.tsx:256`: marcar agrega una afirmación que su autor hace en ese
momento, desmarcar borra la constancia de algo que alguien afirmó antes. El razonamiento se sostiene
sobre el contenido de cada acción, pero deja fuera lo que las dos comparten: las dos escriben en el
repositorio y las dos se disparan con un clic que se puede errar.

Y marcar no es inocuo. Tildar la última casilla pendiente cambia el estado del cambio y hace aparecer
archivar como acción principal, que es la puerta a un movimiento de Git. Un clic accidental sobre una
casilla no sólo afirma algo que nadie quiso afirmar: puede dejar el cambio ofreciendo cerrarse.

Hay además un límite que conviene decir donde se decide. Un cambio activo se puede desmarcar, pero uno
archivado no: `electron/ipc/pipeline-tasks.ts:88` devuelve `archived` cuando `tasks.md` ya no está bajo
`changes/<id>/`, porque lo archivado es de sólo lectura. O sea que lo marcado es reversible hasta que se
archiva, y después no. Ese matiz no está dicho en ninguna parte de la interfaz.

## What Changes

- Marcar una tarea pide confirmación, con el mismo diálogo que ya usa el desmarcado.
- El texto declara lo que realmente pasa: queda registrado en el cambio, se puede desmarcar mientras el
  cambio siga activo, y deja de poder deshacerse una vez archivado.
- El desmarcado no cambia: su diálogo y su texto quedan como estaban.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: marcar una tarea pasa a requerir confirmación, y el aviso declara hasta
  cuándo la acción se puede deshacer.

## Impact

**Producción:** `components/pipeline/OpenSpecDashboard.tsx` (estado de confirmación y diálogo) y
`lib/i18n.ts` (claves nuevas en los tres idiomas).

**Sin tocar:** el canal IPC de marcado, el registro en `task-log.md`, la comprobación de texto esperado
que protege contra editar la línea equivocada, y el diálogo de desmarcado.

**Fuera de alcance:** confirmar el marcado desde un runtime. Un agente que tilda una casilla no está
haciendo clic, y meter una confirmación humana en ese camino lo trabaría sin proteger de nada.

**Dependencias:** ninguna.

**Riesgo:** bajo en código. El riesgo real es de fricción: tildar varias casillas seguidas pasa a costar
el doble de clics, y el circuito de cierre de una tanda tilda varias. Se asume porque el clic accidental
que se evita escribe en el repositorio y puede habilitar el archivado, y porque el diálogo ya existe y
se resuelve con Enter. Si en el uso resulta molesto, es reversible: la confirmación es una condición en
un solo lugar.
