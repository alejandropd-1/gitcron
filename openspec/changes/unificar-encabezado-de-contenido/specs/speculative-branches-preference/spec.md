## MODIFIED Requirements

### Requirement: Las ramas especulativas SHALL mostrarse sólo cuando la persona lo pide

La capa de ramas especulativas SHALL permanecer oculta mientras no exista una elección explícita de
mostrarla, y la aplicación SHALL NOT encenderla por su cuenta al detectar predicciones guardadas ni
al recibir predicciones nuevas.

Todo elemento de interfaz que anuncie la existencia de ramas especulativas SHALL consultar esa misma
elección antes de mostrarse, y SHALL NOT quedar sujeto únicamente a que la representación cronométrica
del grafo esté habilitada. Su rótulo y su tooltip SHALL provenir de la capa de traducción.

El fundamento es que las ramas especulativas son conjeturas de un agente sobre trabajo que no
ocurrió, y el invariante 11 exige que lo especulativo jamás se confunda visualmente con lo real.
Encenderlas automáticamente invierte quién decide: quien genera la conjetura termina decidiendo que
se vea.

Lo que se agrega alcanza al anuncio, no a la capa. El botón que informa cuántas ramas especulativas
hay disponibles se muestra hoy en función de que la representación cronométrica esté habilitada y de
que existan predicciones, sin leer nunca la preferencia por repositorio; sólo la escribe, al recibir
el clic. Quien eligió ocultar las ramas especulativas sigue viendo su anuncio, y la única forma de
retirarlo es deshabilitar la representación cronométrica entera, lo que además se lleva puesto el
selector de modo del grafo. La elección de no ver conjeturas debe alcanzar también al aviso de que
existen.

#### Scenario: Repositorio con predicciones guardadas
- **WHEN** se abre un repositorio que tiene predicciones guardadas y no hay elección previa registrada
- **THEN** la capa de ramas especulativas permanece oculta y su interruptor se muestra apagado

#### Scenario: Llega una predicción nueva
- **WHEN** el agente produce predicciones nuevas mientras la capa está oculta
- **THEN** las predicciones se guardan y la capa permanece oculta

#### Scenario: Anuncio con la capa oculta
- **WHEN** existen ramas especulativas y la elección registrada para ese repositorio es ocultarlas
- **THEN** el anuncio de su existencia no se muestra en ninguna representación del grafo

#### Scenario: Anuncio con la capa visible
- **WHEN** existen ramas especulativas y la elección registrada para ese repositorio es mostrarlas
- **THEN** el anuncio se muestra y lleva a la representación cronométrica con la capa visible

#### Scenario: Idioma del anuncio
- **WHEN** se cambia el idioma de la aplicación
- **THEN** el rótulo del anuncio y su tooltip cambian con él
