## 1. Verificación de procedencia del color

- [ ] 1.1 En `lib/`, escribir una función pura que reciba el texto de una hoja de estilos y devuelva los colores declarados que no provienen de un token de la paleta: valores hexadecimales, `rgb()`, `hsl()` y nombres de color literales. Sin dependencias nuevas y sin acceso al sistema de archivos, igual que las verificaciones de escala que ya existen.
- [ ] 1.2 Distinguir el color que compone la interfaz del que pertenece a un contenido —un color dentro de un SVG de dato, por ejemplo—. Una verificación que señala todo deja de mirarse. Declarar en el reporte qué criterio se adoptó.
- [ ] 1.3 Cubrir 1.1 y 1.2 con tabla de casos, incluyendo: `color: #a3f185` (literal, se detecta), `color: var(--color-secondary)` (correcto), `--os-green: #a3f185` (token propio, se detecta), un color dentro de un comentario (no se detecta) y el caso de contenido que 1.2 haya declarado.
- [ ] 1.4 Agregar la verificación al conjunto que ya recorre las hojas de estilo. **Debe fallar al escribirse**: registrar en el reporte cuántos colores fuera de la paleta detecta y en qué archivos. Es la medición de partida.

## 2. Relevamiento de la paleta propia de Pipeline

- [ ] 2.1 Enumerar los diez tokens de `components/pipeline/OpenSpecDashboard.module.css` —`--os-bg`, `--os-surface`, `--os-surface-strong`, `--os-muted`, `--os-border`, `--os-border-strong`, `--os-green`, `--os-cyan`, `--os-amber`, `--os-violet`— y para cada uno declarar a qué token de la paleta general corresponde, o que no tiene equivalente.
- [ ] 2.2 Informar cuántas declaraciones de esa hoja consumen cada token. Es la pregunta abierta declarada en `design.md` y dice cuánto trabajo implica la migración.
- [ ] 2.3 Proponer la incorporación a la paleta general, con nombre general, únicamente de los matices sin equivalente. No agregar equivalentes de los que ya existen: eso conserva el problema con otro nombre. Si algún matiz propuesto no resuelve un caso concreto, no se agrega.

## 3. Migración de Pipeline

- [ ] 3.1 Reemplazar en `components/pipeline/OpenSpecDashboard.module.css` cada uso de los tokens propios por el token general que 2.1 determinó, y retirar las diez declaraciones locales.
- [ ] 3.2 Revisar el resto de `components/pipeline/` en busca de colores literales, y migrarlos igual.
- [ ] 3.3 Verificar que la vista Pipeline conserva sus estados distinguibles —lo hecho, lo pendiente, lo bloqueado, lo que requiere atención— tras la migración. Si dos estados dejan de distinguirse, declararlo en lugar de inventar un color.
- [ ] 3.4 Confirmar que la verificación de 1.4 ya no reporta nada en `components/pipeline/`.

## 4. Revisión de acentos

- [ ] 4.1 Revisar los acentos generales contra los fondos vigentes: éxito, error, advertencia, información y los estados de Git. El caso declarado es el verde `#a3f185`, un lima saturado elegido contra fondo azul marino que sobre carbón desentona aunque cumpla el contraste.
- [ ] 4.2 Conservar el significado de cada acento. No adoptar en bloque los acentos de otra familia de color por venir armonizados: los colores de Git cargan un vocabulario aprendido y cambiarlo por razón estética tiene un costo propio.
- [ ] 4.3 Verificar que cada acento revisado sigue cumpliendo el contraste exigido contra su fondo, con la comprobación que ya existe.
- [ ] 4.4 Comprobar que los acentos siguen distinguiéndose **entre sí**, no sólo de su fondo, mirando un diff real donde agregado, eliminado y modificado conviven. La verificación automática mide cada color contra su fondo y no puede responder esto. **La comprueba Alejandro.**

## 5. Cierre y validación

- [ ] 5.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 5.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 5.3 `openspec validate unificar-paleta-carbon-soul --strict` en cero.
- [ ] 5.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 5.5 Informar la medición final contra la de 1.4: cuántos colores fuera de la paleta quedan y dónde.
- [ ] 5.6 Revisión visual en la aplicación: Pipeline afinado con el resto, estados distinguibles entre sí, y acentos que pertenecen a la misma familia sin perder su significado. **La marca Alejandro.**
