## Why

GitCron declara soportar OpenSpec de 1.5.0 a 1.8.0 (`lib/openspec-version.ts:17`). Cuando el usuario tiene instalado el CLI 1.5.0 y la versión publicada más reciente en npm es 1.9.0, el sistema cae en un callejón diagnóstico y operativo:
1. La insignia del motor declara «Desactualizado» porque confunde «versión detrás del último publicado en npm» con «versión fuera del rango soportado».
2. Como 1.5.0 está dentro del rango soportado, la matriz diagnóstica sugiere `openspec update` en el repositorio, pero no una actualización del motor.
3. Al ejecutar `openspec update` con el CLI 1.5.0 activo, la integración se regenera en 1.5.0, manteniendo encendido el aviso de desactualización.
4. Si el usuario actualiza manualmente el CLI a 1.9.0 en su sistema, GitCron lo clasifica como `too-new` (> 1.8.0), bloqueando la matriz a `blocked`.

Este cambio amplía el rango soportado a 1.9.0 (cuya compatibilidad de contratos ha sido verificada), separa nítidamente los tres ejes de estado (soporte del motor, novedad respecto al registro npm, y vigencia de la integración del repositorio), e incorpora la capacidad de ejecutar la operación segura `openspec update` directamente desde la interfaz de GitCron, restituyendo las salvaguardas de Git necesarias para mutaciones en el repositorio.

## What Changes

- **Ampliación del rango soportado a 1.9.0:** Se extiende el rango oficial en `lib/openspec-version.ts` a `min: 1.5.0, max: 1.9.0`, admitiendo instalaciones de OpenSpec 1.9.0 como `supported`.
- **Desacoplamiento de estados en la UI y el diagnóstico:**
  - El soporte del motor (`supported`, `too-old`, `too-new`, `absent`) se independiza de la disponibilidad de versiones más nuevas en npm.
  - Se añade el estado de novedad del motor (`cli-up-to-date`, `cli-upgrade-available`, `offline`/`unconfirmed`) sin alarmismo cuando el CLI actual sigue siendo plenamente soportado.
  - La vigencia de la integración del repositorio se evalúa contra el CLI activo (`up-to-date`, `outdated`, `divergent`, `conflicted`).
- **Ejecución controlada de `openspec update` desde GitCron:**
  - La tarjeta y la vista de revisión en dos pasos permiten ejecutar la regeneración de integración del repositorio con el CLI resuelto y autorizado.
  - Se ejecutan con `OPENSPEC_NO_UPDATE_CHECK=1`, telemetría desactivada y sin TTY interactivo.
- **Restitución de salvaguardas de seguridad Git:**
  - Bloqueo de ejecución si el árbol de trabajo tiene modificaciones sucias ajenas o está en ramas protegidas sin aislamiento.
  - Prohibición estricta de ejecutar comandos automáticos de Git (`git add`, `git commit`, `git push`, `git merge`, borrado de ramas).
  - Al concluir la regeneración con éxito, se ofrece al usuario la acción informativa de «Preparar commit».
  - Manejo determinista de estados incompletos (`update-incomplete`) ante fallos en la regeneración de skills.
- **Política declarada para la actualización del motor CLI global:**
  - Se formaliza que GitCron no ejecuta mutaciones de paquetes del sistema operativo (`npm install -g`), debido a la inexistencia de npm en el paquete de Electron y la falta de garantías sobre permisos y gestores de paquetes del usuario.
  - Se expone el comando exacto no traducido con botón de copiado o apertura de terminal interactivo para que el usuario actualice el motor en su propio entorno.

## Capabilities

### New Capabilities
- `pipeline-openspec-update-execution`: Capacidad de ejecutar la regeneración no destructiva de integración `openspec update` en el repositorio autorizado desde el proceso principal, con validación previa de integridad, salvaguardas de Git y reporte de estado.

### Modified Capabilities
- `pipeline-openspec-engine`: Amplía el rango soportado a 1.9.0, desacopla la clasificación de compatibilidad de la novedad en npm y formaliza la guía de actualización del motor en el host.
- `pipeline-guided-workflow`: Integra la acción de ejecución en dos pasos (revisar $\rightarrow$ ejecutar) en la interfaz del dashboard, con bloqueo ante condiciones inseguras de Git y ofrecimiento de preparación de commit.

## Impact

- **Módulos afectados:** `lib/openspec-version.ts`, `electron/pipeline/openspec-engine.ts`, `electron/ipc/pipeline-openspec.ts`, `components/pipeline/OpenSpecDashboard.tsx`, `components/pipeline/OpenSpecEngineCard.tsx`, `components/pipeline/OpenSpecUpdateReview.tsx`, `lib/i18n.ts`.
- **APIs e IPC:** Nuevo canal de IPC autorizado `pipeline:openspec:run-update` que recibe únicamente `{ repoPath: string, plan: OpenSpecUpdatePlan }`, valida huellas vivas e invoca el binario autorizado con argumentos fijos.
- **Seguridad:** Cero mutación en Git, cero ejecución de gestores de paquetes globales en el host, confinamiento estricto a repositorios autorizados.
