## 1. Base

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Caso real capturado íntegro: el texto de ocho líneas que recibió Ale al apretar PUSH con el
      vínculo apuntando a `change/name-task-in-commit-message`. Está en el proposal
- [x] 1.3 Causa confirmada con Git: rama `change/draft-commit-message-with-local-ai`, upstream
      `origin/change/name-task-in-commit-message`, `push.default` sin definir —o sea `simple`—
- [x] 1.4 Comprobado que el reconocimiento por texto **ya existe** en `electron/ipc/git-sync.ts:402`
      para «no upstream branch»: no es una idea nueva, es cobertura que falta
- [x] 1.5 Textos reales capturados provocando cada fallo en repositorios descartables, en
      `textos-reales.md`. Aparecieron dos cosas no previstas: «sin ningún remoto» es un caso aparte de
      «sin upstream», y el rechazo por estar atrasado empieza con `error:` y no con `fatal:`, así que un
      patrón que sólo mire `fatal:` lo deja afuera. El de «sin permisos» NO se capturó

## 2. El reconocedor

- [ ] 2.1 Módulo puro en `lib/` que toma el texto de Git y devuelve el fallo identificado o nada
- [ ] 2.2 Cubrir los cinco capturados: vínculo con otro nombre, sin upstream, sin ningún remoto,
      rechazado por estar atrasado, y remoto inalcanzable. «Sin permisos» queda afuera hasta tener su texto
- [ ] 2.3 Que «no lo reconozco» sea un resultado explícito y no un hueco: es la respuesta más común y la
      que degrada al comportamiento de hoy
- [ ] 2.4 Extraer del texto lo que la explicación necesita nombrar —la rama del remoto, por ejemplo— sin
      inventarlo cuando no está

## 3. La salida

- [ ] 3.1 Canal para reapuntar el vínculo, con el nombre de la rama validado antes de llegar al proceso
- [ ] 3.2 Que el reapuntado informe qué quedó apuntando a qué, en vez de un éxito mudo
- [ ] 3.3 Ninguna acción se ejecuta sin que la persona la pida

## 4. La vista

- [ ] 4.1 Mostrar la explicación donde hoy aparece el cartel rojo
- [ ] 4.2 El texto original de Git accesible y plegado, nunca perdido
- [ ] 4.3 El botón de la salida sólo cuando hay una que resuelva
- [ ] 4.4 Textos en los tres idiomas
- [ ] 4.5 Espaciar lo agregado con la escala del panel

## 5. Tests

- [ ] 5.1 Tabla del reconocedor sobre los textos reales, incluido el de ocho líneas de Ale
- [ ] 5.2 Prueba: un texto desconocido no se reconoce y no se le inventa explicación
- [ ] 5.3 Prueba: el original queda accesible en los dos casos
- [ ] 5.4 Prueba: la acción no se dispara sola
- [ ] 5.5 Prueba del canal: una rama con un nombre inválido no llega al proceso

## 6. Cierre

- [ ] 6.1 `pnpm exec tsc --noEmit` en cero
- [ ] 6.2 `pnpm test` en verde, con el conteo comparado contra la base
- [ ] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 6.4 `openspec validate recover-from-push-failures --strict` válido
- [ ] 6.5 Reporte en `docs/reports/`
- [ ] 6.6 Ale valida provocando el fallo de nuevo y viendo si la explicación alcanza para saber qué hacer
