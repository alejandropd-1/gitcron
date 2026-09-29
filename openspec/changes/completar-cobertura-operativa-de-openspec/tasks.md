# Tasks

Lista de resultados y comprobaciones pendientes. Referencias de implementación en [execution.md](execution.md).

## 1. Matriz verificable

- [ ] 1.1 Inventariar operaciones y parámetros de la versión instalada en matriz motor/integración/ejecutor/UI. **Comprobación:** Cada fila tiene alcance y evidencia; distinguir CLI de workflow. La matriz define qué prompts se liberan y qué versiones soporta.
- [ ] 1.2 Implementar descubrimiento de capacidades/versiones sin declarar soporte desconocido. **Comprobación:** Versión sin contrato ofrece lectura segura/motivo; no inventa flags por inferencia.
- [ ] 1.3 Implementar root/store explícito e invalidación de planes. **Comprobación:** Store externo exige alcance autorizado; cambiar root invalida propuesta pendiente.

## 2. Ciclo fluido

- [ ] 2.1 Conectar revisión de planificación con diff antes de escribir. **Comprobación:** Edición de design repercute en artefactos afectados; no confunde con actualizar integración.
- [ ] 2.2 Conectar verificación de implementación con referencias a pruebas/código. **Comprobación:** Validación estructural aprobada no se presenta como implementación verificada.
- [ ] 2.3 Conectar creación incremental al DAG y artefactos personalizados. **Comprobación:** Schema con múltiples outputs conserva bloqueos/dependencias sin cuatro pasos fijos.
- [ ] 2.4 Conectar preparación acelerada de artefactos respetando el DAG. **Comprobación:** Sólo genera artefactos habilitados; fallo parcial deja estado releíble sin pasar a implementar.

## 3. Administración, una operación por tanda

- [ ] 3.1 Agregar lectura/preview/gestión de schemas con alcance. **Comprobación:** Caso esquema personalizado y error de versión; valores desconocidos permanecen no editables.
- [ ] 3.2 Agregar lectura/preview/gestión de templates. **Comprobación:** Preview corresponde a archivos concretos; no pisa edición concurrente.
- [ ] 3.3 Agregar administración explícita de stores. **Comprobación:** Registrar/quitar no borra directorio ni cambia repos implícitamente; test de scope.
- [ ] 3.4 Agregar administración acotada de worksets. **Comprobación:** Prueba root efectivo y operación fallida; no mezcla datos de repos.
- [ ] 3.5 Exponer context y doctor con resultados legibles y referencias. **Comprobación:** Diagnóstico no ejecuta reparaciones ocultas y muestra error/fuente.
- [ ] 3.6 Agregar plan de archivo por lote con conflictos de deltas visibles. **Comprobación:** Detecta solapamiento entre specs; no declara el lote completo antes de ejecutar.
- [ ] 3.7 Agregar ejecución/reanudación de lote con resultados por cambio. **Comprobación:** Fallo intermedio conserva éxitos reales y reintenta pendientes sin duplicar.
- [ ] 3.8 Agregar recorrido de onboarding usando operaciones ya soportadas. **Comprobación:** Antes de escribir muestra root, herramientas y archivos; nunca inicializa otro repo por root no resuelto.

## 4. Aceptación

- [ ] 4.1 Auditar cada fila de la matriz en montaje productivo y actualizar documentación de soporte. **Comprobación:** Core, ampliado, schema custom, store autorizado y versión desconocida; no cerrar mientras haya filas del alcance sólo simuladas. Validación integrada y visual.
