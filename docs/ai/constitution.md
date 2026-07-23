# Constitución verificable — GitCron

Fuente de verdad de las reglas que tienen veto automático en este repositorio. Una recomendación
que `scripts/gates.ps1` no puede comprobar no se presenta como cláusula verde.

Proyecto: aplicación desktop Electron/Next.js para operar y comprender repositorios Git.
Zona de máximo riesgo: Electron main/preload/IPC, credenciales, filesystem/Git y procesos externos.

## Cláusulas base

### C1 — TypeScript compila

`pnpm exec tsc --noEmit`

### C2 — Cero dependencias nuevas sin aprobación humana

`git diff --exit-code -- package.json pnpm-lock.yaml`

### C3 — Gobernanza protegida cambia sólo con diff exacto aprobado y commit humano

Protege `.gitignore`, `AGENTS.md`, ambos launchers `scripts/gates.*`, `docs/ai/constitution.md` y
`docs/ai/repo-profile.md`.
El gate permanece rojo mientras exista un cambio local en esos paths.

### C4 — Tests pasan

`pnpm test`

### C6 — Changes OpenSpec activos validan strict

`openspec validate <change> --strict --no-interactive` para cada directorio activo.

### C7 — Build web y Electron pasa al cierre

`pnpm run package:build` en modo `full`.

## Pendientes de gate

- C5 ESLint tiene baseline heredado rojo (76 errores, 19 warnings el 2026-07-23). `full` lo ejecuta
  y marca `PENDIENTE`; un change futuro debe sanearlo antes de promoverlo a veto.
- C8 Fallow conserva deuda heredada: se ejecuta en `full`, pero un fallo produce `PENDIENTE` hasta
  que Ale apruebe un baseline o un change de saneamiento; nunca se presenta como verde.
- Seguridad visual/interactiva, packaged Windows y controles reales requieren QA/checkpoints
  específicos y no se inventan desde este gate base.
