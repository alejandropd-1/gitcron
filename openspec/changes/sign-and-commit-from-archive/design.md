# Design — Firma y confirmación en Git desde el archivado

## Context

Cerrar un change hoy son cuatro pasos manuales fuera de la aplicación, y el registro de la
intervención humana no existe: el casillero que la convención reserva para eso —la última tarea—
queda sin marcar en todos los changes archivados, porque el agente no puede marcarla honestamente.

La maquinaria de Git ya está: `git:stage-batch` acepta una lista explícita de archivos y
`git:command` commitea. No hay que construir nada de Git.

## Goals / Non-Goals

**Goals**

- Que el click de archivar quede registrado como lo que es: la firma de una persona.
- Que cerrar un change no exija salir de la aplicación.
- Que el alcance de lo que se commitea sea visible antes de ejecutarlo.

**Non-Goals**

- No se publica nada: `push`, `merge` y `tag` siguen siendo manuales.
- No se infiere qué archivo pertenece a qué cambio. Se declara.
- No se marca ninguna tarea que no sea la de firma.
- No se toca el flujo de commit existente de la solapa Commit.

## Decisions

### 1. Una tarea de firma con texto literal, no "la que quede"

La propuesta original era marcar la tarea pendiente al archivar. Se descarta: convertiría el
checkbox en "se apretó el botón". Un change con tres tareas sin hacer las vería marcadas solas, y el
archivo afirmaría trabajo que nadie hizo — congelado para siempre, porque el archivado no se
revierte.

Se marca **una tarea designada**, identificada por texto literal declarado:

```
- [ ] X.Y Archivado confirmado por Ale desde la aplicación
```

*Alternativa descartada:* detectarla por posición (la última) o por heurística sobre su texto. Es la
misma clase de adivinanza que ya se rechazó para las tareas de handoff: se rompe con cualquier
redacción distinta, y acá el costo de equivocarse es marcar como hecho algo que no se hizo.

**Qué prueba el click y qué no.** Prueba que una persona confirmó el archivado desde la aplicación,
con el alcance a la vista. NO prueba que revisó el resultado. Por eso el texto dice "archivado
confirmado" y no "QA aprobado": el checkbox no puede afirmar más de lo que el gesto demuestra.

### 2. Manifiesto por change, porque el alcance no es deducible

El árbol puede tener varios changes en curso —hoy tiene tres—. No hay forma de saber qué archivo
pertenece a cuál sin que alguien lo declare. Lo declara el change, en `commit.md`:

```markdown
## Mensaje

feat(pipeline): <una línea>

<cuerpo opcional>

## Archivos

- ruta/uno.ts
- ruta/dos.tsx
```

Los artefactos del propio change (`openspec/changes/<slug>/**`) y su reporte no se enumeran: son
rutas deterministas y se agregan solas.

*Alternativa descartada:* deducir el alcance del último diff, o de los archivos que tocó la sesión
de agente. Lo primero mezcla changes; lo segundo no existe cuando el trabajo lo hizo una persona.

### 3. Lo que queda afuera también se muestra

Un manifiesto lo escribe el agente y puede estar mal por omisión — el modo de fallo más silencioso:
un archivo del change que no entra al commit y nadie lo nota hasta mucho después.

Por eso el panel muestra tres cosas: mensaje, archivos que entran, y **archivos modificados que
quedan fuera**. Los de otros changes en curso van a aparecer ahí, y está bien: lo importante es que
si aparece uno que sí correspondía, se vea antes de confirmar.

### 4. Orden escalonado, y frenar ante el primer fallo

1. Marcar la tarea de firma en `tasks.md`.
2. Commit del trabajo: manifiesto + artefactos del change + reporte.
3. `openspec archive <slug> --yes`.
4. Commit del archivado: rutas que produjo el paso 3, calculadas del estado de Git.
5. Releer evidencia.

El paso 1 va antes del 3 a la fuerza: archivar mueve el directorio, después ya no está ahí para
marcar.

Si el paso 2 falla, no se sigue. Dejar el change archivado con su trabajo sin commitear es un estado
peor que no haber empezado, y menos evidente. Si falla el 4, el 3 ya ocurrió: eso se informa tal
cual, sin declarar éxito, y se resuelve commiteando a mano — el trabajo no se perdió.

## Risks / Trade-offs

- **La aplicación escribe en Git sin que Ale tipee un comando** → El click es la autorización, por
  acción, con alcance y mensaje a la vista, y sin publicar nada. `AGENTS.md` se actualiza para
  declararlo; si no, la aplicación contradiría su propio manual.
- **Un manifiesto mal escrito commitea de menos** → Mitigado mostrando lo que queda fuera. No se
  puede eliminar del todo: el manifiesto es un artefacto humano-o-agente y puede errar.
- **La firma no prueba que Ale revisó** → Correcto, y por eso el texto no lo afirma. Que la revisión
  ocurra sigue siendo responsabilidad de quien firma, como cualquier firma.
- **Dos commits desde un botón es mucha acción implícita** → Se acota: sólo esos dos, sólo con
  confirmación, nunca publicando. Y quedan visibles en el historial como dos entradas normales.

## Migration Plan

Los tres changes activos reciben su `commit.md` y su tarea de firma. Los ya archivados quedan como
están: reescribir un archivo para simular una firma que no ocurrió sería justamente la mentira que
este change viene a evitar.

## Open Questions

Ninguna.
