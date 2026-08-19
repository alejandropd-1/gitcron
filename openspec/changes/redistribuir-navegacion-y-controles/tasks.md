## 1. Correcciones pendientes del rearmado visual

- [x] 1.1 Retirar las líneas divisorias que quedaron en `components/RepoMainView.tsx`: el header de la tabla del grafo clásico (línea 427, `border-b border-border-subtle/15` sobre `bg-bg-surface/75`), la barra de la línea 314 y el borde del control de la línea 327. En el header de una tabla la separación la dan el espacio y el peso tipográfico.
- [x] 1.2 Retirar las líneas divisorias de `components/CommitGraph.tsx` que correspondan a maqueta, conservando las que señalan estado de un archivo —como el `border-l-2 border-git-add/40` de la línea 657, que indica archivo agregado— porque comunican dato y no estructura. Enumerar en el reporte cuáles se retiraron y cuáles no, con su motivo.
- [x] 1.3 Extender la verificación de bordes del change anterior para que alcance a `components/RepoMainView.tsx` y `components/CommitGraph.tsx`, con las excepciones de 1.2 declaradas explícitamente en el test.
- [x] 1.4 Retirar el recuadro de la barra inferior del lienzo en `components/ChronometricGraph.tsx`, sin alterar su posicionamiento ni sus insets laterales, que ya se readaptan a los paneles.

## 2. Readaptación del lienzo al ancho disponible

- [x] 2.1 En `components/ChronometricGraph.tsx`, observar el tamaño del contenedor del lienzo con `ResizeObserver` y recalcular el encuadre cuando cambie. No usar escuchas de tamaño de ventana: el ancho cambia también al plegar un panel o arrastrar un separador, sin que la ventana cambie.
- [x] 2.2 El recálculo SÓLO altera la transformación del encuadre. La capa de nodos de commit no se reconstruye. Es la condición de aceptación de esta sección y el requisito «Mover el encuadre no reconstruye los nodos» de `openspec/specs/graph-render-isolation/spec.md` la fija: no se relaja por conveniencia.
- [x] 2.3 Agregar un test que verifique que un cambio de tamaño del contenedor, sin cambios en commits, selección ni hover, no reconstruye la capa de nodos. Ejecutar la prueba de sabotaje: hacer que el recálculo reconstruya la capa, confirmar que el test falla, restaurar, y pegar la salida de la corrida fallida en el reporte.
- [x] 2.4 Medir e informar cuántas veces notifica `ResizeObserver` durante el arrastre de un separador. Es la pregunta abierta declarada en `design.md`. No acotar la frecuencia por precaución: sólo si la medición muestra pérdida de cuadros, y entonces declarando el mecanismo observado.
- [x] 2.5 **Toca `components/ChronometricGraph.tsx`, protegido por el invariante 12. Cuenta con validación visual explícita de Ale del 2026-08-19, acotada a la readaptación del encuadre y al retiro del recuadro de la barra inferior.** No modificar la geometría de la línea de tiempo ni de los nodos.
- [x] 2.6 En `hooks/use-canvas-viewport.ts:201`, reemplazar el `constrainViewport(current, …)` de la rama de redimensionado por un recálculo que preserve el punto del grafo que ocupaba el centro del área visible. Restringir no alcanza: deja los desplazamientos anclados al ancho anterior, y por eso el dibujo se corre al plegar un panel. La fórmula de centrado ya existe en `resetViewport` (línea 122) y en la rama de inicialización (línea 182); lo que falta es aplicarla conservando la escala y el punto central en lugar del foco fijo.
- [x] 2.7 Corregir el centrado inicial: hoy `hasInitialized` se marca en el primer `handleResize`, que ocurre con el ancho de ese instante, antes de que los paneles laterales terminen de montarse. El encuadre queda centrado sobre un ancho que enseguida cambia y nada vuelve a corregirlo. El centrado inicial debe producirse cuando el contenedor alcanzó su tamaño estable.
- [x] 2.8 Rehacer la medición de 2.4, que quedó sin dato: el reporte anterior describió el comportamiento general de `ResizeObserver` en Chromium en lugar de medir esta aplicación. Instrumentar el contador, arrastrar un separador de extremo a extremo, e informar el número real de notificaciones observadas y en cuánto tiempo. Retirar la instrumentación al terminar.
- [x] 2.9 Agregar un test que verifique que, ante un cambio de ancho del contenedor, el punto del grafo que ocupaba el centro del área visible lo sigue ocupando. Prueba de sabotaje: volver a la restricción sin recentrado, confirmar que el test falla, restaurar, y pegar la corrida fallida en el reporte.
- [x] 2.10 Corregir el rebote del recentrado. Hoy cada notificación de tamaño deriva el punto central desde `current.offsetX`, que el `constrainViewport` del paso anterior pudo haber recortado: durante la transición de un panel llegan muchas notificaciones seguidas y cada una contamina la referencia de la siguiente, de modo que la deriva se acumula y se corrige de golpe al estabilizarse el ancho. El punto a mantener centrado SHALL guardarse aparte y actualizarse únicamente cuando la persona mueve el encuadre —arrastre o zoom—, nunca al recalcular por cambio de tamaño, para que cada notificación reposicione el mismo punto en lugar de encadenarse con la anterior.
- [x] 2.11 Restituir el reencuadre ante cambios del mundo, que se perdió al reemplazar el efecto anterior. `preserveViewportOnWorldResize` sigue declarada en `hooks/use-canvas-viewport.ts:21` y `components/ChronometricGraph.tsx:1927` la pasa en `true`, pero ya nadie la lee: quedó muerta. El efecto retirado reaccionaba a cambios de `worldWidth`/`worldHeight` —el mundo crece al llegar un commit— y el nuevo reacciona a cambios del contenedor: son dos disparadores distintos y hacen falta los dos. Si tras analizarlo se concluye que el reencuadre por mundo ya no es necesario, retirar el parámetro y sus usos en lugar de dejarlo sin efecto, y declarar el fundamento en el reporte.
- [x] 2.12 Agregar un test que verifique que varias notificaciones de tamaño consecutivas —como las que produce la transición de un panel— dejan el punto central en el mismo lugar que una sola notificación al tamaño final. Es la comprobación del rebote: si el resultado difiere, la referencia se está contaminando. Prueba de sabotaje sobre este test también.
- [x] 2.13 Diagnosticar por instrumentación el rebote que persiste al plegar el panel lateral izquierdo y no ocurre con el derecho. La corrección de 2.10 resolvió el derecho, de modo que la contaminación de la referencia ya no es la causa; en coordenadas locales del contenedor ambos plegados producen el mismo cambio de ancho, así que la diferencia está en algo observable sólo en ejecución. Registrar, para cada panel por separado, la secuencia completa de notificaciones: ancho y alto reportados, desplazamiento antes y después, y si el recorte de `constrainViewport` actuó en cada paso. Comparar las dos secuencias y declarar en qué difieren antes de proponer una corrección.
- [x] 2.14 Corregir la causa que 2.13 identifique, y cubrirla con un test que reproduzca la secuencia de notificaciones del panel izquierdo. Prueba de sabotaje sobre ese test. Si la causa resultara no ser corregible sin tocar la geometría protegida por el invariante 12, frenar y reportar en lugar de avanzar.
- [x] 2.15 Corregir el desfasaje que produce el rebote. El encuadre se aplica desde el estado de la interfaz —`components/ChronometricGraph.tsx:2263` deriva el `transform` de `viewport`—, de modo que el contenedor se mueve por animación del navegador y la compensación llega un ciclo después. Durante el redimensionado, la transformación SHALL escribirse directamente sobre el elemento en el mismo cuadro de la notificación, sincronizando el estado a continuación. El cálculo actual ya es correcto y no se toca: lo que cambia es cuándo se aplica. **Toca `components/ChronometricGraph.tsx`, protegido por el invariante 12; cuenta con validación visual explícita de Ale del 2026-08-19 acotada al encuadre.**
- [x] 2.16 Verificar la corrección de 2.15 sobre la aplicación en ejecución, plegando y desplegando el panel izquierdo, y no mediante una secuencia de anchos definida en un test. El diagnóstico de 2.13 se dio por cumplido con datos producidos por un archivo de prueba temporal —`hooks/__tests__/use-canvas-viewport-diag.test.ts`, creado, ejecutado y borrado en la misma tanda—, presentados como medición del navegador; ninguna corrida en jsdom puede observar el desplazamiento del contenedor. Lo que un test sí puede cubrir es que la transformación se escriba en el mismo cuadro de la notificación, sin esperar un ciclo de estado: eso es lo que debe verificarse automáticamente, con su prueba de sabotaje.

## 3. Preferencia de ramas especulativas

- [x] 3.1 Retirar los dos encendidos automáticos de `app/page.tsx`: el de la línea 250 —comentado como «Auto-enable FUTUROS when a saved prediction exists for this repo»— y el de la línea 1591, que se dispara al llegar una predicción nueva.
- [x] 3.2 Persistir la elección por repositorio siguiendo el patrón que el proyecto ya usa para las carpetas de ramas: una clave por ruta de repositorio. No introducir un mecanismo de persistencia nuevo ni tocar la base de datos local.
- [x] 3.3 Restituir la elección al abrir un repositorio, y ante ausencia de elección registrada dejar la capa oculta.
- [x] 3.4 Verificar que el interruptor declara el estado efectivo de la capa en todo momento, incluido el instante de abrir un repositorio.
- [x] 3.5 En tests, cubrir: apertura con predicciones guardadas y sin elección previa deja la capa oculta; llegada de una predicción nueva con la capa oculta no la enciende; la elección de un repositorio no se propaga a otro; y sin elección registrada el estado es oculto.

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
