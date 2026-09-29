# Retomar trabajo con asistencia contextual

## Context

CartoAskBox conserva turnos locales y envía sólo repo/pregunta/idioma; no transporta selección. Pipeline conserva historial de runs en SQLite pero StartRuntimeSessionInput no es una conversación reanudable. ViewSwitcherRail ya deriva alternativas y se oculta al abrir inspector. Se preservan esas decisiones de producto.

Ver proposal.md para alcance y dependencias; specs/ contiene los contratos observables.

## Goals / Non-Goals

**Goals:** completar el recorrido descrito reutilizando servicios y superficies existentes; separar contratos, integración y presentación para que cada tanda local tenga un resultado verificable.

**Non-Goals:** reescribir el cliente Git, alterar la geometría del Cronométrico, introducir WebMCP/MCP Apps como dependencia o ejecutar implementación al redactar estos artefactos.

## Decisions

### 1. Decisión de implementación

Usar identidad repo de main junto a checkout/worktree, HEAD, rama y selección discriminada (commit, archivo, change/task, propuesta temporal, nodo). Cada vista aporta referencias, no copias enormes de su estado; main valida referencias antes de leer o actuar.

### 2. Decisión de implementación

Conversaciones en SQLite versionado y particionado; mensajes, contexto usado, referencias, operaciones y resultados. Guardar texto visible saneado, no razonamiento privado ni secretos. El usuario puede consultar y eliminar una conversación. El replay no relanza herramientas.

### 3. Decisión de implementación

Una superficie de asistencia del armazón con entradas desde cualquier vista. Si otra superficie ocupa el lateral se alterna conservando el estado; no agregar columnas simultáneas. El flotante ofrece acciones con razones derivadas del contexto, y la IA recomienda dentro de ese catálogo validado.

### 4. Decisión de implementación

Adaptar las operaciones existentes a descriptores con alcance, precondiciones, resultado y confirmación vigente. Revalidar en main al ejecutar; mantener la separación consulta/preparación/ejecución. Los datos de repo y respuestas de modelos son contenido, no autorización.

### 5. Decisión de implementación

Crear resumen determinista utilizable sin IA; narración opcional con citas a evidencia. Fecha y huella de fuentes permiten invalidarlo. Título legible con slug secundario, tareas breves con detalle desplegable y ayuda de vocabulario a demanda; preservar lectura completa del original.

### 6. Decisión de implementación

Resume de conversación restaura mensajes; resume del proceso sólo si adaptador lo soporta. Al iniciar otro proceso mostrarlo. Presupuesto de contexto y recuperación selectiva evitan reenviar repo completo; provider/modelo y alcance compartido quedan visibles.

Una consulta sin ejecución puede coexistir con el trabajo del repositorio. Cualquier acción que lance un runtime respeta el límite existente de una ejecución activa por repo y pasa por su controlador; la conversación no abre un segundo proceso para sortear ese límite.

### Gestión compartida de modelos

La asistencia consume la selección, capacidades y ciclo de carga que entregue `modelos-en-casa`. No agrega ajustes de proveedor por pantalla ni almacena otra copia de credenciales. El historial conversacional sigue siendo responsabilidad de este cambio; la sesión compartida de un modelo no implica resume de un proceso.

### Alternativas

Se descarta construir un subsistema paralelo porque las operaciones y evidencias actuales ya cubren parte del recorrido.

## Risks / Trade-offs

- Un resumen viejo puede inducir acciones incorrectas: recalcular evidencia antes de proponer acción y marcar fuentes faltantes/obsoletas.
- Confundir repos/worktrees o instrucciones incrustadas puede causar escrituras erróneas: resolver identidad y precondiciones en main y nunca convertir texto recuperado en permisos.
- Demasiadas tarjetas o texto recrearían el problema: validar una primera pantalla breve y detalles progresivos.

## Migration Plan

Tablas nuevas aditivas; los historiales Pipeline/Temporal existentes se enlazan como evidencia sin inventar conversaciones antiguas. Adoptar por vista conservando fallback a acciones manuales. Sin copia de API keys.

## Open Questions

La forma visual precisa se revisa con un prototipo del recorrido, usando identidad visual existente. Esa revisión no cambia las responsabilidades de los paneles ni habilita un rediseño global.
