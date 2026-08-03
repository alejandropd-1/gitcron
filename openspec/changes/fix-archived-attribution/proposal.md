## Why

Al archivar un change sin commitear, los restos del archivado —`openspec/changes/archive/<fecha>-<id>/…` y `openspec/specs/…`— quedan modificados en el árbol. Al seleccionar otro change activo, el panel "Preparar el commit del cambio" los lista como propios de ese change, porque la atribución no distingue "es de un change archivado" de "es código no atribuible". Es un defecto vivo en `main`: el test que hoy lo cubre (`lib/__tests__/change-commit-scope.test.ts:38`) pasa y consagra el comportamiento equivocado al exigir `foreign: []` con un archivo archivado presente.

## What Changes

- `artifactChangeId` deja de devolver `null` para los restos de archivado y distingue tres casos —change, archivado y código— para que los archivados, junto con `openspec/specs/`, nunca caigan en `own` de un change activo.
- El test "un cambio archivado no cuenta como cambio en curso" se corrige para verificar el caso real: el archivo archivado queda fuera, y el código no atribuible del propio change sigue entrando en `own` cuando no hay ambigüedad.
- Se agrega cobertura nueva que hoy no existe: un restos de archivado presente en el árbol nunca entra en `own`.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `pipeline-guided-workflow`: el requisito "El alcance se deriva, no se declara" pasa a cubrir los restos de archivado como caso explícito —no se preparan como parte de un change activo por defecto—.

## Impact

- `lib/change-commit-scope.ts`: la firma interna de `artifactChangeId` pasa a distinguir tres clases en vez de dos valores (`null` ↔ id).
- `lib/__tests__/change-commit-scope.test.ts`: se corrige el caso que consagraba el bug y se agrega el caso de los restos de archivado.
- Sin impacto en UI ni en IPC: la derivación ya es la entrada del panel y su contrato público (`own`, `foreign`, `suggestedMessage`) no cambia.
