# Cuándo empezó un cambio y cuándo terminó

**Change:** `show-change-timestamps` · **Fecha:** 2026-08-06 · **Tareas:** 28/29 (falta la validación
visual de Ale)

## Qué se hizo

El encabezado de un cambio activo muestra su creación junto al título. El de un cambio archivado muestra
creación y archivado, ambas con hora. Se retiraron las tres filas del resumen de archivado.

## El hallazgo: `--no-renames`

El plan original era una consulta con `--follow` por cambio. Funcionaba —se comprobó que atraviesa el
rename del archivado— pero eran dos invocaciones de Git por cambio sobre cuarenta y nueve archivados.

La versión que quedó resuelve todo junto:

```
git log --diff-filter=A --no-renames --name-only --reverse --format=%x00%aI -- openspec/changes
```

Recorriendo de más viejo a más nuevo, la primera aparición de un archivo bajo
`openspec/changes/<slug>/` fecha la creación y la primera bajo
`openspec/changes/archive/<fecha>-<slug>/` fecha el archivado.

`--no-renames` es lo que lo hace posible, y se llegó midiendo, no razonando. Sin esa opción el archivado
sale vacío: Git reconoce el movimiento como `R100` y `--diff-filter=A` no cuenta un renombre como alta.
Con la primera versión del comando, la creación daba `2026-08-06T11:59:37-03:00` —correcta— y el
archivado quedaba en blanco. Desactivando la detección, el movimiento se ve como el alta del destino y
aparece `2026-08-06T12:03:14-03:00`, que coincide con el commit real.

**Costo medido:** 97 ms para 602 caminos, una sola invocación, sobre este repositorio.

## El disco, sólo para lo no confirmado

Un cambio recién creado no tiene ningún commit, que es justo cuando la marca más sirve. Ahí se usa la
fecha de creación del directorio, y va rotulada como `source: 'disk'` para que no se lea como una fecha
de Git.

El disco no sirve como fuente general y se comprobó por qué: la marca no sobrevive al archivado —el
directorio bajo `archive/` se crea nuevo, así que la fecha original desaparece— ni a un clon, donde
todos los cambios pasarían a figurar creados el día de la copia.

## Las tres filas que se fueron

`OpenSpecDashboard.tsx` tenía un `<dl>` con "Archivo", "Especificaciones principales" y "Actividad y
evidencia". Las dos últimas rendían siempre `pipeline.openspec.completed.preserved` —"Conservadas"— sin
consultar el cambio: no existía caso en que dijeran otra cosa. La primera mostraba una ruta cuya fecha
ya estaba impresa dos líneas más arriba.

Ocupaban el lugar donde faltaba el dato. Se retiraron las tres, con sus estilos y sus cuatro claves de
i18n en los tres idiomas.

## Una precisión que se declara en vez de disimularse

La marca es la del **commit**, no la del momento en que se escribió el archivo. Un cambio empezado a la
mañana y confirmado a la noche muestra la noche. Está en el `title` de la marca, porque presentarla como
"creado" a secas afirmaría una exactitud que el dato no tiene.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **103 archivos / 756 tests**, verde en dos corridas
seguidas. Son dos archivos y quince tests más que la base de 101/741: seis del parser, cinco del lector
y cuatro del panel. Lint limpio sobre los nueve archivos tocados.
`openspec validate show-change-timestamps --strict` válido.

## Lo que no se midió

**No se midió el refresco extremo a extremo**, antes contra después. Se midió el costo de lo agregado
—una invocación de Git de ~100 ms— y no la diferencia sobre el refresco completo, que está dominado por
otra cosa: validar un cambio con el CLI de OpenSpec cuesta unos 2,4 s en Windows, y por eso ya se acotó a
sólo el cambio seleccionado. Contra ese orden de magnitud, 100 ms es marginal, pero eso es un
razonamiento sobre números conocidos y no una medición del refresco, así que se declara como lo que es.

Si en la práctica se nota, la salida está identificada: la pasada ya es única, así que lo siguiente sería
cachearla contra el HEAD en vez de repetirla en cada relectura.

## Lo que falta

Ale valida en la aplicación las dos pantallas: un cambio activo con su creación junto al título, y un
cambio archivado con creación y archivado.
