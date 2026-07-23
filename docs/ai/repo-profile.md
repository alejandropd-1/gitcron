# Perfil verificable del repositorio — GitCron

- Path: `C:\www\gitcron`
- Stack: TypeScript 5, Next.js 15, React 19, Electron 42, Vitest, ESLint, Fallow, pnpm.
- Main Electron: `electron/main.ts`.
- Preload: `electron/preload.ts`.
- Renderer: `app/`, `components/`, `hooks/`.
- Persistencia: `node:sqlite` desde Electron main.
- OpenSpec: `openspec/`; validar cada change activo en strict.

## Comandos base

- Typecheck: `pnpm exec tsc --noEmit`
- Tests: `pnpm test`
- Lint: `pnpm lint` (baseline heredado rojo; PENDIENTE, no verde).
- Build de producto: `pnpm run package:build`
- Análisis: `pnpm exec fallow`
- Gate rápido: `pwsh -NoProfile -File scripts/gates.ps1 fast`
- Gate completo: `pwsh -NoProfile -File scripts/gates.ps1 full`
- Compatibilidad Git Bash: `scripts/gates.sh` delega al gate PowerShell.

## Reglas de Pipeline

- Camino core: `F00 → F01 → F03 → F04 → F05 → F06 → F07 → F08`.
- F02 es el adaptador Hermes opcional y puede ejecutarse en paralelo después de F01.
- Ausencia o bloqueo de Hermes no detiene adaptadores directos ni la UI core.
- F01 no escribe producto hasta que el gate base esté versionado y `fast` dé `VERDE` sobre un
  working tree limpio.
