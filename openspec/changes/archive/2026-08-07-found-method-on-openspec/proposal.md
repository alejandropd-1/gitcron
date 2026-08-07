## Why

Este proyecto fue armando su método sobre la marcha: cada vez que algo salía mal se escribía una regla
para que no volviera a pasar. Muchas de esas reglas resultaron ser cosas que OpenSpec ya resolvía, y
nadie lo había comprobado.

Se midió al auditar `openspec/config.yaml` contra la salida de `openspec instructions`. De dieciséis
reglas del proyecto, **ocho** decían lo mismo que el CLI ya entrega: el formato de las tareas con
secciones numeradas y casillas `N.M`, las cuatro almohadillas de un escenario, el bloque entero que
exige MODIFIED, las alternativas de cada decisión, los riesgos con su mitigación. Se retiraron en
`prune-duplicated-rules`.

El caso más caro fue `carry-task-form-in-config`, que agregó reglas de forma partiendo de que la
convención de numerar «se sostiene por imitación y no porque el canal la transporte». Era falso: el
canal la transporta, con ejemplo. Ese change resolvió un problema que no existía, y el problema real
—un ejecutor sin sus skills instaladas— siguió sin tocarse.

Lo que falta es el criterio escrito. Sin él, la próxima regla se escribe igual que las anteriores: por
reacción, sin contrastar contra lo que ya viene resuelto. Ya pasó una vez.

## What Changes

- `AGENTS.md` declara que la base del método es OpenSpec, y que lo propio existe sólo cuando cubre algo
  que OpenSpec no cubre.
- Declara cómo se comprueba: contrastar contra `openspec instructions` antes de escribir una regla.
- Declara el límite del principio: OpenSpec es una implementación concreta, no un estándar ratificado,
  así que ceder ante ella es la regla y no un acto de fe.
- `openspec/config.yaml` lo menciona y remite.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el proyecto declara que su método se funda en OpenSpec y qué justifica una
  regla propia.

## Impact

**Producción:** `AGENTS.md` y `openspec/config.yaml`. Ningún cambio de código.

**Sin tocar:** las once reglas que sobrevivieron a la poda, el `context` del proyecto —comandos de
cierre, política de Git, rama por cambio, runtime— y el circuito de commit y archivado, que es una
práctica de Ale y no una regla del método.

**Fuera de alcance:** revisar el vocabulario del panel contra los cinco verbos de OpenSpec —propose,
apply, archive, explore, sync—, y revisar las prácticas de Git contra lo que OpenSpec propone. Son
consecuencias de este principio y merecen su propio análisis, no un renglón acá.

**Dependencias:** ninguna. Enuncia el criterio que `prune-duplicated-rules` ya aplicó.

**Riesgo:** el principio puede leerse como «OpenSpec siempre tiene razón», y eso sería peor que no
tenerlo. Mitigación: la declaración dice explícitamente que OpenSpec es una implementación y no un
estándar, y que una regla propia se sostiene si cubre algo que la herramienta no cubre. Ceder por
defecto, no por fe.
