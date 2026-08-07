## 1. Base y sondas

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Ale eligió: el panel **declara y ofrece** cuando falta inicializar, sin bloquear
- [x] 1.3 Sonda sin `openspec/`: `openspec new change` **funciona**, deja un `config.yaml` de una línea, y
      `openspec instructions` devuelve `context` vacío y cero reglas
- [x] 1.4 Sonda de `openspec init`: exige `--tools` sólo si no detecta nada; con `--tools claude` escribe
      once archivos —cinco slash commands, cinco skills y el `config.yaml`—
- [x] 1.5 El `config.yaml` tras `init` son veinte líneas **todas comentadas** salvo `schema:`
- [x] 1.6 Tras inicializar, `openspec instructions` sigue devolviendo contexto vacío y cero reglas
- [x] 1.7 `openspec init --help` enumera las herramientas, y expone `all` y `none`
- [x] 1.8 `openspec init --tools none` escribe un solo archivo
- [x] 1.9 **`openspec init` detecta solo**: con `.codex`, `.agent` y `.claude` presentes configuró las
      tres sin `--tools`. Cae la lista de herramientas en el panel
- [x] 1.10 `init` **no pisa** el `config.yaml`: se escribió uno con marcas, se re-inicializó y quedó
      idéntico. Confirmado después por hash sobre `odontoPau`
- [x] 1.11 Sin ningún directorio de herramienta, `init` **falla** con «No tools detected». Es el único
      caso en que hay que preguntar, y el que impide bloquear
- [x] 1.12 Las skills son lo que enseña el canal: `openspec-propose` dice «Follow the `instruction` field
      from `openspec instructions`» y que `context` y `rules` son restricciones para el ejecutor
- [x] 1.13 Medir el estado real de los repositorios. `odontoPau` tenía `.codex` y **ningún `.agent/`**;
      se corrigió con `openspec init --tools antigravity` y ahora recibe 957 caracteres de contexto y
      tres reglas

## 2. Evidencia

- [x] 2.1 Distinguir en el lector "sin `openspec/`" de "con `openspec/`" con `openSpecPresent`
- [x] 2.2 Detectar qué directorios de herramienta existen y cuáles tienen skills, en `openspec-tooling.ts`
- [x] 2.3 Transportar ambas cosas en el snapshot con `openSpecPresent` y `openSpecTools`
- [x] 2.4 Que una herramienta desconocida no se reporte como faltante: no reconocerla deja el panel como
      hoy, y eso es preferible a una afirmación falsa

## 3. Panel

- [x] 3.1 Declarar el estado sin OpenSpec en la pantalla de arranque
- [x] 3.2 Mostrar las herramientas del repositorio y cuáles están sin configurar
- [x] 3.3 Declarar lo que falta antes de empezar un cambio, ofreciendo resolverlo y sin impedir seguir
- [x] 3.4 Conservar el objetivo y el slug al inicializar desde ese aviso
- [x] 3.5 Espaciar lo agregado con la escala `--sp-1..--sp-6` de `.dashboard`

## 4. Inicialización

- [x] 4.1 Ejecutar `openspec init` sin `--tools`, para que el CLI detecte
- [x] 4.2 Enumerar los archivos que se van a escribir antes de escribirlos
- [x] 4.3 Exigir acción humana explícita, sin preselección que la dispare por descuido
- [x] 4.4 Pedir que se elija herramienta sólo cuando el comando falle por no detectar ninguna
- [x] 4.5 Informar el motivo real de un fallo, sin normalizarlo, y releer la evidencia

## 5. Tests

- [x] 5.1 Prueba del lector: repositorio sin `openspec/` → estado distinguible
- [x] 5.2 Prueba: herramienta presente sin skills → pendiente de configurar
- [x] 5.3 Prueba: todo configurado → no reclama nada
- [x] 5.4 Prueba del panel: empezar un cambio sin inicializar declara y no bloquea
- [x] 5.5 Prueba del panel: inicializar desde el aviso conserva lo escrito
- [x] 5.6 Prueba: nada se escribe sin la acción humana
- [x] 5.7 Prueba: fallo de inicialización informa el motivo real

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 6.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 6.4 `openspec validate offer-openspec-init --strict` válido
- [x] 6.5 Reporte en `docs/reports/`, con las sondas como evidencia
- [ ] 6.6 Ale valida abriendo un repositorio sin OpenSpec y llegando a inicializarlo
