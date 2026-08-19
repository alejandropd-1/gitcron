## ADDED Requirements

### Requirement: El estado de la integración SHALL derivarse de los targets instalados y no del recuento de skills

GitCron SHALL determinar la vigencia de la integración a partir de qué targets tienen instalados sus
workflows —la evidencia `installedWorkflowsByTarget` y `targets` que la inspección ya produce— y no
MUST declararla al día por el solo hecho de que existan skills. La derivación actual cuenta skills
sin mirar dónde están, y eso produce una afirmación falsa comprobada en la aplicación: con diez
skills en el esquema anterior, ninguno en el target oficial vigente, y el propio panel informando
«Agents Multi-Agent sin configurar», la tarjeta declara la integración al día. Una tarjeta que
afirma lo contrario de lo que muestra debajo deja de ser evidencia.

#### Scenario: Skills sólo en targets del esquema anterior
- **WHEN** los workflows están instalados únicamente en targets del esquema anterior y ninguno en el vigente
- **THEN** la integración se declara desactualizada, no al día

#### Scenario: Coherencia entre el estado y el detalle
- **WHEN** el detalle de convivencia informa que un target quedó sin configurar
- **THEN** el estado resumido de la integración no se declara al día

### Requirement: El perfil de workflows SHALL leerse del CLI y poder editarse desde la aplicación

GitCron SHALL obtener del CLI el perfil vigente y el conjunto de workflows habilitados, SHALL ofrecer
únicamente acciones correspondientes a los habilitados, y SHALL permitir activarlos o desactivarlos
sin recurrir a la terminal. El fundamento es que OpenSpec dejó de imponer un flujo único y pasó a
admitir configuraciones por organización, de modo que el conjunto disponible es un dato del entorno y
no una constante del programa. Ofrecer una acción que el perfil no habilita produce un botón que
falla al apretarlo, y esconder una habilitada obliga a salir de la aplicación para usarla.

#### Scenario: Acción no habilitada por el perfil
- **WHEN** el perfil vigente no incluye un workflow
- **THEN** su acción no se ofrece, y se puede consultar que está deshabilitada

#### Scenario: Cambio del perfil desde la aplicación
- **WHEN** se habilita o deshabilita un workflow desde la aplicación
- **THEN** la configuración del CLI queda modificada y las acciones ofrecidas se recalculan desde ella

## REMOVED Requirements

### Requirement: GitCron no muta paquetes del sistema operativo y expone comandos de actualización del motor en modo de sólo lectura

**Reason**: El fundamento técnico que sostenía la prohibición no resiste verificación. El requisito la
justificaba en que «el entorno de Electron empaqueta Node.js pero no npm», pero eso sólo impide
depender de un gestor empaquetado: no impide invocar el del sistema, que es exactamente lo que la
aplicación ya hace con el ejecutable de OpenSpec, resuelto del PATH y ejecutado como proceso hijo. La
consecuencia práctica de mantenerla fue que la única acción que la persona quería —tener el motor al
día— quedaba fuera de la herramienta, reducida a copiar un comando para pegarlo en una terminal.

Del fundamento original se conserva lo que sí es cierto y no depende de Electron: una instalación
global escribe fuera de todo repositorio, no se revierte con Git, puede requerir privilegios que el
proceso hijo no puede negociar sin terminal, y le cambia el motor a todos los repositorios de la
máquina. Eso deja de tratarse como una prohibición y pasa a tratarse como una decisión informada.

**Migration**: La capacidad `openspec-engine-installation` recoge el caso completo: la elección
explícita entre instalar en el repositorio abierto o en el sistema, la confirmación previa que declara
comando, rutas y alcance, la resolución canonicalizada del gestor, la ejecución no interactiva con
tope de tiempo, y el recálculo del estado del motor desde el disco al terminar. La exposición del
comando exacto con botón de copiado se conserva como camino alternativo y sigue disponible.
