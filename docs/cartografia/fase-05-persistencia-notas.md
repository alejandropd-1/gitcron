# Fase C0.5 — Persistencia de curaduría: notas + layout por repo (cierra Tier 0)

> Mapea a `GITCRON_CARTOGRAPHY_BRIEF.md` § C0.5. Pegá la caja al agente. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual. **Cierre del Tier 0.**

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42
+ Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen: andamiaje, lente
Explorador, métricas de git, y el lienzo de nodos con React Flow + panel de
detalle (components/cartography/NodeDetailPanel.tsx, contrato lib/carto-types.ts).
Cerrás el Tier 0 con la PERSISTENCIA DE CURADURÍA: notas escritas por el usuario,
guardadas por repo, para que "el Alejandro de dentro de 6 meses" las encuentre.

INVARIANTES (no romper): la persistencia va a userData, NUNCA al working tree ni
a .git; keyed por repo_path; cero red; todo string por lib/i18n.ts en ES/EN/ZH;
verificá DESPUÉS de cada escritura que el dato quedó bien guardado (releelo).

Tareas:
1. Implementá persistencia en userData keyed por repo_path. PREFERÍ una tabla
   nueva `carto_annotation` (repo_path, node_path, note, pinned_x, pinned_y,
   updated_at) en el SQLite global, upsert por (repo_path, node_path), SIN tocar
   las tablas del Temporal Agent. Si la infra SQLite de escritura todavía no está
   lista en el repo, usá como FALLBACK un JSON por repo en userData con la misma
   interfaz, pensado para migrar a SQLite después (mantené la interfaz desacoplada
   del backend de almacenamiento).
2. Agregá IPC de lectura/escritura a userData para esas anotaciones, tipado en
   types/electron.d.ts y expuesto en preload.
3. En NodeDetailPanel, agregá un campo de nota editable por nodo que persista
   entre sesiones. Opcional: recordar la posición manual de un nodo (pin de layout)
   usando pinned_x / pinned_y.
4. Strings nuevos en lib/i18n.ts (ES/EN/ZH).

Aceptación: una nota escrita en un nodo persiste entre reinicios de la app; la
persistencia es per-repo (repos distintos no se pisan); nada se escribe en el
working tree ni en .git; si se usó SQLite, es tabla nueva sin tocar las del
Temporal Agent.

Al terminar: `tsc --noEmit` limpio + `pnpm test` verde, reporte escrito, y PARÁ
para el QA visual de Alejandro. Esto cierra el Tier 0.
```
