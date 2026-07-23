# Pipeline — Protocolo de ejecución para cualquier agente

> Este protocolo es obligatorio aunque el ejecutor sea Hermes, Claude Code, Codex, Antigravity
> (`agy`), OpenCode, LM Studio u otra IA. El agente no debe asumir que conoce conversaciones,
> decisiones o resultados de agentes anteriores.

## Contexto mínimo que debe reconstruir

Antes de proponer cambios, el agente debe leer, en este orden:

1. `docs/00_FUENTE_DE_VERDAD.md`.
2. `docs/01_INVARIANTES.md`.
3. `docs/pipeline/00-indice.md`.
4. `docs/pipeline/protocolo-ejecucion-agentes.md`.
5. `docs/pipeline/00-estado-track.md`.
6. El prompt autónomo y solamente el brief de la fase autorizada.
7. Los reportes de fases anteriores que el brief declare como prerrequisito.

Después debe inspeccionar el estado real del repositorio. Los documentos orientan, pero el código,
Git, los tests y las interfaces instaladas son la evidencia actual. No debe confiar en memoria de
otra IA ni pedirle al usuario que repita información que pueda verificar localmente.

## Inicio y nivel de ceremonia

El agente no debe empezar silenciosamente. Su primera respuesta debe indicar:

- identidad declarada: IA, runtime, modelo y rol (`scout`, `planner`, `builder`, `auditor` o
  `fixer`; `orchestrator` solo para Hermes);
- fase solicitada, objetivo comprendido y cosas fuera de scope;
- prerrequisitos comprobados y estado actual de Git, sin mostrar secretos;
- rama exacta que corresponde a la fase;
- tandas que propone ejecutar, qué resultado deja cada una y sus checkpoints;
- riesgos, operaciones pagas o decisiones todavía abiertas;
- qué hará antes de volver a detenerse.

Luego clasifica la ejecución y pide una sola autorización de alcance:

- **ligera:** cambio acotado, reversible, sin zona protegida ni límites de seguridad;
- **normal:** varios archivos o impacto transversal sin cambiar límites de seguridad;
- **crítica:** zona protegida, seguridad, umbrales, baselines, exclusiones, dependencias, secretos,
  acciones destructivas, publicación o control real de agentes/procesos.

La señal más riesgosa manda. Hasta recibir autorización solo puede hacer reconocimiento read-only.
Una vez autorizada, los pasos mecánicos declarados no requieren un nuevo OK. Debe detenerse si
cambia alcance/riesgo, aparece costo no aprobado o una decisión reservada al humano.

## Rama de trabajo

Tras el OK humano, el agente debe:

1. comprobar que no pisará cambios locales ni una rama ajena;
2. partir de `main` y crear/cambiar a la rama indicada por el brief,
   `pipeline/fase-NN-<slug>`;
3. detenerse y avisar si `main` no está disponible/actualizada, si la rama ya existe con historia
   inesperada o si el working tree contiene cambios que se solapan;
4. nunca usar `reset --hard`, descartar, stashear, rebasear o borrar trabajo sin permiso.

El agente puede crear la rama autorizada. **No puede ejecutar `git add`, `git commit`, `git push`,
merge, tag ni release:** esas operaciones las realiza Ale.

## Antes de cada tanda

Antes de empezar una tanda, el agente debe anunciar brevemente:

- `Fase NN / TANDA N — <nombre>`;
- objetivo y archivos/áreas que espera tocar;
- validación prevista;
- si requiere o no un nuevo OK.

Debe pedir autorización y esperar cuando:

- el brief marca `CHECKPOINT` o `Esperar OK`;
- empieza la primera tanda con escrituras y todavía no existe autorización de alcance vigente;
- cambia el scope acordado o aparece una decisión arquitectónica;
- agregaría dependencias, migraciones, configuración, acceso a red o inferencias pagas;
- ejecutaría procesos/control real de agentes o una acción difícil de revertir;
- propone borrar, mover o reescribir archivos;
- los tests revelan un problema fuera de la fase.

Puede continuar sin un nuevo OK entre todas las tandas/pasos mecánicos cubiertos por la misma
autorización, sin cambiar alcance, riesgo ni costo. Un checkpoint genérico no obliga a detenerse si
el nivel ligero/normal y la autorización ya cubren la decisión; checkpoints críticos y decisiones
humanas reservadas sí detienen.

En zona protegida, el humano aprueba el diff exacto y un agente puede aplicarlo. Cualquier cambio de
archivo o contenido invalida esa autorización. C3 permanece rojo hasta el commit humano. Seguridad,
umbrales, baselines y exclusiones requieren auditoría independiente antes de la aprobación.

## Cierre de cada tanda

El agente debe informar:

- qué completó y qué quedó pendiente;
- archivos y contratos cambiados;
- checks ejecutados y resultado;
- riesgos, deuda o desvíos encontrados;
- próxima tanda y si necesita autorización para comenzarla.

No debe presentar una tanda como aprobada por el solo hecho de que compile.

## Cierre obligatorio de la fase

Al terminar, el agente debe detenerse sin iniciar la fase siguiente y entregar:

1. resumen funcional de lo implementado;
2. lista de archivos creados/modificados/eliminados;
3. validaciones ejecutadas, comandos y resultados;
4. reporte y evidencia visual, si aplican;
5. estado de `git status --short` y nombre de la rama;
6. asuntos pendientes y decisiones para QA;
7. **mensaje de commit sugerido**, listo para copiar;
8. **comandos sugeridos**, pero no ejecutados, para que Ale revise, haga commit y push.

El reporte se guarda como `docs/reports/YYYY-MM-DD-pipeline-fase-NN-<slug>.md` y sigue
`docs/pipeline/PLANTILLA-REPORTE-FASE.md`. También se actualiza `00-estado-track.md` a `Lista para
QA` o `Bloqueada`; solo Ale puede confirmar `Completada`.

Formato de cierre:

```text
FASE NN LISTA PARA TU QA
Rama: pipeline/fase-NN-<slug>
Estado: lista | lista con observaciones | bloqueada
Validaciones: <resumen verificable>
Commit sugerido: <tipo>(pipeline): <descripción concreta>
Comandos sugeridos (NO ejecutados):
  git status --short
  git diff --check
  git add <archivos de la fase>
  git commit -m "<mensaje sugerido>"
  git push -u origin pipeline/fase-NN-<slug>
STOP: espero tu QA, commit y push. No inicio Fase NN+1.
```

Si la fase no está realmente terminada, no debe sugerir un commit como si lo estuviera: debe
marcar `BLOQUEADA` y explicar qué autorización o evidencia falta.
