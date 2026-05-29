# Prompt para Claude Code — Integrar el Temporal Agent en GitCron

> Pegá este archivo (o su contenido) en Claude Code corriendo **dentro del repo
> GitCron**. Los archivos referenciados están en el bundle que viene junto a este
> prompt; copialos al repo donde se indica. **Trabajá por FASES y PARÁ en cada
> checkpoint** a mostrarme el resultado antes de seguir.

---

## Contexto

GitCron es un cliente Git de escritorio: Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TypeScript 5.9, `simple-git` + Octokit. Versión actual ~1.6.5, con la
vista de grafo **clásica y cronométrica** ya integradas (la cronométrica vive en
`components/ChronometricGraph.tsx` con `lib/chronometric-projection.ts` y
`hooks/use-canvas-viewport.ts`).

Vamos a integrar el **Temporal Agent**: una IA opt-in que proyecta *ramas
especulativas* (futuros posibles) sobre la diagonal cronométrica. El usuario las
acepta/rechaza, y al aceptar una se **materializa** como branch real. El diseño,
la doctrina y los módulos núcleo ya están escritos y testeados — tu trabajo es
**integrarlos al repo real**, no rediseñarlos.

Leé primero estos archivos del bundle, en este orden:
1. `docs/TEMPORAL_AGENT_DESIGN.md` — el diseño completo y las invariantes.
2. `.agents/skills/temporal-attention/README.md` — quién lee qué.
3. `.agents/skills/temporal-attention/SKILL.md` y sus `references/`.

## INVARIANTES (no romper — son condición de aceptación)

1. **Secretos cifrados por OS.** API keys con Electron `safeStorage`
   (DPAPI/Keychain/libsecret), nunca `localStorage`, nunca env var en texto plano.
2. **Secretos nunca en el renderer.** Las keys viven y se usan SOLO en el proceso
   main. El renderer solo sabe si una key *existe* (booleano).
3. **Secretos nunca logueados.** Todo lo que sale por `console.*` o vuelve al
   renderer pasa por `sanitizeForLog()`. Extendelo para los formatos de auth nuevos.
4. **CSP estricta.** `connect-src` solo agrega el dominio del proveedor de IA
   *activo*, y se documenta en `SECURITY.md`. `'unsafe-eval'`/`localhost` siguen
   siendo dev-only.
5. **Electron baseline intacto.** `contextIsolation: true`, `nodeIntegration:
   false`, `sandbox: true`, `webSecurity: true`. No degradar nada.
6. **La lógica de Git NO se toca.** Ningún flujo existente (commit, push, pull,
   merge, rebase, stash, cherry-pick, amend, squash) cambia. La única escritura de
   Git NUEVA permitida es la materialización de Fase 6, y SOLO tras confirmación
   explícita del usuario.

Si en cualquier punto una invariante choca con "que funcione", **pará y
preguntá**. No degrades seguridad para destrabar nada.

---

## FASE 1 — Skill + módulos puros (cero riesgo, sin tocar la app)

**Objetivo:** meter los archivos que no dependen de nada del runtime.

1. Copiá la carpeta `.agents/skills/temporal-attention/` al repo tal cual.
2. Copiá `docs/TEMPORAL_AGENT_DESIGN.md` a `docs/`.
3. Copiá los módulos puros y sus tests:
   - `types/temporal-agent.ts`
   - `lib/speculative-projection.ts`
   - `lib/feedback-context.ts`
   - `lib/__tests__/speculative-projection.test.ts`
   - `lib/__tests__/feedback-context.test.ts`
4. Verificá que `lib/chronometric-projection.ts` del repo exporta `ProjectionConfig`
   y `mapLaneToBranchIndex` (los usa `speculative-projection.ts`). Si los nombres
   difieren, ajustá los imports de `speculative-projection.ts` — NO toques la
   proyección existente.
5. Corré `pnpm test` y `pnpm tsc --noEmit` (o el typecheck del repo).

**CHECKPOINT 1:** mostrame el resultado de los tests y el typecheck. No sigas hasta
que estén verdes.

---

## FASE 2 — Storage del agente en main (cifrado, sin red)

**Objetivo:** persistencia per-repo de config/notas + vault de keys. Cero red.

1. Copiá `electron/temporal-agent-ipc.ts` y `electron/ai/key-store.ts`.
2. Registrá los handlers: en `electron/main.ts`, importá y llamá
   `registerTemporalAgentHandlers()` junto a los otros `register*` (ver
   `electron/temporal-agent.bridge-additions.ts`, snippet 2).
3. Agregá el bridge en `electron/preload.ts` (snippet 1) y los tipos en
   `types/electron.d.ts` (snippet 3).
4. Confirmá que `key-store.ts` usa `safeStorage` y que `getKey()` **no** se expone
   por IPC (es interno de main). Invariantes 1 y 2.
5. Typecheck.

**CHECKPOINT 2:** mostrame el diff de `main.ts`, `preload.ts` y `electron.d.ts`.
Confirmá que ninguna key puede llegar al renderer.

---

## FASE 3 — Capa de proveedores + orquestador

**Objetivo:** dejar lista la cadena skill+doctrina+feedback+contexto → proveedor.

> **Proveedores reales que el usuario tiene HOY:** una key de **OpenRouter** (con
> crédito USD) y una de **OpenCode GO**. OpenRouter NO es un cuarto proveedor: es
> un router que con UNA key da acceso a Claude/GPT/Gemini por un endpoint
> compatible con OpenAI. Es el proveedor primario a usar. OpenCode es la familia
> local/gateway (endpoint configurable, auth opcional).

1. Copiá `electron/ai/predict.ts`, `electron/ai/providers/index.ts`,
   `electron/ai/providers/claude.ts`, `electron/ai/providers/openrouter.ts`.
2. **Los 2 cambios de una línea** (documentados arriba de `predict.ts`):
   - En `types/temporal-agent.ts`, `AIPredictionProvider.predictTimelines` debe
     recibir `AssembledPrompts` (definido en `predict.ts`), no `PredictionInput`.
     (El adapter de OpenRouter ya está escrito con esa firma.)
   - En `providers/claude.ts`, sacá el `await import('../predict')` dinámico.
3. `openrouter` ya está registrado como proveedor real en `providers/index.ts`.
   `openai`/`gemini`/`opencode` quedan como stubs hasta que se necesiten;
   `opencode` cuando se implemente debe permitir endpoint configurable y key
   opcional.
4. `gatherRawContext` usa `simple-git` SOLO para lectura (`git log`). Confirmá que
   no invoca ningún comando que escriba.
5. Typecheck.

**CHECKPOINT 3:** mostrame que la firma de `predictTimelines` es coherente en
todos los adapters (claude, openrouter, stubs) y que `predict.ts` carga skill +
doctrina (`loadSkillText` + `loadDoctrineText`).

---

## FASE 4 — IPC de predicción + Settings UI

**Objetivo:** que el usuario configure el agente y dispare una predicción.

1. Agregá el handler `ai:predict-timelines(repoPath)` en `main.ts` que llama a
   `runPrediction(...)` (arma config+notes desde el storage de Fase 2, elige el
   proveedor activo de prefs). Exponelo en `preload.ts` + `electron.d.ts`.
2. Copiá `components/TemporalAgentSettings.tsx` y montalo en el modal de Settings
   existente (buscá dónde se arman las secciones de Settings en `app/page.tsx`).
3. La UI solo maneja: enable, frequency, privacyScope, skill profile, y un
   booleano "¿hay key?" + alta de key (one-way). NUNCA muestra la key.
4. Disparo de predicción: por ahora un botón "Predecir futuros" que llama al IPC y
   loguea el `PredictionResult` (el dibujo es Fase 5).

**CHECKPOINT 4:** corré la app, mostrame la sección de Settings del agente
funcionando y un `PredictionResult` que vuelva (podés stubbear el proveedor si no
querés gastar tokens todavía).

---

## FASE 5 — Dibujar las ramas especulativas en la diagonal

**Objetivo:** ver los futuros sobre el grafo cronométrico real.

1. Copiá `components/SpeculativeBranches.tsx`.
2. Aplicá `ChronometricGraph.speculative.patch` al
   `components/ChronometricGraph.tsx` **del repo**:
   `git apply ChronometricGraph.speculative.patch` (o aplicá los hunks a mano si el
   archivo de 1.6.5 difiere — el patch es puramente aditivo: 3 props nuevas, el
   ancla HEAD y el render del overlay; NO modifica lógica existente).
3. Pasá el `PredictionResult.branches` del IPC a la prop `speculativeBranches`, y
   un toggle a `showSpeculative`.
4. Verificá la regla visual: especulativo = punteado, semitransparente, opacidad
   ligada a `confidence`, etiqueta "predicción". Nunca debe parecer un commit real.
5. Para probar sin IA, pasá 3 ramas mock primero.

**CHECKPOINT 5:** mostrame la diagonal con las ramas especulativas dibujadas
(mock o reales) y el toggle andando.

---

## FASE 5b — Panel Centauro (informe que será conversación)

**Objetivo:** el panel inferior central explica POR QUÉ la IA propuso cada rama.

> Filosofía **Centauro** (ajedrez avanzado de Kasparov): humano + IA le ganan a
> cualquiera de los dos solo; lo que gana es el *proceso de colaboración*. El
> usuario tiene voz y voto. Hoy construimos el informe estático, pero con la
> estructura de datos lista para que MAÑANA sea conversación, SIN reescribir.

1. La unidad de datos es un **hilo** (`SpeculativeDialogue` con `turns[]`), nunca
   un mensaje suelto. Ver `types/temporal-agent.ts` y `openingTurnFromBranch()`.
2. En el panel inferior central (donde el HUD muestra `TARGET_ACQUISITION //
   SCANNING`): al clickear una rama especulativa, mostrá el primer turno del hilo
   — el `rationale`, la evidencia del repo, el nivel de vuelo, y la explicación
   honesta de la confianza (por qué 0.7 y no 0.9). Esto es seguridad cognitiva:
   contrarresta la falsa certeza que da el HUD futurista.
3. **Fase informe (ahora):** el hilo tiene UN turno (de la IA), read-only.
4. **Fase conversación (después, NO ahora):** se agregan turnos user/agent. NO lo
   implementes todavía — solo dejá la estructura de hilo lista para que sumar
   turnos sea aditivo. No metas estado de chat ni input de texto aún.

**CHECKPOINT 5b:** clickeá una rama y mostrame su explicación en el panel.
Confirmá que el dato es un hilo de un turno, no un string suelto.

---

## FASE 6 — Materializar (opción B: confirmar antes de crear)

**Objetivo:** convertir una rama soñada en branch real, con confirmación visible.

> Esta es la ÚNICA escritura de Git nueva. Va con confirmación explícita.

1. Handler `git:materialize-idea(repoPath, idea)` en main que, SOLO tras
   confirmación, hace: `git branch <slug>` desde HEAD + escribe `IDEA.md` (título,
   rationale de la IA, nivel de vuelo, confianza, "próximos pasos") + `git commit`
   + `git tag flight/<nivel>`.
2. Antes de ejecutar, la UI muestra EXACTAMENTE qué se va a crear (nombre de
   branch, tag, contenido del `IDEA.md`) y pide confirmación. Recién ahí se llama
   al handler.
3. Slug provisional: `imagined/<idea-corta>` + tag `flight/<conservative|grounded|
   high|creative>`. El nombre exacto lo afinamos después; dejalo configurable.
4. Al materializar, registrá la decisión como `accepted` vía
   `temporal-agent:record-decision`.

**CHECKPOINT 6:** materializá una rama de prueba y mostrame: la branch creada, el
tag, y el primer commit con el `IDEA.md`. Confirmá que ningún OTRO flujo de Git
cambió.

---

## FASE 7 — CSP + SECURITY.md

**Objetivo:** cerrar la superficie de red y documentar el cambio de threat model.

1. Agregá SOLO el dominio del proveedor activo al `connect-src` de la CSP en
   `app/layout.tsx`. Para OpenRouter es `https://openrouter.ai`; para OpenCode, el
   endpoint/gateway que el usuario configure. Mantené `'unsafe-eval'`/`localhost`
   dev-only. No abras el `connect-src` a todos los proveedores a la vez.
2. En `SECURITY.md`: documentá el envío de contexto a un tercero como riesgo
   aceptado, mitigado por opt-in + scope per-repo; agregá la fila al threat model;
   notá que las keys van por `safeStorage` y nunca al renderer.
3. Si removiste `@google/genai` antes (v0.1.7) y ahora reintroducís un SDK,
   preferí HTTP directo al endpoint salvo que el SDK aporte valor claro
   (`predict.ts`/`claude.ts` ya usan `fetch` directo).

**CHECKPOINT 7:** mostrame el diff de la CSP y la sección nueva de `SECURITY.md`.

---

## Qué NO hacer

- No rediseñar la doctrina, la proyección ni el formato de feedback — ya están.
- No reescribir `ChronometricGraph.tsx`: el overlay es aditivo (aplicá el patch).
- No tocar la lógica de auth de Git ni el token de GitHub.
- No mandar nada a la IA sin disparo explícito del usuario.
- No incluir nombres de archivo en el contexto de IA salvo opt-in per-repo
  (`privacyScope === 'metadata-plus-files'`).
- No degradar ninguna invariante de seguridad para destrabar algo.
- No empezar una fase sin que la anterior esté en verde y mostrada.
- Ante cualquier ambigüedad: preguntá, no asumas.
