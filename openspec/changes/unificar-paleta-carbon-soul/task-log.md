# Registro de tildes

- 2026-08-26 10:29 — marcada — "5.7 Ampliar el detector: define «literal» demasiado angosto y por eso la línea de base llegó a"
- 2026-08-26 10:29 — marcada — "5.8 Retirar las diez referencias a tokens borrados que dejó nuestra propia migración:"
- 2026-08-26 10:29 — marcada — "5.9 Declarar `color-scheme` en `app/globals.css`. Sin eso el navegador pinta los controles"
- 2026-08-26 10:30 — marcada — "4.7 Rehacer la comprobación de 4.4 con el verde nuevo. Alejandro la dio por buena el"
- 2026-08-26 10:30 — marcada — "4.8 El grafo quedó con **dos verdes**, y hay que elegir uno."
- 2026-08-26 14:40 — marcada — "5.3 `DiffViewer` (23), `PageToasts` (23), `PredictionDetail` (22) y `RepoDetailsPanel` (21)."
- 2026-08-26 14:55 — marcada — "5.4 La cola: los veintitrés archivos restantes, de 13 violaciones para abajo."
- 2026-08-26 14:56 — marcada — "5.5 En cada tanda, conservar el significado de lo que se migra y declarar si algún estado dejó"
- 2026-08-26 14:56 — marcada — "5.6 Confirmar que la parte pendiente quedó en cero."
- 2026-08-26 16:56 — marcada — "6.1 Relevar los rótulos en versalita de la aplicación y declarar el número de partida. La"
- 2026-08-26 16:56 — marcada — "6.2 Ampliar el detector de escala antes de migrar: define «declaración» demasiado angosto."
- 2026-08-31 16:45 — marcada — "6.3 Para cada uso, resolver contra el escalón de la escala que le corresponde según el"
- 2026-08-31 16:45 — marcada — "6.4 En la hoja de estilos de la vista del ciclo hay doce rótulos y **los doce están en `xs`**,"
- 2026-08-31 16:45 — marcada — "6.5 Confirmar que la verificación de 1.5 ya no reporta nada."
- 2026-08-31 16:45 — marcada — "7.0 `pnpm build` sin errores. Va primero y no es una formalidad: un selector rechazado por el"
- 2026-08-31 16:45 — marcada — "7.1 `pnpm exec tsc --noEmit` sin errores de tipado."
- 2026-08-31 16:45 — marcada — "7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una."
- 2026-08-31 16:45 — marcada — "7.3 `openspec validate unificar-paleta-carbon-soul --strict` en cero."
- 2026-08-31 16:45 — marcada — "7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git."
- 2026-08-31 16:45 — marcada — "7.5 Informar la medición final contra la de 1.4 y la de 1.5: cuántos colores fuera de la paleta"
- 2026-08-31 17:14 — marcada — "6.6 Revisión visual: los rótulos se distinguen del texto y de los controles, y la jerarquía se"

## Evidencia de medición final (Tarea 7.5)

- **Línea de base de color (`lib/baselines/ui-color-baseline.json`)**:
  - `pendiente`: 0
  - `exento`: 219

- **Línea de base de escala tipográfica y espaciado (`lib/baselines/visual-scale-baseline.json`)**:
  - `pendiente`: 0
  - `exento`: 93 declaraciones
    - **Progresión de exenciones**: `85 → 90 → 93`
      - **85**: al 2026-08-26, declaradas en la tarea 6.2 (`ChronometricGraph.tsx` 81, `CommitGraph.tsx` 4 — invariante 12).
      - **90**: en HEAD (`497a02b`): +5 durante las tandas (`InteractiveRebasePanel.tsx` 1, `DiffViewer.tsx` 3, `SemanticGraphLens.tsx` 1).
      - **93**: estado final: +3 del bloque 2 (`OpenSpecUpdateReview.tsx` `marginTop: 1` por desplazamiento óptico en `AlertTriangle`).
    - **Desglose exacto por archivo**:
      - `components/ChronometricGraph.tsx`: 81
      - `components/CommitGraph.tsx`: 4
        *(Subtotal Invariante 12: 85)*
      - `components/InteractiveRebasePanel.tsx`: 1
      - `components/DiffViewer.tsx`: 3
      - `components/cartography/SemanticGraphLens.tsx`: 1
      - `components/pipeline/OpenSpecUpdateReview.tsx`: 3
        *(Total exenciones: 93)*
