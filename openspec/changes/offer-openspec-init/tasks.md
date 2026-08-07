## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Ale confirmó la decisión, ampliada por las sondas: la aplicación ejecuta `openspec init` y
      **la herramienta la elige la persona en el panel**, en vez de fijarla o de entregar el mando
- [x] 1.3 Sonda sobre un repositorio de prueba sin `openspec/`: `openspec new change` **funciona**, deja
      un `config.yaml` de una sola línea (`schema: spec-driven`), y `openspec instructions` devuelve
      `context` vacío y **cero reglas**
- [x] 1.4 Registrar qué escribe `openspec init`. Dos hallazgos que cambian el diseño: **exige `--tools`**
      —falla sin él, y ofrece unas treinta herramientas— y con `--tools claude` escribe **once
      archivos**: cinco slash commands en `.claude/commands/opsx/`, cinco skills en `.claude/skills/` y
      `openspec/config.yaml`
- [x] 1.5 Registrar cómo queda el `config.yaml` tras `init`: veinte líneas, **todas comentadas salvo
      `schema:`**. Es una plantilla con ejemplos, no una configuración
- [x] 1.6 Comprobar qué recibe el ejecutor **después** de inicializar: `context` vacío y **cero reglas**,
      igual que antes. `init` por sí solo no cambia nada de lo que motivó este change
- [x] 1.7 Comprobar de dónde puede salir la lista de herramientas sin escribirla en el código:
      `openspec init --help` las enumera, y expone además `all` y `none`
- [x] 1.8 Comprobar qué escribe `openspec init --tools none`: **un solo archivo**, `openspec/config.yaml`,
      y nada de ninguna herramienta
- [x] 1.10 Comprobar **para qué sirven** los archivos por herramienta, antes de tratarlos como relleno:
      la skill `openspec-propose` le enseña al ejecutor a pedir `openspec instructions` y declara que
      `context` y `rules` son restricciones para él. Sin ese archivo, el canal está lleno y nadie lo abre
- [x] 1.11 Medir qué tiene instalado cada repositorio. `C:\www\odontoPau`: `.codex/skills/openspec-*`
      con cinco archivos y **sin `.agent/`**, que es donde van los de Antigravity —soportado, con skills
      y workflows—. Explica el caso que abrió este pendiente. `C:\www\gitCronos`: `.agent` con diez,
      `.codex` con cinco, `.opencode` con diez, y **`.claude` sin ninguno**
- [ ] 1.9 **Ale aprueba el juego de reglas base** que se va a sembrar, antes de escribirlo en repositorios
      ajenos

## 2. Evidencia

- [ ] 2.1 Distinguir en el lector "sin `openspec/`" de "con `openspec/` y sin cambios activos"
- [ ] 2.2 Transportar esa distinción en el snapshot, sin que la vista tenga que inferirla de contadores

## 3. Elección de herramienta

- [ ] 3.1 Leer las herramientas disponibles de `openspec init --help`, sin escribirlas en el código
- [ ] 3.2 Ofrecer «ninguna» como opción **no predeterminada**, declarando que deja al ejecutor sin las
      instrucciones que le enseñan a usar el método
- [ ] 3.3 Degradar a sólo «ninguna» si el parseo de la ayuda falla, en vez de quedarse sin opciones
- [ ] 3.4 Enumerar los archivos que cada elección va a escribir, antes de escribirlos

## 4. Reglas base

- [ ] 4.1 Redactar el juego mínimo de reglas base, genérico y sin contexto de gitCronos
- [ ] 4.2 Incluir la numeración jerárquica de tareas y la redacción autosuficiente
- [ ] 4.3 Sembrarlas en el `config.yaml` como parte de la inicialización, porque `init` lo deja
      íntegramente comentado y sin efecto
- [ ] 4.4 Comprobar sobre un repositorio de prueba que `openspec instructions` devuelve esas reglas
      después de inicializar, y pegar la salida en el reporte

## 5. Panel

- [ ] 5.1 Declarar el estado sin OpenSpec en la pantalla de arranque, con su consecuencia nombrada
- [ ] 5.2 Ofrecer la acción de inicializar, con la elección de herramienta y la lista de archivos
- [ ] 5.3 Exigir acción humana explícita, sin preselección que dispare la escritura por descuido
- [ ] 5.4 Informar el error real si la inicialización falla, sin normalizarlo, y releer la evidencia
- [ ] 5.5 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 6. Tests

- [ ] 6.1 Prueba del lector: repositorio sin `openspec/` → estado distinguible del vacío
- [ ] 6.2 Prueba del panel: estado sin OpenSpec declara su consecuencia y ofrece inicializar
- [ ] 6.3 Prueba del panel: repositorio con OpenSpec y sin cambios activos no ofrece inicializar
- [ ] 6.4 Prueba: nada se escribe sin la acción humana
- [ ] 6.5 Prueba: fallo de inicialización informa el motivo real
- [ ] 6.6 Prueba: la inicialización deja el `config.yaml` con reglas, no comentado
- [ ] 6.7 Prueba: sin poder leer la lista de herramientas queda «ninguna» como única opción

## 7. Cierre

- [ ] 7.1 `pnpm exec tsc --noEmit` en cero
- [ ] 7.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 7.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 7.4 `openspec validate offer-openspec-init --strict` válido
- [ ] 7.5 Reporte en `docs/reports/`, con las salidas de las sondas como evidencia
- [ ] 7.6 Ale valida abriendo un repositorio sin OpenSpec y llegando a inicializarlo con reglas
