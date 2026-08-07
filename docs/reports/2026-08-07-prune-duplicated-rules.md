# Las reglas del proyecto dejan de repetir a OpenSpec

**Change:** `prune-duplicated-rules` · **Fecha:** 2026-08-07 · **Tareas:** 12/14 (falta que Ale confirme
las que quedan y el cierre)

## Qué se hizo

De dieciséis reglas en `openspec/config.yaml` quedaron once. Ningún cambio de código.

## La auditoría, regla por regla

`openspec instructions <artefacto> --json` devuelve por separado lo que pone OpenSpec —`instruction` y
`template`— y lo que pone el proyecto —`context` y `rules`—. Se comparó una contra otra.

**Duplicaban, y se fueron:**

| Regla del proyecto | Lo que OpenSpec ya entrega |
|---|---|
| Secciones `## N.` y casillas `N.M` | «Group related tasks under `##` numbered headings» + «Each task MUST be a checkbox: `- [ ] X.Y`», con ejemplo |
| Cada tarea es una casilla verificable | «Each task MUST be a checkbox» + «Each task should be verifiable» |
| Escenarios con cuatro almohadillas | «**CRITICAL**: Scenarios MUST use exactly 4 hashtags» |
| MODIFIED exige el bloque entero | «MUST include full updated content» + workflow de cuatro pasos |
| Cada decisión con su alternativa | «Include alternatives considered for each decision» |
| Riesgos con su mitigación | «Format: [Risk] → Mitigation» |

**Se fueron dos más, por otro motivo:** «no agregar marcas propias a las casillas» y «la forma rige
igual al retro-documentar». No duplicaban nada, pero nacieron de un diagnóstico equivocado.

**Ninguna contradice a OpenSpec.** Hay una tensión, no contradicción: la instrucción de propuesta pide
«Keep it concise (1-2 pages)» y la regla del proyecto pide prosa densa con alternativas y evidencia. Las
propuestas de este repositorio suelen pasar esas dos páginas. Se declara sin resolver.

## El diagnóstico que había que corregir

`carry-task-form-in-config` agregó reglas de forma sobre esta premisa: que la convención de numerar
«se sostiene por imitación de los archivos vecinos, no porque el canal la transporte». **Era falsa.** El
canal la transporta, y con ejemplo, en la `instruction` de OpenSpec.

El ejecutor que se desvió no la recibió por otro motivo: no tenía instalada la skill que le enseña a
pedir instrucciones. Se midió sobre los repositorios reales —`C:\www\odontoPau` tiene
`.codex/skills/openspec-*` y **no tiene `.agent/`**, que es donde van los de Antigravity— y se leyó la
skill, que dice «Follow the `instruction` field from `openspec instructions`» y «**IMPORTANT**:
`context` and `rules` are constraints for YOU».

Sin ese archivo, el canal está lleno y nadie lo abre. Es un problema de instalación, no de reglas.
Aquel change resolvió algo que no era el problema, y esto lo deja escrito.

## Qué quedó

`proposal` 4, `specs` 3, `design` 1, `tasks` 3. Comprobado por el canal después de podar.

Las tres de tareas son las que OpenSpec no cubre: quién marca una casilla que depende de una validación
humana —su bucle de apply asume que el agente hace todo—, no implementar sobre un change archivado, y
redactar cada tarea para quien no participó de la conversación.

El archivo declara ahora el criterio, para que la próxima regla se mida contra el CLI antes de
escribirse. Sin eso la duplicación vuelve: ya volvió una vez.

## Lo que esto cierra

Sembrar reglas del proyecto en repositorios ajenos deja de tener sentido. Después de la auditoría quedan
tres reglas genuinamente universales, y tres reglas no justifican una función del panel. Lo que sí sirve
en cualquier repositorio es que las herramientas tengan sus skills instaladas, que es trabajo del propio
CLI.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **107 archivos / 779 tests**, sin variación: no se tocó
código. `openspec validate prune-duplicated-rules --strict` válido.
