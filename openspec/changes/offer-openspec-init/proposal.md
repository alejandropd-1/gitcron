## Why

Abrir en el panel un repositorio sin `openspec/` muestra cuatro ceros y ninguna salida. Es un caso
real y cercano: `C:\www\odontoPia` es un repositorio Git —`.git` existe— sin `openspec/`, y el panel no
ofrece nada que permita empezar.

El caso se sondeó y el resultado es peor que "no hay nada". `openspec new change` funciona sin haber
corrido `init`: crea el cambio igual. Pero el `config.yaml` que queda sale vacío, y `openspec
instructions` devuelve contexto vacío y ninguna regla. O sea que el ejecutor recibe el encargo y cero
método: exactamente el escenario que este proyecto ya vivió con un runtime que trabajó con reglas
locales sin saberlo. El camino de menor resistencia lleva al peor estado posible, y en silencio.

Por eso la ausencia de `openspec/` no es un vacío que se pueda mostrar como cuatro ceros: es un estado
que hay que nombrar y del cual hay que ofrecer salida.

Y la salida no puede ser sólo correr `init`. Un repositorio recién inicializado queda con el
`config.yaml` sin reglas, que es el mismo estado del que se quería salir: el ejecutor recibe el encargo
y ninguna convención.

Tener reglas tampoco alcanza si ninguna habla de la forma del artefacto, y `C:\www\odontoPau` lo
muestra medido. Su `config.yaml` está poblado, con tres reglas de `tasks` —separar infraestructura de
contenido y QA, mantener puertas de aprobación, incluir los comandos de cierre—. Bajo ese canal hay
cinco cambios activos. Cuatro traen secciones numeradas y casillas jerárquicas: 164 casillas `N.N` en
total, ninguna plana, ningún comentario espurio. El quinto,
`crear-dashboard-editorial-y-trazabilidad`, no tiene ninguna sección, sus seis casillas son una lista
plana bajo un `# Tareas:`, y cada una arrastra un `<!-- id: N -->` al final.

La proporción importa más que el caso: la convención se sostiene sola cuatro veces de cinco, y no
porque el canal la transporte —ninguna regla la menciona— sino porque el ejecutor mira los archivos
vecinos antes de escribir. Funciona hasta el primero que no los mira, y ese ya apareció. Un cumplimiento
que depende de la imitación no es una regla: es una costumbre que se rompe sin aviso, y cuando se rompe
no falla nada, simplemente queda un artefacto que el resto del circuito lee peor.

El comentario `<!-- id: N -->` merece una aclaración, porque parece una convención y no lo es: GitCron
identifica cada casilla por su número de línea y ningún `tasks.md` de este repositorio lleva esos
comentarios. Los agregó el ejecutor por su cuenta, que es lo que pasa cuando nadie declaró cómo se
escribe el artefacto.

El mismo hueco existe acá. Las cuatro reglas de `tasks` de `openspec/config.yaml` hablan de
verificabilidad, de quién marca una casilla, de cuándo marcarla y de no implementar sobre un cambio
archivado. Ninguna dice cómo se numera ni para quién se redacta. Que los `tasks.md` de este
repositorio usen `1.1`, `1.2`, `1.3` es imitación de los archivos vecinos, no una regla que viaje por
el canal, y sólo funciona con un ejecutor que mire alrededor antes de escribir.

**Lo que las sondas cambiaron.** Al medirlo sobre repositorios de prueba aparecieron tres cosas que la
propuesta original no contemplaba, y las tres afectan el diseño.

`openspec init` **exige `--tools`**: falla sin él y ofrece unas treinta herramientas. No hay un
«inicializar» a secas que la aplicación pueda ejecutar sin decidir antes para qué ejecutor se
inicializa.

Con `--tools claude` escribe **once archivos**, no uno: cinco slash commands bajo
`.claude/commands/opsx/`, cinco skills bajo `.claude/skills/` y `openspec/config.yaml`. Es bastante más
de lo que sugería «inicializar OpenSpec», y hay que enumerarlo antes de escribirlo.

Y lo más importante: **`init` no resuelve el problema que este change atiende**. Después de
inicializar, `openspec instructions` sigue devolviendo contexto vacío y cero reglas, porque el
`config.yaml` que deja son veinte líneas comentadas —una plantilla con ejemplos, no una configuración—.
Sembrar reglas deja de ser un agregado y pasa a ser lo único que cambia algo.

## What Changes

- El panel detecta que el repositorio abierto no tiene `openspec/` y lo declara como estado propio, en
  vez de mostrarlo como un repositorio sin cambios activos.
- Ofrece inicializar OpenSpec, explicando antes qué se va a escribir en el repositorio y dejando la
  ejecución a una acción humana explícita.
- La inicialización siembra el `config.yaml` con un juego de reglas base en vez de dejarlo vacío, y
  entre ellas van las de forma —numeración jerárquica de tareas y redacción autosuficiente— que hoy
  ningún canal transporta.
- Explica por qué importa: sin `init`, crear un cambio igual funciona pero el ejecutor no recibe
  contexto ni reglas.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el panel distingue un repositorio sin OpenSpec de uno con OpenSpec y sin
  cambios activos, y ofrece la inicialización como salida.

## Impact

**Producción:** el lector de evidencia —para distinguir "no hay `openspec/`" de "hay `openspec/` y
está vacío"—, la guía de próximas acciones y la pantalla de arranque del panel. Hace falta además una
superficie para ejecutar la inicialización.

**Sin tocar:** el flujo de cambios, el archivado, y el comportamiento del panel en un repositorio que
sí tiene OpenSpec.

**Fuera de alcance:** inicializar sin confirmación humana, elegir esquema o plantillas por el usuario, y
escribir `AGENTS.md` o cualquier otro archivo que no ponga la propia inicialización. Tampoco entra
escribir la convención de forma en el `config.yaml` **de este** repositorio: acá también falta, pero es
un cambio en el canal de gitCronos y no algo que resuelva la inicialización de un repositorio ajeno.

**Del contenido de las reglas base:** se siembra un juego mínimo y genérico, no las reglas de producto
de gitCronos. Un repositorio ajeno no quiere heredar el contexto de éste; quiere arrancar con las
convenciones de forma que hacen que un `tasks.md` sea legible por cualquier ejecutor.

**Dependencias:** ninguna.

**Riesgo:** medio, porque es una escritura nueva en un repositorio del usuario. Mitigación: se enumera
qué se va a escribir antes de escribirlo, la acción es explícitamente humana y se puede no ejecutar,
según la invariante que exige declarar toda escritura antes de que ocurra. Queda por decidir si la
inicialización se ejecuta desde la aplicación o si el panel entrega el mando para correrlo a mano; la
decisión va en `design.md` antes de tocar código.
