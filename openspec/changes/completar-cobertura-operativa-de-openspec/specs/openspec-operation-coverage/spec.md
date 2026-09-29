# openspec-operation-coverage

## Purpose

Exponer y completar recorridos OpenSpec verificables según motor, perfil, esquema, ejecutor y raíz de planificación, sin confundir instalación con integración operativa.

## ADDED Requirements

### Requirement: La cobertura distingue descubrimiento y ejecución

GitCron SHALL declarar por operación soporte del motor, integración, ejecutor y recorrido UI. SHALL distinguir CLI de workflows de agente, y desconocido de no soportado. No SHALL contar una operación como integrada por existir su nombre o botón.

#### Scenario: Workflow instalado sin ejecutor
- **WHEN** el perfil habilita una operación pero no hay executor compatible
- **THEN** se declara la causa y alternativa, sin afirmar cobertura completa

#### Scenario: Versión no reconocida
- **WHEN** el motor devuelve capacidades nuevas sin contrato probado
- **THEN** se muestran como desconocidas y no se ejecutan mediante argumentos inventados

### Requirement: La planificación y la verificación tienen recorridos propios

La UI SHALL permitir revisar planificación, crear artefactos incrementales y verificar implementación cuando el entorno lo soporte, usando las instrucciones oficiales. Verify SHALL distinguir hallazgos de código/pruebas de validate estructural; actualizar integración SHALL NOT presentarse como revisar el plan.

#### Scenario: Revisar diseño
- **WHEN** se solicita actualizar planificación
- **THEN** se presenta preview de artefactos afectados sin editar código de producto

#### Scenario: Validación estructural exitosa
- **WHEN** las specs validan pero no hay pruebas de implementación
- **THEN** no se afirma que la implementación esté verificada

#### Scenario: Artefacto personalizado
- **WHEN** un esquema declara un artefacto fuera de los cuatro usuales
- **THEN** se puede inspeccionar y operar según sus dependencias y outputs oficiales

### Requirement: La raíz y el alcance se resuelven antes de operar

Toda operación SHALL identificar raíz de planificación, repositorio de implementación y alcance global/local. Un store externo SHALL requerir destino autorizado explícito; cambiar raíz SHALL invalidar selección y planes anteriores.

#### Scenario: Cambio de store
- **WHEN** se cambia el store durante un preview
- **THEN** no se aplica el plan anterior sobre la nueva raíz

#### Scenario: Directorio no autorizado
- **WHEN** una respuesta propone escribir fuera de las raíces aprobadas
- **THEN** la operación se rechaza sin escribir

### Requirement: La administración avanzada es accesible sin saturar

La UI SHALL ofrecer las operaciones soportadas de esquemas/templates, stores/worksets y diagnóstico/contexto bajo acceso avanzado, con alcance y efecto claros. SHALL reutilizar configuración global y operaciones de cierre de sus capacidades propietarias.

#### Scenario: Sólo consultar
- **WHEN** se abre el catálogo de herramientas avanzadas
- **THEN** no se modifican configuración, archivos ni integración

#### Scenario: Editar plantilla
- **WHEN** se prepara una modificación soportada
- **THEN** se muestran destino, diferencias y alcance antes de escribir

### Requirement: Las operaciones múltiples permiten recuperación verificable

El archivado múltiple SHALL declarar cambios incluidos y conflictos entre deltas, confirmar el plan y reportar resultado por cambio. El recorrido guiado SHALL declarar si usa un repo de práctica o uno real.

#### Scenario: Fallo a mitad del lote
- **WHEN** una operación falla después de completar otra
- **THEN** se conserva evidencia de la completada y se ofrece recuperación de pendientes sin repetirla

#### Scenario: Onboarding
- **WHEN** se inicia el recorrido guiado
- **THEN** se declara dónde escribirá antes de crear contenido
