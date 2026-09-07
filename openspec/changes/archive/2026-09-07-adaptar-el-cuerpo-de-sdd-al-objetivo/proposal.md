# El cuerpo muestra lo que sirve al objetivo del momento

## Why

`remaquetar-cuerpo-de-sdd` reordenó el cuerpo de la vista del ciclo y **su revisión visual se
rechazó**. No por mala ejecución: por la regla que ese change se puso a sí mismo, en su Why y en su
tarea 2.2 —«no agrega información ni la quita: mueve, agrupa y jerarquiza lo que ya está»—. Con esa
restricción, un cuerpo amontonado sólo puede reordenarse: nada puede dejar de mostrarse, así que el
montón se reubica y sigue empujando. Tareas empuja evidencia, evidencia empuja actividad, y
actividad termina fuera de vista al fondo de un scroll.

El 2026-09-04, mirando el resultado, Alejandro nombró lo que falta con un ejemplo concreto: la
interfaz de Codex, **donde cada ítem aparece según la circunstancia, queda disponible si se lo
quiere, y si no, no ocupa lugar ni se va al fondo de un scroll infinito**. Su frase: «tiene que
mostrarse lo que sirva, y no amontonarse todo».

Dos de las fallas que denunció ya son incumplimientos de requisitos consolidados, no preferencias
nuevas:

- «El contenido de los artefactos se lee con ritmo» exige que párrafos y encabezados se distingan
  por su separación. El markdown de las solapas sigue plano.
- «Un control no desplaza a los demás al cambiar» establece el principio de no moverle a nadie lo
  que está mirando, pero hoy sólo alcanza a un control que cambia su texto o su cuenta, no a una
  sección que se despliega y empuja a otra.

Lo que falta es la regla general, y que valga para lo que venga: a medida que la aplicación adopte
lo que OpenSpec 1.11 ya trae, van a aparecer más cosas que mostrar. Si la regla no está escrita
antes, cada una se va a apilar en la misma columna.

## What Changes

- La disposición del cuerpo del ciclo pasa a ser **condicional**: cada superficie aparece cuando
  sirve al objetivo del momento y no ocupa lugar cuando no.
- Ninguna superficie que se despliega desplaza lo que se estaba mirando.
- La evidencia deja de convivir con las tareas en la misma columna y se alcanza desde un control
  junto a ellas.
- Se resuelve el rol de «Actividad»: qué muestra, si sirve, y si el desplegable homónimo del panel
  derecho ya lo cubre.
- El estado del repositorio muestra los cambios en curso, y crear un cambio nuevo deja de llamarse
  «Siguiente paso», que no dice lo que hace.
- **Un panel lateral flotante donde aparece lo que va surgiendo**, al modo de la interfaz de Codex
  que Alejandro puso como referencia el 2026-09-04: cada cosa entra cuando la circunstancia la trae
  —cambios, rama, fuentes, acciones disponibles—, queda ahí para usarla si se la quiere, y cuando no
  corresponde no está. Es la forma concreta de la tesis: lo que aparece lo trae el momento, no una
  lista fija.

**Alcance de ese panel, declarado ahora para no decidirlo dos veces:** Alejandro anotó que el patrón
puede escalar a toda la interfaz de GitCron, más allá del ciclo. Este change lo resuelve **sólo para
el cuerpo del ciclo**, y deja el mecanismo escrito de modo que otra vista pueda adoptarlo sin
rehacerlo. Extenderlo al resto de la aplicación es otro change y otra decisión.

## Capabilities

**Modified Capabilities**
- `pipeline-guided-workflow` — se generaliza «Un control no desplaza a los demás al cambiar», hoy
  limitado a un control que alterna su texto o su cuenta, y se agrega el requisito de la disposición
  condicional.

**New Capabilities**
- Ninguna. La regla vive donde ya viven las del panel, para que no termine escrita en dos lados.

## Impact

- El cuerpo de la vista del ciclo: cabecera, tareas, evidencia, actividad y la pantalla de estado
  del repositorio.
- `lib/i18n.ts` en sus tres idiomas, para los rótulos que dejen de mentir sobre lo que hacen.
- Sin dependencias nuevas. Sin cambios en el protocolo con OpenSpec.

**Fronteras con los changes vecinos**, declaradas para que nadie las cruce:

- `remaquetar-cuerpo-de-sdd` aportó el piso medido —el área de trabajo que crece, las reglas del
  markdown, el CSS muerto retirado, la caja pesada del aviso de rama— y queda reducido a eso. Este
  change lo continúa bajo otra tesis, no lo repite.
- `gestionar-ciclo-openspec-desde-gitcron` construye la **operación** y es el dueño de la vista del
  recorrido de artefactos, en su sección 3c. La observación de Alejandro sobre la línea de tiempo
  con nodos unidos pertenece a esa sección, no a este change.
- `explicar-el-ciclo-sin-tecnicismos` decide **qué dicen** los rótulos y las explicaciones. Este
  change decide **cuándo aparecen y dónde**.
