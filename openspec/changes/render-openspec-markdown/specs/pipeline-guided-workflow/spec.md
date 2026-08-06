## ADDED Requirements

### Requirement: El visor renderiza las convenciones de la metodología
El visor de artefactos SHALL renderizar los seis niveles de encabezado de markdown como encabezados, y
SHALL NOT imprimir sus almohadillas como texto. Los niveles SHALL encajarse bajo la jerarquía de
encabezados de la página sin saltos y sin exceder el último nivel disponible. Las listas SHALL
mostrarse con su marcador.

El fundamento es que el nivel de cuatro almohadillas es el que la metodología usa para cada escenario
—es una regla suya que un escenario lleva exactamente cuatro— y era el único que el visor no
reconocía: cada `#### Scenario:` de cada requisito salía impreso crudo, con sus almohadillas a la
vista. Un visor que no entiende la convención más frecuente de lo que muestra no está mostrando el
documento, está mostrando su fuente a medias.

Las listas pierden su marcador por el reajuste global de estilos de la aplicación, que es correcto para
el resto del producto; el visor lo restituye para sí porque en un documento una lista tiene que
distinguirse de un párrafo indentado.

#### Scenario: Escenario de un requisito
- **WHEN** un artefacto contiene una línea de encabezado de cuatro almohadillas
- **THEN** se renderiza como encabezado y sus almohadillas no aparecen en pantalla

#### Scenario: Jerarquía del documento dentro de la página
- **WHEN** un artefacto usa varios niveles de encabezado
- **THEN** se encajan bajo los encabezados de la página en orden, sin saltar niveles

#### Scenario: Lista dentro de un artefacto
- **WHEN** un artefacto contiene una lista
- **THEN** sus ítems se muestran con marcador, distinguibles de un párrafo
