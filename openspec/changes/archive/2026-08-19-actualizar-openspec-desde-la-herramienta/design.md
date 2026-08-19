## Context

GitCron gestiona la interacción con OpenSpec a través del proceso principal en Electron (`electron/pipeline/openspec-engine.ts`, `electron/ipc/pipeline-openspec.ts`), comunicándose con el renderer mediante canales IPC tipados y securizados.
Actualmente:
1. `lib/openspec-version.ts` fija el rango soportado entre 1.5.0 y 1.8.0. La publicación de OpenSpec 1.9.0 provoca que usuarios con CLI 1.5.0 vean el estado «Desactualizado» frente al registro npm, pero cuando actualizan su CLI a 1.9.0, GitCron lo clasifica como `too-new` y bloquea la operación.
2. El diagnóstico actual mezcla la **compatibilidad técnica** (si el CLI puede ser consumido por GitCron) con la **novedad de versión** (si hay una versión superior en npm) y la **vigencia de la integración del repositorio** (si los skills de `.agents` fueron regenerados con el CLI activo).
3. La interfaz ya cuenta con una vista de revisión de sólo lectura (`OpenSpecUpdateReview.tsx`), pero no permite disparar la regeneración `openspec update` de forma directa, obligando al usuario a ir a la terminal externa.

## Goals / Non-Goals

**Goals:**
- Extender el soporte formal a OpenSpec 1.9.0 actualizando `SUPPORTED_OPENSPEC_VERSIONS` a `1.5.0`–`1.9.0` sin alterar los parsers retrocompatibles.
- Desacoplar los 3 ejes diagnósticos: compatibilidad del motor (`versionClass`), novedad en npm (`freshnessState`) y estado de integración del repo (`integrationState`).
- Habilitar la ejecución no destructiva de `openspec update` desde la revisión de actualización en la UI, con bloqueo ante condiciones inseguras de Git y ofrecimiento de «Preparar commit».
- Documentar y formalizar la política de actualización del motor en el host: guiar mediante comando exacto copiable o terminal integrado, sin intentar mutaciones globales de paquetes desde la app empaquetada.

**Non-Goals:**
- No implementar un instalador o gestor de paquetes interno (`npm install -g`) para mutar el sistema operativo del usuario.
- No ejecutar `git add`, `git commit`, `git push`, `git merge`, cambios de rama ni borrado automático de ramas.
- No modificar outputs clasificados como `external-global` (ej. `~/.minimax/skills`), los cuales permanecen estrictamente bloqueados.
- No agregar dependencias de terceros al proyecto.

## Decisions

### Decisión 1: Ampliar el rango soportado a 1.9.0 preservando los parsers actuales
- **Elección:** Actualizar `SUPPORTED_OPENSPEC_VERSIONS` en `lib/openspec-version.ts` a `{ min: '1.5.0', max: '1.9.0' }`.
- **Fundamento y evidencia:** Se comprobó mediante `npx @fission-ai/openspec@1.9.0 status --json` que la estructura devuelta mantiene 100% de compatibilidad con 1.8.0 (`changeName`, `schemaName`, `artifacts`, `applyRequires`, `isComplete`). La única adición es el campo `isPlanningComplete`, que no rompe los parsers existentes.
- **Alternativas consideradas:**
  - *Mantener 1.8.0 como tope y tratar 1.9.0 como `too-new`:* Rechazada. Obliga al usuario a congelar su CLI global y mantiene el callejón de avisos.

### Decisión 2: Separar nítidamente los tres ejes de estado en la UI
- **Elección:**
  1. *Eje Motor — Compatibilidad:* `supported` (1.5 a 1.9), `too-old` (<1.5), `too-new` (>1.9), `absent`.
  2. *Eje Motor — Novedad en npm:* `cli-up-to-date` (igual a npm), `cli-upgrade-available` (menor a npm pero dentro de supported), `offline`/`unconfirmed`.
  3. *Eje Repositorio — Integración:* `up-to-date` (skills coinciden con CLI activo), `outdated` (skills generados por versión anterior al CLI activo o faltantes), `divergent`, `conflicted`.
- **Fundamento:** Un CLI 1.5.0 no es un error si GitCron lo soporta. La UI mostrará: «Motor compatible (1.5.0) · 1.9.0 disponible en npm» y permitirá trabajar normalmente, reservando el aviso de atención sólo cuando la integración del repo esté desalineada con el CLI activo o cuando el CLI sea incompatible (<1.5.0).
- **Alternativas consideradas:**
  - *Mantener la insignia única de «Desactualizado»:* Rechazada. Produce diagnósticos falsos y confusión en el usuario.

### Decisión 3: Ejecución de `openspec update` en dos pasos con salvaguardas de Git
- **Elección:**
  - *Paso 1 (Revisión no mutante):* El botón «Revisar actualización» en la tarjeta o banner abre `OpenSpecUpdateReview.tsx` sin tocar disco.
  - *Paso 2 (Ejecución):* El botón «Actualizar integración del repositorio» en el pie de la revisión invoca `pipeline:openspec:run-update` vía IPC.
  - *Salvaguardas:* El backend y el frontend comprueban que el working tree esté limpio y que no se ejecute sobre ramas no aisladas si hay riesgos. Si la ejecución tiene éxito, se muestra el resumen de archivos regenerados y un botón «Preparar commit» (que abre el modal de staging selectivo sin mutar Git automáticamente).
- **Fundamento:** OpenSpec update regenera archivos dentro del repositorio (`.agents/skills/`, `.codex/skills/`, etc.). Mantener el primer clic de sólo lectura y exigir confirmación explícita protege el trabajo del desarrollador.
- **Alternativas consideradas:**
  - *Ejecución directa en 1 clic desde la tarjeta:* Rechazada. Viola el principio de revisión previa de mutaciones en disco.

### Decisión 4: Política de actualización del motor en el host (Sólo Guía / Terminal Integrado)
- **Elección:** GitCron detecta la versión de npm más reciente pero **no invoca `npm i -g` ni muta paquetes globales**. Muestra el comando exacto en la revisión con botón de copiado (`npm i -g @fission-ai/openspec@latest`), o una acción para abrir el terminal integrado con el comando precargado para confirmación humana.
- **Fundamento y evidencia:**
  - Electron empaquetado contiene el runtime de Node pero **no incluye el binario de npm**.
  - La instalación global requiere permisos de administrador (`sudo` o UAC) y puede entrar en conflicto con múltiples entornos (`nvm`, `pnpm`, `volta`, `brew`).
  - La app debe operar dentro de su perímetro de seguridad (el repositorio autorizado). Mutar el entorno global de la máquina es una violación de contención.
- **Alternativas consideradas:**
  - *Descargar un runtime administrado interno:* Descartada en Fase 4 por fragilidad y dependencias excesivas (76 paquetes).
  - *Spawnear `npm` asumiendo que está en `PATH`:* Rechazada. Falla silenciosamente en entornos sin npm global o con permisos restringidos.

## Risks / Trade-offs

- **[Riesgo] El usuario ejecuta `openspec update` teniendo skills personalizados con nombres de flujos oficiales en `.agents/`**
  - *Mitigación:* La revisión de convivencia (`classifyCoexistenceSkills`) detecta y resalta las colisiones en rojo antes de habilitar el botón de ejecución.
- **[Riesgo] El proceso de `openspec update` falla a mitad de camino por permisos de archivo en `.agents/`**
  - *Mitigación:* El backend captura el error, asigna el estado `update-incomplete`, enumera los archivos que llegaron a modificarse y ofrece una acción segura de reintento o descarte en Git.
- **[Riesgo] El usuario cree que al presionar «Actualizar integración» se actualiza también su CLI global**
  - *Mitigación:* La interfaz separa claramente la sección «Motor (CLI del sistema)» de «Integración del repositorio (skills y configuración)», rotulando el botón como «Actualizar integración del repositorio».

## Migration Plan

1. Actualizar `lib/openspec-version.ts` para ampliar el rango a `1.5.0`–`1.9.0`.
2. Actualizar `electron/ipc/pipeline-openspec.ts` para computar los nuevos estados desacoplados y exponer el canal `pipeline:openspec:run-update`.
3. Actualizar `OpenSpecEngineCard.tsx` y `OpenSpecUpdateReview.tsx` con las nuevas etiquetas i18n en ES/EN/ZH y el botón de ejecución en dos pasos.
4. Validar la suite completa con pruebas unitarias e integración en Vitest.

## Open Questions

1. **Inhibición de ejecución sobre la rama `main`:** ¿Debe bloquearse terminantemente la ejecución de `openspec update` si el usuario está parado en `main`/`master`, o permitirse siempre que el working tree esté completamente limpio?
2. **Terminal integrado vs Copiado al portapapeles:** Para la actualización del motor CLI global (`npm i -g ...`), ¿se prefiere únicamente el botón de copiado al portapapeles, o también un botón que abra el terminal integrado de GitCron con el comando listo para presionar Enter?
3. **Manejo de `--force`:** ¿`openspec update` debe ejecutarse siempre en modo estándar, o debe exponerse una casilla avanzada para pasar `--force` si se detectan residuos legacy que no se actualizan?
