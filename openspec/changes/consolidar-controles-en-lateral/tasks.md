## 1. La barra de ventana recibe los controles de plegado

- [x] 1.1 Mover los controles de plegado de panel izquierdo y derecho de `components/TopBar.tsx` a `components/RepoTabs.tsx`, a la derecha de las pestañas de repositorio. Va primero: hasta que estén ahí, quitar la franja intermedia dejaría el panel lateral sin forma de reabrirse.
- [x] 1.2 Mover el acceso a la búsqueda a la misma zona, conservando su atajo de teclado.
- [x] 1.3 Verificar que ambos controles quedan alcanzables con cualquiera de los dos paneles plegado, y que conservan su posición al cambiar de vista y de repositorio.
- [x] 1.4 En tests, cubrir que el control de despliegue del panel lateral sigue presente y operable cuando el panel está plegado. Es la condición que hace inviable ubicarlo dentro del propio panel.

## 2. Las acciones del repositorio bajan al panel lateral

- [x] 2.1 Mover traer, publicar y recargar a una fila en `components/RepoSidebar.tsx`, bajo el título y por encima de la lista de ramas. Siguen siendo acciones directas de un clic: no entran en ningún desplegable.
- [x] 2.2 Mover el desplegable de acciones —deshacer, rehacer, crear rama, guardar temporalmente, aplicar parche— junto a ellas, conservando su comportamiento de teclado.
- [x] 2.3 Fundir el desplegable de herramientas con el acceso a búsqueda de la barra de ventana, o conservarlo en el lateral si el relevamiento muestra que sus entradas no pertenecen a la misma familia. Declarar en el reporte qué se decidió y por qué.
- [x] 2.4 Retirar `components/TopBar.tsx` como franja de la composición, una vez que todos sus contenidos tengan destino. Si algún control quedara sin ubicación evidente, frenar y reportar en lugar de dejarlo en una franja residual.
- [x] 2.5 En tests, verificar que cada acción movida sigue invocando lo que invocaba: no alcanza con que se dibuje en su lugar nuevo. Afirmar sobre el llamado, no sobre el render.

## 3. La navegación pasa a desplegable

- [x] 3.1 Reemplazar las cuatro filas de navegación de `components/RepoSidebar.tsx` por un desplegable encabezado por la vista activa: el encabezado nombra dónde se está y despliega adónde se puede ir.
- [x] 3.2 Al elegir una vista, el encabezado pasa a nombrarla y el contenido cambia. Cumple el comportamiento de teclado que ya rige para todo desplegable de la aplicación.
- [x] 3.3 Verificar que los atajos de vista siguen cambiando de vista sin abrir el desplegable, y que el encabezado refleja el cambio.
- [x] 3.4 En tests, cubrir el cambio de vista por desplegable y por atajo, y que el encabezado declara la vista activa en ambos casos.

## 4. Estado del repositorio como indicador

- [x] 4.1 Presentar rama actual, estado del árbol de trabajo y estado de validación como indicadores junto al nombre del repositorio en `components/RepoSidebar.tsx`, disponibles en todas las vistas.
- [x] 4.2 Verificar que cada indicador se distingue por forma o rótulo además de por color, conforme al requisito de contraste vigente.
- [x] 4.3 En tests, cubrir que el estado se muestra en una vista distinta de Pipeline, que es donde hoy vive.

## 5. Controles del lienzo

- [x] 5.1 Hacer que el control del extremo inferior derecho abra el lector de ramas futuras directamente, sin menú intermedio.
- [x] 5.2 Presentar acercar, alejar y restablecer como controles sueltos sobre el lienzo, sin agrupamiento y sin recuadro.
- [x] 5.3 Mover el interruptor de ramas especulativas dentro del lector de ramas futuras, que es aquello cuyo contenido gobierna. Conservar la preferencia por repositorio que ya existe.
- [x] 5.4 Verificar que el lector conserva sus pestañas, su alto arrastrable y su estado persistido, y que sigue abriéndose también al elegir una rama especulativa.
- [x] 5.5 **Toca `components/ChronometricGraph.tsx`, protegido por el invariante 12. Cuenta con validación visual explícita de Ale del 2026-08-20**, acotada a lo que declara este grupo: que el control del extremo inferior derecho abra el lector de ramas futuras, que acercar, alejar y restablecer queden como controles sueltos, y que el interruptor de ramas especulativas pase dentro del lector. No alcanza a la geometría de la línea de tiempo, a la de los nodos ni a ninguna otra parte del archivo: ante cualquier otra necesidad, frenar y reportar.

## 6. Interfaz e i18n

- [x] 6.1 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo rótulo nuevo, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor. Retirar las que queden sin uso tras la mudanza.
- [x] 6.2 Actualizar el test de paridad con las claves nuevas y retiradas.
- [x] 6.3 Verificar que todo control reubicado sigue cumpliendo el área objetivo de 44×44 px y el contraste exigido, con las verificaciones que ya existen.
- [x] 6.4 Verificar que no quedaron líneas divisorias en las superficies tocadas, con la verificación de bordes que ya existe.

## 7. Cierre y validación

- [x] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [x] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [x] 7.3 `openspec validate consolidar-controles-en-lateral --strict` en cero.
- [x] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [x] 7.5 Informar cuántos elementos quedaron en el panel lateral y cuánta altura ocupan con la lista de ramas desplegada. Es la pregunta abierta declarada en `design.md`: si el lateral quedó tan cargado como estaba la barra, el problema se mudó en lugar de resolverse.
- [ ] 7.6 Revisión visual y funcional en la aplicación: sin franja entre la ventana y el contenido, controles de plegado alcanzables con los paneles plegados, acciones operando desde el lateral, navegación por desplegable y por atajo, estado visible en todas las vistas, y el lector de ramas futuras a un clic. **La marca Alejandro.**

## 8. Correcciones de la revisión visual

Surgen de la revisión de Alejandro del 2026-08-20 sobre la implementación de los grupos 1 a 7.

- [x] 8.1 Mover el control de plegado del panel izquierdo al extremo izquierdo de la barra de ventana, antes de que empiecen las pestañas de repositorio. Hoy está a la derecha, lejos de aquello que despliega.
- [x] 8.2 Mover el acceso a la búsqueda al panel lateral, junto al desplegable de vistas. Es donde la referencia declarada en el invariante 11 lo ubica —la lupa acompaña al título del lateral, no a la barra de ventana— y revisa la decisión que este mismo change tomó en 1.2.
- [x] 8.3 Presentar el selector de vistas como entrada de lista y no como botón: sin recuadro propio ni relleno de botón, con su ícono y su rótulo, al modo de las entradas del panel lateral de la referencia. Hoy ocupa altura de control y su zona sensible al puntero queda acotada al recuadro.
- [x] 8.4 Separar en dos líneas el nombre de la rama y sus indicadores de estado: la rama ocupa su propia línea completa y los indicadores pasan debajo. Con nombres largos —`change/consolidar-controles-en-lateral` es de uso corriente en este repositorio— la rama se corta para dejar lugar a dos etiquetas cortas.
- [x] 8.5 Disponer en vertical los controles de encuadre del lienzo, hoy en horizontal en el extremo inferior derecho, para que no se superpongan con la barra del lector de ramas futuras cuando está desplegado.
- [x] 8.6 Aumentar el espaciado entre entradas y textos del panel lateral, tomando los pasos de la escala de espaciado que ya existe. La densidad se resuelve con ritmo, no con proximidad.
- [x] 8.7 Fijar la cabecera del panel lateral —selector de vistas, rama con sus indicadores, y fila de acciones— de modo que no se desplace al recorrer la lista de ramas, igual que el pie del panel ya está fijo. Sólo el cuerpo de secciones se desplaza.
- [x] 8.8 Presentar todas las secciones del panel lateral contraídas por omisión, y recordar por repositorio cuáles quedaron abiertas, siguiendo el mecanismo de preferencia por ruta de repositorio que el proyecto ya usa. Sin preferencia registrada, todas contraídas.
- [x] 8.9 Invertir los fondos de armazón y contenido: `--color-bg-surface` pasa a valer `#020f1e` y `--color-bg-base` a valer `#06182a`, intercambiando los valores y no el token que usa cada superficie. Cada nombre debe seguir significando lo que dice —base es el fondo del contenido, surface el del armazón— y sus comentarios deben actualizarse. El armazón queda oscuro y el contenido claro, como en la referencia declarada en el invariante 11.
- [x] 8.10 Verificar tras la inversión que los pares de color de la paleta siguen cumpliendo el contraste exigido, con la verificación que ya existe, y corregir los que no lleguen sin agregar colores nuevos.
- [ ] 8.11 Comprobar que el lienzo del grafo cronométrico conserva legibilidad sobre el fondo aclarado. Sus colores fueron elegidos contra el fondo oscuro y la verificación automática mide pares de la paleta, no los del dibujo. Si algún elemento del grafo pierde contraste, declararlo en el reporte en lugar de corregirlo: tocar sus colores excede la autorización vigente del invariante 12. **La comprueba Alejandro.**
- [ ] 8.12 Reemplazar los íconos del selector de modo de grafo, que hoy no se explican solos: `MoustacheIcon` para el modo clásico y `VulcanSaluteIcon` para el cronométrico son referencias que sólo entiende quien estuvo en la conversación. Usar íconos de la biblioteca que el proyecto ya emplea, eligiendo formas que dibujen lo que cada vista muestra: filas apiladas para el modo clásico, que presenta los commits en una tabla, y puntos conectados en trayectoria para el cronométrico, que dibuja una diagonal de nodos. Retirar los dos componentes de ícono propios, que dejan de tener consumidor.
- [ ] 8.13 Acompañar cada modo con su rótulo accesible, de modo que la vista activa se pueda nombrar sin depender de reconocer un dibujo. Un ícono solo, por bueno que sea, no dice cuál de los dos modos está activo.
