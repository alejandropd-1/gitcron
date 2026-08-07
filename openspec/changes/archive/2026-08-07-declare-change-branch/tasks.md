## 1. Base y sondas

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Medido: `git branch --list "change/*"` vacío cuatro días después de escribir la regla
- [x] 1.3 Medido sobre ramas reales: `claude/jolly-khayyam-2be14c` 501 commits detrás de `main`,
      `fix/pipeline-launcher-empty-box` 107, `imagined/streaming-predicciones-via-ipc` 296 detrás con un
      commit propio. Los dos números salen de `git rev-list --left-right --count main...<rama>`
- [x] 1.4 Medir cuánto tarda `git rev-list --count` en este repositorio, para saber si entra en cada
      refresco o si hay que restringirlo. Comparar contra los 97 ms de la pasada de `git log`
- [x] 1.5 Ale decide si el aviso de rama vive en la franja de evidencia —que ya muestra la rama— o como
      línea propia arriba de la guía, como el de OpenSpec

## 2. Evidencia

- [x] 2.1 Leer la divergencia entre la rama actual y el `main` local: commits que faltan y commits
      propios, en un módulo con la forma de los demás lectores
- [x] 2.2 Que la lectura degrade sin romper: sin `main`, en un repositorio recién iniciado o con Git
      inaccesible, la respuesta es "no se pudo medir" y no un cero
- [x] 2.3 Transportar la divergencia en el snapshot
- [x] 2.4 Derivar la correspondencia entre la rama actual y el cambio abierto sin estado de Git en un
      módulo puro: entra el nombre de la rama como parámetro

## 3. Panel

- [x] 3.1 Declarar que el cambio abierto no está en su rama, nombrando las dos, sin bloquear
- [x] 3.2 No declarar nada cuando la rama coincide
- [x] 3.3 Declarar la base antes de crear la rama, con los dos números y rotulada contra el `main` local
- [x] 3.4 Ofrecer crear a partir de `main`, sin preselección que lo dispare por descuido
- [x] 3.5 Declarar el árbol sucio como motivo de no crear la rama, en el mismo lugar donde se crea
- [x] 3.6 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`
- [x] 3.7 Releer la evidencia después de crear la rama. Ale lo encontró validando: la franja seguía
      mostrando la rama anterior después de que el formulario la cambió
- [x] 3.8 Los avisos van en ámbar, no en cyan. Ale lo marcó validando: contra el cyan del resto del panel
      se leían como más texto de lo mismo. Alcanza a `.branchBase` y, por consistencia, a `.flowNature`

## 4. Tests

- [x] 4.1 Prueba del lector: divergencia leída de un repositorio real con commits en dos ramas
- [x] 4.2 Prueba del lector: sin `main` la respuesta es "no se pudo medir" y no cero
- [x] 4.3 Prueba: cambio abierto en otra rama → el panel lo declara y el trabajo sigue disponible
- [x] 4.4 Prueba: cambio abierto en su rama → el panel no declara nada
- [x] 4.5 Prueba: rama atrasada → se declara el número y se ofrece `main`
- [x] 4.6 Prueba: árbol sucio → no se llama a crear la rama y se declara el motivo
- [x] 4.7 Prueba: crear la rama relee la evidencia, y un fallo o una rama no pedida no la releen

## 5. Cierre

- [x] 5.1 `pnpm exec tsc --noEmit` en cero
- [x] 5.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 5.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 5.4 `openspec validate declare-change-branch --strict` válido
- [x] 5.5 Reporte en `docs/reports/`, con las mediciones como evidencia
- [x] 5.6 Ale valida abriendo un cambio desde otra rama y viendo el aviso
