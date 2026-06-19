# Fase 5 ⭐ — Panel "Explicame esto" (click → castellano, grounded, cacheado)

> Fase 5 de Cartografía · plan completo en `00-indice.md`. Primera superficie estrella. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 +
Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen andamiaje, Explorador, el grounding
CodeGraph (relaciones + impacto) y la capa de proveedor de IA (local/online). Ahora la PRIMERA
superficie estrella: hacés click en un archivo/símbolo y la IA lo explica en lenguaje humano,
bajado a tierra, para alguien no experto.

INVARIANTES (no romper): la explicación se construye SOLO con contexto real y recortado (el
código/firma del nodo + sus relaciones de CodeGraph: callers, callees, impacto) — NUNCA mandes
el repo entero; ese recorte es la clave del ahorro de tokens y de que la explicación sea verdadera;
IA opt-in; cacheá para no re-gastar; strings i18n.

Tareas:
1. Al seleccionar un nodo, armá un contexto MÍNIMO Y PRECISO desde el contrato CartoGraph: el
   código/firma del nodo + sus callers, callees e impact radius. Nada más.
2. Mandalo al proveedor con un prompt que pida una explicación en castellano, clara, para alguien
   no técnico: qué hace, a qué le pide datos, qué consume, "si tocás esto se afecta X/Y" y "suele
   cambiar junto con…".
3. Mostralo en un PANEL DE DETALLE legible (estética TCARS): ruta + explicación + lista de impacto.
4. CACHEÁ la explicación por nodo (clave por repo_path + node_path + hash del contenido); no re-llames
   al modelo si el nodo no cambió. Reusá la disciplina de cache del Temporal Agent.
5. Strings i18n. Corre con el proveedor elegido (local u online).

Aceptación: click en un nodo conocido devuelve una explicación correcta y en castellano, con su
impacto; el contexto enviado es chico (verificable en el reporte); se cachea y no re-llama si no
cambió; funciona local y online; con IA apagada, el panel muestra al menos los datos estructurales.

Al terminar: `tsc --noEmit` + `pnpm test` + reporte escrito + STOP para QA visual.
```
