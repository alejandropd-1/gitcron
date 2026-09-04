# Tareas

Las fases se envían por separado y entre fase y fase hay revisión visual de Alejandro. **Esta vez se
cumple.** En `remaquetar-cuerpo-de-sdd` la implementación entera vino en una sola tanda, se vio todo
junto y se rechazó todo junto, sin que hubiera un punto intermedio donde frenar.

## 1. Qué se muestra hoy y bajo qué condición

- [ ] 1.1 Listar cada superficie del cuerpo del ciclo y declarar, con archivo y línea, bajo qué
  condición aparece hoy. Acotado al cuerpo: no es un inventario del producto.
- [ ] 1.2 Para cada una, declarar qué evidencia observada podría condicionarla —hay sesión, hay
  diffs, hay tareas sin completar, hay artefactos habilitados— y cuál está siempre presente sin
  motivo. Lo medido el 2026-09-04 sobre «Actividad» es el caso de partida, no el único.
- [ ] 1.3 Declarar qué queda del piso que dejó `remaquetar-cuerpo-de-sdd` y sirve bajo esta tesis, y
  qué de lo que hizo hay que deshacer. Su commit está en la rama `change/remaquetar-cuerpo-de-sdd`.
  No se revierte a ciegas: arregló cosas medidas.

## 2. Las nueve observaciones del rechazo

- [ ] 2.1 Confirmar contra el árbol las nueve observaciones de la revisión visual del 2026-09-04,
  anotadas como tarea 1.4 de `remaquetar-cuerpo-de-sdd`, y declarar cuáles resuelve esta tesis y
  cuáles necesitan trabajo aparte. Andar directo a lo que cada una nombra; no barrer el repositorio.
- [ ] 2.2 Declarar cuáles **no** son de este change y quién las hereda: la línea de tiempo de
  artefactos con nodos unidos es la sección 3c de `gestionar-ciclo-openspec-desde-gitcron`, y las
  palabras de los rótulos son de `explicar-el-ciclo-sin-tecnicismos`.
- [ ] 2.3 Dos de las observaciones incumplen requisitos que ya están consolidados: el markdown plano
  contra «El contenido de los artefactos se lee con ritmo», y el empuje de una sección sobre otra
  contra «Un control no desplaza a los demás al cambiar». Declararlo como incumplimiento y no como
  pedido nuevo: cambia quién tiene que arreglarlo y con qué urgencia.

## 3. La disposición condicional

- [ ] 3.1 Proponer la disposición del cuerpo bajo la tesis, sin implementarla, declarando para cada
  superficie la condición por la que aparece y de qué evidencia se deriva. **La aprueba Alejandro.**
- [ ] 3.2 La propuesta responde con nombre y apellido a: dónde va la evidencia si no convive con las
  tareas; qué pasa con «Actividad» y si el desplegable del panel derecho ya la cubre; qué muestra el
  estado del repositorio y cómo se llama crear un cambio nuevo, que hoy se llama «Siguiente paso» y
  no dice lo que hace.
- [ ] 3.3 Declarar si «Tengo clara la tarea» y «Quiero definirla mejor» siguen siendo dos caminos y
  cómo se distinguen. Medido: son distintos —uno crea el cambio y su rama, el otro no crea nada— y
  hoy se ven iguales. Lo que **dicen** es de `explicar-el-ciclo-sin-tecnicismos`; lo que se decide
  acá es si siguen siendo dos controles y con qué peso.
- [ ] 3.4 Resolver la forma del panel lateral flotante. Referencia declarada por Alejandro el
  2026-09-04: la interfaz de Codex, donde el panel de entorno va sumando lo que la circunstancia
  trae —los cambios con su conteo, la rama, las fuentes, las acciones disponibles— y lo que no
  corresponde no está. Decidir: qué lo dispara, dónde vive, si flota sobre el contenido o lo
  acompaña, qué pasa cuando está vacío, y cómo entra algo nuevo sin que lo que ya estaba se mueva de
  lugar —que es lo que exige el requisito «Un control no desplaza a los demás al cambiar»—.
  Mirar la referencia antes de dibujar: Alejandro la nombró dos veces, así que no es un ejemplo
  suelto sino el modelo. **La aprueba Alejandro.**
- [ ] 3.5 Declarar el alcance del panel: este change lo resuelve para el cuerpo del ciclo. Dejar el
  mecanismo escrito de modo que otra vista de GitCron pueda adoptarlo sin rehacerlo, y declarar qué
  haría falta para extenderlo. No extenderlo acá: eso es otro change.

## 4. Implementación, una región por tanda

- [ ] 4.1 Implementar lo aprobado **por región de pantalla, no de una sola vez**, con revisión visual
  de Alejandro entre región y región. El orden lo fija la propuesta aprobada.
- [ ] 4.2 Ninguna superficie que se abre empuja fuera de vista lo que se estaba mirando.
- [ ] 4.3 Cada superficie condicional declara qué la habilitó, y la condición sale de evidencia
  observada.

## 5. Pruebas

- [ ] 5.1 Sostener lo decidido: que una superficie sin contenido no ocupe lugar, que siga siendo
  alcanzable, y que abrir una no desplace a las demás. Afirmar sobre el DOM montado.
- [ ] 5.2 Declarar qué NO cubre la verificación de este change y qué archivos recorre: una
  comprobación vale lo que abarca.

## 6. Revisión visual

- [ ] 6.1 El cuerpo se lee de arriba abajo, lo primero es lo que se va a hacer, nada se dice dos
  veces, y nada que no sirva al momento ocupa lugar. **La marca Alejandro.**

## 7. Cierre

- [ ] 7.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [ ] 7.2 `pnpm exec tsc --noEmit` en cero.
- [ ] 7.3 `pnpm test` en verde, informando «Test Files» y «Tests».
- [ ] 7.4 `pnpm exec eslint` limpio sobre lo tocado.
- [ ] 7.5 `openspec validate adaptar-el-cuerpo-de-sdd-al-objetivo --strict` en cero.
- [ ] 7.6 `git diff --check` en cero.
