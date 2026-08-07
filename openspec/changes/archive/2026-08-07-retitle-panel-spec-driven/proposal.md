## Why

El panel se rotula «OpenSpec», que es el nombre de la herramienta que lo alimenta y no el de lo que la
pantalla muestra. Lo que se ve ahí es el método: qué se propuso, cómo se pensó, qué falta y en qué anda
un ejecutor. El nombre de la herramienta describe la fuente de los datos, no el trabajo.

La diferencia dejó de ser cosmética esta semana. Al auditar las reglas del proyecto contra las que
entrega el CLI quedó claro cuánto del método viene de OpenSpec y cuánto es de acá; y al medir qué tiene
instalado cada repositorio quedó claro que OpenSpec es una pieza reemplazable —hay treinta herramientas
que lo consumen— dentro de una forma de trabajar que no lo es. Rotular la pantalla con el nombre del
proveedor confunde una cosa con la otra.

## What Changes

- El rótulo pasa a decir «Spec-Driven Development», en dos líneas.
- El salto es estructural, no un ajuste del navegador: son dos elementos, así que no depende del ancho
  de la ventana.
- El tamaño baja y el bloque se dimensiona contra la fila de contadores que tiene al lado, para que el
  encabezado quede encuadrado.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el panel se rotula con el método que muestra, no con la herramienta que lo
  alimenta.

## Impact

**Producción:** `components/pipeline/OpenSpecDashboard.tsx`, sólo el encabezado, y su hoja de estilos.

**Sin tocar:** el nombre del componente y del archivo, que siguen la convención del repositorio; las
referencias a OpenSpec en la barra lateral y en los artefactos, que sí nombran la herramienta porque
hablan de ella; y la pestaña «Pipeline» de la barra superior.

**Fuera de alcance:** renombrar el componente, el módulo de estilos o las claves de i18n. Es un cambio de
rótulo, no de arquitectura, y arrastrar el renombre a los archivos mezclaría dos cosas en un mismo
diff.

**Dependencias:** ninguna.

**Riesgo:** bajo. El rótulo no está traducido —es un nombre propio del método, igual que antes— y ningún
test lo buscaba, así que no había nada atado a la cadena anterior.
