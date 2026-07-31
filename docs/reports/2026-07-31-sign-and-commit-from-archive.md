# Reporte — sign-and-commit-from-archive

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `sign-and-commit-from-archive`

## Qué problema resolvía

OpenSpec no registraba en ningún lado la intervención humana. Los checkboxes los marca el agente,
los reportes los escribe el agente, y el archivo guarda la palabra del agente sobre su propio
trabajo. Si un agente mintiera, el artefacto se vería idéntico — que es lo que pasó con un handoff
que declaró "549 tests en verde" cuando eran 548 y un fallo.

La convención tiene un casillero para eso: la última tarea, "frenar antes de staging y entregar a
Ale". Pero es intildeable por el agente —marcarla sería afirmar que el handoff terminó antes de que
Ale lo recibiera— así que se archiva sin marcar **siempre**. Verificado en
`openspec/changes/archive/2026-07-31-fix-pipeline-refresh-cost/tasks.md`, congelada en `[ ]`.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `electron/pipeline/change-commit-manifest.ts` | Nuevo. Texto literal de la firma, parseo de `commit.md`, marcado de la tarea de firma y cálculo de rutas deterministas. |
| `electron/ipc/pipeline-archive.ts` | `pipeline:archive-plan` y orquestación escalonada del archivado. Git, lectura y escritura inyectables. |
| `electron/preload.ts`, `types/electron.d.ts` | Los dos canales. |
| `components/pipeline/OpenSpecDashboard.tsx` + CSS | El panel muestra el alcance antes de ejecutar. |
| `lib/i18n.ts` | 5 strings × 3 idiomas. |
| `AGENTS.md` | Convención de firma y manifiesto; la excepción de Git. |
| Tests | +8 del manifiesto, +11 del canal. |

## Las tres decisiones que importan

**1. Se marca una tarea designada, no "la que quede".** La propuesta original era marcar la tarea
pendiente al archivar. Se descartó: convertiría el checkbox en "se apretó el botón". Un change con
tres tareas sin hacer las vería marcadas solas y el archivo afirmaría trabajo que nadie hizo,
congelado para siempre porque archivar no se revierte. Se marca la que coincide con el literal
declarado, y sólo esa; hay un test que fija que un pendiente real siga pendiente.

**2. El texto dice lo que el click prueba.** "Archivado confirmado por Ale desde la aplicación", no
"QA aprobado". El gesto demuestra que una persona confirmó con el alcance a la vista; no demuestra
que haya revisado el resultado. Un checkbox no puede afirmar más de lo que su hecho respalda.

**3. Lo que queda fuera también se muestra.** Un manifiesto lo escribe el agente y su modo de fallo
más silencioso es la omisión: un archivo del change que no entra al commit y nadie lo nota. El panel
muestra mensajes, incluidos y **excluidos**. Los de otros changes en curso van a aparecer ahí, y está
bien: lo importante es que si aparece uno que sí correspondía, se vea antes de confirmar.

## Orden y caminos de fallo

1. Marcar la firma · 2. Commit del trabajo · 3. Archivar · 4. Commit del archivado.

El paso 1 va antes del 3 por obligación: archivar mueve el directorio. **Si falla el paso 2 no se
archiva** —dejar el change archivado con su trabajo sin commitear es un estado peor y menos
evidente—. Si falla el 4, el 3 ya ocurrió: se informa tal cual, sin declarar éxito. Los tres caminos
tienen test.

## Qué NO hace

- **No publica.** `push`, `merge` y `tag` no están en la superficie inyectada y hay un test que lo
  fija. La confirmación humana autoriza esa acción concreta y nada más.
- No agrega directorios: `add` recibe siempre una lista explícita de archivos.
- No reescribe los changes ya archivados para simular una firma que no ocurrió.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **600 passed / 82 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate sign-and-commit-from-archive --strict` | **válido** |

## Pendiente de QA visual

El flujo completo —firma, dos commits y archivado— **no se ejerció todavía contra un repositorio
real**. Los tests cubren la orquestación con Git inyectado, que es lo que se puede cubrir sin
commitear de verdad, pero el primer uso real lo hace Ale. Conviene que el primero sea sobre un
change chico.
