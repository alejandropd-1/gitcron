## ADDED Requirements

### Requirement: Lo que un agente propone SHALL presentarse para confirmación y nunca escribirse directo

Cuando la redacción de un artefacto se le encarga a un agente, GitCron SHALL presentar el resultado
como propuesta y escribir el archivo únicamente tras una confirmación humana. El fundamento es doble:
OpenSpec lo declara como principio de su flujo —el agente genera salida para que la persona
confirme, no modifica archivos por su cuenta— y AGENTS.md exige confirmación humana explícita antes
de que una sesión de agente escriba en el árbol de trabajo. Sin esto, un artefacto mal redactado
queda en el disco antes de que nadie lo haya leído, y el único recurso es Git.

#### Scenario: El agente termina de redactar
- **WHEN** un agente termina de redactar un artefacto y GitCron recibe su salida
- **THEN** el contenido se muestra como propuesta pendiente y ningún archivo del repositorio cambia

#### Scenario: La persona descarta la propuesta
- **WHEN** la persona descarta la propuesta
- **THEN** el archivo destino queda exactamente como estaba y se registra que hubo una propuesta descartada

### Requirement: La revisión de una propuesta SHALL permitir aceptar por bloque y corregir antes de guardar

GitCron SHALL presentar la diferencia entre el contenido actual y el propuesto separada en bloques,
permitiendo aceptar o rechazar cada uno por separado, y SHALL permitir editar el resultado antes de
escribirlo. Aceptar todo o nada obliga a elegir entre perder los aciertos de una propuesta o quedarse
con sus errores, que es justamente lo que hace que una revisión se vuelva un trámite.

#### Scenario: Aceptación parcial
- **WHEN** la persona acepta unos bloques y rechaza otros
- **THEN** el archivo escrito contiene sólo los bloques aceptados sobre el contenido previo

#### Scenario: Corrección antes de guardar
- **WHEN** la persona edita el resultado de la revisión y confirma
- **THEN** se escribe lo que quedó tras su edición, no lo que el agente había propuesto

### Requirement: Las plantillas y reglas de un artefacto SHALL provenir del CLI y no declararse en GitCron

GitCron SHALL obtener la plantilla, la instrucción, las reglas y el contexto de cada artefacto de
`openspec instructions <artefacto> --change <slug> --json`, y no MUST mantener copias propias. El
fundamento es medido: este repositorio tenía dieciséis reglas propias y ocho repetían lo que el CLI
ya entregaba, por lo que se retiraron. Una plantilla duplicada en GitCron queda vieja en cuanto
cambia el motor o el schema, y nadie se entera hasta que el artefacto sale mal.

#### Scenario: Cambia el schema del change
- **WHEN** un change usa un schema cuyos artefactos difieren del anterior
- **THEN** GitCron ofrece los artefactos y plantillas que devuelve el CLI para ese schema, sin lista propia

#### Scenario: El CLI no puede entregar instrucciones
- **WHEN** la consulta de instrucciones falla o el motor no está disponible
- **THEN** GitCron declara que no puede redactar ese artefacto y no ofrece una plantilla de reemplazo

### Requirement: Editar un artefacto SHALL dejar el cambio sin confirmar en Git

Toda escritura de artefactos SHALL dejar los archivos modificados en el árbol de trabajo sin
ejecutar `git add`, commit ni ninguna otra operación que altere el historial. AGENTS.md lo exige para
cualquier ejecutor, y además es lo que mantiene reversible cada operación: mientras el cambio no esté
confirmado, descartarlo es una acción de Git y no una recuperación.

#### Scenario: Se guarda un artefacto
- **WHEN** se confirma la escritura de un artefacto
- **THEN** el archivo queda modificado en el árbol de trabajo y el historial de Git no cambia

### Requirement: Revisar el alcance de un cambio SHALL mantener coherentes todos sus artefactos

Cuando el alcance de un cambio se revisa durante su implementación, la revisión SHALL alcanzar a
todos los artefactos que la afecten y no sólo a la lista de tareas. GitCron SHALL ofrecer esa
revisión como operación, delegándola al workflow que el motor provea para ello, y SHALL NOT
limitarse a permitir la edición suelta de un artefacto por vez.

El fundamento es medido en este repositorio: durante el cambio `unificar-sistema-visual-gitcron` el
alcance se revisó cinco veces y en todas se editó únicamente `tasks.md`. El resultado fue que
`design.md` quedó describiendo una causa —una carencia de observación de tamaño— que la investigación
posterior mostró que era otra —un desfasaje de sincronía—, y que `proposal.md` nunca mencionó el
retiro del arte de fondo, que terminó siendo parte del trabajo. Los artefactos quedaron describiendo
un trabajo parecido pero distinto del que se hizo, que es exactamente lo que la metodología existe
para evitar.

Cuando la revisión altere el propósito del trabajo en lugar de precisarlo, GitCron SHALL declararlo y
proponer un cambio nuevo en vez de revisar el vigente.

#### Scenario: Revisión que precisa el alcance
- **WHEN** se revisa el alcance de un cambio en curso y la revisión afecta a más de un artefacto
- **THEN** la revisión se propone sobre todos los artefactos afectados, para confirmarse antes de escribirse

#### Scenario: Revisión que cambia el propósito
- **WHEN** la revisión propuesta altera aquello que el cambio venía a resolver
- **THEN** GitCron lo declara y ofrece abrir un cambio nuevo, en lugar de reescribir el vigente

#### Scenario: El motor no ofrece la revisión
- **WHEN** el motor instalado no expone un workflow de revisión de artefactos
- **THEN** la operación no se ofrece, y se declara qué versión del motor la habilitaría

### Requirement: GitCron SHALL exponer el diagnóstico estructurado que el motor produce

GitCron SHALL presentar la información de diagnóstico que el motor entrega en formato legible por
máquina —la salud de las relaciones del repositorio y el contexto de trabajo resuelto— y SHALL
transportarla como datos, sin recomponerla en prosa propia.

El fundamento es que ese diagnóstico ya existe y hoy la aplicación lo ignora: obliga a salir a una
terminal para saber si el repositorio está sano o qué contexto ve un agente. Y recomponerlo en la
aplicación repetiría el error que este repositorio ya midió y corrigió, cuando ocho de sus dieciséis
reglas propias resultaron ser una copia de lo que el motor entregaba.

#### Scenario: Repositorio con relaciones sanas
- **WHEN** se consulta el diagnóstico y el motor no reporta problemas
- **THEN** GitCron lo declara sin inventar advertencias

#### Scenario: El motor reporta un problema
- **WHEN** el diagnóstico del motor incluye una condición a atender
- **THEN** GitCron la presenta tal como el motor la clasifica, sin reinterpretar su gravedad

### Requirement: Un cambio archivado SHALL no admitir edición de sus artefactos

GitCron SHALL rechazar toda operación de escritura sobre los artefactos de un cambio archivado. Un
cambio archivado ya consolidó sus specs en los principales, y editarlo después deja el histórico
diciendo algo distinto de lo que se consolidó.

#### Scenario: Intento de editar un archivado
- **WHEN** se intenta escribir un artefacto de un cambio que ya fue archivado
- **THEN** la operación se rechaza declarando que el cambio está archivado y ningún archivo cambia
