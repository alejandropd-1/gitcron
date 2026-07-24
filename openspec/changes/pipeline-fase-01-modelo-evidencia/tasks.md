## 1. Contratos y fixtures

- [x] 1.1 Definir DTOs serializables de evidencia, diagnóstico, snapshot, decisión y evento semántico en `types/pipeline/`
- [x] 1.2 Crear fixtures sanitizados de tasks, auditorías, OpenSpec y los tres productores JSONL reales

## 2. Parsers y reducción pura

- [x] 2.1 Implementar parser de tasks Markdown y veredictos de auditoría con diagnósticos
- [x] 2.2 Implementar lector JSONL incremental tolerante a línea parcial, corrupción aislada y truncado
- [x] 2.3 Normalizar gates, delegaciones, alturas visuales y evaluaciones de controles sin defaults inventados
- [x] 2.4 Implementar selección de change desde branch/OpenSpec sin elecciones ambiguas
- [x] 2.5 Implementar reducer determinístico y eventos de task, reporte, gate, merge y archive
- [x] 2.6 Cubrir parsers, selección y reducer con tests focalizados

## 3. Evidencia segura del repositorio

- [x] 3.1 Implementar contención por realpath/path.relative y lecturas estables acotadas
- [x] 3.2 Implementar consultas read-only de Git y OpenSpec con argumentos fijos
- [x] 3.3 Construir `RepoEvidenceReader` tolerante a kit/CLI/archivos ausentes
- [x] 3.4 Probar traversal, symlink externo, desaparición concurrente, repo sin kit y múltiples changes

## 4. Persistencia y replay

- [x] 4.1 Agregar migración STRICT para repo bindings, snapshots y eventos Pipeline
- [x] 4.2 Implementar repositorio SQLite con sequence per-repo e idempotencia por eventId
- [x] 4.3 Probar migración, aislamiento cross-repo, replay y sanitización previa a persistencia

## 5. IPC read-only

- [x] 5.1 Registrar servicio/handlers de snapshot y suscripción read-only en Electron main
- [x] 5.2 Exponer DTOs y métodos tipados mínimos en preload y `types/electron.d.ts`
- [x] 5.3 Reutilizar el watcher existente como trigger y limpiar listeners/suscripciones
- [x] 5.4 Probar allowlist IPC, refresh, unsubscribe y ausencia de escrituras al repo

## 6. Cierre

- [x] 6.1 Ejecutar typecheck, tests focalizados, suite, fallow y gate full; registrar resultados honestos
- [x] 6.2 Escribir reporte F01 y actualizar tablero/checklist humano a `Lista para QA`
- [x] 6.3 Auditar F01 read-only y resolver únicamente hallazgos concretos aceptados
