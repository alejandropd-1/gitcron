## Why

Durante la redacción del mensaje de commit con IA local, el panel de preparación muestra el razonamiento del modelo en un bloque con desplazamiento propio. Cuando el razonamiento es extenso, seleccionarlo con el mouse dentro del contenedor con scroll resulta incómodo y propenso a pérdidas de contenido. Se necesita un control directo para copiar el texto completo del razonamiento al portapapeles con un solo clic.

## What Changes

- Se añade un control de copiado sobre el bloque de razonamiento en `components/pipeline/CommitDraftLog.tsx` que copia la totalidad de `log.reasoning` mediante `navigator.clipboard.writeText`.
- Se añade un estado de confirmación transitorio visual y accesible al pulsar el botón.
- El control sólo se renderiza cuando existe razonamiento (`log.reasoning.length > 0`).
- Se incorporan las claves de traducción correspondientes en `lib/i18n.ts` para español, inglés y chino (ES, EN, ZH).
- Queda fuera de alcance modificar el protocolo de captura o transporte de tokens SSE, la lógica de commit, o alterar otros componentes de la interfaz.

## Capabilities

### New Capabilities
- `commit-draft-reasoning-clipboard`: Capacidad de copiar el texto completo del razonamiento generado por el modelo local desde el registro de redacción.

### Modified Capabilities

## Impact

- Componentes afectados: `components/pipeline/CommitDraftLog.tsx` y su módulo de estilos `components/pipeline/OpenSpecDashboard.module.css`.
- Internacionalización: `lib/i18n.ts` añade claves en ES, EN y ZH.
- Pruebas: `components/pipeline/__tests__/commit-draft-log.test.tsx`.
- Sin dependencias externas ni cambios en APIs o persistencia.
