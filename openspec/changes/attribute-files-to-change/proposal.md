## Why

El panel de preparación declara de qué tipo es cada archivo modificado, pero no puede decir a qué
cambio pertenece ninguno de los archivos de código. No es un problema de presentación: el dato no
existe en ninguna parte. Los artefactos de un cambio se atribuyen por su ruta —viven bajo
`openspec/changes/<slug>/`—, y un archivo de código no lleva encima ninguna marca de por qué se editó.

La consecuencia práctica es el circuito de confirmación que hoy se resuelve a mano. Cuando varios
cambios tocan los mismos archivos de código, que pasa siempre, no hay forma de separarlos y el mensaje
sugerido sale vacío. Eso está bien —es información, no un error a esquivar—, pero hoy sale vacío
también cuando la separación sí sería posible, porque no hay dato con el cual intentarla.

Existe información desaprovechada. `captureWorkingTree`
(`electron/pipeline/runtime/runtime-session-evidence.ts:35`) ya corre `git status` y arma su firma con
**todas las rutas** del árbol, y devuelve sólo el string de la firma y los contadores: las rutas se
descartan en la misma línea que las produce. El hub la llama antes y después de cada sesión
(`runtime-session-hub.ts:203` y `:324`) y compara firmas para detectar que hubo cambios, y la sesión
conoce su `changeId`. Está todo salvo llevarse las rutas.

Esa observación tiene dos puntos ciegos que no se pueden tapar: sólo cubre agentes lanzados desde la
aplicación, y dos sesiones solapadas ven los cambios de la otra. Por eso, si se usa, tiene que
mostrarse como "tocado por una sesión de X" y nunca como "pertenece a X".

La otra vía es la rama. `branch-on-change-creation` ya deja el trabajo separado cuando el cambio se
crea desde la aplicación, pero `git branch --list "change/*"` no devuelve nada sobre 35 ramas locales:
la convención no se aplicó nunca porque los cambios se crean desde la terminal. Eso lo atiende
`carry-branch-rule-in-config`, y hasta que la rama exista de verdad no hay sobre qué apoyarse.

## What Changes

Este cambio no está decidido: hay dos caminos y `design.md` propone uno con su alternativa. **Nada se
implementa antes de que Ale confirme el camino.** Lo que en cualquier caso entra:

- El panel de preparación puede decir algo sobre el origen de un archivo de código, en vez de declarar
  únicamente su tipo.
- Lo que se afirme queda calificado por su confianza: una observación se muestra como observación y no
  como pertenencia.
- Los puntos ciegos de la fuente elegida quedan visibles en la interfaz, no sólo en un reporte.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia de archivos modificados puede llevar el origen de cada archivo
  de código, calificado por la confianza de la fuente que lo produjo.

## Impact

**Producción, según el camino que se elija:**
`electron/pipeline/runtime/runtime-session-evidence.ts` y `runtime-session-hub.ts` si se conserva la
observación por sesión; el lector de evidencia y la derivación de alcance si se consume la rama.
En ambos casos, `types/pipeline/index.ts` y el panel de preparación.

**Sin tocar:** `lib/change-commit-scope.ts` mantiene su forma. Es pura, sin estado de Git ni forma de
`GitFile`, y eso es lo que permite probarla con tablas; cualquier dato nuevo entra como parámetro, no
como acceso desde adentro.

**Fuera de alcance:** preseleccionar archivos en el panel de preparación a partir de la atribución.
Nada entra preseleccionado, y esa decisión está tomada: preseleccionar reintroduce que el commit
dependa de dónde esté el foco. También queda fuera partir un commit mezclado: Git prepara archivos
enteros, y cuando dos cambios tocan el mismo archivo un commit mezclado con mensaje escrito a mano
sigue siendo la respuesta correcta.

**Dependencias:** `carry-branch-rule-in-config` si se elige el camino de la rama.

**Riesgo:** alto, y el riesgo principal no es técnico. Una atribución que parece cierta y no lo es es
peor que ninguna: llevaría a confirmar archivos que no corresponden creyendo que la aplicación lo
verificó. Mitigación: nada se afirma sin calificar su confianza, y los puntos ciegos se muestran donde
se muestra la atribución.
