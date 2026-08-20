## 1. La barra de ventana recibe los controles de plegado

- [ ] 1.1 Mover los controles de plegado de panel izquierdo y derecho de `components/TopBar.tsx` a `components/RepoTabs.tsx`, a la derecha de las pestañas de repositorio. Va primero: hasta que estén ahí, quitar la franja intermedia dejaría el panel lateral sin forma de reabrirse.
- [ ] 1.2 Mover el acceso a la búsqueda a la misma zona, conservando su atajo de teclado.
- [ ] 1.3 Verificar que ambos controles quedan alcanzables con cualquiera de los dos paneles plegado, y que conservan su posición al cambiar de vista y de repositorio.
- [ ] 1.4 En tests, cubrir que el control de despliegue del panel lateral sigue presente y operable cuando el panel está plegado. Es la condición que hace inviable ubicarlo dentro del propio panel.

## 2. Las acciones del repositorio bajan al panel lateral

- [ ] 2.1 Mover traer, publicar y recargar a una fila en `components/RepoSidebar.tsx`, bajo el título y por encima de la lista de ramas. Siguen siendo acciones directas de un clic: no entran en ningún desplegable.
- [ ] 2.2 Mover el desplegable de acciones —deshacer, rehacer, crear rama, guardar temporalmente, aplicar parche— junto a ellas, conservando su comportamiento de teclado.
- [ ] 2.3 Fundir el desplegable de herramientas con el acceso a búsqueda de la barra de ventana, o conservarlo en el lateral si el relevamiento muestra que sus entradas no pertenecen a la misma familia. Declarar en el reporte qué se decidió y por qué.
- [ ] 2.4 Retirar `components/TopBar.tsx` como franja de la composición, una vez que todos sus contenidos tengan destino. Si algún control quedara sin ubicación evidente, frenar y reportar en lugar de dejarlo en una franja residual.
- [ ] 2.5 En tests, verificar que cada acción movida sigue invocando lo que invocaba: no alcanza con que se dibuje en su lugar nuevo. Afirmar sobre el llamado, no sobre el render.

## 3. La navegación pasa a desplegable

- [ ] 3.1 Reemplazar las cuatro filas de navegación de `components/RepoSidebar.tsx` por un desplegable encabezado por la vista activa: el encabezado nombra dónde se está y despliega adónde se puede ir.
- [ ] 3.2 Al elegir una vista, el encabezado pasa a nombrarla y el contenido cambia. Cumple el comportamiento de teclado que ya rige para todo desplegable de la aplicación.
- [ ] 3.3 Verificar que los atajos de vista siguen cambiando de vista sin abrir el desplegable, y que el encabezado refleja el cambio.
- [ ] 3.4 En tests, cubrir el cambio de vista por desplegable y por atajo, y que el encabezado declara la vista activa en ambos casos.

## 4. Estado del repositorio como indicador

- [ ] 4.1 Presentar rama actual, estado del árbol de trabajo y estado de validación como indicadores junto al nombre del repositorio en `components/RepoSidebar.tsx`, disponibles en todas las vistas.
- [ ] 4.2 Verificar que cada indicador se distingue por forma o rótulo además de por color, conforme al requisito de contraste vigente.
- [ ] 4.3 En tests, cubrir que el estado se muestra en una vista distinta de Pipeline, que es donde hoy vive.

## 5. Controles del lienzo

- [ ] 5.1 Hacer que el control del extremo inferior derecho abra el lector de ramas futuras directamente, sin menú intermedio.
- [ ] 5.2 Presentar acercar, alejar y restablecer como controles sueltos sobre el lienzo, sin agrupamiento y sin recuadro.
- [ ] 5.3 Mover el interruptor de ramas especulativas dentro del lector de ramas futuras, que es aquello cuyo contenido gobierna. Conservar la preferencia por repositorio que ya existe.
- [ ] 5.4 Verificar que el lector conserva sus pestañas, su alto arrastrable y su estado persistido, y que sigue abriéndose también al elegir una rama especulativa.
- [ ] 5.5 **Toca `components/ChronometricGraph.tsx`, protegido por el invariante 12. Requiere validación visual explícita de Ale antes de implementarse: la del 2026-08-19 alcanzaba al encuadre y al decorado, no a esto.** Frenar y pedirla si no está declarada al empezar.

## 6. Interfaz e i18n

- [ ] 6.1 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo rótulo nuevo, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor. Retirar las que queden sin uso tras la mudanza.
- [ ] 6.2 Actualizar el test de paridad con las claves nuevas y retiradas.
- [ ] 6.3 Verificar que todo control reubicado sigue cumpliendo el área objetivo de 44×44 px y el contraste exigido, con las verificaciones que ya existen.
- [ ] 6.4 Verificar que no quedaron líneas divisorias en las superficies tocadas, con la verificación de bordes que ya existe.

## 7. Cierre y validación

- [ ] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 7.3 `openspec validate consolidar-controles-en-lateral --strict` en cero.
- [ ] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 7.5 Informar cuántos elementos quedaron en el panel lateral y cuánta altura ocupan con la lista de ramas desplegada. Es la pregunta abierta declarada en `design.md`: si el lateral quedó tan cargado como estaba la barra, el problema se mudó en lugar de resolverse.
- [ ] 7.6 Revisión visual y funcional en la aplicación: sin franja entre la ventana y el contenido, controles de plegado alcanzables con los paneles plegados, acciones operando desde el lateral, navegación por desplegable y por atajo, estado visible en todas las vistas, y el lector de ramas futuras a un clic. **La marca Alejandro.**
