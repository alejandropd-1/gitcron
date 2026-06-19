# Fase 4 — Proveedor de IA enchufable (LM Studio local u online)

> Fase 4 de Cartografía · plan completo en `00-indice.md`. La costura híbrida local/online. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen andamiaje, Explorador y el grounding
estructural (CodeGraph: relaciones + impacto, contrato CartoGraph). Ahora construís la CAPA
DE PROVEEDOR DE IA que van a usar la explicación de nodos y la ventanita de preguntas,
pensada para alternar entre IA local (LM Studio) e IA online.

INVARIANTES (no romper): secretos solo en el main vía safeStorage, nunca en el renderer ni
logueados; cualquier dominio de proveedor online se agrega EXPLÍCITAMENTE al connect-src del
CSP y se documenta en SECURITY.md; el proveedor local apunta a localhost:1234 (API compatible
OpenAI) y también requiere su entrada de CSP documentada; la IA NUNCA dispara sola; strings i18n.

Reconocimiento primero (leé esto ANTES de tocar nada):
- electron/ai/ (predict, key-store con safeStorage, providers, provider-parsing) → la infra multi-proveedor a REUTILIZAR.
- app/layout.tsx → el CSP por meta tag (connect-src) que hay que tocar.
- SECURITY.md → dónde documentar el cambio de CSP.
- SettingsPanel.tsx → dónde va el selector de proveedor.
- Referencia: docs/01_INVARIANTES.md (secretos / CSP).

Tareas:
1. Definí una interfaz de proveedor común (p. ej. CartoAIProvider con métodos `explain(node, contexto)`
   y `ask(pregunta, contexto)`). REUTILIZÁ/alineá con los stubs multi-proveedor que ya existen del
   Temporal Agent (openrouter/openai/gemini/opencode) — NO dupliques esa infra; sumá un proveedor
   'lmstudio'/local.
2. Proveedor local LM Studio: POST a http://localhost:1234/v1/chat/completions (compatible OpenAI),
   sin API key. Manejá "servidor local no disponible" con un mensaje claro, sin romper la vista.
3. Selector de proveedor en Ajustes (local vs online), opt-in, apagado por defecto.
4. Tipá el IPC, exponé en preload, strings i18n. Documentá los cambios de CSP en SECURITY.md.

Aceptación: desde el repo activo se puede mandar un prompt de prueba al proveedor elegido (local
u online) y recibir respuesta; con el proveedor apagado o no disponible, la vista sigue funcionando
sin IA; secretos solo en el main; cambios de CSP documentados.

Al terminar: `tsc --noEmit` + `pnpm test` + reporte escrito + STOP para QA visual.
```
