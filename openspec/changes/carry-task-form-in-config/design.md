## Decisión: la regla en el canal, sin verificación en el panel

Se escribe la convención de forma en `openspec/config.yaml` y no se construye ninguna comprobación que
la haga cumplir.

**Alternativa descartada: que el panel verifique la forma y avise.** Es estrictamente más eficaz, y por
un motivo que no es opinable: actúa sobre el artefacto ya escrito, así que alcanza también al ejecutor
que nunca pidió instrucciones —que es justamente el perfil del único caso observado—. El proyecto ya
tiene la demostración de que anunciar no basta: la regla de la rama vive en el código de la aplicación
desde hace una semana y `git branch --list "change/*"` sigue devolviendo cero sobre 35 ramas locales,
mientras que la validación de OpenSpec se cumple siempre porque algo la comprueba.

Se descarta por proporción. El desvío es uno sobre cinco cambios, o seis casillas sobre 170, y la
verificación exige contrato, superficie en el panel, textos y pruebas: el tamaño de un cambio completo
para un caso. Ale acotó el alcance explícitamente. La decisión se toma sabiendo que es la opción menos
eficaz de las dos, no creyendo que sea equivalente, y queda escrita acá para que rehacerla no cueste
volver a razonarlo: si el desvío reaparece, la evidencia para justificar la verificación ya está
reunida.

## Decisión: reglas autosuficientes, comprobables sobre un archivo solo

Cada regla se redacta para poder verificarse leyendo únicamente el `tasks.md` en cuestión, sin
consultar los demás.

**Alternativa descartada: remitir a los archivos existentes como referencia de forma.** Es más corto y
se mantiene solo, porque los ejemplos se actualizan al ritmo del repositorio. Se descarta porque es
precisamente el mecanismo que falló: la imitación funcionó cuatro veces de cinco y no funcionó la
quinta, y una regla que dice "hacelo como los otros" tiene el mismo punto ciego que la costumbre que
viene a reemplazar. Un ejecutor que no mira alrededor tampoco va a mirar alrededor porque una regla se
lo pida.

## Decisión: la forma rige igual al documentar trabajo ya hecho

Las reglas declaran explícitamente que un cambio escrito para documentar trabajo ya realizado usa la
misma forma que uno escrito por delante.

**Alternativa descartada: no mencionarlo, por obvio.** Se descarta porque el único desvío observado
ocurrió exactamente en ese contexto: el pedido fue documentar en OpenSpec una tarea que ya estaba a
medio hacer, sin flujo previo, y el ejecutor resolvió sobre la marcha. Lo que en un flujo normal se
sobreentiende, en uno improvisado se omite. Nombrarlo cuesta una línea y cubre el único caso que se
manifestó.

## Riesgo

**La regla no alcanza a quien no pide instrucciones.** No tiene mitigación dentro de este cambio: es el
límite del canal, y taparlo requiere la verificación que acá se descarta. La comprobación honesta es
mirar, más adelante, si vuelve a aparecer un `tasks.md` sin secciones; no suponer que la regla lo
impidió.

## Sin medir

No se sabe si el ejecutor que se desvió pide instrucciones al CLI o no. Es una hipótesis razonable a
partir de cómo se produjo el caso —pedido informal, sin flujo—, y se declara como hipótesis, no como
dato.
