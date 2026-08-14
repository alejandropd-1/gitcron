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
    `openspec validate <change> --strict` válido + **STOP**. Un reporte en `docs/reports/` no es
    obligatorio, pero sigue siendo la forma de dejar registrado lo que las comprobaciones no
    demuestran: qué se tocó, qué no, y el resultado real —incluido "no mejoró"—.
15. **Scope cerrado.** No tocar `README.md` ni `CHANGELOG.md` mientras se implementa —
    la documentación se actualiza en una pasada propia al cierre, indicada por Ale.
16. **No revertir cambios ajenos.** No eliminar código sólo porque un análisis marque
    complejidad: confirmar primero con CodeGraph que no sostiene features vivas.
17. **Fallow y CodeGraph son rutinas que pide Ale**, no automatismos del cierre.
18. Ante cualquier ambigüedad de alcance: **preguntar, no asumir.**
19. **Una suite que no termina no está en verde, y ningún recorrido del disco puede
    ser infinito.** Dos caras del mismo caso real (2026-08-14, change
    `actualizar-integracion-openspec-1-8`): `computeDirContentHash` recorría carpetas
    con una cola **sin tope de profundidad ni registro de lo ya visitado**, y cuatro
    tests le pasaban un `readdir` falso que devolvía las mismas entradas para toda ruta
    que contuviera `.agents`. El resultado fue un bucle **sincrónico** infinito: los
    ~1215 tests pasaban, se imprimía verde, y el proceso no salía nunca.
    - **No se sube un `testTimeout` para destrabar una suite.** Un timeout de test no
      puede interrumpir un bucle sincrónico: subirlo de 5 a 15 s no arregló nada y
      además tapó el síntoma. Si la suite no devuelve exit code, se aísla el archivo
      (bisección por grupo y por tanda), no se afloja el reloj.
    - **`pnpm test` cuenta sólo con exit code observado.** "Vi verde en pantalla" no es
      evidencia: el verde se imprime antes del cierre del proceso.
    - **Todo recorrido de directorios en el proceso principal lleva tope** de
      profundidad y de entradas, y corta ante lo ya visitado. Congelar el main de
      Electron congela la aplicación entera y no se puede cancelar.
    - **Un doble de disco no puede describir un árbol infinito.** Si el `readdir`
      falso responde por coincidencia de subcadena (`p.includes('.agents')`), todo
      descendiente vuelve a coincidir. Los dobles se anclan a rutas exactas.
