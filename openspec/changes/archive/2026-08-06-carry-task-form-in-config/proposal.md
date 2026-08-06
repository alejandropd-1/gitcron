## Why

La forma de un `tasks.md` en este proyecto no está escrita en ninguna parte. Las cuatro reglas de
`tasks` de `openspec/config.yaml` hablan de verificabilidad, de quién marca una casilla, de cuándo
marcarla y de no implementar sobre un cambio archivado: ninguna dice cómo se estructura el archivo. Que
todos los `tasks.md` de este repositorio usen secciones `## N.` y casillas `N.M` es imitación de los
archivos vecinos, no una regla que viaje por el canal.

La costumbre aguanta bastante. En `C:\www\odontoPau`, cuatro de cinco cambios traen 164 casillas
jerárquicas sin una sola plana, escritas por ejecutores que nunca recibieron la convención. El quinto,
`crear-dashboard-editorial-y-trazabilidad`, no tiene ninguna sección, sus seis casillas son una lista
plana bajo un `# Tareas:`, y cada línea arrastra un `<!-- id: N -->` que no significa nada —GitCron
identifica las casillas por número de línea y ningún `tasks.md` de este repositorio lleva esos
comentarios—.

Lo que hace instructivo a ese caso es cómo se produjo. El pedido fue informal: documentar en OpenSpec
una tarea que ya estaba a medio hacer. No hubo flujo, no hubo `openspec instructions`, y el ejecutor
resolvió sobre la marcha con lo que tenía. Ése es exactamente el momento en que una convención tácita
no existe: quien improvisa no imita, inventa. Una regla escrita sólo sirve si cubre ese caso, así que
tiene que ser autosuficiente —decir la forma completa en vez de remitir a otros archivos— y tiene que
declarar explícitamente que documentar trabajo ya hecho no habilita una forma distinta.

## What Changes

- `openspec/config.yaml` gana las reglas de forma de un `tasks.md`: secciones numeradas, casillas
  jerárquicas dentro de su sección, y texto accionable por quien no participó de la conversación.
- Las reglas dicen explícitamente que no se agregan marcas propias al archivo, porque la identificación
  de una casilla es posicional y cualquier anotación extra es ruido que nadie consume.
- Las reglas declaran que la forma rige igual cuando el cambio documenta trabajo ya hecho.
- Cada regla se redacta de modo que se pueda comprobar leyendo el archivo, sin conocer los demás.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: la forma de un `tasks.md` deja de ser una costumbre sostenida por
  imitación y viaja por el canal de instrucciones que alcanza a cualquier ejecutor.

## Impact

**Producción:** `openspec/config.yaml`, en las reglas del artefacto `tasks`.

**Sin tocar:** nada de código. La lectura de `tasks.md`, el conteo de casillas y su marcado desde la
aplicación quedan como están; la identificación posicional de una casilla ya funciona y no depende de
la forma del archivo.

**Fuera de alcance:** que el panel verifique la forma y avise cuando un `tasks.md` no la cumple. Es la
única capa que alcanza a un ejecutor que no pidió instrucciones, y por eso se consideró; se deja fuera
por proporción, con el motivo escrito en `design.md`. También quedan fuera las reglas de forma de
`proposal.md`, `design.md` y los deltas de spec: sobre esos artefactos no hay ningún desvío observado, y
escribir reglas para un problema que no se manifestó es inventar trabajo.

**Dependencias:** ninguna. Es hermano de `carry-branch-rule-in-config` —misma idea, mismo archivo,
regla distinta— y se pueden aplicar en cualquier orden.

**Riesgo:** bajo en código, porque no se toca ninguno. El riesgo real es de eficacia y conviene
declararlo sin adornos: una regla en el canal sólo llega a quien pide instrucciones, y el único
ejecutor que se desvió probablemente no las pidió. Esto cierra que la convención sea tácita, que es un
problema real por sí mismo; no garantiza que el caso observado no se repita, y prometer lo contrario
sería vender una mejora que no se midió.
