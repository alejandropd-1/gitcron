## ADDED Requirements

### Requirement: Descubrimiento de runtimes sin panel vacío
Mientras el descubrimiento de runtimes para el repositorio abierto no resolvió, la superficie de arranque SHALL mostrar un estado de carga explícito y accionable, y SHALL NOT pintar un panel con marco cuyo interior esté vacío. El contenido del launcher SHALL aparecer dentro del mismo marco que ya estaba visible, sin un salto visual desde un recuadro vacío a un recuadro lleno.

#### Scenario: Discover en curso al montar el launcher
- **WHEN** el launcher se monta y el descubrimiento IPC aún no respondió
- **THEN** la vista muestra un mensaje de carga accionable y no renderiza un panel con marco vacío

#### Scenario: Discover resuelto
- **WHEN** el descubrimiento responde con la lista de runtimes
- **THEN** el formulario del launcher reemplaza al estado de carga dentro del mismo contenedor, sin pintar un marco nuevo

#### Scenario: Remontaje del launcher al cambiar de change o tarea
- **WHEN** se selecciona otro cambio activo o se pasa a otra tarea y el launcher se remonta con un nuevo descubrimiento en curso
- **THEN** mientras ese descubrimiento no resolvió se muestra el estado de carga, no un recuadro vacío

### Requirement: Diagnóstico de OpenSpec sin referencias a andamiaje retirado
Cuando el lector de evidencia no puede determinar la disponibilidad de OpenSpec o no encuentra changes, el diagnóstico que llega al usuario SHALL describir la causa real (OpenSpec no responde o no hay `openspec/changes`) y SHALL NOT mencionar mecanismos de andamiaje ya retirados del producto.

#### Scenario: OpenSpec no disponible
- **WHEN** el lector no puede invocar la validación de OpenSpec
- **THEN** el diagnóstico describe la indisponibilidad de OpenSpec sin nombrar "scaffold"
