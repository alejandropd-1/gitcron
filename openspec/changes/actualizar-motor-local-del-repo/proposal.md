# Proposal

## Why

El 2026-09-25, en OdontoPau, el botón «Actualizar» de la Configuración de OpenSpec anunció
«Motor: v1.5.0 → v1.13.2», corrió, y terminó en «Listo: motor v1.5.0 · integración al día» con
0 archivos actualizados. El motor no se actualizó y la pantalla dijo que sí.

La causa está medida. OdontoPau tiene su propia copia de OpenSpec, fijada en `1.5.0` en las
dependencias de desarrollo de su `package.json`, y su CI valida con esa copia. GitCron resuelve primero la copia
del repositorio y después la del sistema. Pero el botón «Actualizar» instala siempre en el sistema:
subió la global (que ya estaba en 1.13.2), volvió a medir, encontró otra vez la local en 1.5.0 y lo
dio por bueno porque el único control posterior es «el motor responde», no «responde la versión
pedida». La integración corrió con la 1.5.0 y no tuvo nada nuevo que escribir.

La spec ya lo anticipaba —«con una instalación local presente, la resolución la prefiere sobre la
global, y afirmarlo sin comprobarlo repite el defecto de declarar un estado que nadie verificó»—,
pero el botón combinado que unió motor e integración en un solo recorrido se escribió después y no
la respeta. Tampoco respeta que la instalación global pida la confirmación que declara el comando y
los repositorios afectados, y su «volver a la versión anterior» también instala siempre en el sistema:
en un repositorio con copia propia, bajaría la global de todos los proyectos.

## What Changes

- El botón «Actualizar» actualiza **el motor que el repositorio usa**: si es la copia del
  repositorio, la actualiza ahí (queda en el `package.json` y el lockfile, sin confirmar en Git);
  si es la del sistema, la del sistema. El plan lo dice antes de correr: «actualizar el motor de
  este repositorio a v1.13.2» o «actualizar el motor de toda la máquina a v1.13.2».
- Se instala **la versión exacta que el plan anunció**, no «la última» al momento de correr.
- El paso del motor queda «listo» **sólo si después responde la versión pedida**. Si responde otra,
  el paso falla diciendo qué versión quedó, cuál se pidió y de dónde sale la que responde; la
  integración no corre.
- Si el `package.json` fijaba la versión exacta, sigue exacta después de actualizar; si tenía un
  rango, sigue siendo rango.
- «Volver a la versión anterior» vuelve en el mismo lugar donde se actualizó.
- Cuando el paso del motor va a tocar el sistema, pasa por la confirmación que la spec ya exige
  (comando, gestor, repositorios abiertos afectados) antes de ejecutar.
- Un motor de procedencia desconocida o administrada no se actualiza desde ese botón: el paso se
  declara no disponible y dice por qué.

Fuera de alcance: decidir si OdontoPau debe subir su copia (es decisión de ese proyecto y de su CI);
la tarjeta del motor con sus dos acciones separadas (instalar local / global), que ya funciona.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `openspec-engine-installation`: la elección explícita entre local y global rige al *instalar*; al
  *actualizar* un motor presente, la acción va donde ese motor vive y lo declara. Se agregan tres
  exigencias: la actualización se da por hecha sólo si responde la versión pedida, la fijación
  exacta se conserva, y volver atrás ocurre en el mismo lugar.

## Impact

- Renderer: el recorrido de actualización del motor y su revisión (`components/pipeline/OpenSpecUpdateRunner.tsx`,
  `components/pipeline/OpenSpecUpdateReview.tsx`), la evaluación posterior a instalar
  (`components/pipeline/pipeline-domain.ts`), textos en los tres idiomas (`lib/i18n.ts`).
- Proceso principal: la instalación local tiene que poder conservar la fijación exacta
  (`electron/pipeline/package-manager.ts`, `electron/pipeline/openspec-install.ts`). Los canales
  `install-local` e `install-global` ya existen y ya aceptan versión de destino.
- Pruebas: `components/pipeline/__tests__/pipeline-openspec-update-runner.test.tsx` hoy fija que el
  botón llama a la instalación global con sólo `{ repoPath }`; esa expectativa cambia.
- Sin dependencias nuevas.
