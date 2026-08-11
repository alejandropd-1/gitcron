## 1. Medir antes de tocar

- [x] 1.1 Registrar la línea base: cronometrar `git status --porcelain` sobre este repositorio con al
      menos 20 corridas y anotar mediana, mínimo y máximo. La referencia previa es mediana 42 ms
- [x] 1.2 Contar cuántos eventos de filesystem genera hoy una operación pesada —`git checkout` entre dos
      ramas distantes y un rebase de varios commits— con el observador actual, que ignora `.git/`. Es la
      base contra la cual comparar el punto 2.2

## 2. Observar el estado de Git

- [x] 2.1 En `electron/ipc/watchers.ts`, dejar de ignorar `.git/` entero y observar sólo los caminos
      declarados en `design.md`: `index`, `HEAD`, `MERGE_HEAD`, `rebase-merge/`, `rebase-apply/` y
      `refs/heads/`. `.git/objects/`, `.git/logs/` y los `*.lock` siguen ignorados
- [x] 2.2 **Medir la tormenta.** Repetir el conteo de 1.2 con los caminos nuevos observados. Declarar
      eventos por segundo durante un `checkout` y un rebase, y cuántos sobreviven al agrupado de 250 ms
      de la línea 47. Si el agrupado no los absorbe, ajustar la ventana —no volver a ignorar `.git/`— y
      declarar el número nuevo con su motivo
- [x] 2.3 Que un `git add`, un `git checkout` y un merge con conflictos hechos **desde una terminal**
      producen evento en los caminos observados de `.git/` (`index`, `HEAD`, `MERGE_HEAD`, `refs/heads/`),
      medido con chokidar real sobre un clon del repositorio; y que escribir en `.git/objects/` **no**
      produce ningún evento (la whitelist lo poda). Es la mitad «evento» de la cadena; la mitad que llega
      a la vista es la 2.5
- [x] 2.4 Comprobar que escribir en `.git/objects/` no dispara ninguna relectura
- [x] 2.5 **Ale valida**, con la aplicación abierta, que esas mismas operaciones (`git add`, `git
      checkout`, merge con conflictos) actualizan la vista sin esperar al temporizador. Validación
      humana, igual que la 6.6

## 3. La guardia previa

- [x] 3.1 Elegir entre las dos alternativas de `design.md` —`stat` de `.git/index`, o marca propia del
      observador— y argumentar la elección en el propio `design.md`, con el costo medido de la
      comprobación
- [x] 3.2 Implementar la guardia en el camino que precede a la lectura completa del estado, de modo que
      un disparo redundante no ejecute `git status`
- [x] 3.3 Comprobar que la guardia **nunca descarta un evento**: sólo puede evitar una relectura cuando
      no hubo cambios. Ante cualquier ambigüedad —la resolución de un segundo del `mtime` en Windows es
      el caso conocido— se lee

## 4. La cadencia adaptativa

- [x] 4.1 En `hooks/use-repo-loader.ts:719`, reemplazar el intervalo fijo de 2.000 ms por dos escalones,
      activo y quieto, con cualquier evento devolviendo al activo. Los números concretos los fija esta
      tarea y se declaran en el reporte con su fundamento
- [x] 4.2 Conservar la condición de ventana visible y enfocada, que es lo que impide trabajar de fondo.
      `hooks/__tests__/use-repo-watch.test.ts:90-99` afirma que existe exactamente un temporizador: sigue
      valiendo, un temporizador con cadencia variable sigue siendo uno
- [x] 4.3 **No eliminar el temporizador.** Cubre eventos que Windows, algunos editores y los guardados
      atómicos pierden de verdad, y su fallo es silencioso: lo que no se detecta no se nota hasta que
      alguien confirma un commit con la lista de archivos vieja

## 5. Tests

- [x] 5.1 En `electron/__tests__/watchers.test.ts`: un cambio en `.git/index` emite `repo:fs-change`, y
      uno en `.git/objects/` no
- [x] 5.2 En `electron/__tests__/watchers.test.ts`: una ráfaga de escrituras dentro de `.git/` emite un
      solo evento agrupado, no uno por escritura
- [x] 5.3 Prueba de la guardia: sin cambios desde la lectura anterior no se ejecuta la lectura completa;
      con un cambio, sí
- [x] 5.4 Prueba de la cadencia: tras un período sin actividad el intervalo es el espaciado, y un evento
      lo devuelve al frecuente
- [x] 5.5 Comprobar que `hooks/__tests__/use-repo-watch.test.ts` sigue pasando sin aflojar ninguna
      aserción. Si alguna afirmaba la cadencia fija, actualizarla declarando aserción anterior, nueva y
      por qué la nueva es correcta

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm exec vitest run --maxWorkers=2` en verde, declarando el delta contra la base de 134
      archivos y 1041 pruebas
- [x] 6.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.4 `npx openspec validate watch-git-state-events --strict` válido
- [x] 6.5 Reporte en `docs/reports/` con: la comparación antes y después de 1.1, 1.2 y 2.2; el costo de
      la guardia; los números de la cadencia y su fundamento; qué no se pudo medir; y la lista exacta de
      archivos sin confirmar, uno por uno
- [x] 6.6 **Ale valida** que con la aplicación abierta y trabajando desde la terminal —preparar, cambiar
      de rama, hacer un commit— la vista se mantiene al día, y que la máquina no se siente más cargada
      que antes del cambio
