## MODIFIED Requirements

### Requirement: El panel muestra el estado de OpenSpec del repositorio
El panel SHALL distinguir un repositorio sin `openspec/` de uno con OpenSpec, y SHALL NOT presentar el
primero como una lista vacía de contadores en cero. Para un repositorio con OpenSpec, SHALL mostrar qué
herramientas usa y cuáles tienen sus archivos instalados. SHALL mostrar además, siempre visible —también
cuando no hay CLI, cuando el repositorio no tiene `openspec/`, cuando hay CLI pero falta la integración,
sin conexión o todo al día— una tarjeta de OpenSpec que representa por separado el **motor** (ausente,
global, local, administrado o desconocido, y versión soportada/demasiado vieja/más nueva que el rango),
el **repositorio** (no inicializado/inicializado/desconocido) y la **integración** (al día,
desactualizada, requiere regeneración, herramientas incompletas, personalizada o con conflictos,
actualización parcial), junto al perfil, los workflows y la última versión disponible con su fecha. La
tarjeta SHALL poder mostrar un estado resumido, pero SHALL NOT colapsar las evidencias independientes en
un único booleano. Cuando el estado lo justifique, SHALL ofrecer desde esa tarjeta el botón único de
actualización, cuyo primer clic abre la revisión previa y no modifica nada hasta la confirmación
explícita.

El fundamento del primer estado es que ambos coinciden hoy en los contadores —cuatro ceros— y piden
respuestas distintas: uno se resuelve creando un cambio, el otro no se puede resolver desde el panel en
absoluto. `C:\www\odontoPia` es un repositorio Git sin `openspec/`, y quien lo abre no recibe ninguna
indicación de qué le falta.

El fundamento del segundo es un caso peor y menos visible: un repositorio puede estar correctamente
inicializado y aun así dejar a un ejecutor trabajando a ciegas. En `C:\www\odontoPau` convivían
`.codex/skills/openspec-*` y ningún `.agent/`, que es donde van los de Antigravity; Codex recibía el
método y Antigravity no. Nadie lo vio hasta que un artefacto salió mal, y diagnosticarlo exigió comparar
directorios a mano. La aplicación puede leer eso del disco y mostrarlo antes.

El fundamento de la tarjeta siempre visible con tres ejes independientes es que hoy la versión y
procedencia del CLI son invisibles para quien abre Pipeline: el wrapper resuelve `openspec` por `PATH`
sin saber qué versión ejecuta, así que un motor 1.5.0 con una 1.8.0 disponible pasa sin aviso. Cada eje
pide una acción distinta y sus causas no se solapan: un motor ausente no se resuelve igual que un repo
sin inicializar, y una integración en conflicto no se lee igual que una desactualizada. Colapsarlos en
«ok/no-ok» obliga a adivinar, y hacer desaparecer la tarjeta cuando todo está bien esconde justamente el
dato que confirma que no hay nada que hacer.

#### Scenario: Repositorio Git sin openspec/
- **WHEN** se abre un repositorio Git que no tiene `openspec/`
- **THEN** el panel declara ese estado en vez de mostrar contadores en cero

#### Scenario: Herramienta presente sin configurar
- **WHEN** el repositorio tiene el directorio de una herramienta sin skills de OpenSpec
- **THEN** el panel lo muestra como pendiente de configurar

#### Scenario: Todo configurado
- **WHEN** todas las herramientas presentes tienen sus skills instaladas
- **THEN** el panel no reclama nada de las herramientas, y la tarjeta de OpenSpec sigue visible

#### Scenario: Tarjeta visible sin motor
- **WHEN** no hay ningún CLI de OpenSpec detectado
- **THEN** la tarjeta sigue visible declarando el motor ausente, junto al estado del repositorio y la integración, sin colapsarlos

#### Scenario: Ejes independientes
- **WHEN** el motor está presente pero la integración está desactualizada o en conflicto
- **THEN** la tarjeta declara cada eje por separado en vez de un único estado combinado

#### Scenario: Actualización disponible ofrece el botón
- **WHEN** el motor está soportado y existe una versión disponible mayor
- **THEN** la tarjeta ofrece el botón único de actualización, cuyo primer clic abre la revisión sin modificar nada
