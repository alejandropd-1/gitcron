# Pipeline repo evidence

## Purpose

Definir la captura local, segura y tolerante de evidencia por repositorio para construir snapshots verificables de Pipeline.

## Requirements

### Requirement: Evidencia local tolerante y explícita
Pipeline SHALL representar repositorios con o sin OpenSpec, gates o logs locales, preservando evidencia válida y emitiendo diagnósticos por fuentes ausentes o malformadas.

#### Scenario: Repositorio sin kit
- **WHEN** un repositorio Git no contiene OpenSpec ni archivos del método
- **THEN** el snapshot conserva evidencia Git y marca las fuentes del kit como `unknown` sin fallar globalmente

#### Scenario: JSONL parcialmente corrupto
- **WHEN** una línea intermedia es inválida y existen líneas válidas posteriores
- **THEN** Pipeline conserva las líneas válidas y agrega un diagnóstico degradado para la línea inválida

### Requirement: Parsers de metadata sin render inseguro
Pipeline SHALL extraer metadata de tasks, reportes, auditorías y productores JSONL sin renderizar Markdown como HTML ni convertir campos ausentes en defaults exitosos.

#### Scenario: Task con marcador en texto
- **WHEN** `[x]` aparece dentro de prosa o código y no como marcador de una task Markdown
- **THEN** el parser no la cuenta como task completada

#### Scenario: Métrica opcional ausente
- **WHEN** una delegación no informa reintentos o espera humana
- **THEN** esos campos quedan `unknown` y no se normalizan a cero

### Requirement: Selección no ambigua de change
Pipeline SHALL seleccionar un change sólo por match inequívoco de branch o cuando exista un único change activo; en cualquier otro caso SHALL requerir selección.

#### Scenario: Dos changes activos sin match
- **WHEN** existen varios changes activos y la branch no identifica uno de forma inequívoca
- **THEN** el snapshot declara `selectionRequired` y no asigna un change arbitrario

### Requirement: Lectura confinada al repositorio
`RepoEvidenceReader` SHALL ejecutarse sólo en Electron main, resolver paths reales y rechazar lecturas que escapen del repositorio mediante traversal o symlink.

#### Scenario: Symlink externo
- **WHEN** una ruta permitida nominalmente resuelve fuera del root real del repositorio
- **THEN** la lectura se rechaza y queda un diagnóstico de seguridad sin exponer el contenido externo

#### Scenario: Archivo desaparece durante lectura
- **WHEN** un archivo desaparece entre stat y read
- **THEN** el reader degrada esa fuente y completa el resto del snapshot

### Requirement: Cero escrituras al repositorio observado
La ingesta F01 SHALL usar operaciones de solo lectura para filesystem, Git y OpenSpec y SHALL NOT crear cursores, caches o archivos dentro del repositorio observado.

#### Scenario: Captura incremental
- **WHEN** Pipeline conserva un cursor JSONL
- **THEN** lo persiste en la base global de GitCron y no junto al archivo observado
