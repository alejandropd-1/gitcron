## 1. Qué usa la aplicación hoy

- [ ] 1.1 Enumerar los comandos de OpenSpec que GitCron ejecuta y verificar cuáles siguen
  existiendo en la versión instalada, con `openspec --help` y el `--help` de cada subcomando. La
  medición del 2026-09-02 dio nueve comandos, los nueve existentes: el desfase no es de comandos
  rotos.
- [ ] 1.2 Enumerar qué campos del JSON de `openspec instructions` consume la aplicación y cuáles
  ignora. Al 2026-09-02 consumía `.state` y `.tasks`, e ignoraba `context`, `operationGuidance`,
  `contextFiles` e `instruction`.
- [ ] 1.3 Enumerar lo que la herramienta agregó entre la versión contra la que se escribió el ciclo
  y la instalada, y marcar qué usa la aplicación de cada cosa. Al 2026-09-02: `--diff`,
  `--archived`, `opsx-update`, `templates`, `workset`, `schemas` y `operationGuidance`, ninguno en
  uso.

## 2. La instrucción sale del motor

- [ ] 2.1 Reemplazar `composeProposeInstruction` por el consumo de la instrucción que devuelve el
  motor para esa operación. Lo que la aplicación agrega encima es el objetivo y el alcance que
  escribió la persona, no una lista de comandos.
- [ ] 2.2 Lo mismo con `composeApplyInstruction`, `composeArchiveInstruction` y
  `composeExploreInstruction`, en `components/pipeline/pipeline-next-action.ts`.
- [ ] 2.3 Entregar al ejecutor el `context` y el `operationGuidance` que vienen en la misma
  respuesta.
- [ ] 2.4 Un fallo del motor —o un estado bloqueado— informa el motivo real y no arranca ninguna
  sesión.
- [ ] 2.5 Pruebas: la instrucción entregada contiene lo que devolvió el motor; un motor que falla
  no arranca nada; una regla nueva en el `config.yaml` llega al ejecutor sin tocar la aplicación.

## 3. Lo que la versión nueva ya trae

- [ ] 3.1 `openspec show <change> --diff` para mostrar qué altera un change, donde hoy se lee el
  artefacto entero.
- [ ] 3.2 `openspec validate --archived` antes de archivar, para no cerrar un change con tareas sin
  marcar. Al 2026-09-02 el repositorio tenía 16 changes archivados que no lo pasan, todos
  archivados con la tarea de revisión visual pendiente.
- [ ] 3.3 Evaluar `opsx-update` —revisar el plan de un change sin tocar código— y declarar si
  reemplaza algo que la aplicación hace a mano o si queda fuera de alcance.
- [ ] 3.4 Declarar qué se hace con `templates`, `workset` y `schemas`: se usan, o se declara por
  qué no.
- [ ] 3.5 Comprobar que cada bloque `## MODIFIED Requirements` de un change apunte a un requisito
  que exista en la spec consolidada, y avisarlo antes del archivado. Caso real del 2026-09-02:
  `add-opencode-runtime` declaraba `MODIFIED` sobre «Factory de adaptador con ejecutable resuelto
  por el hub», un requisito que no existía —era nuevo y correspondía `ADDED`—. **`openspec validate
  --strict` daba válido igual**: esa correspondencia no se comprueba. El error apareció recién al
  archivar, que es el último paso posible, con el change escrito un mes antes y ya fusionado a
  `main`. Verificar primero si el CLI lo cubre con algún comando: si lo cubre se usa, y si no, lo
  comprueba la aplicación antes de ofrecer el archivado.

## 4. El formulario declara qué hace

- [ ] 4.1 Cada campo indica dónde termina su contenido: qué crea una carpeta o una rama, qué es
  texto que sólo lee el ejecutor, y qué no se guarda en ningún archivo.
- [ ] 4.2 Ninguna escritura en Git ocurre desde un control que no la nombra. Se decide entre pedir
  confirmación, corregir el rótulo, o mover la creación de la rama al lanzamiento; la decisión se
  declara con su motivo.
- [ ] 4.3 Pruebas de lo que se decida en 4.2.

## 5. La versión deja de ser un supuesto

- [ ] 5.1 Declarar en la aplicación contra qué versión de OpenSpec está escrito el ciclo.
- [ ] 5.2 Informar cuando la versión instalada supera a la declarada, para que el desfase se vea.

## 6. Revisión visual

- [ ] 6.1 El ciclo se opera de punta a punta desde la aplicación: proponer, elegir runtime,
  implementar y archivar, sin que el formulario mienta sobre lo que escribe. **La comprueba
  Alejandro.**

## 7. Cierre

- [ ] 7.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [ ] 7.2 `pnpm exec tsc --noEmit` en cero.
- [ ] 7.3 `pnpm test` en verde.
- [ ] 7.4 `pnpm exec eslint` limpio sobre lo tocado.
- [ ] 7.5 `openspec validate actualizar-ciclo-sdd-a-openspec-1-11 --strict` en cero.
- [ ] 7.6 Releer `gestionar-ciclo-openspec-desde-gitcron` y declarar cuáles de sus 53 tareas
  quedaron cubiertas por lo que la herramienta ya trae. **Es el motivo de haber hecho este change
  primero.**
