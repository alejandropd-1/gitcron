# GitCron — Invariantes (aplican a TODO change, sin excepción)

> Estas reglas son condición de aceptación. Si una invariante choca con "que funcione",
> **pará y preguntá**. No degrades nada para destrabar algo.

## Seguridad

1. **Secretos cifrados por OS.** Tokens y API keys SOLO con Electron `safeStorage`
   (DPAPI/Keychain/libsecret) en `userData`. Nunca `localStorage`, nunca env var en texto
   plano, nunca disco sin cifrar.
2. **Secretos nunca en el renderer.** Las keys viven y se usan SOLO en el proceso main.
   El renderer solo conoce un booleano "existe" (+ fingerprint SHA-256 de 8 hex).
3. **Secretos nunca logueados.** Todo `console.*` y todo lo que vuelve al renderer pasa
   por `sanitizeForLog()`. Proveedor nuevo de auth ⇒ extender el sanitizador.
4. **CSP estricta.** `connect-src` solo: api.github.com, github.com, openrouter.ai (+ el
   endpoint del proveedor activo si cambia). Todo dominio nuevo se documenta en
   `SECURITY.md`. `'unsafe-eval'` / localhost siguen siendo dev-only.
5. **Electron baseline intacto.** `contextIsolation: true`, `nodeIntegration: false`,
   `sandbox: true`, `webSecurity: true`. Guard de navegación y contención de paths
   `app://` de v1.8.0 no se tocan.

## Funcionalidad

6. **La lógica de Git no cambia de comportamiento** en fases de refactor/visuales. Las
   únicas escrituras de Git nuevas permitidas son las que el brief de la fase autorice
   explícitamente, siempre con confirmación del usuario para acciones destructivas.
7. **Features vivas intocables:** i18n ES/EN/ZH, Temporal Agent completo (predicciones,
   FUTUROS, Centauro, materialización, SQLite, providers), ramas `imagined/*` y tags
   `flight/*`, vista cronométrica + pan/zoom, conflict resolver (dentro del cuerpo
   central, no modal flotante), stash avanzado, clean untracked, GitHub auth.
8. **Toda string de UI via `lib/i18n.ts`** con sus tres idiomas (ES fuente de verdad;
   EN y ZH completos). Nada hardcodeado.
9. **`node:sqlite` con prefijo `node:` preservado** (tsup external + onSuccess patch en
   `tsup.config.ts`). No "arreglar" imports quitando el prefijo.
10. **Cero predicciones de IA en testing.** Usar el caché (`ai:load-prediction`) o mocks.
    Disparar OpenRouter consume crédito real de Ale — solo él lo dispara.

## Estética

11. La estética GitCron se mantiene: denso, oscuro, productivo, glass sobrio; paleta
    "The Compiled Soul". Nada de landing pages ni textos explicativos dentro de la app.
    Lo especulativo (IA) jamás puede confundirse visualmente con lo real.
12. Geometría de `ChronometricGraph.tsx` / `CommitGraph.tsx`: no tocar sin validación
    visual explícita de Ale.

## Proceso

13. **Un change por vez.** El alcance es el que declaran los artefactos OpenSpec del change.
    Lo que no está en el change no es parte del trabajo; si hace falta, se amplía el change.
14. **Cierre obligatorio:** `pnpm exec tsc --noEmit` en 0 + `pnpm test` verde +
    `openspec validate <change> --strict` válido + **reporte escrito en `docs/reports/`**
    (qué tocaste, qué NO tocaste, resultado real de esas comprobaciones) + **STOP**.
15. **Scope cerrado.** No tocar `README.md` ni `CHANGELOG.md` mientras se implementa —
    la documentación se actualiza en una pasada propia al cierre, indicada por Ale.
16. **No revertir cambios ajenos.** No eliminar código sólo porque un análisis marque
    complejidad: confirmar primero con CodeGraph que no sostiene features vivas.
17. **Fallow y CodeGraph son rutinas que pide Ale**, no automatismos del cierre.
18. Ante cualquier ambigüedad de alcance: **preguntar, no asumir.**
