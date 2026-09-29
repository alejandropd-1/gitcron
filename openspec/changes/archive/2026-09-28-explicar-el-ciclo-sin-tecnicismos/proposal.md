# El ciclo se explica solo, en castellano llano

## Why

El 2026-09-04, mirando la aplicación, Alejandro —que construyó este panel y lo usa todos los días—
dijo textual: **«no sé qué es la intención y dónde está la propuesta»**. Si la persona que escribió
la herramienta no reconoce el vocabulario de su propia pantalla, nadie más va a hacerlo.

No es un problema de disposición. La pantalla nombra las cosas como las nombra OpenSpec —propuesta,
specs, delta, artefacto, archivar— y da por sabido lo que significan. Las cinco pestañas de
evidencia son cinco palabras sin explicación: «Propuesta», «Diseño», «Specs (1)», «Tareas»,
«Archivos y diffs (0)».

El precedente de que esto se puede resolver ya existe y funciona: el requisito «El formulario
declara qué hace con lo que se escribe» hizo que cada campo de empezar un cambio diga dónde termina
su contenido —«Texto que recibe el ejecutor en la línea Objetivo. No se guarda en ningún archivo»—.
Esa exigencia hoy alcanza a un solo formulario. Lo que falta es el resto del panel.

## What Changes

- Cada control y cada campo del ciclo declara, en castellano llano, qué hace y adónde va lo que se
  escribe. Se extiende al panel entero la regla que hoy rige sólo el formulario de empezar un cambio.
- Los nombres de OpenSpec se muestran acompañados de qué son: una propuesta, una spec, un delta, un
  artefacto, archivar. Sin reemplazar el término —el vocabulario de la herramienta se aprende, no se
  esconde—, pero sin exigir conocerlo de antemano.
- Un glosario dentro de la aplicación: qué es cada pieza del método, para qué sirve, y en qué orden
  aparecen en el ciclo.
- Qué trae la versión instalada de OpenSpec y qué cambió respecto de la anterior, leído de la
  herramienta y no escrito a mano.

## Capabilities

**Modified Capabilities**
- `pipeline-guided-workflow` — el requisito «El formulario declara qué hace con lo que se escribe»
  hoy obliga sólo al formulario de empezar un cambio. Se extiende a todo control del ciclo que
  reciba texto o dispare una operación, y se agregan los requisitos del vocabulario y del glosario.

**New Capabilities**
- Ninguna carpeta nueva. El glosario entra como requisito de `pipeline-guided-workflow`, porque es
  una superficie del mismo panel y compartir capacidad evita que la regla del vocabulario termine
  viviendo en dos lados.

## Impact

- Los rótulos y textos de ayuda del panel del ciclo, y `lib/i18n.ts` en sus tres idiomas.
- Una superficie nueva de glosario dentro del panel.
- La tarjeta del motor, para lo que trae la versión instalada.
- Sin dependencias nuevas. Sin cambios en el protocolo con OpenSpec: lo que se explique sale de lo
  que el CLI ya devuelve, o se declara escrito a mano y por qué.

**Fronteras con los changes vecinos**, declaradas para que nadie las cruce:

- `remaquetar-cuerpo-de-sdd` decide **dónde va cada cosa**; este change decide **cómo se llama y
  cómo se explica**. Su observación 12 nombra el mismo defecto de las pestañas: la ubicación es de
  aquél, las palabras son de éste.
- `gestionar-ciclo-openspec-desde-gitcron` construye la **operación** —editar tareas, escribir
  artefactos— y su tarea 6.7 el aviso de actualización del motor. Este change no construye
  operaciones: explica las que existan.
