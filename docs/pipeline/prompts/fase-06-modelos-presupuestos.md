# Prompt de ejecución — Pipeline Fase 06 · Modelos, presupuesto y contexto

> Rama: `pipeline/fase-06-modelos-presupuestos`. Requiere F05 completada.

## Contexto obligatorio

Leé fuente de verdad, invariantes, contexto integral, estado, protocolo, brief F06 y reporte F05.
Verificá catálogos/capabilities actuales sin revelar credenciales ni cambiar configuración.

## Decisiones confirmadas — no volver a preguntar

- Selección por repo/rol/task; mostrar requested, resolved, reported y procedencia.
- Builder/auditor de familias distintas, incluso mediante fallback.
- Cambios en próxima unidad segura; no hot-swap.
- Costo/contexto unknown nunca es cero; no double-count; local no equivale a USD cero medido.
- No gestionar keys, auto-login, cargar modelos LM Studio ni modificar defaults globales.
- Ale realiza stage, commit y push.

## Ejecución y checkpoints

Identificate y anunciá rama, jerarquía, tandas, probes y costo previsto; pedí OK. TANDA 0 audita
catálogo, tipos, budgets y decorrelación sin editar. Esperá OK. Implementá catálogo/selección,
routing, usage/costo/tiempo, contexto y enforcement en tandas separadas.

## Entregables

- Funcionalidad, tests y fixtures de F06.
- Reporte `docs/reports/YYYY-MM-DD-pipeline-fase-06-modelos-presupuestos.md` con procedencia de
  pricing/capabilities y limitaciones.
- Checklist humano de selección/fallback/budget y tablero actualizado.

## Entrega

No cambies credenciales/configuración del usuario ni hagas Git de cierre. Entregá exit codes,
archivos, desvíos, mensaje/comandos sugeridos y STOP.

