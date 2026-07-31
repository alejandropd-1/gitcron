## ADDED Requirements

### Requirement: Las operaciones de Git sobre un repositorio no se solapan

Las operaciones de Git que ejecuta la aplicación sobre un mismo repositorio SHALL serializarse, de
modo que dos de ellas no toquen su índice a la vez. Repositorios distintos SHALL poder ejecutarse en
paralelo: tienen índices separados y no tienen por qué esperarse.

Git protege su índice con `.git/index.lock`. Dos procesos concurrentes hacen fallar al segundo con
`Unable to create index.lock`, y una operación cortada a la mitad deja el archivo huérfano
bloqueando todo lo que venga después.

El fallo de una operación SHALL NOT trabar la cola: la siguiente arranca igual, y el error se
propaga a quien la pidió sin tragárselo.

#### Scenario: Relectura durante una escritura

- **WHEN** el watcher dispara una relectura de evidencia mientras se está commiteando o archivando
- **THEN** las operaciones se ejecutan una después de la otra y ninguna falla por el lock

#### Scenario: Repositorios distintos

- **WHEN** hay operaciones sobre dos repositorios distintos
- **THEN** no se esperan entre sí

#### Scenario: Operación fallida

- **WHEN** una operación encolada falla
- **THEN** su error llega a quien la pidió y la siguiente operación se ejecuta igual
