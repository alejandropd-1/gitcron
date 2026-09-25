# Spec Delta

## ADDED Requirements

### Requirement: Una actualización detenida SHALL declarar su causa real

Cuando la revisión de actualización declara que no se puede actualizar, GitCron SHALL mostrar el
motivo que efectivamente la detiene —un conflicto entre instrucciones viejas y nuevas, instrucciones
modificadas a mano, un motor ausente o de versión ilegible, una lectura incompleta del
repositorio— en palabras de la persona y sin nombres internos. GitCron SHALL NOT mostrar un motivo
fijo que no se derive del estado medido. Un motivo que no corresponde manda a la persona a buscar un
problema que no existe y le esconde el que sí.

#### Scenario: Instrucciones viejas y nuevas conviven
- **WHEN** la integración queda detenida porque hay instrucciones de OpenSpec en la carpeta vieja de una herramienta y en la nueva a la vez
- **THEN** el motivo dice que conviven copias viejas y nuevas, dónde están, y remite a retirarlas

#### Scenario: Causa no reconocida
- **WHEN** la actualización está detenida por una causa que GitCron no clasifica
- **THEN** el motivo lo dice así —que no se pudo determinar la causa— en lugar de mostrar un texto ajeno al estado

### Requirement: Las copias viejas de las instrucciones SHALL poder retirarse desde la revisión cuando se pueden recuperar

Cuando OpenSpec pasó las instrucciones de una herramienta a una carpeta nueva y quedaron las copias
viejas, la revisión SHALL listar esas copias y SHALL ofrecer retirarlas desde GitCron, sólo las que
Git puede devolver: seguidas en el repositorio y sin cambios sin confirmar. Las que no cumplen SHALL
listarse aparte con el motivo, para revisarlas a mano. El retiro SHALL dejar los borrados sin
confirmar en Git y volver a medir el estado de la integración.

La revisión SHALL NOT presentar `--force` de `openspec update` como forma de limpiar esas copias:
en ese comando significa regenerar aunque todo esté al día, y no borra nada. OpenSpec tampoco las
borra al inicializar cuando difieren de las nuevas: deja esa decisión a la persona.

#### Scenario: Copias viejas recuperables
- **WHEN** hay copias viejas de instrucciones de OpenSpec seguidas en Git y sin cambios sin confirmar, y la persona confirma retirarlas
- **THEN** GitCron las borra del árbol de trabajo, no confirma nada en Git, enumera lo borrado y vuelve a medir la integración

#### Scenario: Copias viejas no recuperables
- **WHEN** una copia vieja no está seguida en Git o tiene cambios sin confirmar
- **THEN** no se ofrece retirarla desde GitCron y se lista con el motivo para revisarla a mano

#### Scenario: No se promete limpiar con --force
- **WHEN** la revisión muestra copias viejas
- **THEN** no ofrece `--force` como forma de limpiarlas

### Requirement: Una herramienta servida desde la carpeta compartida SHALL contarse como configurada

Cuando la carpeta compartida de instrucciones (`.agents/skills`) declara qué herramienta la atiende,
GitCron SHALL contar esa herramienta como configurada, aunque su carpeta propia exista sin
instrucciones de OpenSpec. La carpeta propia de una herramienta puede existir por su configuración
propia, ajena a OpenSpec; contarla como «sin configurar» deja la integración desactualizada para
siempre, sin que ninguna actualización pueda arreglarla.

#### Scenario: Codex servido desde .agents
- **WHEN** `.agents/skills` declara que la atiende Codex y `.codex/` existe sólo con la configuración propia de Codex
- **THEN** Codex cuenta como configurada y la integración no queda desactualizada por esa carpeta

#### Scenario: Carpeta propia con instrucciones viejas
- **WHEN** además `.codex/skills` todavía tiene copias viejas de las instrucciones de OpenSpec
- **THEN** esas copias se informan como viejas y retirables, no como una herramienta sin configurar
