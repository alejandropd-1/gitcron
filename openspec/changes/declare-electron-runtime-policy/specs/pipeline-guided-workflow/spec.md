## ADDED Requirements

### Requirement: El proyecto declara sobre qué runtime corre
`AGENTS.md` SHALL declarar que la aplicación corre sobre Electron con una versión nombrada, y qué
implica eso para el uso de funciones del navegador: que las ya disponibles de forma amplia se pueden
usar sin escribir código de respaldo. La declaración SHALL nombrar también qué no habilita. El canal de
instrucciones SHALL mencionarla, sin copiarla.

El fundamento es que el motor no lo elige quien abre la aplicación sino el proyecto, al fijar la versión
de Electron, y eso cambia por completo la respuesta a «¿esto necesita un plan B?». Sin declararlo, cada
ejecutor la razona de nuevo, y el resultado peor no es la demora: es que alguno escriba el respaldo por
las dudas y quede código que nunca se ejecuta y hay que mantener igual.

Que viva en `AGENTS.md` y no en el canal es deliberado y no contradice la regla de la rama, que vive al
revés. Lo que cambia es quién la consume: la rama la cumple un ejecutor que pide instrucciones al CLI,
mientras que esta política la lee además la herramienta que responde consultas sobre prácticas modernas,
cuyas instrucciones dicen que la busca en `AGENTS.md`. Cada regla va donde la lee quien tiene que
cumplirla.

Nombrar la versión importa porque una política sin versión no se puede evaluar más adelante: con ella
escrita, quien la lea puede comparar contra la actual y decidir si sigue valiendo.

#### Scenario: Decidir si una función del navegador necesita respaldo
- **WHEN** se evalúa usar una función del navegador ya disponible de forma amplia
- **THEN** la política declarada alcanza para resolverlo, sin volver a razonarlo

#### Scenario: Alcance de lo que la política habilita
- **WHEN** se lee la política
- **THEN** dice qué se puede asumir y qué no habilita, sin leerse como permiso para cualquier cosa

#### Scenario: Ejecutor que pide instrucciones por el canal
- **WHEN** un ejecutor pide instrucciones al CLI
- **THEN** el contexto menciona la política y dónde está, sin duplicar su texto
