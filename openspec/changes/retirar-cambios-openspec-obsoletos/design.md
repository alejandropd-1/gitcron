## Context

El archivo productivo pasa por electron/ipc/pipeline-archive.ts y electron/pipeline/openspec-cli.ts; la evidencia se relee desde disco. OpenSpec 1.13.2 expone archive --skip-specs. Ese flag no equivale a desactivar validación: la operación debe conservar las comprobaciones y reportar sus fallos.

## Goals / Non-Goals

**Goals:** retirar sin sincronizar deltas, preservar historia portable, diferenciar resultado conocido de desconocido y recuperarse ante interrupciones.
**Non-Goals:** revertir código parcial, deprecar specs canónicas, sustituir staging/commit o construir un archivador propio.

## Decisions

1. **Operación explícita y mecanismos compartidos.** Mantener pipeline:retire-plan y pipeline:retire-change con contratos propios, reutilizando descubrimiento/runtime, autorización de repo, plan main y cola existentes. No duplicar la seguridad del archivado en otro servicio divergente.
2. **Registro portable.** retirement.md contiene schemaVersion 1.0, closureKind, disposition, retiredAt, replacementChange, specSync, implementationState, conteo de tareas y referencias Git. Explicación en Markdown y sin identidad humana inventada. Mientras siga en activos es un intento pendiente; sólo el movimiento verificado lo convierte en evidencia de retiro.
3. **Estados honestos.** El lector diferencia retired, completed y archived-unknown; no deduce completed de la ausencia de retirement.md. Un registro incompleto/corrupto informa incertidumbre. Una lista histórica única permite abrir origen/reemplazo sin multiplicar pantallas.
4. **Plan vigente.** El plan no escribe y liga repo/root, cambio, contenido, runtime y entradas estructuradas. Confirmar vuelve a validar y rechaza modificaciones concurrentes. Reemplazo exige existencia, mismo alcance y ausencia de ciclos. El texto libre nunca se usa como argumento ejecutable.
5. **Ejecución comprobable.** Invocar archive con --yes --skip-specs mediante el runtime resuelto y argumentos acotados. Exigir validación estructural aprobada y precondiciones Git/concurrencia aplicables; tareas abiertas no bastan para bloquear. No agregar --no-validate silenciosamente ni ofrecer bypass en esta entrega.
6. **Recuperación.** Verificar cuatro hechos: origen dejó activos, destino existe, registro viajó, canónicas quedan intactas. Si hay discrepancia, mostrar estado parcial y archivos afectados, sin éxito ficticio ni rollback que pise trabajo externo. Reintento revalida registro y destino, no sobrescribe un retiro previo distinto.
7. **Windows.** Reusar invocador actual validado por plataforma y agregar prueba de rutas/argumentos; no declarar que interpolar en shell es seguro por validar sólo el slug.
8. **Git común.** Resultado actualiza evidencia y alcance; preparar usa el circuito ya existente. El mensaje sugerido diferencia retired de archived. La UI no incluye confirmación de commit dentro del retiro.

## Risks / Trade-offs

El registro es una convención GitCron, no un estado nativo de OpenSpec: documentar schemaVersion y reconocerlo al clonar. Versiones distintas del CLI exigen ensayo de --skip-specs en un repo temporal. Una edición externa durante el CLI produce discrepancia que se informa sin sobrescribirla.

## Migration Plan

No reescribir históricos para inventar cierres. Leer los registros presentes y conservar unknown donde no haya evidencia. La nueva operación se habilita cuando plan, ejecución y lector estén conectados. Si se revierte la UI, retirement.md permanece legible y no se aplican deltas retiradas.

## Open Questions

Ninguna decisión bloqueante para esta entrega. Retirar cambios que no validan mediante bypass queda fuera; se informa el error para corregir su estructura o definir una operación posterior específica.
