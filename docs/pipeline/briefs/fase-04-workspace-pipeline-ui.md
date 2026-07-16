# Pipeline Fase 04 — Workspace visual per-repo

> Construye la solapa Pipeline y sus vistas usando datos F01–F03. Sigue siendo observación:
> no hay pause/interrupt/model switch. Ale escribe el CSS. Requiere F03 mergeada.
> Branch `pipeline/fase-04-workspace-ui`.

## Agentes recomendados

- **Builder markup/estado:** Claude Code.
- **Revisión accesibilidad/estados:** OpenCode o Antigravity.
- **Auditor funcional/seguridad:** Codex.
- **CSS:** Ale, fuera de la ejecución del agente.

## Resultado de producto

Para el repo activo, Pipeline responde primero:

> ¿Qué está pasando, cuánto está costando y necesita algo de mí?
>
> ¿Qué me está pidiendo decidir, en lenguaje claro, y qué pasa si digo sí, no o después?

Vistas dentro del workspace:

1. **Ahora:** agente/task/estado/tiempo/costo y acción humana pendiente.
2. **Inbox de decisiones:** solicitudes normalizadas, evidencia, opciones, consecuencias y riesgo
   con procedencia; read-only en esta fase.
3. **Vía del change:** propuesta → aprobación → builder/tasks → gates → auditor → fixer → merge.
4. **Árbol de agentes:** Hermes, hijos, roles, modelos, duración, usage y estado.
5. **Bitácora consciente:** reasoning emitido + resumen operativo + tools/events.
6. **Economía y contexto:** tokens, costo con procedencia, contexto y compresiones.
7. **Actividad y diffs:** archivos del working tree y DiffViewer existente.
8. **Detalle:** proposal/spec/tasks/auditoría/gates/decisiones.

## Reglas de UX

- Hecho confirmado, inferencia y futuro posible deben distinguirse semánticamente.
- `data-estado`, `data-provenance`, `data-veredicto`, `data-runtime`, `data-cost-basis`.
- Camino sólido = ocurrido; punteado = posible; retroceso = rechazo/corrección.
- Las decisiones humanas son estaciones propias: aprobar spec y merge final.
- Lenguaje humano antes que nombres de archivos/eventos.
- Vista avanzada permite ver payload técnico sanitizado, nunca por defecto.
- Reasoning inexistente muestra “este runtime no lo expone”, no un panel vacío engañoso.
- Costos/contexto desconocidos muestran “sin datos”, nunca `0`.
- Repo sin kit, Hermes desconectado y runtime degradado son estados normales.
- Aplicar `docs/pipeline/UX-DECISIONES.md`: riesgo/consecuencia unknown no se rellenan con texto
  generado; glosario base + términos del repo sanitizados.

## Tandas

### TANDA 0 — Wireframe semántico y contrato de estado

- Trazar cómo sumar `Pipeline` a TopBar/RepoMainView sin inflar `app/page.tsx`.
- Definir `PipelineWorkspace` como dueño del estado de esta feature.
- Definir layout, jerarquía de headings, navegación por teclado, live regions y empty/error states.
- Listar componentes y props; evitar bolsas de callbacks.
- **CHECKPOINT 0:** wireframe textual + árbol de componentes + fixtures visuales. Sin editar.

### TANDA 1 — Entrada y shell per-repo

- Cuarta pestaña Pipeline con i18n ES/EN/ZH.
- Montaje per-repo; cambio de tab cancela requests viejos y no mezcla snapshots.
- Ocultar panel derecho histórico irrelevante si el workspace ocupa el detalle propio.
- Loading, sin pipeline, sin Hermes, incompatible y error recuperable.
- Sin CSS nuevo: markup semántico y clases estables solamente.

### TANDA 2 — Vía, “Ahora” y decisiones

- Estado actual humano.
- Estaciones y loops de auditoría/fixer.
- Progreso de tasks.
- Próximos caminos explicados sin convertirlos en acciones.
- **Inbox de decisiones pendientes** contra `docs/pipeline/UX-DECISIONES.md`: zona prioritaria sobre
  el feed, una decisión por elemento, con qué-piden, por-qué, opciones/consecuencias conocidas,
  riesgo con procedencia, evidencia y contexto técnico expandible.
- F04 solo permite navegar, revisar evidencia/diff o copiar una respuesta. Aprobar, rechazar,
  enviar al fixer o responder a Hermes se muestran como no conectados hasta F05.
- Un repo sin kit conserva Pipeline con evidencia Git/Hermes/runtime; solo faltan gates/logs del kit.
- Selector de change cuando haya más de uno; no elegir arbitrariamente.

### TANDA 3 — Agentes, reasoning y economía

- Árbol parent/child con runtime/model/provider.
- Feed combinado con filtros: narrativo, reasoning emitido, tools, archivos, sistema.
- Contadores live de tiempo/tokens/costo/contexto.
- Badges de procedencia y tooltip/explicación humana.
- Agrupar deltas de alta frecuencia para no renderizar por token.

### TANDA 4 — Detalle y diffs

- Reusar `DiffViewer`; carga lazy de diff por archivo/branch.
- Proposal/Markdown seguro; no `dangerouslySetInnerHTML`.
- Hallazgos del auditor como estructura, gates history y decisiones.
- Archivo tocado muestra agente/task cuando la correlación exista; unknown si no.

### TANDA 5 — Integración CSS de Ale y QA

1. Agente entrega markup funcional y screenshot sin maquillar. STOP.
2. Ale escribe/modifica CSS y avisa qué tocó.
3. Agente relee esos archivos; no pisa CSS.
4. QA visual en resoluciones acordadas, keyboard, reduced motion y estados fixtures.

## Prompt copiable — builder Claude

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 04. Leé fuente de verdad, invariantes, índice Pipeline y brief
F04. Confirmá F03 mergeada. Branch pipeline/fase-04-workspace-ui desde main.

TANDA 0 primero: trazá TopBar/RepoMainView/page/store y entregá wireframe semántico, componentes,
props y estados. Esperá OK. Luego una tanda por vez.

Regla especial: NO escribas ni modifiques CSS, no agregues utility classes de estilo y no
inventes visuales inline. Entregá HTML/React semántico, accesible, clases claras y data-* para
que Ale haga la piel. Reusá DiffViewer y contratos existentes. No agregues controles ni model
selection. Strings ES/EN/ZH. No pongas estado global de Pipeline en app/page.tsx.

Checkpoint visual tras cada tanda. Cierre tsc/test/fallow/reporte, mensaje y comandos de
commit/push sugeridos sin ejecutarlos, y STOP.
```

## Prompt copiable — revisión Antigravity/OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. La revisión comienza read-only: no crees rama ni edites sin nuevo OK.
Revisá Pipeline F04 como usuario no técnico y como auditor de accesibilidad. No edites al inicio.
Recorré con teclado los estados: sin kit, sin Hermes, conectado, task activa, reasoning ausente,
costo desconocido, auditor rechazado, varios changes y error/reconnect. Reportá dónde la UI
obliga a entender términos técnicos, pierde foco, anuncia demasiado o confunde hecho/inferencia.
No evalúes estética/CSS: Ale la realiza aparte. STOP con hallazgos concretos.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá read-only Pipeline F04. Verificá scoping per-repo, cleanup de subscriptions, renders de
alta frecuencia, XSS/Markdown, secretos/payloads técnicos, i18n ES/EN/ZH, accesibilidad, reuse de
DiffViewer, ausencia total de controles y ausencia de cambios CSS. Validá que unknown no se
muestre como cero y derived no se muestre como hecho. Veredicto + hallazgos.
```

## Qué NO hacer

- No CSS, estilos inline ni utility styling.
- No copiar la terminal/TUI de Hermes dentro de GitCron.
- No controles, prompts ni approvals.
- No gráficos decorativos que oculten datos.
- No mostrar raw reasoning/payloads por defecto.
- No agregar charts/dependencias sin aprobación.
- No tocar ChronometricGraph/CommitGraph salvo reuse explícito aprobado.

## Criterios de aceptación

- [ ] Solapa Pipeline funciona por repo y no mezcla tabs.
- [ ] “Ahora” responde estado, agente, task, tiempo/costo y necesidad humana.
- [ ] Inbox explica decisiones sin jerga, conserva evidencia/procedencia y no ejecuta controles.
- [ ] Repo sin kit conserva Git/Hermes/runtime y explica qué fuentes faltan.
- [ ] Rechazo se ve como retroceso a fixer.
- [ ] Árbol de agentes + reasoning/tools + economía/contexto funcionan con fixtures/live.
- [ ] Diffs se reutilizan y cargan lazy.
- [ ] Empty/degraded/unknown son honestos.
- [ ] i18n ES/EN/ZH, teclado y visual QA.
- [ ] Cero cambios CSS hechos por agentes.
