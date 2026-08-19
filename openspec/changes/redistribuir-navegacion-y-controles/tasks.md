## 1. Correcciones pendientes del rearmado visual

- [ ] 1.1 Retirar las líneas divisorias que quedaron en `components/RepoMainView.tsx`: el header de la tabla del grafo clásico (línea 427, `border-b border-border-subtle/15` sobre `bg-bg-surface/75`), la barra de la línea 314 y el borde del control de la línea 327. En el header de una tabla la separación la dan el espacio y el peso tipográfico.
- [ ] 1.2 Retirar las líneas divisorias de `components/CommitGraph.tsx` que correspondan a maqueta, conservando las que señalan estado de un archivo —como el `border-l-2 border-git-add/40` de la línea 657, que indica archivo agregado— porque comunican dato y no estructura. Enumerar en el reporte cuáles se retiraron y cuáles no, con su motivo.
- [ ] 1.3 Extender la verificación de bordes del change anterior para que alcance a `components/RepoMainView.tsx` y `components/CommitGraph.tsx`, con las excepciones de 1.2 declaradas explícitamente en el test.
- [ ] 1.4 Retirar el recuadro de la barra inferior del lienzo en `components/ChronometricGraph.tsx`, sin alterar su posicionamiento ni sus insets laterales, que ya se readaptan a los paneles.

## 2. Readaptación del lienzo al ancho disponible

- [ ] 2.1 En `components/ChronometricGraph.tsx`, observar el tamaño del contenedor del lienzo con `ResizeObserver` y recalcular el encuadre cuando cambie. No usar escuchas de tamaño de ventana: el ancho cambia también al plegar un panel o arrastrar un separador, sin que la ventana cambie.
- [ ] 2.2 El recálculo SÓLO altera la transformación del encuadre. La capa de nodos de commit no se reconstruye. Es la condición de aceptación de esta sección y el requisito «Mover el encuadre no reconstruye los nodos» de `openspec/specs/graph-render-isolation/spec.md` la fija: no se relaja por conveniencia.
- [ ] 2.3 Agregar un test que verifique que un cambio de tamaño del contenedor, sin cambios en commits, selección ni hover, no reconstruye la capa de nodos. Ejecutar la prueba de sabotaje: hacer que el recálculo reconstruya la capa, confirmar que el test falla, restaurar, y pegar la salida de la corrida fallida en el reporte.
- [ ] 2.4 Medir e informar cuántas veces notifica `ResizeObserver` durante el arrastre de un separador. Es la pregunta abierta declarada en `design.md`. No acotar la frecuencia por precaución: sólo si la medición muestra pérdida de cuadros, y entonces declarando el mecanismo observado.
- [ ] 2.5 **Toca `components/ChronometricGraph.tsx`, protegido por el invariante 12. Cuenta con validación visual explícita de Ale del 2026-08-19, acotada a la readaptación del encuadre y al retiro del recuadro de la barra inferior.** No modificar la geometría de la línea de tiempo ni de los nodos.

## 3. Preferencia de ramas especulativas

- [ ] 3.1 Retirar los dos encendidos automáticos de `app/page.tsx`: el de la línea 250 —comentado como «Auto-enable FUTUROS when a saved prediction exists for this repo»— y el de la línea 1591, que se dispara al llegar una predicción nueva.
- [ ] 3.2 Persistir la elección por repositorio siguiendo el patrón que el proyecto ya usa para las carpetas de ramas: una clave por ruta de repositorio. No introducir un mecanismo de persistencia nuevo ni tocar la base de datos local.
- [ ] 3.3 Restituir la elección al abrir un repositorio, y ante ausencia de elección registrada dejar la capa oculta.
- [ ] 3.4 Verificar que el interruptor declara el estado efectivo de la capa en todo momento, incluido el instante de abrir un repositorio.
- [ ] 3.5 En tests, cubrir: apertura con predicciones guardadas y sin elección previa deja la capa oculta; llegada de una predicción nueva con la capa oculta no la enciende; la elección de un repositorio no se propaga a otro; y sin elección registrada el estado es oculto.

## 4. Navegación al panel lateral

- [ ] 4.1 Agregar al tope de `components/RepoSidebar.tsx` la sección de navegación entre vistas —Commit, Graph, History, Pipeline—, por encima de la lista de ramas, declarando cuál está activa.
- [ ] 4.2 Retirar la navegación de `components/TopBar.tsx` y recablear en `app/page.tsx` el disparo del cambio de vista desde el panel lateral, sin cambiar la forma del estado de vista activa.
- [ ] 4.3 Verificar que con el panel lateral plegado la navegación sigue siendo alcanzable y no queda inaccesible.
- [ ] 4.4 Mover `UpdateControls` —versión y estado de actualizaciones de la aplicación— de `components/TopBar.tsx:171` al pie de `components/RepoSidebar.tsx`, junto a ajustes, ayuda y perfil, conservando íntegro su comportamiento de verificar, descargar e instalar.
- [ ] 4.5 En tests, cubrir el cambio de vista desde el panel lateral y con el panel plegado, y que `UpdateControls` conserva sus acciones tras la mudanza.

## 5. Jerarquía de la barra superior

- [ ] 5.1 Conservar traer, publicar y recargar como acciones directas visibles en `components/TopBar.tsx`.
- [ ] 5.2 Agrupar deshacer, rehacer, crear rama, guardar temporalmente y aplicar parche en un desplegable de acciones, rotulado y alcanzable por teclado.
- [ ] 5.3 Agrupar terminal, filtro y búsqueda en un desplegable propio, con el atajo de teclado de cada entrada visible junto a su rótulo.
- [ ] 5.4 Implementar el comportamiento común de los desplegables: abren con clic o teclado, cierran con escape y con clic afuera, se recorren con flechas, activan con Enter y devuelven el foco al control que los abrió.
- [ ] 5.5 Definir los atajos siguiendo la convención más difundida en herramientas de escritorio de desarrollo, declarar en el reporte cuáles se eligieron y verificar que ninguno colisione con los que la aplicación ya usa. Enumerar en el reporte cómo se comprobó la ausencia de colisión.
- [ ] 5.6 Mover el selector de modo de grafo de `components/TopBar.tsx` a la vista de grafo, de modo que no ocupe lugar en las demás vistas.
- [ ] 5.7 En tests, cubrir el comportamiento de teclado de los desplegables —apertura, cierre con escape, recorrido con flechas, devolución del foco— y que cada atajo abre su herramienta sin pasar por el menú.

## 6. Interfaz e i18n

- [ ] 6.1 Contraer los controles del lienzo —acercar, alejar, restablecer e interruptor de ramas especulativas— tras un único control en el extremo inferior derecho del área de contenido, sin recuadro.
- [ ] 6.2 Conservar el lector de ramas futuras como panel desplegable con sus pestañas, su alto arrastrable y su estado persistido. Sigue abriéndose al elegir una rama especulativa, y además desde los controles del lienzo.
- [ ] 6.3 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo rótulo nuevo —desplegables, sección de navegación, atajos—, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor.
- [ ] 6.4 Actualizar `components/pipeline/__tests__/pipeline-i18n.test.ts` con las claves nuevas y verificar la paridad en los tres idiomas.
- [ ] 6.5 Verificar que todo control nuevo cumple el área objetivo de 44×44 px y el contraste exigido, usando las verificaciones que ya existen del change anterior.

## 7. Cierre y validación

- [ ] 7.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 7.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 7.3 `openspec validate redistribuir-navegacion-y-controles --strict` en cero.
- [ ] 7.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 7.5 Informar la medición de 2.4 y qué se decidió a partir de ella.
- [ ] 7.6 Revisión visual y funcional en la aplicación: navegación en el panel lateral, barra superior reducida, desplegables con teclado, lienzo completo al plegar y desplegar paneles, controles del lienzo contraídos, y ramas especulativas apagadas y recordadas por repositorio. **La marca Alejandro.**
