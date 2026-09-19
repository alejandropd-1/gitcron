## ADDED Requirements

### Requirement: La observación SHALL usar un único handle recursivo en la raíz

La observación de un repositorio SHALL abrirse con un único handle recursivo sobre la raíz del
repositorio, y SHALL NOT abrir un handle por carpeta. Un handle por carpeta impide que cualquier
otro programa renombre o mueva carpetas del repositorio mientras GitCron lo observa; con un solo
handle en la raíz, GitCron observa sin trabar a nadie. Se conservan el filtro de rutas ignoradas,
la estabilización de escrituras y la interfaz que consumen quienes reaccionan a los eventos.

#### Scenario: Otro programa renombra una carpeta
- **WHEN** GitCron observa un repositorio y otro programa renombra una carpeta de ese repositorio
- **THEN** el renombre se completa y GitCron recibe el evento

#### Scenario: Los consumidores no cambian
- **WHEN** se reemplaza el mecanismo de observación
- **THEN** git-ops y el pipeline reciben los mismos eventos con la misma interfaz, y sus pruebas corren sin cambios

#### Scenario: Ráfaga de eventos
- **WHEN** se producen muchos cambios en poco tiempo y el sistema operativo omite parte de los eventos
- **THEN** el temporizador de respaldo de git-ops lleva el estado a converger, como ya exige esta capacidad
