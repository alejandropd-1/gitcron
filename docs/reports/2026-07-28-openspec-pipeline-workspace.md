# OpenSpec Pipeline workspace — cierre de implementación

Fecha: 2026-07-28  
Branch: `codex/openspec-changes-ui`

## Alcance

Se reemplazó únicamente el contenido de la pestaña Pipeline por un workspace OpenSpec. La topbar, sus iconos y el resto de las vistas de GitCron no se rediseñaron. Los dos botones ya existentes de la topbar controlan, mientras Pipeline está activo, el navegador OpenSpec izquierdo y la actividad derecha.

## Datos reales y acciones

- El lector de evidencia recorre cambios activos, archivos de propuesta/diseño/tareas/specs, cambios archivados y especificaciones principales.
- Cada cambio activo expone intención, artefactos, tareas, progreso y validación estricta de OpenSpec.
- El flujo visual usa las etapas nativas Explore, Propose, Apply, Validate y Archive.
- `Continuar` abre el lanzador real con `/opsx:apply <change>` y la próxima tarea; al completar y validar, la acción pasa a Archive.
- Un cambio archivado aparece en Completados recientes. Al seleccionarlo se ve el cierre y queda disponible Nuevo cambio.
- Cada ejecución queda persistida como una sesión independiente con cambio, tarea, rol, inicio, cierre y resultado (`completed`, `failed` o `interrupted`). El historial sobrevive al reinicio de GitCron y puede recorrerse desde la cabecera de Actividad.
- El estado vacío dice `Sin sesión`; los fixtures de desarrollo se identifican como `Datos de vista previa`, sin presentarlos como una ejecución real.
- GitCron agrega únicamente evidencia local que puede verificar por sí mismo: cambio del working tree y resultado de `openspec validate`. La actividad emitida por el runtime sigue sanitizada y no se inventan reasoning, costo, archivos ni resultados.
- La migración SQLite v5 agrega `pipeline_runtime_session`; el preload expone historial mediante IPC validado y limitado.

## Responsive y shell

- La grilla se gobierna por container queries del workspace.
- En desktop ancho se muestran tres columnas; en el escalón medio la actividad se superpone con fondo opaco; en el estrecho también puede superponerse el navegador.
- No hay ancho mínimo rígido que fuerce overflow horizontal.
- Los dos paneles se muestran/ocultan y se redimensionan con el estado y los tiradores que ya administra la carcasa.

## Limpieza

Se retiraron los componentes visuales LCARS sin consumidores de producción: HUD, Change Path, Now, Agent Tree, Economy, cards/elbows y el antiguo control supervisado con sus modales/banners. Se conservaron `ActivityFeed`, `DecisionInbox`, `PipelineDetails`, el lanzador de runtime, adaptadores y contratos que siguen participando del flujo nuevo.

`app/globals.css` ya tenía cambios sin cerrar de la iteración visual anterior. No se revirtió ni se reescribió esa modificación preexistente; el nuevo workspace usa `OpenSpecDashboard.module.css` para evitar ampliar ese solapamiento.

## Verificación

- TypeScript: 0 errores.
- Tests: 84 archivos, 521 tests, todos pasaron.
- Tests focalizados de esquema, repositorio, proyección, sesiones, reader y adapter: 6 archivos, 73 tests, todos pasaron.
- ESLint focalizado sobre persistencia, runtime y UI tocados: 0 errores y 0 warnings.
- Build de producción Next + Electron: correcto.
- QA visual e interacción: `design-qa.md`, resultado `passed`; 0 overflow horizontal en 1488, 1280 y 1150 px; consola limpia en una pestaña nueva.
- `gates.ps1 fast`: VERDE.
- `gates.ps1 full`: PENDIENTE, con C1/C2/C3/C4/C6/C7 correctos; C5 lint y C8 fallow conservan la deuda global declarada por el gate.

## Fuera de alcance

- No se modificaron la topbar ni sus iconos.
- No se agregaron dependencias.
- No se hizo staging, commit, push, merge ni publicación.
