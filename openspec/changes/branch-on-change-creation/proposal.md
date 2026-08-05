## Why

Un archivo de código no se puede atribuir a un cambio. Ese dato no existe en el repositorio, y por eso
el panel de preparación agrupa los artefactos por su carpeta pero deja todo el código en «sin atribuir a
un cambio», donde lo único que puede declarar es de qué tipo es. Es la misma razón por la que se retiró
la división propio/ajeno en `raise-commit-to-repo-level`: con dos cambios en curso, la aplicación estaba
adivinando.

Git ya resuelve exactamente eso, sin inventar nada: si cada cambio tiene su rama, `git diff main...HEAD`
dice qué archivos son suyos, con precisión y sin maquinaria propia. Hoy no se usa porque todo el trabajo
ocurre en `main`, y nada en la aplicación propone otra cosa.

Además, la rama actual pasó a declararse en el panel de preparación en `commit-surface-context`, y ahí se
ve el efecto: la información está pero siempre dice lo mismo, porque no hay más de una rama.

## What Changes

Al empezar un cambio nuevo desde la aplicación con la tarea clara, el formulario declara que se va a
trabajar en la rama `change/<slug>` y la crea antes de lanzar la sesión, dejando el repositorio parado
ahí. Es una casilla que se puede desmarcar: quien quiera seguir en la rama actual lo hace desmarcándola,
y en ese caso no se toca Git.

Si la rama no se puede crear —porque ya existe, porque el árbol lo impide, o por cualquier otro motivo—
se informa el motivo real y **no se lanza la sesión**. Arrancar igual dejaría al agente trabajando en una
rama distinta de la que se declaró, que es peor que no arrancar.

Queda **fuera de alcance**, y esto es lo que Ale acotó explícitamente: qué hace el archivado con la rama,
fusionarla, borrarla, o pararse en ella al abrir un cambio existente. Nada de eso entra. Tampoco entra el
flujo de exploración, que no crea ningún cambio y por lo tanto no tiene slug con el cual nombrar una
rama. Ni consumir la rama para atribuir archivos en el panel de preparación: esto deja el dato disponible,
usarlo es un trabajo aparte.

No se promete que la atribución quede resuelta. Lo que este cambio hace es que, de acá en adelante, el
trabajo de cada cambio quede separado por construcción; qué se hace con esa separación es otra decisión.

## Capabilities

### New Capabilities

Ninguna. Empezar un cambio desde la aplicación ya es parte de `pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que empezar un cambio con la tarea clara pueda
  crear su rama, declarándolo antes, permitiendo desactivarlo, y sin lanzar la sesión si falla.

## Impact

En `components/pipeline/PipelineNewChangeFlow.tsx`, el formulario de propuesta suma la casilla y la
creación de la rama antes de entregar la instrucción al lanzador. Se usa el canal `git:create-branch` que
ya existe (`electron/ipc/git-ops.ts:359`), que sin `fromHash` crea y se para en la rama: no se agrega
ninguna superficie de escritura de Git nueva en el proceso principal.

En i18n, las claves de la casilla y del error se escriben en ES, EN y ZH. En pruebas, se cubre que la
rama se crea con el nombre esperado, que desmarcar no toca Git, y que un fallo no lanza la sesión.

No se agregan dependencias.
