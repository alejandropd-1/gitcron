# La forma de un tasks.md, en el canal

**Change:** `carry-task-form-in-config` · **Fecha:** 2026-08-06 · **Tareas:** 14/15 (falta que Ale
confirme la redacción)

## Qué se hizo

Cuatro reglas nuevas bajo `rules.tasks` en `openspec/config.yaml`. No se tocó código.

Antes había cuatro reglas y ninguna hablaba de la estructura del archivo: verificabilidad, quién marca
una casilla, cuándo marcarla y no implementar sobre un change archivado. Que todos los `tasks.md` de
este repositorio usaran secciones `## N.` y casillas `N.M` era imitación de los archivos vecinos.

Las nuevas cubren la forma —secciones numeradas y casillas jerárquicas—, la redacción accionable, la
prohibición de agregar marcas propias, y que todo eso rige igual cuando el change documenta trabajo ya
hecho.

## La comprobación del canal

```
openspec instructions tasks --change carry-task-form-in-config --json
```

Devuelve ocho reglas: las cuatro previas más las cuatro nuevas, en orden.

## La comprobación que importaba, y su resultado real

Escribir reglas es barato; lo que había que saber es si alcanzan para rechazar el caso que las motivó.
Se contrastaron contra `crear-dashboard-editorial-y-trazabilidad` de `C:\www\odontoPau`, el `tasks.md`
que se desvió.

**Lo rechaza la regla de estructura.** Cero secciones con formato `## N.`, cero casillas `N.M`. El
archivo abre con un `# Tareas:` y sigue con seis casillas planas.

**Lo rechaza la regla de marcas propias.** Seis comentarios `<!-- id: N -->`, uno por casilla.

**No lo rechaza la regla de redacción accionable, y conviene decirlo.** Las seis tareas nombran archivo
o comando concreto: `EditorialDashboard.tsx`, `src/app/editorial/page.tsx`,
`src/styles/pages/_editorial-dashboard.scss`, `tsc --noEmit`, `eslint .`,
`openspec validate … --strict`. En ese aspecto el archivo estaba bien escrito.

Esto corrige la impresión de partida. El desvío fue de **forma**, no de contenido: las tareas decían
qué hacer y dónde. Si el problema hubiera sido sólo la redacción, la regla no lo habría agarrado.
Sirve para calibrar qué cubren estas reglas y qué no.

## Autosuficiencia

Ninguna de las cuatro remite a otros archivos como referencia de forma. Era el criterio de la tarea 2.5
y no es un detalle de estilo: la imitación es precisamente el mecanismo que falló, así que una regla que
dijera "seguí el formato de los demás cambios" tendría el mismo punto ciego que la costumbre que viene
a reemplazar. Cada una se puede comprobar leyendo un solo archivo.

## Lo que esto no resuelve

No hay nada que verifique el cumplimiento. Una regla en el canal llega a quien pide instrucciones, y el
único ejecutor que se desvió probablemente no las pidió —el encargo fue informal, documentar sobre la
marcha algo ya empezado—. Eso es hipótesis, no dato.

La capa que sí lo cubriría es que el panel verifique la forma de un `tasks.md` y lo avise. Se descartó
por proporción, con el motivo escrito en `design.md`: el desvío es uno de cinco cambios, o seis casillas
sobre 170, y la verificación cuesta un change completo. Si reaparece, la evidencia para justificarla ya
está reunida.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **101 archivos / 736 tests**, mismo conteo que la base.
No se tocó código. `openspec validate carry-task-form-in-config --strict` válido.
