## Why

El panel de preparación agrupa bien pero explica poco, y eso lo vuelve difícil de auditar justo cuando
más hace falta. Tres cosas concretas, observadas por Ale sobre el panel funcionando:

Los controles de sumar y quitar un grupo son texto plano al lado del rótulo
(`components/pipeline/OpenSpecDashboard.module.css`, `.groupToggle`: sin marco, sin fondo, sin ícono).
Se leen como parte del título y no como algo que se puede apretar.

El mensaje sugerido se muestra en un `<code>` de sólo lectura. El requisito vigente dice que el mensaje
«SHALL quedar editable antes de confirmar», y lo es —pero recién en la vista Commit, después de
preparar—. En el momento en que se está decidiendo qué entra, se ve una sugerencia que no se puede
tocar.

Los grupos se nombran pero no se explican, y el estado de cada archivo es una letra. Con todo sumado
de una, la sensación que describió Ale es la de mandar todo «a un palo y a la bolsa»: si entra algo que
no correspondía, el rótulo dice que no tiene atribución y ahí se termina la información. Un panel cuya
función es que una omisión se vea tiene que decir de qué está hecho cada grupo.

## What Changes

Los controles de grupo pasan a ser botones con marco e ícono, como el resto de los controles del panel.

El mensaje sugerido pasa a un campo editable. Lo que se escriba viaja al mensaje de commit, y la regla
que ya existe se mantiene: una sugerencia no pisa lo que una persona escribió.

Cada grupo suma una línea que dice en castellano llano qué es y de dónde viene: los artefactos de un
cambio en curso, el movimiento completo de un archivado —con el identificador de lo que se archivó—, y
lo que ningún cambio reclama. El estado de cada archivo deja de ser una letra y se declara con
palabra: nuevo, modificado, borrado. Y en el grupo sin atribuir, cada archivo declara además de qué
tipo es —código, prueba, documentación, configuración—, derivado de su ubicación.

Queda **fuera de alcance**, y hay que decirlo porque es lo que Ale preguntó: atribuir un archivo de
código a un cambio. Ese dato no existe hoy en el repositorio, y por eso el grupo dice de qué tipo es el
archivo pero no de qué trabajo vino. Registrarlo es posible —el hub de sesiones ya captura el árbol
antes y después de cada corrida, y descarta las rutas— pero es un trabajo propio, con sus decisiones
de persistencia y de procedencia, y no se mete acá.

Tampoco entra el ancho de los paneles de artefactos, que sigue sin poder reproducirse, ni el grafo de
OpenSpec.

## Capabilities

### New Capabilities

Ninguna. Qué muestra el panel de preparación y cómo se edita el mensaje ya son requisitos de
`pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: «Preparar el commit sin confirmarlo» pasa a exigir que cada grupo declare
  qué contiene y que el estado de cada archivo se diga con palabra. «El mensaje se sugiere y se puede
  editar» pasa a exigir que sea editable en la misma superficie donde se elige qué entra.

## Impact

En `lib/change-commit-scope.ts` se suma una función pura que clasifica un archivo por tipo a partir de
su ruta. En `components/pipeline/OpenSpecDashboard.tsx` cambian el render de los grupos, del estado de
archivo y del mensaje; el campo editable escribe en el `commitMessage` del store, que es donde ya vive.
En `OpenSpecDashboard.module.css` cambian los controles de grupo.

En i18n, las descripciones de grupo, los estados con palabra y los tipos de archivo se escriben en ES,
EN y ZH. En pruebas, se cubre la clasificación por tipo con tablas y se verifica que el campo del
mensaje es editable y que no pisa lo escrito.

No se agregan dependencias. No se toca el proceso principal.
