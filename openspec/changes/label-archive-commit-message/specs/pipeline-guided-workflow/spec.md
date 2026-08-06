## ADDED Requirements

### Requirement: El mensaje sugerido distingue el archivado del trabajo
Cuando el conjunto que se va a preparar corresponda a un archivado, el mensaje sugerido SHALL
intercalar `archived` antes del identificador del cambio. Un conjunto de artefactos de un cambio activo
SHALL seguir sugiriendo sólo el identificador, y un conjunto que abarque más de un cambio SHALL seguir
devolviendo la descripción vacía.

El fundamento es que el circuito de un cambio produce dos commits —el del trabajo y el del archivado— y
hoy la aplicación sugiere el mismo texto para los dos, así que el historial queda con dos entradas
indistinguibles salvo por su contenido. Ya se corrige a mano en cada archivado de este repositorio:
`chore: archived render-openspec-markdown`, `chore: archived retire-stale-agent-instructions`. Una
sugerencia que hay que corregir siempre del mismo modo es una sugerencia incompleta.

Que el caso de varios cambios siga vacío importa porque esa ausencia es deliberada: es la señal de que
el commit está mezclando trabajos, y llega antes de confirmar. Rellenarla con el identificador del
archivado escondería justamente el caso donde hace falta que una persona escriba el mensaje.

#### Scenario: Preparación de un archivado
- **WHEN** el conjunto a preparar son las dos mitades del archivado de un cambio y su spec consolidada
- **THEN** el mensaje sugerido nombra el cambio precedido de `archived`

#### Scenario: Preparación del trabajo de un cambio activo
- **WHEN** el conjunto a preparar son artefactos de un cambio activo y su código
- **THEN** el mensaje sugerido nombra el cambio sin la palabra `archived`

#### Scenario: Conjunto que abarca varios cambios
- **WHEN** el conjunto a preparar incluye un archivado y artefactos de otro cambio
- **THEN** la descripción queda vacía, para que la escriba una persona
