## Why

Segunda pasada de QA sobre los arreglos de `fix-archive-panel-and-git-refresh`, ya archivado. Los
dos defectos son de los propios arreglos anteriores, no del código previo.

1. **El panel de confirmación acotado no alcanzó.** Limitarlo a `46vh` con scroll propio dejó dos
   áreas desplazables compitiendo dentro del centro, y en ventanas bajas los botones `sticky`
   terminaban encimados sobre el texto del comando en vez de debajo.
2. **La ficha del archivado quedó desprolija.** Se intentó fijar arriba la identidad del cambio para
   que no se perdiera al recorrer los artefactos, y el resultado fue peor: el contenido pasaba por
   debajo asomándose contra su fondo. Ale definió el criterio: que el cuerpo se recorra entero, de
   una sola pieza.

## What Changes

- Mientras se confirma un archivado, el panel **es** el contenido del centro: toma el alto
  disponible y es el único con scroll. El trabajo y la actividad se retiran mientras dura.
- La identidad del cambio archivado se agrupa y se separa con una línea, pero forma parte del flujo:
  el cuerpo se recorre entero, sin nada fijado por encima.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: una confirmación ocupa el centro por sí sola.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx` — la identidad del archivado agrupada en su contenedor.
- `components/pipeline/OpenSpecDashboard.module.css` — el panel a alto completo; la ficha sin nada fijado.
- Sin dependencias nuevas. Sin cambios en Electron main, IPC ni SQLite.
