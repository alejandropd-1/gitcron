## Context

`hooks/use-repo-loader.ts` tiene 645 líneas: unas veinticinco funciones `async` de carga y refresco,
un `useRef` de debounce y **un solo** `useEffect` —el de observación, líneas 623-675—. Esa
concentración es lo que hace el arreglo tratable: hay exactamente un efecto que mover.

El efecto hace cinco cosas por instancia: `repoWatch` sobre el repo, suscripción a `repo:fs-change`,
suscripción a `repo:commits-changed`, listeners de `focus`/`visibilitychange`, y un `setInterval` de
2 s. Su cleanup deshace las cinco correctamente. El defecto no es el cleanup: es que corre una vez
por consumidor.

Los ocho consumidores actuales usan el hook por sus funciones. Ninguno necesita observar:
`BranchFilterDropdown` quiere `refreshLog`, `ChronometricGraph` quiere `loadAll`, los `git-actions`
quieren refrescar después de una operación.

## Goals / Non-Goals

**Goals:**

- Una sola suscripción y un solo temporizador por repositorio abierto.
- Conservar exactamente los disparadores actuales, con el mismo debounce.
- Que un montaje duplicado se declare en vez de degradar en silencio.

**Non-Goals:**

- Tocar `electron/ipc/watchers.ts`. El lado de main ya deduplica por repo con
  `repoWatchers.set(targetPath, watcher)`; el que se suscribe de más es el renderer.
- Agregar control de concurrencia a `git:status`. Sería tapar el síntoma: con una sola suscripción
  no hay concurrencia que controlar. Si más adelante aparece por otra vía, es otro trabajo.
- Revisar si el heartbeat de 2 s sigue haciendo falta. Con una sola instancia su costo pasa de ~11
  invocaciones cada 2 s a una, que es otro orden de magnitud; si conviene quitarlo del todo se
  decide con la aplicación a la vista, no acá.
- Reducir el número de consumidores de `useRepoLoader`.

## Decisions

**Separar el efecto a su propio hook, no condicionar el existente.** La alternativa era dejar el
efecto donde está y que sólo la primera instancia lo monte, con un contador a nivel de módulo. Se
descartó: "la primera instancia" depende del orden de montaje, que ningún consumidor controla ni
declara, y el comportamiento pasaría a depender de qué componente renderiza antes. Separarlo hace
explícito quién observa.

**El hook de observación obtiene las funciones de refresco llamando a `useRepoLoader`.** Como ese
hook ya no monta el efecto, llamarlo desde adentro no reintroduce el problema, y evita tener que
pasar seis funciones por parámetro desde `app/page.tsx`.

**Se monta en `app/page.tsx`.** Es la raíz de la vista y está montada mientras haya aplicación, que
es exactamente la duración que debe tener la observación. Montarlo más abajo la ataría a una vista.

**El aviso de duplicado usa un contador a nivel de módulo, sólo en desarrollo.** Es el mismo
mecanismo que se descartó para *decidir* quién observa, pero acá no decide nada: sólo informa. La
diferencia importa —un contador que elige comportamiento es frágil; uno que sólo declara una
condición no puede romper nada—.

React 18 en modo estricto monta y desmonta los efectos dos veces en desarrollo. El contador se
decrementa en el cleanup, así que un remonte no dispara el aviso: sólo lo dispara la coexistencia
real de dos observaciones.

## Risks / Trade-offs

- **Si `app/page.tsx` dejara de montar el hook, la aplicación perdería el refresco automático.** →
  Es un riesgo de omisión, no de rendimiento, y sería visible de inmediato: el panel de cambios sin
  preparar dejaría de actualizarse solo. La cobertura fija que obtener las funciones no observa, con
  lo cual la única forma de tener observación es montar el hook explícitamente.
- **El aviso de duplicado puede sonar por un falso positivo si alguna vista se monta dos veces de
  forma legítima.** → No hay hoy ningún caso así, y si apareciera el aviso sería precisamente la
  señal correcta para revisarlo.
- **No se declara mejora de rendimiento medida.** → Se sabe que el trabajo redundante desaparece
  (once invocaciones pasan a una); cuánto se nota depende del repositorio y de la máquina, y
  afirmarlo sin medir sería inventar. La medición la hace quien use la aplicación.
