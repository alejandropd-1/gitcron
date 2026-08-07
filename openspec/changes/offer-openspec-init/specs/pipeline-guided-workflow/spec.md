## ADDED Requirements

### Requirement: El panel muestra el estado de OpenSpec del repositorio
El panel SHALL distinguir un repositorio sin `openspec/` de uno con OpenSpec, y SHALL NOT presentar el
primero como una lista vacía de contadores en cero. Para un repositorio con OpenSpec, SHALL mostrar qué
herramientas usa y cuáles tienen sus archivos instalados.

El fundamento del primer estado es que ambos coinciden hoy en los contadores —cuatro ceros— y piden
respuestas distintas: uno se resuelve creando un cambio, el otro no se puede resolver desde el panel en
absoluto. `C:\www\odontoPia` es un repositorio Git sin `openspec/`, y quien lo abre no recibe ninguna
indicación de qué le falta.

El fundamento del segundo es un caso peor y menos visible: un repositorio puede estar correctamente
inicializado y aun así dejar a un ejecutor trabajando a ciegas. En `C:\www\odontoPau` convivían
`.codex/skills/openspec-*` y ningún `.agent/`, que es donde van los de Antigravity; Codex recibía el
método y Antigravity no. Nadie lo vio hasta que un artefacto salió mal, y diagnosticarlo exigió comparar
directorios a mano. La aplicación puede leer eso del disco y mostrarlo antes.

#### Scenario: Repositorio Git sin openspec/
- **WHEN** se abre un repositorio Git que no tiene `openspec/`
- **THEN** el panel declara ese estado en vez de mostrar contadores en cero

#### Scenario: Herramienta presente sin configurar
- **WHEN** el repositorio tiene el directorio de una herramienta sin skills de OpenSpec
- **THEN** el panel lo muestra como pendiente de configurar

#### Scenario: Todo configurado
- **WHEN** todas las herramientas presentes tienen sus skills instaladas
- **THEN** el panel no reclama nada

### Requirement: Empezar un cambio declara lo que falta, sin impedirlo
El panel SHALL declarar lo que falta antes de empezar un cambio, y SHALL ofrecer resolverlo, cuando el
repositorio esté sin inicializar o tenga una herramienta presente sin configurar. SHALL NOT impedir
empezar. Al inicializar desde ese aviso, lo ya escrito en el formulario SHALL conservarse.

El fundamento es que la persona no puede decidir sobre algo que no ve, y hoy no lo ve: `openspec new
change` funciona sin inicializar, así que el trabajo arranca igual y el problema aparece después, en un
artefacto mal escrito.

No se bloquea porque bloquear no garantiza lo que promete. En un repositorio sin ningún directorio de
herramienta, `openspec init` falla y exige elegir a mano; y el comando sólo configura lo que ya está
presente, así que tampoco cubre la herramienta que todavía no se usó en ese repositorio. Un bloqueo que
no asegura el resultado es fricción sin contrapartida, y la decisión de seguir igual es legítima.

Conservar lo escrito importa porque el aviso tiene que ser barato de atender: perder el objetivo y el
slug por hacerle caso convierte la advertencia en un costo, y una advertencia que cuesta se aprende a
ignorar.

#### Scenario: Empezar un cambio sin OpenSpec inicializado
- **WHEN** se va a empezar un cambio en un repositorio sin `openspec/`
- **THEN** el panel lo declara y ofrece inicializar, sin impedir seguir

#### Scenario: Inicializar desde el aviso
- **WHEN** se inicializa desde ese aviso con el formulario ya completado
- **THEN** al volver, el objetivo y el slug siguen escritos

#### Scenario: Seguir sin inicializar
- **WHEN** se elige seguir sin inicializar
- **THEN** el cambio se empieza igual

### Requirement: La inicialización declara lo que escribe y la ejecuta una persona
La inicialización SHALL enumerar qué archivos va a escribir antes de escribirlos, y SHALL requerir una
acción humana explícita. Cuando el comando no pueda detectar ninguna herramienta, el panel SHALL pedir
que se elija. Un fallo SHALL informarse con su motivo real.

El fundamento es la invariante que rige toda escritura nueva en un repositorio del usuario. Está medido
que `openspec init` no pisa el `config.yaml` existente y que es incremental —en un repositorio ya
inicializado sólo agrega la herramienta que falta—, pero eso lo hace seguro, no invisible.

Pedir que se elija sólo cuando el comando no detecta nada evita replicar en el panel la lista de
herramientas que el CLI ya conoce: `openspec init` las detecta por los directorios del repositorio y
configura todas las que encuentra.

#### Scenario: Antes de escribir nada
- **WHEN** se ofrece la inicialización
- **THEN** se enumeran los archivos que se van a escribir y nada se escribe sin una acción humana

#### Scenario: Repositorio sin ninguna herramienta presente
- **WHEN** el comando no puede detectar ninguna herramienta
- **THEN** el panel pide que se elija cuál configurar

#### Scenario: Fallo al inicializar
- **WHEN** la inicialización falla
- **THEN** se informa el motivo real y se relee el estado del repositorio
