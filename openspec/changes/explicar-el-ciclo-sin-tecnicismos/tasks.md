## 1. Qué no se entiende hoy

- [ ] 1.1 Recorrer el panel del ciclo y listar cada rótulo, pestaña, campo y mensaje que use un
  término del método sin explicarlo, con archivo y línea. Acotado al panel del ciclo: no es un
  inventario del producto entero.
- [ ] 1.2 Para cada uno, declarar si su significado se puede obtener de lo que el CLI ya devuelve
  —`openspec instructions <artefacto> --change <id> --json` entrega `description` por artefacto— o
  si hay que escribirlo en la aplicación. Lo primero se prefiere: una versión nueva de OpenSpec no
  puede dejar el texto mintiendo.
- [ ] 1.3 Caso medido que da origen a este change: la cabecera rotula «Intención» un texto que
  `electron/pipeline/repo-evidence-reader.ts:405` compone como el primer párrafo del «Why» de
  `proposal.md`. Declarar cuántos otros rótulos nombran con una palabra algo que en otro lado se
  llama distinto. Es lo que hace que dos superficies parezcan dos cosas siendo una.

## 2. Cada control dice qué hace

- [ ] 2.1 Extender al panel entero la regla que hoy rige el formulario de empezar un cambio: todo
  control que reciba texto o dispare una operación declara qué hace y adónde va lo que recibe. El
  texto va junto al control, en una frase, y no como un bloque explicativo aparte.
- [ ] 2.2 Escribirlo en lenguaje llano. Un campo no se explica repitiendo su nombre: «Alcance» no se
  explica diciendo «el alcance del cambio».
- [ ] 2.3 Las tres lenguas de `lib/i18n.ts`, sin dejar ninguna clave sin consumidor ni ningún
  consumidor sin clave.

## 3. El vocabulario se consulta donde aparece

- [ ] 3.1 Cada término del método que la aplicación muestre se puede consultar desde el lugar donde
  aparece. El término no se reemplaza por una paráfrasis: se muestra y se explica.
- [ ] 3.2 Un término del que no haya explicación se declara como tal. No se inventa.
- [ ] 3.3 Decidir la forma de la consulta —qué control la abre, dónde aparece la respuesta— y
  declarar el motivo. **La aprueba Alejandro.**

## 4. El glosario

- [ ] 4.1 Una superficie de glosario dentro del panel: qué es cada pieza del método, para qué sirve
  y en qué orden aparece en el ciclo.
- [ ] 4.2 Lo que el CLI ya declara se lee de él; lo que se escriba en la aplicación queda marcado
  como propio. Que una versión nueva de OpenSpec no deje el glosario afirmando algo falso.
- [ ] 4.3 Qué trae la versión instalada y qué cambió respecto de la anterior. Medir primero si el CLI
  lo entrega por algún comando: si lo entrega se usa, y si no, se declara que no se puede y no se
  escribe a mano una lista que va a envejecer.

## 5. Pruebas

- [ ] 5.1 Ningún control del panel que reciba texto o dispare una operación queda sin su
  declaración. Afirmar sobre el DOM montado, y declarar qué archivos recorre la comprobación: una
  comprobación vale lo que abarca.
- [ ] 5.2 Un término sin explicación disponible se declara y no se inventa.
- [ ] 5.3 El contenido del glosario que viene del CLI no está escrito a mano en la aplicación.

## 6. Revisión visual

- [ ] 6.1 Entrar al ciclo sin saber OpenSpec y poder decir, sin preguntar, qué es cada pestaña, qué
  hace cada botón y qué pasa con lo que se escribe en cada campo. **La comprueba Alejandro.**

## 7. Cierre

- [ ] 7.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [ ] 7.2 `pnpm exec tsc --noEmit` en cero.
- [ ] 7.3 `pnpm test` en verde.
- [ ] 7.4 `pnpm exec eslint` limpio sobre lo tocado.
- [ ] 7.5 `openspec validate explicar-el-ciclo-sin-tecnicismos --strict` en cero.
