## ADDED Requirements

### Requirement: No coexisten instrucciones que contradigan la metodología
El repositorio SHALL NOT contener artefactos que impartan instrucciones de trabajo a un ejecutor y
contradigan la metodología vigente. Un artefacto de ese tipo que quede obsoleto SHALL retirarse de las
rutas donde se lo encuentra al recorrer el repositorio, y SHALL conservarse como registro histórico
declarando que ya no rige y qué lo reemplazó.

El fundamento es el mismo que sostiene que la metodología viaje por el canal de la herramienta: un
ejecutor recorre el repositorio y toma como vigente lo que encuentra. Ya ocurrió una vez —un runtime
trabajó con reglas locales sin saber que había un flujo— y el requisito que salió de ahí obliga a
retirar la regla que contradice, no sólo a declarar la correcta. Mientras un archivo con una sección
titulada «modo de trabajo obligatorio» siga en la raíz, la declaración del canal compite con él en vez
de reemplazarlo.

Se conservan como registro y no se borran porque describen trabajos que se hicieron y explican
decisiones que siguen vivas en el código: lo que se retira es su autoridad, no su contenido.

#### Scenario: Instrucción obsoleta encontrada en el repositorio
- **WHEN** un artefacto imparte instrucciones de trabajo que contradicen la metodología vigente
- **THEN** se retira de la ruta donde se lo encuentra al recorrer el repositorio y se conserva
  declarando que ya no rige

#### Scenario: Mecanismo al que apunta una instrucción retirada
- **WHEN** una instrucción retirada nombra un directorio como fuente de trabajo para agentes
- **THEN** ese directorio se retira junto con ella, para que la instrucción no siga siendo ejecutable
