## Why

El panel de preparación funciona pero obliga a adivinar. Con tres trabajos encimados en el árbol
mostró **21 archivos en una lista plana** bajo el rótulo "No se le pueden atribuir", sin decir de
dónde venía cada uno. Elegir cuáles sumar exige recordar qué se tocó en cada change, que es
exactamente el trabajo mental que la preparación existía para evitar.

La información para no adivinar ya está: un archivo bajo `openspec/changes/<id>/` **dice a qué
cambio pertenece**. Hoy se descarta esa atribución y todo lo que no es del cambio seleccionado cae
en una misma bolsa.

Además hay tres defectos observados usando la aplicación:

- **El mensaje sugerido se deriva de los archivos propios, no de los que se van a preparar.** En
  `lib/change-commit-scope.ts` la sugerencia se calcula sobre `own`, pero se prepara
  `[...own, ...extraFiles]`. Con `own` vacío y todo elegido a mano —el caso real que ocurrió— el
  mensaje no puede derivar alcance de lo que efectivamente entra.
- **La lista no dice en qué estado está cada archivo.** El panel de staging de la aplicación lo
  muestra con un distintivo de una letra desde hace tiempo; acá no, así que no se distingue lo
  agregado de lo borrado.
- **El texto del panel no se puede seleccionar**, así que no se puede copiar el nombre de un archivo
  ni el título de una tarea.

## What Changes

- La lista se agrupa por procedencia en vez de partirse en dos bolsas: artefactos de este cambio,
  artefactos de otro cambio —con el identificador a la vista—, restos de un archivado, y código sin
  atribuir. Cada grupo dice qué es y por qué está donde está.
- Cada archivo muestra su estado con el mismo distintivo de una letra que ya usa el panel de
  staging, con los mismos colores.
- **El mensaje sugerido pasa a derivarse de los archivos que realmente se van a preparar**, no sólo
  de los propios.
- "Sumar todos" deja de ser un enlace en medio de una frase y pasa a ser un control propio, con la
  lista más aireada.
- El texto del panel se puede seleccionar y copiar, como el resto de la aplicación.

Fuera de alcance, declarado: no se toca la regla de atribución —qué entra en `own` y qué no sigue
igual—, sólo se expone de dónde viene cada archivo. Tampoco se mueve la preparación fuera de su
pestaña ni se agrega ninguna acción que confirme en Git.

## Capabilities

### Modified Capabilities

- `pipeline-guided-workflow`: la preparación del commit muestra la procedencia de cada archivo y
  deriva el mensaje del alcance real.

## Impact

- `lib/change-commit-scope.ts` — la derivación pasa a devolver grupos con procedencia, y el mensaje
  se calcula sobre lo que se prepara.
- `lib/__tests__/change-commit-scope.test.ts` — casos de agrupación y del mensaje.
- `components/pipeline/OpenSpecDashboard.tsx` y su hoja de estilos — la lista agrupada, los
  distintivos de estado y el control de sumar todos.
- `lib/i18n.ts` (ES/EN/ZH) — los rótulos de cada grupo.
- Sin cambios de IPC ni de dependencias.
