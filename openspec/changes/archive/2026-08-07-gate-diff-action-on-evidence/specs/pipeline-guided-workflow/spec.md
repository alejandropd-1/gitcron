## ADDED Requirements

### Requirement: La guía no ofrece ver diffs que no existen
La guía de próximas acciones SHALL ofrecer la acción "Ver diff" únicamente cuando el snapshot tenga al
menos un diff. Sin diffs, la acción SHALL NOT aparecer, y el estado SHALL conservar su acción
principal. El criterio de disponibilidad SHALL ser el mismo que usa el botón del panel.

El fundamento es que los diffs se producen a partir de sesiones de runtime lanzadas desde la
aplicación, y un cambio trabajado a mano o por un agente arrancado desde la terminal no genera
ninguna. Ofrecer igual la acción lleva a una sub-pestaña vacía sin explicar por qué, y una guía que
propone un paso que no lleva a nada deja de servir para saber cuál es el próximo paso. Que el panel y
la guía compartan el criterio evita que uno de los dos vuelva a quedarse atrás cuando cambie la regla.

#### Scenario: Cambio listo para archivar sin ninguna sesión corrida
- **WHEN** el cambio está listo para archivar y el snapshot no tiene ningún diff
- **THEN** la guía ofrece archivar y no ofrece ver el diff

#### Scenario: Cambio listo para archivar con diffs de una sesión
- **WHEN** el cambio está listo para archivar y el snapshot tiene al menos un diff
- **THEN** la guía ofrece ver el diff y lleva a la sub-pestaña de diffs con contenido

#### Scenario: Panel y guía frente al mismo snapshot
- **WHEN** un snapshot no tiene diffs
- **THEN** ni el botón del panel ni la acción de la guía ofrecen abrirlos
