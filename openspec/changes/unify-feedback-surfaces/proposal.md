## Why

Pipeline inventó su propia forma de avisar. El archivado exitoso se anuncia con una banda verde
arriba del panel, mientras el resto de la aplicación usa toasts abajo, con su animación, su
autocierre y su cierre manual. Dos superficies para lo mismo obligan a mirar dos lugares distintos
y desaprovechan un sistema que ya existe y funciona.

Además, seleccionar un cambio dispara una relectura de evidencia que tarda: recién al terminar se
completan los círculos del ciclo de vida y se habilita el archivado. La banda fina superior que se
agregó para declararlo pasa desapercibida, porque está lejos de donde ocurre el cambio.

Y los toasts de mensaje simple ocupan un ancho fijo aunque el texto sea corto, así que una frase de
cuatro palabras se muestra en una caja de 640 píxeles.

Todo detectado por Ale durante el QA visual.

## What Changes

- Las notificaciones de Pipeline usan la superficie de notificaciones de la aplicación en lugar de
  una propia. El aviso de archivado exitoso pasa a ser un toast como cualquier otro.
- Los toasts de mensaje simple se ajustan a su contenido, con el ancho actual como tope. Los que
  llevan acciones —decisión de pull, archivos ignorados— conservan su ancho: ahí el ancho fijo
  sostiene la disposición de los botones.
- La relectura de evidencia se percibe **donde ocurre**: los círculos del ciclo de vida laten
  mientras se está releyendo, además de la banda superior que ya existe.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se declara que Pipeline no inventa superficies de aviso propias y que
  el progreso se percibe donde ocurre.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx` — el aviso de archivado pasa al toast; los círculos
  reflejan la relectura.
- `components/pipeline/PipelineWorkspace.tsx` — propaga el estado de relectura.
- `components/pipeline/OpenSpecDashboard.module.css` — se retira la banda propia; late el ciclo.
- `components/PageToasts.tsx` — **componente compartido**: el ancho de los toasts de mensaje simple
  pasa de fijo a tope. Se toca fuera de Pipeline a propósito, porque el defecto está ahí; se deja
  anotado por si Ale prefiere separarlo.
- `lib/i18n.ts` — se retira la string de cierre del aviso propio, que el toast ya resuelve.
- Sin dependencias nuevas. Sin cambios en Electron main, IPC ni SQLite.
