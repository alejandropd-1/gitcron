## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (103 archivos / 756 tests antes de tocar nada)
- [x] 1.2 Comprobar en el código que hoy sólo pregunta el desmarcado, y leer el motivo escrito en
      `OpenSpecDashboard.tsx:256`
- [x] 1.3 Comprobar que un cambio activo sí se puede desmarcar y que uno archivado no:
      `electron/ipc/pipeline-tasks.ts:88` devuelve `archived` cuando `tasks.md` ya no está bajo
      `changes/<id>/`
- [x] 1.4 Buscar qué pruebas fijaban el comportamiento anterior: `pipeline-task-toggle.test.tsx` tenía
      "marcar una tarea pendiente no pide confirmación"

## 2. Implementación

- [x] 2.1 Reemplazar el estado de desmarcado pendiente por uno que cubra las dos direcciones
- [x] 2.2 Hacer que el clic sobre una casilla sin marcar abra la confirmación en vez de escribir
- [x] 2.3 Reutilizar el bloque de confirmación existente, con textos distintos por dirección
- [x] 2.4 Reescribir el comentario que justificaba la asimetría, con el motivo nuevo, para que nadie la
      reponga con el argumento viejo

## 3. Textos

- [x] 3.1 Escribir el aviso de marcado: nombra la tarea, dice que queda registrado, y dice que se puede
      desmarcar mientras el cambio siga activo y no una vez archivado
- [x] 3.2 Comprobar que el aviso no afirma que la acción es irreversible
- [x] 3.3 Agregar las tres claves nuevas en español, inglés y chino
- [x] 3.4 Dejar intactos los textos del desmarcado

## 4. Tests

- [x] 4.1 Actualizar la prueba que fijaba que marcar no preguntaba
- [x] 4.2 Prueba: marcar pide confirmación y no escribe hasta obtenerla
- [x] 4.3 Prueba: cancelar el marcado deja la tarea sin marcar
- [x] 4.4 Prueba: el aviso de marcado muestra su propio texto y no el del desmarcado
- [x] 4.5 Comprobar que las pruebas del desmarcado siguen pasando sin tocarlas

## 5. Ubicación de la confirmación

Ale probó la primera versión y detectó que la pregunta aparecía en el encabezado del panel, mientras
que las casillas se tildan bajando por la lista: había que volver a subir hasta arriba de todo para
responder. El alcance se amplía acá en vez de abrir otro change, porque éste sigue activo.

- [x] 5.1 Comprobar qué patrón de toast usa ya la aplicación cuando necesita una respuesta antes de
      escribir: el de decisión de pull en `components/PageToasts.tsx`, ámbar y fijo abajo
- [x] 5.2 Comprobar que `PageToasts` se monta fuera de todo condicional de vista, así que el patrón
      convive con el panel Pipeline
- [x] 5.3 Crear `TaskConfirmToast` con las clases y colores de ese patrón, fijo respecto de la ventana
- [x] 5.4 Reemplazar el bloque del encabezado por el toast, para las dos direcciones
- [x] 5.5 No poner cruz de descarte: "Cancelar" ya está entre los botones y duplicar el control con el
      mismo efecto es lo que la guía del panel prohíbe
- [x] 5.6 Prueba: la confirmación se renderiza en una superficie fija, no dentro del panel
- [x] 5.7 Corregir en `design.md` la decisión anterior, que descartaba el toast con un argumento falso

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test`: 103 archivos / 759 tests. Cuatro corridas, tres verdes y una con **un fallo
      intermitente cuyo detalle no se capturó** —se perdió al recortar la salida— y que no volvió a
      aparecer en las dos corridas siguientes. Los tres tests de más son 4.3, 4.4 y 5.6
- [x] 6.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.4 `openspec validate confirm-task-check --strict` válido
- [x] 6.5 Reporte en `docs/reports/2026-08-07-confirm-task-check.md`
- [x] 6.6 Ale valida en la aplicación: marcar pide confirmación, cancelar no escribe, y decide si la
      fricción de tildar varias casillas seguidas es aceptable
