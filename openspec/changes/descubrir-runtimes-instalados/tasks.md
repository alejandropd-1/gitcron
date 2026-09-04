## 1. Por qué no se resuelven

- [x] 1.1 Medir qué devuelve el descubrimiento para `codex` y `opencode`. No se midió con la
  aplicación corriendo (eso queda en 4.1/4.2); se midió el mismo camino que el descubrimiento usa —
  `structured-cli-adapter.ts:50` lanza el nombre tal cual por `RuntimeProcessRunner` → Node `spawn`
  → libuv — directamente sobre Node v22.19.0 (uv 1.51.0, medido el 2026-09-03) y se confirmó en la
  fuente. Resultado: el adaptador no encuentra el ejecutable; `spawn('codex')` y `spawn('opencode')`
  devuelven `ENOENT` (errno -4058), porque libuv v1.51.0 no usa `PATHEXT` y para nombres sin
  extensión solo intenta `.com` y `.exe`, nunca el literal (`src/win/process.c:295-298`,
  `path_search_walk_ext` en `src/win/process.c:246-285`; probado con un shim de texto sin extensión
  en un `PATH` privado, que también da `ENOENT`), mientras que lo instalado son shims
  `codex.cmd` en `C:\nvm4w\nodejs\` y `opencode.CMD` en `%LOCALAPPDATA%\pnpm\bin\` (verificado con
  `where`). Lanzar el `.cmd` por su camino completo falla aparte: `CreateProcess` no ejecuta batch
  files y Node lanza `EINVAL` síncrono (`node:internal/child_process:420`, errno -4071). `claude` sí
  resuelve porque es un `.exe` real en `C:\Users\apdel\.local\bin\claude.exe`. El fallo llega a
  `discover()` como rechazo del runner y se convierte en `installed: false`
  (`structured-cli-adapter.ts:75-87`).
- [x] 1.2 Descartar o confirmar la hipótesis del entorno (un proceso de Electron no heredaría el
  `PATH` del shell). La comparación en vivo entre el entorno del proceso de la aplicación y el del
  shell **no se hizo**; no fue necesaria porque la causa medida en 1.1 es independiente del
  contenido del `PATH`: con un `PATH` en el que `where` resuelve `codex.cmd` y `opencode.CMD`, el
  `spawn` de los nombres tal cual sigue dando `ENOENT` — el fallo está en qué extensiones intenta el
  resolver (libuv solo `.com`/`.exe`, `src/win/process.c:295-298`), no en qué directorios hay. Un
  `PATH` más o menos completo no cambia el resultado, así que el entorno queda descartado como causa
  sin la comparación en vivo.
- [x] 1.3 Declarar si `agy` queda fuera por su `launchable: false` y nada más, para no arrastrar a
  `make-agy-launchable` dentro de este cambio.

## 2. Ofrecer lo que está instalado

- [x] 2.1 Resolver la causa medida en 1.1 y 1.2 de modo que un runtime instalado cuyo adaptador se
  declara lanzable quede lanzable. Si la resolución del ejecutable pasa a compartirse entre
  runtimes, que viva en un solo lugar: hoy cada adaptador la resuelve por su cuenta.
- [x] 2.2 Un runtime que no se pudo resolver se lista con el motivo real —no «no instalado» si está
  instalado—, con la misma honestidad que ya se le exige a la procedencia del motor OpenSpec.

## 3. Pruebas

- [x] 3.1 Con dos runtimes instalados y lanzables, el descubrimiento los devuelve a los dos.
- [x] 3.2 Un runtime instalado que la aplicación no resuelve aparece listado con su motivo y no
  desaparece de la lista.
- [x] 3.3 Un adaptador con `launchable: false` sigue sin ser lanzable y se lista con su motivo, sin
  que este cambio lo vuelva lanzable por accidente.

## 4. Comprobación en la aplicación

- [x] 4.1 Abrir el desplegable de runtime y ver ofrecidos los que están instalados, con los que no
  se puedan ofrecer listados y con motivo. **La comprueba Alejandro.**
- [x] 4.2 Comprobarlo también sobre la aplicación empaquetada, no sólo en desarrollo: la resolución
  de ejecutables es distinta ahí, y es donde la mide la persona que la usa. **La marca Alejandro.**

## 5. Cierre

- [x] 5.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [x] 5.2 `pnpm exec tsc --noEmit` en cero.
- [x] 5.3 `pnpm test` en verde.
- [x] 5.4 `pnpm exec eslint` limpio sobre lo tocado.
- [x] 5.5 `openspec validate descubrir-runtimes-instalados --strict` en cero.
