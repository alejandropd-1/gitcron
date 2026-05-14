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

### 3. Token NUNCA toca `git config` durante push/pull
- Antes: inyectábamos el token en la URL de `origin` (`https://x-access-token:TOKEN@github.com/...`) y la restaurábamos después. Ventana de exposición + riesgo de quedar en `.git/config` si crasheaba.
- Ahora: usamos **`GIT_ASKPASS`** — un script helper que git invoca para pedir credenciales. El script lee el token desde la variable de entorno `GITCRON_TOKEN`, que solo existe durante el child process de git.
- Resultado: el token nunca toca disco fuera del storage cifrado, ni queda en `git reflog`, ni en `.git/config`, ni en logs de git.
- Adicionalmente seteamos `GIT_TERMINAL_PROMPT=0` para que git no muestre prompts en terminal.

### 4. Content Security Policy (CSP)
- Agregada en `app/layout.tsx` via meta tag.
- Bloquea scripts/conexiones a dominios no permitidos.
- Solo se permite `connect-src` a `api.github.com` y `github.com` (más localhost para el dev server).
- `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`.

### 5. Electron baseline secure
- `contextIsolation: true` ✅
- `nodeIntegration: false` ✅
- `sandbox` no está habilitado pero podría agregarse en `webPreferences` para extra protección
- DevTools solo en dev (`if (isDev)`) ✅
- Preload usa `contextBridge.exposeInMainWorld` (no expone toda la API Node) ✅

## ⚠️ Vulnerabilidades conocidas en dependencias

`npm audit` reporta 2 moderate severity:
- **postcss < 8.5.10** (transitivo via `next`) — XSS en el stringify de CSS.
- No es explotable en nuestro contexto (no procesamos CSS de fuentes no confiables).
- El fix oficial requiere downgrade breaking de Next.js. Decidimos no aplicarlo.

Para revisar en el futuro:
```bash
npm audit --audit-level=moderate
# o con pnpm:
pnpm audit --audit-level=moderate
```

## 🔄 Recomendación: migrar a pnpm

El proyecto ya tiene `pnpm-lock.yaml`. Recomendaciones para usarlo:

```bash
# Instalar pnpm si no lo tenés
npm install -g pnpm

# En el proyecto:
rm -rf node_modules package-lock.json
pnpm install

# Usar siempre pnpm a partir de ahora:
pnpm run electron:dev
```

**Ventajas de pnpm para seguridad:**
- **Strict dependency tree**: las dependencias no listadas explícitamente no son accesibles. Esto previene ciertos ataques de supply chain donde una dependencia "huérfana" puede ser importada.
- **Content-addressable store**: cada paquete se guarda una sola vez en `~/.pnpm-store/` y se hardlinkea. Más fácil auditar.
- **`pnpm audit`** funciona igual que `npm audit`.

## 🛡️ Modelo de amenazas actual

**Threat model para uso personal (vos en tu máquina):**

| Amenaza | Probabilidad | Mitigación |
|---|---|---|
| Atacante remoto explotando la app | Casi cero | No hay ports abiertos, no es servidor web |
| Malware en tu máquina lee el token | Baja con DPAPI | safeStorage usa cifrado del OS atado a tu usuario |
| Dependencia maliciosa (supply chain) | Real pero baja | CSP limita exfiltración. Auditá con `pnpm audit` regularmente |
| Token leak via git config | Eliminado | GIT_ASKPASS — token nunca toca disco |
| Command injection en spawn | Eliminado | `shell: false` + args array |

## 🚧 Pendiente para producción / distribución pública

Si en algún momento publicás la app:

1. **Code signing**
   - Windows: certificado EV (~300 USD/año), evita el SmartScreen warning
   - macOS: Apple Developer Account (~99 USD/año) + notarización
   - Sin firma → los usuarios ven warnings (la app funciona igual)

2. **CSP más estricto en producción**
   - Quitar `'unsafe-eval'` del `script-src` (solo necesario para HMR en dev)
   - Considerar generar nonces para scripts inline

3. **Habilitar `sandbox: true`** en `webPreferences`
   - Aísla aún más el renderer del sistema operativo

4. **ASAR integrity checks** en electron-builder
   - Detecta si alguien modificó el bundle después de la instalación
   - Activar con `asarIntegrity: true` en electron-builder config

5. **Auto-update con firma**
   - `electron-updater` con `provider: 'github'` (releases firmados)

6. **Telemetría/error tracking opcional** (con opt-in)
   - Sentry, etc. — pero respetando privacidad

7. **Auditoría profesional**
   - Para un launch público real, un pentest formal (~1500-5000 USD) vale la pena
   - Servicios como Cure53, Trail of Bits, o pentesters freelance

8. **Política de revelación de vulnerabilidades**
   - Crear `SECURITY.md` (este archivo cuenta) con email de contacto
   - Considerar bug bounty si la base de usuarios crece

## 📋 Checklist rápido antes de cualquier release

```
[ ] pnpm audit --audit-level=high → 0 vulns
[ ] npx electron-builder@latest --check
[ ] CSP verificado en DevTools Console (no warnings)
[ ] Token NO aparece en .git/config tras push/pull
[ ] storage.enc existe y NO es legible sin la sesión del usuario
[ ] DevTools cerradas en build de prod
[ ] Sin console.log de tokens, passwords, o paths sensibles
```
