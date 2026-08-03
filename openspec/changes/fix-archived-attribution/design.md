## Context

`artifactChangeId` (en `lib/change-commit-scope.ts:28`) clasifica un archivo modificado en dos valores: el id del change al que pertenece, o `null`. Devuelve `null` para dos clases distintas que hoy se tratan igual: el código que no es artefacto de ningún change, y los restos de un archivado (`openspec/changes/archive/…`). En `deriveChangeCommitScope:106`, cuando no hay ambigüedad (un solo change activo con artefactos tocados), todo lo que dio `null` cae en `own` —incluidos los restos del archivado—.

El defecto fue consagrado por un test: "un cambio archivado no cuenta como cambio en curso" (`lib/__tests__/change-commit-scope.test.ts:38`) verifica que `components/algo.tsx` entre en `own`, que está bien, pero no verifica qué pasa con el archivo archivado, y al exigir `foreign: []` fuerza al archivado a caer en `own`.

## Goals / Non-Goals

**Goals:**
- Que los restos de un archivado nunca entren en el alcance de un change activo por defecto.
- Que el código no atribuible siga entrando en `own` cuando no hay ambigüedad —ese comportamiento es correcto y se conserva—.
- Corregir el test que consagra el bug y agregar cobertura nueva del caso archivado.

**Non-Goals:**
- No se ofrece preparar los restos del archivado como un caso propio desde el panel. Eso es un hueco de diseño separado (mencionado en el handoff), y la decisión de cómo cerrarlo —usar `archiveCommitPaths` o dejarlo manual— es de Ale.
- No se cambia el contrato público `ChangeCommitScope` (`own`, `foreign`, `suggestedMessage`): la corrección es interna.

## Decisions

### Distinguir tres clases en `artifactChangeId`, no dos valores

Cambiar la firma interna a un discriminated union `{ kind: 'change'; id: string } | { kind: 'archived' } | { kind: 'code' }`, y reescribir el loop de `deriveChangeCommitScope` para que `archived` (y, por extensión, cualquier `openspec/specs/…`) caiga siempre en `foreign`, sin depender de la ambigüedad.

**Alternativa descartada:** dejar la firma `string | null` y agregar un chequeo separado para `archive/` en el loop. Es menos expresiva y vuelve a mezclar "código" con "archivado" en el mismo valor: el defecto nació justamente de tratar a ambos como `null`.

**Alternativa descartada:** tratar `openspec/specs/…` como `code` (entrar en `own` cuando no hay ambigüedad). Las specs consolidadas pertenecen al archivado, no al change activo, así que deben seguir la misma regla que `archive/…`. En la práctica ya vivían bajo el prefijo `openspec/` y por eso `deriveScope` las ignoraba; aquí se las excluye del alcance de preparación por la misma razón.

### El código no atribuible conserva su regla actual

El `code` sigue dependiendo de la ambigüedad: entra en `own` con un solo change tocando artefactos, y en `foreign` con varios. Es la decisión original del change `confirm-work-in-git` y es correcta —no se toca—. El arreglo sólo cambia el destino de `archived`.

## Risks / Trade-offs

- **[Riesgo] Un change que toque a la vez sus artefactos y `openspec/specs/…` por otra razón** (no archivado) vería las specs listadas como `foreign`. → **Mitigación:** en `main`, `openspec/specs/…` sólo cambia por consolidación de archivado o por edición manual de specs vivas; el primer caso es el que se cubre, y el segundo es una decisión deliberada de la persona, que puede elegir incluir el archivo a mano. No se pierde capacidad, sólo se deja de incluir por defecto.
- **[Riesgo] Cambio de comportamiento observable para quien confiaba en el bug.** → **Mitigación:** la documentación (`docs/00_FUENTE_DE_VERDAD.md`, specs) nunca prometió que los restos entraran en `own`; era comportamiento no especificado. El test que lo consagraba se corrige junto con la lógica.

## Migration Plan

Sin migración: la corrección es a una función pura y a su test. No hay persistencia ni estado guardado. Verificación: `pnpm exec vitest run lib/__tests__/change-commit-scope.test.ts` y `openspec validate fix-archived-attribution --strict`.

## Open Questions

- **Hueco de diseño separado (fuera de este change):** cómo ofrecer preparar los restos del archivado una vez que el change ya no está activo. La función `archiveCommitPaths` (en `electron/pipeline/change-commit-manifest.ts:22`) sigue existiendo para ese fin. Decisión pendiente de Ale.
