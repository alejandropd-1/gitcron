## 1. Corrección del estado de integración

- [ ] 1.1 En `electron/ipc/pipeline-openspec.ts`, reemplazar la rama `installedIntegration.skills.length > 0` de `buildEngineStatusSnapshot` por una derivación basada en `installedWorkflowsByTarget` y `targets` de `electron/pipeline/openspec-evidence.ts`: la integración sólo se declara `up-to-date` si el target vigente del esquema actual tiene sus workflows instalados.
- [ ] 1.2 En `electron/__tests__/pipeline-openspec-evidence.test.ts`, agregar un caso con workflows presentes sólo en `.codex`/`.agent` y ninguno en `.agents`, afirmando que `integrationState` NO es `up-to-date`. Ejecutar la prueba de sabotaje: revertir 1.1, confirmar que el caso falla, restaurar, y pegar en el reporte la salida de la corrida fallida.
- [ ] 1.3 En `components/pipeline/OpenSpecEngineCard.tsx`, verificar que el estado resumido no pueda decir «Al día» mientras el detalle informa un target sin configurar, y agregar el caso al test del componente.

## 2. Autoría de tareas en el proceso principal

- [ ] 2.1 En `electron/pipeline/task-checkbox.ts`, agregar funciones puras `addTaskLine`, `editTaskText`, `moveTaskLine` y `removeTaskLine` con la misma forma de resultado tipado que `toggleTaskCheckbox` y su misma verificación de `expectedText`, sin alterar ninguna línea ajena a la operación.
- [ ] 2.2 En `electron/pipeline/task-checkbox.ts`, extender `composeTaskLogEntry` para registrar el tipo de operación y si la originó una persona o un agente, conservando el formato de una línea por entrada legible sin herramientas.
- [ ] 2.3 En `electron/pipeline/__tests__/`, cubrir 2.1 y 2.2 con tablas de entrada y salida, incluyendo: sangría y numeración preservadas al editar el texto, rechazo por `mismatch` cuando la línea cambió, y que ninguna operación toca líneas vecinas.
- [ ] 2.4 En `electron/ipc/pipeline-tasks.ts`, registrar los canales de agregar, editar, mover y eliminar tarea, con la misma validación de ruta autorizada, slug y contención `resolveInside` que ya usa `pipeline:set-task-checked`, devolviendo códigos de error y nunca prosa.
- [ ] 2.5 En `electron/__tests__/`, verificar que cada canal nuevo rechaza ruta no autorizada, slug inválido y cambio archivado, y que ante `mismatch` no escribe. Afirmar sobre el llamado a la escritura, no sólo sobre el valor devuelto.

## 3. Escritura de artefactos en el proceso principal

- [ ] 3.1 En `electron/pipeline/`, agregar la consulta de `openspec instructions <artefacto> --change <slug> --json` mediante `runAuthorizedOpenSpec`, devolviendo `resolvedOutputPath`, `instruction`, `template`, `rules`, `context` y `dependencies` sin interpretar su contenido.
- [ ] 3.2 En `electron/ipc/pipeline-specs.ts`, agregar el canal de escritura de un artefacto, contenido a las rutas que devuelve 3.1, rechazando cualquier destino fuera del directorio del change y todo cambio archivado.
- [ ] 3.3 Agregar al registro del change las entradas de escritura de artefacto, con el mismo formato y origen declarado que 2.2.
- [ ] 3.4 En `electron/__tests__/`, verificar que el canal de escritura rechaza una ruta fuera del change aunque venga de una respuesta del CLI manipulada, y que sobre un change archivado no escribe.
- [ ] 3.5 Agregar la operación de revisión del alcance de un cambio en curso, delegándola al workflow que el motor exponga para ello. La revisión alcanza a todos los artefactos afectados y no sólo a `tasks.md`: el resultado se presenta como propuesta sobre cada uno, con la misma revisión por bloque que 8.5, y no se escribe nada sin confirmación. Fundamento medido: en `unificar-sistema-visual-gitcron` el alcance se revisó cinco veces editando sólo la lista de tareas, y `design.md` terminó describiendo una causa que la investigación posterior desmintió.
- [ ] 3.6 Declarar cuándo la revisión cambia el propósito del trabajo en lugar de precisarlo, y en ese caso ofrecer abrir un cambio nuevo en vez de reescribir el vigente. Es el criterio que el propio motor documenta, y el que en esta sesión llevó a partir dos veces un change en lugar de ampliarlo.

## 3b. Diagnóstico del motor

- [ ] 3b.1 En `electron/pipeline/`, agregar la consulta del diagnóstico de salud de relaciones que el motor entrega en formato legible por máquina, transportando su resultado como datos sin recomponerlo en prosa.
- [ ] 3b.2 Agregar la consulta del contexto de trabajo resuelto que el motor produce para agentes, con el mismo criterio de transporte.
- [ ] 3b.3 Presentar ambos en la aplicación dentro del diagnóstico contraído, respetando la clasificación de gravedad que el motor declara y sin inventar advertencias cuando no reporta ninguna.
- [ ] 3b.4 En `electron/__tests__/`, verificar que un diagnóstico sin problemas no produce advertencias en la interfaz, y que una condición reportada por el motor se presenta con la gravedad que el motor le asigna y no con otra.

## 4. Sincronización de specs

- [ ] 4.1 En `electron/ipc/`, agregar el canal de vista previa de sincronización que informe qué capacidades y requisitos se incorporarían a `openspec/specs/`, sin escribir nada.
- [ ] 4.2 Agregar el canal de ejecución de la sincronización, que sólo procede tras confirmación explícita y deja los specs modificados sin confirmar en Git.
- [ ] 4.3 En `electron/__tests__/`, verificar que la vista previa no escribe ningún archivo y que la ejecución sin confirmación previa se rechaza.

## 5. Motivo al archivar

- [ ] 5.1 En `electron/ipc/pipeline-archive.ts`, aceptar un motivo opcional y conservarlo junto a los artefactos del cambio archivado, legible sin la aplicación.
- [ ] 5.2 En `electron/__tests__/`, verificar que archivar sin motivo sigue funcionando y que con motivo el texto queda escrito con el cambio.
- [ ] 5.3 **Archivar no puede depender de que nadie más mire el repositorio.** En Windows,
  `openspec archive` falla con `EPERM: operation not permitted, rename` sobre
  `openspec/changes/<id>` cuando cualquier proceso tiene un archivo de esa carpeta abierto, y el
  sistema no permite renombrarla.
  Caso real del 2026-09-02: falló desde la aplicación, desde la terminal, y también con la
  aplicación y el entorno de desarrollo cerrados. El bloqueo eran **dos servidores MCP** —CodeGraph
  y Fallow— que indexan el árbol con vigilante propio; matándolos, el archivado pasó en el primer
  intento. Verificado además con un `rename` a mano desde el shell, que fallaba igual: **el
  bloqueo es del sistema de archivos, no del CLI ni de la aplicación**.
  Es intermitente, y por eso engaña: el índice de CodeGraph se había reescrito esa misma mañana
  después de un día de mover archivos en masa, mientras que el archivado del día anterior había
  funcionado sin problema. Un fallo así apunta siempre a lo último que se tocó —esa mañana se había
  actualizado OpenSpec— y no a su causa.
  El error se lee como si el CLI tuviera una salida sin usar —«No fallback copy was attempted»—
  pero en `dist/core/archive.js` de la 1.11 ese respaldo es **otro `rename`**, a una carpeta
  `.openspec-move-<uuid>`. Si el primero falló porque la carpeta está tomada, el segundo falla por
  lo mismo: la copia directa habría funcionado y el CLI no llega a intentarla. Es un defecto de la
  herramienta y corresponde reportarlo con `openspec feedback` antes de rodearlo acá.
  Lo que la aplicación sí puede hacer: reconocer el `EPERM`, decir que lo causa un proceso con la
  carpeta abierta, y no presentarlo como un fallo del cambio —el cambio está bien; lo que falla es
  la mudanza—.

## 6. Instalación del motor

- [ ] 6.1 En `electron/pipeline/`, agregar la resolución del gestor de paquetes del sistema con canonicalización de ruta, resolviendo en cada uso y sin memorizar, con la misma estrategia de contención que `resolveOpenSpecExecutable` de `electron/pipeline/openspec-engine.ts`.
- [ ] 6.2 Agregar la ejecución de la instalación local al repositorio, no interactiva, con tope de tiempo y salida capturada, dejando manifiesto y bloqueo modificados sin confirmar y devolviendo la lista exacta de archivos tocados.
- [ ] 6.3 Agregar la ejecución de la instalación global, no interactiva, con tope de tiempo y salida capturada, devolviendo el comando ejecutado y las rutas resueltas para que el renderer las muestre.
- [ ] 6.4 Al terminar cualquiera de las dos, volver a resolver el ejecutable de OpenSpec y recalcular su estado desde el disco en lugar de asumir la versión pedida.
- [ ] 6.5 En `electron/__tests__/`, verificar que sin gestor resuelto no se invoca nada y se devuelve el código correspondiente; que el argv es exactamente el esperado para cada modo; y que ante fallo de permisos el estado del motor queda como estaba. Afirmar sobre el llamado, no sobre el valor devuelto.
- [ ] 6.6 Comprobar la resolución del gestor sobre la aplicación empaquetada e instalada, no sólo en desarrollo, y dejar el resultado escrito en el reporte. Es la pregunta abierta declarada en `design.md`. **La marca Alejandro.**

## 7. Perfil de workflows

- [ ] 7.1 En `electron/pipeline/`, agregar la lectura de `openspec config list` devolviendo perfil y workflows habilitados como datos, sin enum cerrado en el código.
- [ ] 7.2 Agregar el canal de activación y desactivación de un workflow, y recalcular las acciones ofrecidas desde la configuración resultante.
- [ ] 7.3 En `electron/__tests__/`, verificar que un workflow ausente de la configuración no habilita su acción, usando una configuración con un nombre de workflow que el código no conoce.
- [ ] 7.4 Distinguir el workflow que el perfil no habilita del que el motor instalado no tiene. Son dos causas distintas con soluciones distintas: la primera se resuelve activándolo desde el panel de perfil, la segunda actualizando el motor. Caso comprobado el 2026-08-19: el motor 1.5.0 no expone `update`, que sí integra el conjunto básico de la 1.9.0, de modo que cambiar el perfil a `core` no lo habilita.
- [ ] 7.5 Cuando una operación no esté disponible por versión del motor, declarar cuál la habilitaría, apoyándose en el eje de novedad en npm que la tarjeta ya expone. No deducir la versión mínima de una tabla propia en el código: derivarla de lo que el motor y el registro informan.

## 8. Interfaz: tareas y artefactos

- [ ] 8.1 En `components/pipeline/`, construir la vista de lista de tareas con agregar, editar, reordenar, marcar y eliminar, consumiendo los canales de la sección 2, con confirmación al eliminar y al desmarcar.
- [ ] 8.2 Agregar la vista del texto del archivo de tareas, editable, que escribe sobre el mismo archivo y refleja lo hecho en la lista.
- [ ] 8.3 Escribir en `lib/` una función pura que detecte líneas que aparentan una tarea mal formada —empiezan con guion o numeración y su casilla no cumple el formato— sin señalar encabezados, párrafos ni notas, y cubrirla con una tabla de casos que incluya `## 1. Grupo`, `- [ ] 1.1 ok`, `- [] 1.2 rota`, `-[ ] 1.3 rota`, `- [x] 1.4 ok` y una línea de prosa suelta.
- [ ] 8.4 Señalar en ambas vistas las líneas que devuelve 8.3, sin impedir guardar.
- [ ] 8.5 Agregar a `components/DiffViewer.tsx` un modo de propuesta con acciones de aplicar y descartar por bloque, reutilizando `parseDiff` y la selección de líneas existentes, sin alterar el comportamiento de los modos `stage` y `unstage`.
- [ ] 8.6 Construir la revisión de una propuesta de agente sobre 8.5: aceptar y rechazar por bloque, editar el resultado, y escribir sólo al confirmar. La propuesta debe distinguirse visualmente de lo ya escrito, sin inventar una paleta propia: lo especulativo jamás puede confundirse visualmente con lo real.
- [ ] 8.7 Verificar con tests de componente que descartar una propuesta no invoca el canal de escritura, y que aceptar parcialmente escribe únicamente los bloques aceptados.

## 9. Interfaz: motor, sync, archivado y jerarquía

- [ ] 9.1 Reordenar `components/pipeline/OpenSpecUpdateReview.tsx` y `OpenSpecEngineCard.tsx` para que las acciones y el estado resumido en una línea precedan al diagnóstico, con el diagnóstico completo contraído por omisión y sin perder ninguna evidencia que hoy muestra.
- [ ] 9.2 Ofrecer las dos acciones de instalación del motor por separado, con la local oculta y explicada cuando el repositorio no tiene manifiesto.
- [ ] 9.3 Construir la confirmación de la instalación global mostrando comando literal, rutas resueltas del gestor y de Node, y la lista de repositorios abiertos que quedarían afectados.
- [ ] 9.4 Agregar el botón de sincronización con su vista previa, y el campo opcional de motivo en el archivado, destacado cuando queden tareas sin completar.
- [ ] 9.5 Presentar toda operación bloqueada como control deshabilitado con su motivo al lado, sin depender del desplazamiento, incluido el bloqueo sobre la rama principal para actualizar la integración y archivar.
- [ ] 9.6 **Ejecutar el comando que la aplicación ya muestra, sin salir de ella.** Cada operación
  del ciclo declara el comando que va a correr —el archivado muestra `openspec archive <id> --yes`—
  pero ese texto no se puede copiar ni ejecutar: cuando el botón falla hay que transcribirlo a mano
  en otra ventana. Caso real del 2026-09-02, con el archivado fallando por permisos de Windows.
  Se acota a comandos `openspec`: un intérprete libre es una superficie de riesgo con los permisos
  de quien usa la aplicación, y no hace falta para el caso que lo motiva. Ya existe
  `terminalOpen(repoPath)` en `types/electron.d.ts`, que abre una terminal externa y no ejecuta
  nada adentro: esto es distinto y no lo reemplaza.
  **Ojo con lo que NO resuelve**: el fallo que lo motivó viene de que la aplicación vigila el
  repositorio, así que el mismo comando lanzado desde acá fallaría igual. Lo que se arregla en 5.3
  es otra cosa y va primero.
- [ ] 9.7 Agregar a `lib/i18n.ts` las claves en ES, EN y ZH de todo lo anterior, mapeando cada código de error del proceso principal a su clave, sin armar claves por interpolación de plantilla y sin dejar ninguna clave sin consumidor.
- [ ] 9.8 Actualizar `components/pipeline/__tests__/pipeline-i18n.test.ts` con las claves nuevas y verificar la paridad en los tres idiomas.

## 10. Cierre y validación

- [ ] 10.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 10.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada una.
- [ ] 10.3 `openspec validate gestionar-ciclo-openspec-desde-gitcron --strict` en cero.
- [ ] 10.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en Git.
- [ ] 10.5 Revisión visual y funcional en la aplicación: acciones antes del diagnóstico, alta y edición de tareas, revisión de una propuesta por bloque distinguible de lo ya escrito, sincronización con su vista previa, motivo al archivar, e instalación del motor en sus dos modos. **La marca Alejandro.**
