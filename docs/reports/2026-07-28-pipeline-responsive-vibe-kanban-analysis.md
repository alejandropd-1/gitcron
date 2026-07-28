# Pipeline responsive y adaptación de Vibe Kanban

Fecha: 2026-07-28

Rama: `pipeline/f04-runtime-streams`

## Resultado responsive

La causa era la combinación de dos sistemas de medida: algunas reglas miraban el ancho real de `.pipeline-workspace` y otras el ancho de la ventana. Cuando la navegación lateral reducía el workspace a unos 870 px, seguía activo un layout pensado para dos columnas.

El Pipeline ahora usa exclusivamente container queries y cuatro escalones:

| Ancho real del workspace | Composición |
| --- | --- |
| 1400 px o más | HUD ancho, carcasa instrumental de tres columnas |
| 1100–1399 px | Carcasa de dos columnas; Actividad ocupa el ancho completo inferior |
| 800–1099 px | Instrumentos apilados dentro de una sola carcasa; Change Path conserva su lectura mediante scroll horizontal |
| Menos de 800 px | Lectura lineal compacta; HUD y hechos se reducen a una columna o dos segmentos |

También se eliminó el piso rígido de `18rem` de la tercera pista. Las filas de la carcasa usan tamaño intrínseco `max-content`: al apilar bloques crecen hacia abajo y el workspace scrollea, en vez de comprimir o superponer contenido.

## Qué resuelve Vibe Kanban

Vibe Kanban organiza el trabajo de varios agentes de código alrededor de issues, workspaces, repositorios y sesiones. Cada workspace crea worktrees aislados, puede alojar varias sesiones, y concentra conversación, cambios, logs, preview, Git, terminal y notas en un layout de cuatro paneles ajustables.

Su idea más útil no es el tablero Kanban en sí. Es desplazar la atención humana hacia planificación, decisiones y revisión: mostrar qué está ejecutándose, qué necesita intervención y qué está listo para revisar.

El flujo documentado es:

1. Crear un issue con prioridad, etiquetas y relaciones padre/hijo.
2. Crear uno o más workspaces aislados para ese issue.
3. Elegir repositorios, ramas base y configuración de agente.
4. Ejecutar sesiones de agentes en paralelo.
5. Revisar conversación, cambios y preview dentro del workspace.
6. Finalizar mediante PR o merge local.

## Traducción al modelo de GitCron

| Vibe Kanban | GitCron |
| --- | --- |
| Issue | Objetivo o change autorizado |
| Workspace | Repo/worktree aislado para ejecutar el objetivo |
| Session | Sesión de runtime de un agente/proveedor |
| Attempt | Ejecución de una fase o tarea |
| Needs Attention | Decisión humana pendiente |
| Changes / review | Detalles, evidencia y diff comentable |
| Preview | Dev server o build verificable |
| Merge | Finalización Git explícitamente humana |

## Qué conviene adaptar

### Prioridad alta

- Una lista de workspaces agrupada por `Needs attention`, `Running`, `Idle` y `Ready for review`, calculada desde evidencia real.
- Paneles redimensionables, ocultables y con disposición recordada por repositorio.
- Un workspace como unidad persistente: objetivo, worktree, sesiones, estado, decisiones y evidencia.
- Múltiples sesiones/proveedores dentro del mismo workspace, con cambio rápido y trazabilidad.
- Un cockpit de revisión que reúna diff, comentarios, respuesta del agente y estado de validación.
- Preview/dev server como contexto verificable, con estado visible y lifecycle controlado.

### Prioridad media

- Notas del workspace y contexto operativo persistente.
- Jerarquía objetivo/subtareas vinculada al path de siete fases.
- Una vista Board separada para planificación; no incrustada dentro del monitor Pipeline.
- Command palette para navegar workspaces, sesiones, decisiones y evidencia.

### Qué no copiar

- El Kanban genérico como navegación principal: GitCron es repo-céntrico, gobernado por fases y evidencia.
- Lanzar agentes automáticamente al crear una tarea sin pasar por autorización y capacidades.
- Terminal libre en el renderer; contradice las invariantes de seguridad de GitCron.
- Acciones de PR/merge que eludan la finalización humana.
- La arquitectura cloud/team como dependencia central. Vibe Kanban anunció su cierre comercial; los workspaces locales continúan como proyecto open source mantenido por la comunidad.

## Adaptación visual

Se debe copiar la arquitectura de atención, no la marca visual de Vibe Kanban:

- conservar el lenguaje LCARS, su jerarquía tipográfica, franjas y ventanas;
- en ancho completo: rail de workspaces, foco operativo, contexto de cambios/preview y evidencia;
- en ancho medio: colapsar el rail y convertir el contexto derecho en panel con tabs;
- priorizar visualmente `Needs attention`, agente activo, diff/preview y luego economía;
- permitir resize y toggle de zonas sin volver cada región una card independiente.

## Secuencia de implementación propuesta

1. Fundación responsive y persistencia del layout.
2. Proyección de workspaces y estados desde datos existentes.
3. Asociación objetivo–worktree–sesiones.
4. Cockpit de revisión con diff y feedback dirigido al agente.
5. Preview/dev server administrado.
6. Vista opcional de planificación y grafo de subtareas.

## Fuentes

- https://www.vibekanban.com/docs/getting-started
- https://www.vibekanban.com/docs/workspaces
- https://www.vibekanban.com/docs/workspaces/interface
- https://www.vibekanban.com/docs/core-features/creating-tasks
- https://www.vibekanban.com/docs/supported-coding-agents
- https://vibekanban.com/blog/shutdown

## Alcance de esta tanda

Se implementó solamente la corrección responsive en CSS. La adaptación funcional de Vibe Kanban queda como propuesta y no modifica stores, IPC, runtime, worktrees ni Git.
