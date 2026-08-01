# Handoff — GitCron / Pipeline · sesión del 2026-07-31

**Estado:** `main`, working tree limpio, `1e85492`. Todo lo de la sesión está mergeado.
**Changes activos:** 3, los tres en 0% y sin tocar — `add-opencode-runtime`,
`add-lmstudio-agent-runtime`, `make-agy-launchable`.
**Archivados en la sesión:** 12.

---

## 1 · Cómo se trabaja acá

El método es **OpenSpec y no hay otro**. Leer `AGENTS.md` y `docs/01_INVARIANTES.md` antes de tocar
nada. Resumen operativo:

1. `openspec list --json` → ver activos.
2. `openspec new change "<slug>"` → slug: empieza con letra, minúsculas/dígitos/guiones, sin
   consecutivos ni finales.
3. `openspec instructions <artefacto> --change "<slug>"` antes de escribir cada artefacto.
4. Implementar contra `tasks.md`, tildando.
5. **Cierre:** `pnpm exec tsc --noEmit` en 0 · `pnpm test` · `openspec validate <slug> --strict` ·
   reporte en `docs/reports/` · **frenar**.

### Novedades de esta sesión que hay que respetar

**Tarea de firma.** Cada change termina con este texto **literal**, no parafraseado:

```
- [ ] X.Y Archivado confirmado por Ale desde la aplicación
```

La tilda el botón de archivar de la app, y **sólo esa**. Es el registro de la intervención humana,
que antes no existía en ningún lado.

**Manifiesto de commit.** Cada change lleva `openspec/changes/<slug>/commit.md`:

```markdown
## Mensaje

feat(alcance): una línea

## Archivos

- ruta/uno.ts
- ruta/dos.tsx
```

Los artefactos del propio change y su reporte **no** se enumeran: son rutas deterministas y entran
solas. Hace falta declarar el resto porque el árbol puede tener varios changes en curso y nada dice
qué archivo es de cuál.

**El archivado desde la app hace todo:** tilda la firma, commitea el trabajo, archiva, y commitea el
archivado. Nunca publica —`push`, `merge` y `tag` siguen siendo manuales—. El panel muestra antes de
ejecutar: los dos mensajes, los archivos que entran y **los que quedan fuera**.

> **Premisa importante:** el automatismo asume **un change por vez**. Si hay varios encimados sobre
> los mismos archivos, el commit por change no es separable y hay que commitear a mano y destildar
> "Confirmar también en Git" al archivar.

---

## 2 · Lo que queda por hacer, en orden

### A · El adaptador que miente (prioridad 1 — es el único que afirma algo falso)

Al confirmar una tarea con "Continuar", el adaptador de Claude reporta **éxito de una sesión que no
hizo nada**. Verificado ejecutando el CLI directamente:

```json
{"subtype":"success","is_error":false,"duration_ms":18,"duration_api_ms":0,"num_turns":0,
 "result":"Unknown command: /opsx:archive","total_cost_usd":0}
```

Claude devuelve `is_error: false` y exit 0 para un slash command inexistente. El adaptador lo
traduce a `run.completed · ok` → sesión `completed`, y la app muestra *"Sesión finalizada
correctamente"*. Además deja una **sesión fantasma** en `pipeline_runtime_session` apuntando a una
tarea sin tildar, que fuerza el estado `session-retry`.

Mordió **tres veces** en la sesión: `retire-f03-runtime-gate`, `fix-openspec-artifacts-selection` y
`pin-archived-header-and-single-scroll`.

**Arreglo acotado propuesto:** que el adaptador no declare éxito cuando `num_turns: 0` y el `result`
empieza con `"Unknown command:"`. Eso convierte la sesión en un fallo declarado con su motivo real,
en vez de un éxito mentiroso. **No hace que `/opsx:apply` funcione** — para eso ver punto B.

### B · Que `/opsx:apply` funcione de verdad con Claude (decisión de Ale, no técnica)

Dos bloqueos independientes:

1. El repo define los comandos `opsx` en `.agent/workflows/` y `.opencode/commands/`. **Claude Code
   los lee de `.claude/commands/`**, que sólo tiene `settings.local.json` y `worktrees/`.
2. Aunque existieran, `apply`/`archive` requieren correr `openspec`, es decir **shell**, y
   `claude-adapter.ts` excluye `Bash` a propósito (`CLAUDE_TOOLS = 'Read,Grep,Glob,Edit,Write'`) con
   un comentario que explica bien por qué: daría `git push`, borrado y red desde un botón.

**Ale no decidió esto todavía.** No avanzar sin su definición explícita: abre la superficie que el
adaptador cerró deliberadamente.

### C · El flake de la suite (prioridad 2)

`pnpm test` **no está verde de forma confiable**: en ~10 corridas completas, 3 fallaron. Siempre los
mismos archivos —los que crean repos Git reales en temporales: `git-hunks-ipc`, `branch-delete-ipc`,
`git-ops-worktree-submodule`, `git-sync-ipc`— y **todos pasan corridos aislados**.

Error capturado: `Test timed out in 5000ms` (ya **no** es el `EBUSY` de antes; eso lo atacó
`make-temp-repo-cleanup-reliable` con `removeTempDir`, en `test-utils/temp-dir.ts`).

**Qué medir antes de arreglar:** si la cola de `serialize-git-operations` lo empeoró. No hay
evidencia en ninguna dirección y afirmarlo sin medir sería inventar. Si la causa es el timeout, subir
el de las pruebas que hacen Git real.

Esto viola el requirement que se escribió en la capacidad **`testing-harness`**: *la suite no se
declara verde mientras exista diferencia entre correr aislado y correr completo*. Respetarlo.

### D · Cobertura parcial de la cola de Git

`serialize-git-operations` cubrió los canales que chocaban: lecturas de evidencia de Pipeline, el
archivado, y `git:command` / `git:stage` / `git:stage-batch`. **El resto de `git-ops.ts` sigue sin
cola** —pull, push, merge, rebase, stash, worktrees—. Reduce las colisiones de `index.lock`, no las
elimina. Envolver el módulo entero es mecánico pero con superficie de regresión grande: merece su
propia tanda.

### E · Los tres runtimes (artefactos escritos, sin implementar)

- `add-opencode-runtime` — registrar el adaptador ACP ya existente (`opencode-acp-adapter.ts`) en el
  hub. Vía OpenCode se llega a Z.ai.
- `make-agy-launchable` — `agy` sólo hace `discover`; falta `start()`/`events()`/`shutdown()`. Sin
  JSON stream: observación gruesa, declarar `degraded`.
- `add-lmstudio-agent-runtime` — falta el loop agente sobre la API local. El adaptador proveedor ya
  existe.

### F · Divergencia anotada, no corregida

`CHANGE_ID_PATTERN` en `openspec-cli.ts` es `/^[a-z0-9][a-z0-9-]*$/` y su comentario afirma ser el
"mismo contrato que `openspec new change`". **No lo es:** admite `a--b` y `trailing-`. El patrón
correcto está en `pipeline-next-action.ts` como `CHANGE_SLUG_PATTERN`. Es inocuo para seguridad
(cubierto por tests) pero el comentario miente. Follow-up chico.

---

## 3 · Trampas que costaron tiempo — no volver a pisarlas

**El parser de OpenSpec trunca el requirement a ~100 caracteres.** Si el `SHALL`/`MUST` cae después
del corte, `validate --strict` lo rechaza con *"must contain SHALL or MUST"* aunque sí lo contenga.
**Liderar siempre con la norma** y dejar el fundamento debajo.

**`ADDED` vs `MODIFIED` en los spec deltas.** Requirement nuevo → `ADDED`. Modificar uno existente →
`MODIFIED` **copiando el bloque entero** y verificando que el header exista textualmente en
`openspec/specs/<capability>/spec.md`. Si no existe, `openspec archive` aborta.

**Un change sin deltas no valida en `--strict`.** Para trabajo que no cambia producto —arnés de
pruebas, tooling— existe la capacidad **`testing-harness`**, creada en esta sesión. Su límite está
escrito en el `design.md` de `make-temp-repo-cleanup-reliable`: entra lo que determina si el
resultado del arnés es creíble; no entra nada observable usando la aplicación.

**No implementar encima de un change ya archivado.** Pasó una vez: Ale archivó y yo seguí corrigiendo
sobre esos arreglos, dejando trabajo sin change que lo cubriera. Un archivado es un registro cerrado.
**Confirmar qué está archivado antes de seguir tocando**, sobre todo si el QA y la implementación se
pisan en el tiempo.

**El QA visual de Ale es la única red para una clase entera de defecto.** En esta sesión encontró
**seis o siete** que los tests no vieron: solapamiento de la fila de acciones que se comía los
clicks, el archivado que no archivaba, el aviso que moría con el remount, la selección divergente, el
salto al abrir un completado, el scroll. Todos de render o de integración real entre capas. La suite
cubre bien lógica pura y contratos; no cubre el sistema andando.

**En layout, quitar suele ganarle a agregar.** Tres veces se resolvió un problema de layout agregando
un mecanismo —acotar con scroll propio, fijar con `sticky`, ocultar hermanos con `~`— y las tres el
mecanismo trajo un artefacto peor. Lo que funcionó fue sacar: **el centro entero es el único con
scroll** y lo que aparece empuja, no reemplaza.

**Cuidado con `justify-content: safe center`.** Si el motor no soporta `safe`, la declaración entera
se descarta y vuelve a quedar `center` — el defecto reaparece sin ninguna señal.

**Un valor "conveniente" en una capa de adaptación puede borrar información que una capa de arriba
necesita.** `pipeline-adapter.ts` sustituía la selección ausente por `activeChanges[0]`, y con eso la
vista no podía distinguir "el backend eligió éste" de "no eligió ninguno". No fallaba ruidosamente:
volvía imposible una comprobación correcta.

---

## 4 · Datos técnicos que conviene tener a mano

- **DB de sesiones:** `$APPDATA/GitCron/temporal-agent-history.db` (SQLite vía `node:sqlite`). Tabla
  `pipeline_runtime_session`. Inspección: `node --experimental-sqlite -e "..."`, no hay CLI de
  sqlite3. **Borrar filas de la DB requiere autorización de Ale** — el clasificador de permisos lo
  bloquea, y con razón.
- **Costo del refresco:** la validación por CLI cuesta ~1,5–2,4 s por change en Windows
  (`cmd.exe → node → openspec`). Por eso **sólo se valida el change seleccionado**. Si alguien vuelve
  a validar todos, el refresco vuelve a costar ~9 s por guardado de archivo.
- **Archivos clave:** `electron/pipeline/repo-evidence-reader.ts` (lectura),
  `electron/ipc/pipeline-archive.ts` (firma + commits + archivado),
  `electron/pipeline/change-commit-manifest.ts` (manifiesto y firma),
  `electron/git/repo-queue.ts` (cola por repo),
  `components/pipeline/OpenSpecDashboard.tsx` + su CSS (la vista, es grande),
  `components/pipeline/pipeline-next-action.ts` (derivación pura del siguiente paso).
- **i18n:** `lib/i18n.ts`, tres bloques ES/EN/ZH. Toda string de UI pasa por ahí, nada hardcodeado.
- **Lint:** evitar `react-hooks/set-state-in-effect`. Para resetear estado al cambiar una prop, el
  patrón aceptado es trackear el valor previo durante el render.
- **Capacidades en `openspec/specs/`:** `pipeline-connection-security`, `pipeline-decision-contract`,
  `pipeline-event-contract`, `pipeline-guided-workflow`, `pipeline-identity-contract`,
  `pipeline-repo-evidence`, `pipeline-runtime-adapters`, `pipeline-runtime-capabilities`,
  `pipeline-state-replay`, `pipeline-telemetry-fixtures`, `testing-harness`.

---

## 5 · Lo primero que debería hacer la próxima IA

1. `git log --oneline -5` y `openspec list --json` → confirmar que el estado sigue siendo éste.
   Un handoff describe lo que era cierto cuando se escribió.
2. Correr `pnpm exec tsc --noEmit` y `pnpm test` **dos o tres veces** para ver el flake con sus
   propios ojos antes de creer cualquier "verde".
3. Preguntarle a Ale por dónde seguir. Mi recomendación es **A** (el adaptador que miente) porque es
   el único defecto que queda que afirma algo falso, y es el que más se pisa: `apply` es el camino
   normal de trabajo.
4. Antes de tocar layout: preguntar el criterio en vez de adivinar. Acá se erró tres veces
   adivinando y una vez preguntando se acertó a la primera.
