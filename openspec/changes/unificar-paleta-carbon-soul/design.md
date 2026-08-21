## Context

`app/globals.css` declara la paleta general, hoy «The Compiled Carbon Soul»: armazón `#272c36`,
contenido `#2e3440`, diálogos `#3b4252`, más los acentos heredados de la paleta anterior —verde
`#a3f185`, cian `#5ed8ff`, ámbar `#fd9d1a`— y los colores de estado de Git.

`components/pipeline/OpenSpecDashboard.module.css` declara diez tokens propios: `--os-bg`,
`--os-surface`, `--os-surface-strong`, `--os-muted`, `--os-border`, `--os-border-strong`,
`--os-green`, `--os-cyan`, `--os-amber` y `--os-violet`. Es la única hoja de estilos con módulo
propio que queda en el proyecto, y la única vista con paleta propia.

El invariante 11 incorporó el 2026-08-20 la regla de paleta única. Este change la implementa.

## Goals / Non-Goals

**Goals:**

Que exista un solo lugar del que salga el color. Que los acentos pertenezcan a la misma familia que
los fondos sin perder su significado. Que la regla se sostenga sola, verificada, y no dependa de que
alguien la recuerde.

**Non-Goals:**

La disposición de Pipeline. Los colores del lienzo cronométrico, protegidos por el invariante 12.
Agregar colores que no resuelvan un caso existente. Rediseñar la paleta: se conserva la vigente y se
la completa donde haga falta.

## Decisions

**Los tokens de Pipeline se resuelven contra la paleta general antes de decidir si falta algo.** El
orden importa: primero se busca a qué token general corresponde cada uno de los diez, y sólo lo que
no tenga equivalente se propone incorporar. Al revés —agregar diez tokens generales equivalentes a
los diez propios— se conserva el problema con otro nombre.

**Los acentos se revisan, no se reemplazan por una paleta ajena.** Se evaluó adoptar los acentos de
la familia de la que salen los fondos nuevos, que vendrían armonizados de fábrica, y se descartó: los
colores de Git cargan significado aprendido, y cambiarlos en bloque por venir de otro conjunto
cambiaría el vocabulario de la aplicación por una razón estética. Se ajusta lo que desentona,
conservando qué significa cada uno.

**La verificación es de procedencia, no de valor.** No comprueba que un color sea correcto —eso no es
verificable— sino que provenga de la paleta. Es la misma naturaleza que las verificaciones de escala
que ya existen, y se implementa igual: función pura sobre el texto de la hoja, cubierta con tabla de
casos.

**La distinción entre acentos queda como comprobación humana.** La verificación de contraste mide
cada color contra su fondo, no unos contra otros. Que verde, ámbar y cian sigan siendo distinguibles
entre sí después de armonizarlos no lo puede decir un test: lo dice quien los mira.

## Risks / Trade-offs

**Armonizar puede acercar acentos entre sí** → El verde de agregado y el ámbar de modificado viven
juntos en el mismo diff. Si al ajustarlos se parecen más, el diff pierde legibilidad aunque cada
color cumpla su contraste. La mitigación es declararlo como comprobación humana y mirarlo en un diff
real, no en una paleta aislada.

**Retirar los tokens de Pipeline puede cambiar más de lo previsto** → Diez tokens en una hoja de
estilos de una vista densa: no está medido cuántas declaraciones los consumen. Se informa antes de
migrar.

**La verificación puede volverse ruidosa** → Si detecta como violación cada color dentro de un SVG
embebido o de un dato, deja de servir. Debe distinguir el color que compone la interfaz del que
pertenece a un contenido, y esa distinción se declara al escribirla.

## Migration Plan

Primero la verificación, fallando, con el número de partida registrado. Después el relevamiento de
los diez tokens de Pipeline contra la paleta general, que dice cuánto falta. Después la incorporación
de lo que falte, con nombre general. Después la migración de Pipeline. Por último la revisión de
acentos, que es lo más sensible y conviene hacer sobre una base ya unificada.

No hay migración de datos. Revertir es descartar cambios no confirmados.

## Open Questions

Cuántas declaraciones de Pipeline consumen sus tokens propios, y cuántos de los diez tienen
equivalente en la paleta general. No está medido.

Si los acentos armonizados siguen siendo distinguibles entre sí en un diff real. Sólo se responde
mirando.
