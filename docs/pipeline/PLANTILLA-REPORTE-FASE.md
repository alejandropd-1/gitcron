# Pipeline Fase NN — Reporte de <nombre>

Fecha: `YYYY-MM-DD`
Agente: `<IA / runtime / modelo / rol>`
Rama: `pipeline/fase-NN-<slug>`
Estado: `Lista para QA | Bloqueada`
Brief: `docs/pipeline/briefs/fase-NN-<slug>.md`

## Objetivo

Qué debía lograr esta fase y por qué existe dentro del track.

## Alcance implementado

- Resultado funcional verificable.
- Contratos o comportamientos incorporados.
- Estados degradados contemplados.

## Decisiones aplicadas

- Decisiones confirmadas por Ale que se respetaron.
- Decisiones nuevas aprobadas durante checkpoints, con fecha o referencia.

## Cambios técnicos

### Archivos creados

- `ruta`: responsabilidad.

### Archivos modificados

- `ruta`: cambio concreto.

### Archivos eliminados

- Ninguno, o lista con evidencia y checkpoint de autorización.

## Contratos, datos y seguridad

- Tipos, eventos, IPC, DB, procesos o endpoints afectados.
- Scoping per-repo y tratamiento de secretos.
- Compatibilidad/degradación por runtime.

## Validaciones ejecutadas

| Comando o prueba | Exit code | Resultado | Observaciones |
|---|---:|---|---|
| `npx.cmd tsc --noEmit` | | | |
| tests focalizados | | | |
| `pnpm test` | | | |
| `pnpm exec fallow` | | | deuda heredada separada |

No escribir “OK” si el comando no se ejecutó. Indicar `NO EJECUTADO` y el motivo.

## Evidencia visual

Aplicable a UI. Incluir estados recorridos, resoluciones, teclado, i18n ES/EN/ZH, consola y rutas de
screenshots. Si no aplica, escribir `No aplica`.

## Checklist manual para Ale

- [ ] Acción o flujo que requiere intervención humana.
- [ ] Proveedor/runtime/credencial/configuración que el agente no debe tocar.
- [ ] Consecuencia esperada y forma de verificarla.

## Desvíos respecto del brief

Ninguno, o cada desvío con causa, impacto y autorización. No esconder mejoras no pedidas.

## Riesgos, limitaciones y pendientes

- Riesgos conocidos.
- Datos/capabilities desconocidos.
- Trabajo expresamente diferido a otra fase.

## Estado Git de entrega

```text
<salida sanitizada de git status --short>
```

El agente no ejecutó stage, commit, push, merge, tag ni release.

## Mensaje y comandos sugeridos para Ale

Commit sugerido:

```text
<tipo>(pipeline): <resultado de la fase>
```

Comandos sugeridos, no ejecutados:

```powershell
git status --short
git diff --check
git add <archivos exactos de la fase>
git commit -m "<mensaje>"
git push -u origin pipeline/fase-NN-<slug>
```

## Cierre

`FASE NN LISTA PARA TU QA` o `FASE NN BLOQUEADA`.
