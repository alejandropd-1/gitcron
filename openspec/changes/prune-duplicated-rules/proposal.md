## Why

Las reglas de `openspec/config.yaml` repiten cosas que OpenSpec ya entrega. Se auditó regla por regla
contra la salida de `openspec instructions`, y ocho de dieciséis dicen lo mismo que el propio CLI ya
manda en el campo `instruction` de cada artefacto.

La instrucción de tareas trae textualmente «Group related tasks under `##` numbered headings» y «Each
task MUST be a checkbox: `- [ ] X.Y Task description`», con ejemplo. La de specs trae «**CRITICAL**:
Scenarios MUST use exactly 4 hashtags» y el flujo completo de MODIFIED con «MUST include full updated
content». La de design pide «Include alternatives considered for each decision» y «Format: [Risk] →
Mitigation». Todo eso está también en nuestras reglas, escrito de nuevo.

Una regla repetida no es gratis: gasta atención del ejecutor en algo que recibió dos párrafos antes, y
entierra las que sí son de este proyecto entre las que no aportan nada.

El caso que hay que corregir de raíz es el de `carry-task-form-in-config`, que agregó cuatro reglas de
forma para que un `tasks.md` se escribiera con secciones numeradas. Se dio por sentado que la convención
«se sostiene por imitación y no porque el canal la transporte». Era falso: el canal la transporta, en la
`instruction` de OpenSpec. El ejecutor que se desvió no la recibió por otro motivo —no tenía instalada la
skill que le enseña a pedir instrucciones—, y ese es un problema de instalación, no de reglas.

## What Changes

- Se retiran ocho reglas: las seis que duplican lo que OpenSpec ya entrega, más las dos que
  `carry-task-form-in-config` agregó para un problema que resultó ser otro.
- Quedan las once que dicen algo que OpenSpec no dice.
- El archivo declara el criterio, para que la próxima regla se mida contra el CLI antes de escribirse.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: las reglas del proyecto no repiten lo que el CLI ya entrega.

## Impact

**Producción:** `openspec/config.yaml`, sólo el bloque `rules`. Ningún cambio de código.

**Sin tocar:** el `context`, que es íntegramente de este proyecto —comandos de cierre, política de Git,
rama por cambio, runtime—; las reglas que quedan; y `carry-task-form-in-config`, que está archivado y no
se reescribe.

**Fuera de alcance:** sembrar reglas en repositorios ajenos. Después de la auditoría quedan tres reglas
genuinamente universales, y tres reglas no justifican una función del panel.

**Dependencias:** ninguna.

**Riesgo:** bajo, y conviene nombrarlo. Si OpenSpec quitara alguna de esas instrucciones en una versión
futura, la regla equivalente ya no estaría acá para cubrirla. Se asume porque el CLI es la fuente del
método y seguirlo es el punto; y porque la comprobación —contrastar con `openspec instructions`— es
barata y quedó escrita en el propio archivo.
