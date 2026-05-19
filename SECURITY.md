# Seguridad de GitCron

Notas sobre el modelo de amenazas, lo que ya está protegido y lo que falta si algún día se distribuye públicamente.

## ✅ Hardening implementado

### 1. Command injection eliminada
- `terminal:open` ahora usa `child_process.spawn` con array de argumentos (no `exec` con string).
- Antes: `exec(\`start "" wt -d "${targetPath}"\`)` → vulnerable si el path tenía `"` o `&`.
- Ahora: `spawn('wt.exe', ['-d', targetPath], { shell: false })` → el path nunca se interpreta por un shell.
- Validación extra: verifica que el path exista y sea un directorio antes de spawn.

### 2. Token cifrado por el OS (no localStorage)
- Se eliminó `localStorage` para el token de GitHub.
- Se usa **`safeStorage` de Electron** que delega en:
  - **Windows** → DPAPI (Data Protection API)
  - **macOS** → Keychain
  - **Linux** → libsecret / kwallet
- El archivo cifrado vive en `app.getPath('userData')/storage.enc` con permisos `0600`.
- La clave de cifrado la maneja el OS y está atada al usuario logueado — otros usuarios de la misma máquina no pueden descifrarla.

### 3. Token y credential cache durante push/pull
- **Sin URL token en `.git/config`**: `withGitHubToken()` ya no modifica `origin`. Para push/pull/fetch sobre `https://github.com/...`, GitCron pasa el token mediante `http.https://github.com/.extraheader=AUTHORIZATION: basic ...` en la configuración efímera del proceso Git.
- **Sin caché en OS keychain**: cada invocación de git va con `-c safe.allowUnsafeCredentialHelper=true -c credential.helper= -c core.askpass=`. Eso evita que GCM o el keychain del SO almacenen credenciales de la operación autenticada. `safe.allowUnsafeCredentialHelper=true` autoriza el override vacío en git-for-windows ≥2.40; además, las instancias autenticadas de `simple-git` habilitan `unsafe.allowUnsafeCredentialHelper` y `unsafe.allowUnsafeAskPass` para que su guard interno deje pasar esos `-c`. Hasta v1.1.4 usábamos un `.gitconfig` temporal apuntado por `GIT_CONFIG_GLOBAL`, y hasta v1.1.7 se usaba `remote set-url` temporal; ambos approaches quedaron reemplazados en v1.2.0.
- **Clone autenticado sin URL token**: `git:clone` también usa el extraheader temporal y clona con la URL HTTPS limpia, así que el `origin` inicial queda sin `x-access-token`.
- **Prompts deshabilitados**: `GIT_TERMINAL_PROMPT=0` (no prompts de terminal) y `GCM_INTERACTIVE=never` (GCM nunca abre su diálogo nativo).
- **Logs sanitizados**: cualquier output que pase por `sanitizeForLog()` reemplaza `x-access-token:<TOKEN>@` y `AUTHORIZATION: basic <TOKEN>` antes de loguearse o devolverse al renderer.

### 4. Content Security Policy (CSP)
- Agregada en `app/layout.tsx` via meta tag.
- Bloquea scripts/conexiones a dominios no permitidos.
- Solo se permite `connect-src` a `api.github.com` y `github.com` (más localhost para el dev server).
- `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`.

### 5. Electron baseline secure
- `contextIsolation: true` ✅
- `nodeIntegration: false` ✅
- `sandbox: true` y `webSecurity: true` en `webPreferences`
- DevTools solo en dev (`if (isDev)`) ✅
- Preload usa `contextBridge.exposeInMainWorld` (no expone toda la API Node) ✅

## ⚠️ Vulnerabilidades conocidas en dependencias

Estado actual en `v1.2.0`:
- `pnpm audit --audit-level moderate` no reporta vulnerabilidades conocidas.
- El override de `postcss >=8.5.10` queda en `pnpm-workspace.yaml` para evitar la regresión del CVE transitivo previo.

Para revisar en el futuro:
```bash
pnpm audit --audit-level=moderate
```

## 🔄 Package manager

El proyecto usa `pnpm` como package manager recomendado.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm run electron:dev
```

**Ventajas de pnpm para seguridad:**
- **Strict dependency tree**: las dependencias no listadas explícitamente no son accesibles. Esto previene ciertos ataques de supply chain donde una dependencia "huérfana" puede ser importada.
- **Content-addressable store**: cada paquete se guarda una sola vez en `~/.pnpm-store/` y se hardlinkea. Más fácil auditar.
- **`pnpm audit`** permite revisar vulnerabilidades desde el mismo lockfile usado por la app.

## 🛡️ Modelo de amenazas actual

**Threat model para uso personal (vos en tu máquina):**

| Amenaza | Probabilidad | Mitigación |
|---|---|---|
| Atacante remoto explotando la app | Casi cero | No hay ports abiertos, no es servidor web |
| Malware en tu máquina lee el token | Baja con DPAPI | safeStorage usa cifrado del OS atado a tu usuario |
| Dependencia maliciosa (supply chain) | Real pero baja | CSP limita exfiltración. Auditá con `pnpm audit` regularmente |
| Token leak via git config | Mitigado | No se escribe URL con token en `origin`; auth efímera por `http.extraheader` + `credential.helper=` vacío autorizado en Git y `simple-git` |
| Command injection en spawn | Eliminado | `shell: false` + args array |

## 🚧 Pendiente para producción / distribución pública

La app ya se está publicando en GitHub Releases. Para endurecerla antes de una distribución más amplia:

1. **Code signing**
   - Windows: certificado EV (~300 USD/año), evita el SmartScreen warning
   - macOS: Apple Developer Account (~99 USD/año) + notarización
   - Sin firma → los usuarios ven warnings (la app funciona igual)

2. **Mantener `sandbox: true` y CSP estricta**
   - Ya están habilitados en producción; revisar regresiones después de upgrades de Electron/Next.

3. **ASAR integrity checks** en electron-builder
   - Detecta si alguien modificó el bundle después de la instalación
   - Activar con `asarIntegrity: true` en electron-builder config

4. **Auto-update con firma**
   - `electron-updater` ya usa GitHub Releases; sumar releases firmados cuando haya code signing.

5. **Telemetría/error tracking opcional** (con opt-in)
   - Sentry, etc. — pero respetando privacidad

6. **Auditoría profesional**
   - Para un launch público real, un pentest formal (~1500-5000 USD) vale la pena
   - Servicios como Cure53, Trail of Bits, o pentesters freelance

7. **Política de revelación de vulnerabilidades**
   - Crear `SECURITY.md` (este archivo cuenta) con email de contacto
   - Considerar bug bounty si la base de usuarios crece

## 📋 Checklist rápido antes de cualquier release

```
[ ] pnpm audit --audit-level=moderate → 0 vulns
[ ] npx electron-builder@latest --check
[ ] CSP verificado en DevTools Console (no warnings)
[ ] Token NO aparece en .git/config tras push/pull/fetch normal
[ ] `git remote -v` sigue mostrando URL HTTPS limpia tras clone privado
[ ] storage.enc existe y NO es legible sin la sesión del usuario
[ ] DevTools cerradas en build de prod
[ ] Sin console.log de tokens, passwords, o paths sensibles
```
