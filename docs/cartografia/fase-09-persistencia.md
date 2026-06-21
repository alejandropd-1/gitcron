# Fase 9 — Persistencia: historial de chats + notas de curaduría

> Fase 9 de Cartografía · plan completo en `00-indice.md`. Guarda las conversaciones (lista navegable tipo cliente de chat) y las notas por nodo, entre sesiones. Cierra con `tsc` + `pnpm test` + `fallow` + reporte + push de la branch + STOP (no merge).

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 +
TS 5.9, simple-git + Octokit). Ya están en main: Explorador, grounding CodeGraph, proveedor de IA
local/online, "Explicame esto", ventanita de preguntas, Grafo semántico y Panorama. HOY la
ventanita guarda el historial SOLO dentro de la sesión (se pierde al cerrar). Esta fase agrega
PERSISTENCIA: (a) historial de chats guardado y navegable, y (b) notas de curaduría por nodo.

INVARIANTES (no romper): la persistencia va a userData (SQLite global), NUNCA al working tree ni
a .git; todo keyed por repo_path; cero red; verificá DESPUÉS de cada escritura que el dato quedó
guardado (releelo); reusá el patrón de electron/db/ (schema.ts + módulos de cache existentes) y NO
toques las tablas existentes (Temporal Agent, carto_panorama); strings por lib/i18n.ts (ES/EN/ZH).

Reconocimiento primero (leé esto ANTES de tocar nada):
- components/cartography/CartoAskBox.tsx → el historial de sesión actual a persistir y cómo se dispara askRepo.
- electron/ai/carto/ask-repo.ts → qué devuelve cada turno (answer, usedNodes, usedFiles, promptChars).
- electron/db/schema.ts + electron/db/carto-cache.ts → el patrón EXACTO de tablas/IPC/helpers a imitar (NO toques carto_panorama ni tablas del Temporal Agent).
- components/cartography/CartoNodeDetail.tsx → dónde montar el campo de nota por nodo.
- components/cartography/CartographyView.tsx → dónde montar la lista de conversaciones (cerca de la ventanita de preguntas).
- lib/git-store.ts / RepoState → cómo identificar el repo activo (repo_path).
- types/electron.d.ts + electron/preload.ts → cómo se tipa y expone el IPC de carto.
- Referencia: docs/00_FUENTE_DE_VERDAD.md y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fase-09-persistencia`.
- Commits en esa branch.
- Al cerrar (tsc + tests + fallow + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge a main lo hace Alejandro tras su QA visual y OK.

Tareas:
1. Esquema SQLite nuevo en electron/db/schema.ts (userData), keyed por repo_path, SIN tocar tablas
   existentes:
   - `carto_conversation` (id, repo_path, title, created_at, updated_at)
   - `carto_message` (id, conversation_id, role 'user'/'assistant', content, used_nodes JSON, used_files JSON, created_at)
   - `carto_annotation` (repo_path, node_path, note, updated_at) — upsert por (repo_path, node_path)
   Si el write path no estuviera listo, fallback JSON por repo con la misma interfaz.
2. Capa de acceso (p. ej. electron/db/carto-history.ts) + IPC: crear/listar/leer/borrar conversaciones;
   append de mensajes; get/upsert de nota por nodo. Tipá en types/electron.d.ts y exponé en preload.
3. HISTORIAL (principal): en la ventanita de preguntas, una lista de las conversaciones del repo
   activo (estilo barra lateral de chat) con: nueva conversación, seleccionar para retomar (recarga
   el hilo completo), y borrar. Debe escalar a CIENTOS (virtualizá o paginá). Al preguntar, persistí
   el turno (user + assistant + nodos/archivos citados). Ubicación a tu criterio cerca de la caja de
   preguntas — que sea cómoda, no estorbe el layout de 3 columnas.
4. Per-repo: cambiar de solapa muestra el historial del repo correspondiente; no mezclar repos.
5. NOTAS (secundario): campo de nota editable en CartoNodeDetail, persistente entre sesiones
   (upsert por repo_path+node_path). Mostrá un indicador cuando un nodo tiene nota.
6. Strings i18n ES/EN/ZH.

Aceptación: una conversación persiste entre reinicios de la app; la lista muestra las conversaciones
del repo activo y se puede retomar/borrar; escala a cientos; cambiar de solapa cambia el historial;
una nota por nodo persiste y se ve su indicador; nada se escribe en working tree ni en .git; tablas
nuevas sin tocar Temporal Agent ni carto_panorama.

Al terminar: tsc + pnpm test + fallow audit + reporte en docs/reports/ + push de la branch + STOP
para QA visual. No mergees.
```
