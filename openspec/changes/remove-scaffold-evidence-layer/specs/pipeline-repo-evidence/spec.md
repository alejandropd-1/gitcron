## MODIFIED Requirements

### Requirement: Evidencia local tolerante y explícita
Pipeline SHALL representar repositorios con o sin OpenSpec, preservando evidencia válida y emitiendo diagnósticos por fuentes ausentes o malformadas. Las fuentes observadas SHALL limitarse a los artefactos de OpenSpec y al estado de Git; Pipeline SHALL NOT leer registros del kit multi-agente retirado, como historiales de gates, delegaciones entre agentes o mediciones de diff visual.

#### Scenario: Repositorio sin OpenSpec
- **WHEN** un repositorio Git no contiene scaffold de OpenSpec
- **THEN** el snapshot conserva evidencia Git y marca las fuentes de OpenSpec como `unknown` sin fallar globalmente

#### Scenario: JSONL parcialmente corrupto
- **WHEN** una línea intermedia es inválida y existen líneas válidas posteriores
- **THEN** Pipeline conserva las líneas válidas y agrega un diagnóstico degradado para la línea inválida

#### Scenario: Registros del kit retirado presentes en disco
- **WHEN** un repositorio todavía contiene archivos como `docs/ai/logs/gates.jsonl` o `delegations.jsonl`
- **THEN** Pipeline los ignora por completo y no expone ningún campo derivado de ellos
