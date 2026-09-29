# Tasks

Lista de resultados y comprobaciones pendientes. Referencias de implementación en [execution.md](execution.md).

## 1. Matriz verificable

- [ ] 1.1 **Orquestador/auditor:** Inventariar operaciones y parámetros de la versión instalada en matriz motor/integración/ejecutor/UI. **Comprobación:** Cada fila tiene alcance y evidencia; distinguir CLI de workflow. La matriz define qué prompts se liberan y qué versiones soporta.
- [ ] 1.2 **IA local:** Implementar descubrimiento de capacidades/versiones sin declarar soporte desconocido. **Comprobación:** Versión sin contrato ofrece lectura segura/motivo; no inventa flags por inferencia.
- [ ] 1.3 **IA local:** Implementar root/store explícito e invalidación de planes. **Comprobación:** Store externo exige alcance autorizado; cambiar root invalida propuesta pendiente.

## 2. Ciclo fluido

- [ ] 2.1 **IA local:** Conectar revisión de planificación con diff antes de escribir. **Comprobación:** Edición de design repercute en artefactos afectados; no confunde con actualizar integración.
- [ ] 2.2 **IA local:** Conectar verificación de implementación con referencias a pruebas/código. **Comprobación:** Validación estructural aprobada no se presenta como implementación verificada.
- [ ] 2.3 **IA local:** Conectar creación incremental al DAG y artefactos personalizados. **Comprobación:** Schema con múltiples outputs conserva bloqueos/dependencias sin cuatro pasos fijos.
- [ ] 2.4 **IA local:** Conectar preparación acelerada de artefactos respetando el DAG. **Comprobación:** Sólo genera artefactos habilitados; fallo parcial deja estado releíble sin pasar a implementar.

## 3. Administración, una operación por tanda

- [ ] 3.1 **IA local:** Agregar lectura/preview/gestión de schemas con alcance. **Comprobación:** Caso esquema personalizado y error de versión; valores desconocidos permanecen no editables.
- [ ] 3.2 **IA local:** Agregar lectura/preview/gestión de templates. **Comprobación:** Preview corresponde a archivos concretos; no pisa edición concurrente.
- [ ] 3.3 **IA local:** Agregar administración explícita de stores. **Comprobación:** Registrar/quitar no borra directorio ni cambia repos implícitamente; test de scope.
- [ ] 3.4 **IA local:** Agregar administración acotada de worksets. **Comprobación:** Prueba root efectivo y operación fallida; no mezcla datos de repos.
- [ ] 3.5 **IA local:** Exponer context y doctor con resultados legibles y referencias. **Comprobación:** Diagnóstico no ejecuta reparaciones ocultas y muestra error/fuente.
- [ ] 3.6 **IA local:** Agregar plan de archivo por lote con conflictos de deltas visibles. **Comprobación:** Detecta solapamiento entre specs; no declara el lote completo antes de ejecutar.
- [ ] 3.7 **IA local:** Agregar ejecución/reanudación de lote con resultados por cambio. **Comprobación:** Fallo intermedio conserva éxitos reales y reintenta pendientes sin duplicar.
- [ ] 3.8 **IA local:** Agregar recorrido de onboarding usando operaciones ya soportadas. **Comprobación:** Antes de escribir muestra root, herramientas y archivos; nunca inicializa otro repo por root no resuelto.

## 4. Aceptación

- [ ] 4.1 **Orquestador/auditor:** Auditar cada fila de la matriz en montaje productivo y actualizar documentación de soporte. **Comprobación:** Core, ampliado, schema custom, store autorizado y versión desconocida; no cerrar mientras haya filas del alcance sólo simuladas. Validación integrada y visual.

## 5. Sync aislado y aplicación (traído de cerrar-conexiones-operativas-de-sdd)

- [ ] 5.1 **Orquestador/auditor:** Cerrar contrato del runner real y del aislamiento antes de emitir su prompt; incluir cancelación, schema de salida y límites de escritura. **Comprobación:** Documentar en design ejecutor probado o bloqueo concreto; demostrar cómo se impide escribir en el repo durante preview. Sin ejecutor compatible esta sección sigue pendiente.
- [ ] 5.2 **IA local:** Implementar el adaptador del workflow nativo para obtener contenidos propuestos en el entorno aislado aprobado. **Comprobación:** Con fixture de proceso y ensayo real acotado, preview devuelve propuesta y deja canónicas byte-iguales; timeout/cancelación limpian sólo temporales propios.
- [ ] 5.3 **IA local:** Registrar las dependencias productivas de sync desde main y reutilizar la disponibilidad por capacidad. **Comprobación:** Prueba de composición usa el registro real: runner conectado, falta de capacidad informada y ausencia de fallback que fusione specs por su cuenta.
- [ ] 5.4 **IA local:** Vincular propuesta a plan main con root, cambio, hashes, runtime y alcance validados; rechazar paths no permitidos. **Comprobación:** Manipulación del payload, symlink fuera del root, cambio de HEAD/root o edición de spec invalidan el plan antes de escribir.
- [ ] 5.5 **IA local:** Aplicar sólo la propuesta vigente confirmada con exclusión por repo y recuperación de escrituras interrumpidas. **Comprobación:** Fallo en segunda escritura y reintento no pierden ediciones externas ni declaran éxito parcial; registrar archivos realmente aplicados.
