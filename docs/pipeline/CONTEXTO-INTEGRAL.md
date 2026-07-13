# Pipeline Dashboard — Contexto integral para una IA nueva

> Documento de orientación general del track Pipeline de GitCron. Su finalidad es permitir que
> una IA que nunca participó de las conversaciones anteriores entienda el problema, la visión, las
> decisiones tomadas, el plan completo y la forma correcta de colaborar, sin reconstruir el proyecto
> desde cero.

## Cómo usar este documento

Este archivo explica el panorama, pero no autoriza por sí solo a implementar. Una IA nueva debe:

1. leer este documento para comprender la intención completa;
2. comprobar el estado actual del repositorio, porque Git y el código pueden haber avanzado;
3. leer `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`;
4. leer [`00-indice.md`](00-indice.md) y
   [`protocolo-ejecucion-agentes.md`](protocolo-ejecucion-agentes.md);
5. recibir de Ale una sola fase autorizada;
6. leer el brief y los reportes prerrequisito de esa fase;
7. anunciar el plan y esperar autorización según el protocolo.

En el momento de redactar este panorama, el track está en etapa de planificación documental. La IA
debe verificar branches, reportes y código antes de afirmar que una fase todavía no comenzó.

## Resumen ejecutivo

GitCron necesita una solapa `Pipeline` por repositorio que funcione como torre de control de los
agentes de inteligencia artificial que trabajan sobre ese repo.

El usuario quiere poder ver, con la menor ambigüedad posible:

- qué tarea se está ejecutando;
- qué agente, runtime, proveedor y modelo la ejecutan;
- qué subagentes existen y cómo se relacionan;
- qué herramientas, comandos y archivos están usando;
- qué razonamiento o thinking fue realmente emitido por el runtime;
- cuánto tiempo, tokens, contexto y dinero consumió el trabajo;
- qué cambió en el repositorio y con qué task se relaciona;
- si el proceso avanza, está esperando, retrocede o entró en un loop;
- qué decisión humana necesita;
- qué controles seguros están disponibles para intervenir.

La solución no consiste en copiar una terminal dentro de GitCron. Debe convertir eventos técnicos
de varios runtimes en un modelo operativo comprensible, contrastarlo con evidencia real del repo y
ofrecer interacción gradual sin convertir el renderer en una consola de comandos arbitrarios.

## Objetivo

Construir una superficie de observabilidad, explicación y control supervisado para trabajo con IA,
aislada por repositorio e integrada conscientemente con Hermes y los runtimes que este coordine.

Al completar el track, una persona debe poder abrir un repo en GitCron y responder rápidamente:

1. “¿Qué está haciendo la IA ahora?”
2. “¿Por qué está haciendo eso?”
3. “¿Qué modelo usa y cuánto está consumiendo?”
4. “¿Qué modificó realmente?”
5. “¿Está progresando o está trabada?”
6. “¿Necesita que yo decida algo?”
7. “¿Puedo pausarla, orientarla o detenerla de manera segura?”

## Misión

Hacer observable y gobernable el trabajo multiagente sin inventar certezas, perder trazabilidad ni
ceder control humano.

Esto implica unir tres clases de información:

- **intención declarada:** lo que Hermes, el agente o el runtime dicen estar haciendo;
- **actividad observable:** tools, comandos, uso, tiempos, eventos y estados de sesión;
- **evidencia del repositorio:** Git, OpenSpec, documentos, reportes, tests, diffs y filesystem.

Cuando estas fuentes coinciden, Pipeline puede mostrar un estado confirmado. Cuando divergen, debe
mostrar la discrepancia. Nunca debe ocultarla ni completar el dato mediante una suposición silenciosa.

## Finalidad de producto

Pipeline busca que el usuario deje de administrar varias IAs como cajas negras independientes. La
experiencia final debe sentirse como una colaboración consciente entre GitCron, Hermes, los agentes
y la persona responsable del repositorio.

La finalidad no es otorgar autonomía ilimitada. Es aumentar la capacidad de supervisión:

- comprender el trabajo sin leer logs interminables;
- intervenir en el momento correcto;
- comparar modelos con evidencia y no con impresiones;
- detectar gasto, repetición o bloqueo temprano;
- conservar un historial explicable;
- mantener decisiones sensibles bajo autorización humana.

## Actores y responsabilidades

### Ale

Es el responsable humano y la autoridad final. Define alcance, aprueba checkpoints, revisa cambios,
decide si una fase está aceptada y realiza stage, commit, push, merge, tag y release.

### GitCron

Es la superficie visual y la fuente de evidencia local. Lee el repo, normaliza eventos, conserva
historial, muestra estado y expone controles tipados. No reemplaza al orquestador.

### Hermes

Es el orquestador consciente. Administra sesiones, agentes, subagentes, modelos y flujos. Informa a
GitCron mediante un conector autenticado y recibe únicamente controles seguros y vinculados a una
sesión/repositorio conocidos.

### Runtimes y proveedores

- **Claude Code:** builder principal sugerido para cambios multiarchivo, Electron e interfaz.
- **Codex:** auditor independiente por defecto; puede ser builder si otra familia lo audita.
- **Antigravity (`agy`):** scout, spike acotado o builder alternativo cuando exista una salida
  integrable comprobada.
- **OpenCode:** builder alternativo y candidato fuerte para integración estructurada mediante
  sesiones, JSON y ACP.
- **LM Studio:** proveedor local y herramienta de extracción/clasificación mecánica; no es un
  orquestador ni el auditor final.

Estos roles son recomendaciones, no verdades eternas. Cada fase debe verificar versiones,
capabilities y modelos reales antes de depender de ellos.

## Relación consciente entre GitCron y Hermes

Hermes y GitCron tienen responsabilidades diferentes y complementarias:

```text
Ale
 │ conversa, decide y autoriza
 ▼
Hermes
 │ crea y coordina runs, agentes, subagentes, tasks y modelos
 │ emite eventos y recibe controles permitidos
 ▼
Hermes Connector en GitCron
 │ autentica, negocia versión/capabilities y normaliza
 ▼
PipelineCoordinator
 │ correlaciona repo/change/task/run/session/agent
 ├─────────────── evidencia de Git/OpenSpec/docs/files/tests
 ▼
PipelineStore + PipelineWorkspace
 │ historial, estado actual, explicaciones, métricas y controles
 ▼
Ale observa, compara, interviene y valida
```

“Conexión consciente” significa que ambas partes conocen explícitamente:

- qué repo está vinculado;
- qué sesión y corrida se observan;
- qué agente y task originaron un evento;
- qué versión de protocolo hablan;
- qué capacidades están realmente disponibles;
- qué comandos acepta el runtime y cuáles no;
- qué resultados fueron confirmados por evidencia local.

No alcanza con inferir la relación por el directorio de trabajo o por texto de terminal.

## Experiencia de usuario esperada

La solapa Pipeline pertenece al repo activo. Cada repo conserva su propio vínculo, estado,
presupuesto, modelos, sesiones e historial.

La pantalla debe priorizar siete zonas conceptuales:

1. **Ahora:** estado actual, tarea, agente/modelo, tiempo, costo y necesidad humana.
2. **Camino del cambio:** proposal, spec, tasks, implementación, gates, auditoría y cierre.
3. **Árbol de agentes:** agente principal, subagentes, roles, modelos y estado.
4. **Bitácora operativa:** objetivo, hipótesis declarada, acción, observación y próximo paso.
5. **Economía y contexto:** tokens, costo, tiempo, ventana de contexto y compresiones.
6. **Evidencia:** archivos, diffs, comandos, tools, tests, reportes y decisiones.
7. **Control:** pausa, steer, cola, interrupt, approvals y cancelación según capability y riesgo.

Los estados vacíos o degradados también son parte del producto: repo sin scaffold, Hermes ausente,
runtime incompatible, sesión desconectada, uso desconocido, razonamiento no emitido o costo no
calculable deben explicarse honestamente.

## Qué significa “ver lo que piensa la IA”

No todos los modelos o runtimes exponen reasoning literal. Pipeline separa:

- `reasoning/thinking emitido`: contenido que la fuente entregó explícitamente;
- `bitácora operativa`: objetivo, acción y observación construidos desde eventos verificables;
- `explicación derivada`: síntesis posterior basada en evidencia citada;
- `desconocido/no disponible`: cuando la fuente no expone el dato.

Una inferencia de GitCron nunca puede etiquetarse como pensamiento privado del modelo. Además, el
reasoning crudo puede contener información sensible: su captura debe minimizarse, ser configurable y
tener una política de retención clara.

## Tokens, costo, tiempo y contexto

Cada cifra debe incluir procedencia. Pipeline no debe mostrar `0` cuando en realidad no hay datos.

### Tokens

Cuando la fuente lo permita, separar input, output, cache y reasoning. Evitar double-count entre
agente padre, subagentes, reintentos y totales agregados del proveedor.

### Costo

Clasificar como:

- real informado por proveedor/runtime;
- estimado con pricing y timestamp;
- incluido en una suscripción;
- local, por ejemplo LM Studio;
- desconocido.

“Local” no significa gratis: significa que Pipeline no inventa un costo USD por electricidad o
hardware que no puede medir.

### Tiempo

Separar duración de pared, tiempo activo, espera humana, espera de tools, retry y pausa cuando los
eventos permitan hacerlo.

### Contexto

Distinguir ventana máxima del modelo, contexto actualmente usado, tokens acumulados históricos y
compresiones/resúmenes. Cada valor será `medido`, `estimado` o `desconocido`.

## Selección de modelos

La configuración debe poder resolverse por:

```text
default de Hermes/runtime
  < perfil del repo
  < política del rol
  < override del change
  < override de la task
  < override explícito de una corrida
```

Pipeline debe mostrar el modelo solicitado, el efectivamente resuelto y el reportado por el runtime.
Cambiar un modelo no debe hacer hot-swap en medio de una llamada. El cambio se aplica a la próxima
unidad segura o requiere interrumpir, revisar el diff y reanudar.

Builder y auditor deben pertenecer a familias diferentes, incluso si un fallback cambia el modelo.

## Interactividad y modelo de control

El control se implementa después de lograr observabilidad confiable. Las acciones previstas son:

- pausar y reanudar cuando el runtime lo soporte;
- enviar steer/instrucción al próximo punto seguro;
- encolar una instrucción;
- interrumpir una tarea o agente;
- solicitar/aceptar/rechazar approvals explícitos;
- cancelar una corrida;
- controlar únicamente procesos registrados y owned.

Cada control necesita target per-repo, sesión/agente válido, idempotencia, confirmación acorde al
riesgo, audit log, ack separado del efecto y reconciliación posterior.

Detener no significa deshacer. Luego de una interrupción, Pipeline debe refrescar el working tree,
mostrar archivos parciales y permitir que la persona decida. Nunca debe ejecutar rollback silencioso.

## Arquitectura técnica prevista

```text
PipelineWorkspace (renderer, repo activo)
  └─ window.api.pipeline.*
       └─ preload: API mínima, tipada y allowlisted
            └─ Electron main
                 ├─ PipelineCoordinator
                 ├─ HermesConnector
                 ├─ RuntimeAdapters
                 │    ├─ Hermes
                 │    ├─ Claude Code
                 │    ├─ Codex CLI
                 │    ├─ Antigravity / agy
                 │    ├─ OpenCode
                 │    └─ LM Studio
                 ├─ RepoEvidenceReader
                 ├─ PipelineCommandBus
                 └─ PipelineStore SQLite per-repo
```

Decisiones centrales:

- conexiones, secretos, procesos y filesystem viven en Electron main;
- preload expone métodos concretos, no shell/argv/PID libres;
- renderer no posee tokens ni sockets privilegiados;
- persistencia global particionada por identidad de repo;
- parsers y reducers puros, determinísticos y testeables;
- protocolo versionado con capability negotiation;
- backpressure/batching para streams de alta frecuencia;
- degradación explícita cuando un runtime no ofrece una capability.

## Identidad y eventos

Toda observación útil debe poder correlacionarse con:

```text
repo → change → task → run → session → agent → parent agent → runtime/model
```

Los eventos convergen en un sobre versionado con identificador, secuencia, timestamp, identidad,
tipo, fuente, payload y procedencia. Las procedencias principales son:

- `runtime`: informado directamente por Hermes/proveedor/CLI;
- `repo`: observado en Git/OpenSpec/filesystem/tests;
- `derived`: inferido de reglas transparentes;
- `human`: decisión o acción de Ale.

El contrato exacto no se congela hasta F00, luego de capturar fixtures reales.

## Estrategia para lograrlo

El track reduce riesgo mediante una progresión deliberada:

```text
contratos verificados
  → evidencia local per-repo
  → conexión Hermes read-only
  → adaptadores de runtimes
  → workspace visual
  → controles supervisados
  → modelos, presupuesto y contexto
  → replay e inteligencia
  → hardening y release
```

No se construyen controles antes de confiar en identidad y eventos. No se comparan modelos antes de
tener datos. No se predice antes de auditar la calidad de la muestra.

## Plan completo por fases

### F00 — Contrato, seguridad y spikes

Verifica las interfaces reales de Hermes, Claude, Codex, `agy`, OpenCode y LM Studio. Captura
fixtures, define identidad/eventos/métricas/capabilities/comandos y decide el protocolo de conexión,
autenticación, versionado y degradación. Es audit-only y no implementa la feature.

Brief: [`fase-00-contrato-y-spikes.md`](fase-00-contrato-y-spikes.md).

### F01 — Modelo y evidencia por repositorio

Construye los tipos, parsers, reducer, lector de evidencia y persistencia SQLite per-repo. Debe
entender OpenSpec, Git, docs, reportes, tests, archivos y repos sin scaffold, sin UI ni red.

Brief: [`fase-01-modelo-y-evidencia-repo.md`](fase-01-modelo-y-evidencia-repo.md).

### F02 — Conector Hermes de solo observación

Implementa la conexión autenticada desde Electron main, negociación de versión/capabilities,
vínculo explícito por repo, normalización de eventos, reconexión, dedupe y cleanup. Todavía no envía
prompts ni controles.

Brief: [`fase-02-hermes-connector-readonly.md`](fase-02-hermes-connector-readonly.md).

### F03 — Adaptadores y telemetría

Normaliza Hermes, Claude Code, Codex CLI, Antigravity, OpenCode y LM Studio. Cada adaptador declara
honestamente qué puede observar/controlar, conserva procedencia y degrada campos ausentes. No se
permite parsing frágil de prosa ni paridad ficticia.

Brief: [`fase-03-adaptadores-y-telemetria.md`](fase-03-adaptadores-y-telemetria.md).

### F04 — Workspace Pipeline por repo

Construye la solapa y sus estados con markup semántico, accesibilidad, i18n ES/EN/ZH, fixtures y
evidencia visual. Muestra “Ahora”, camino, agentes, actividad, economía, contexto y diffs. Los agentes
no escriben CSS: Ale realiza la piel visual.

Brief: [`fase-04-workspace-pipeline-ui.md`](fase-04-workspace-pipeline-ui.md).

### F05 — Control supervisado

Agrega command bus tipado y acciones seguras de pausa, steer, queue, interrupt, approvals y
cancelación. Incluye state machines, threat model, confirmaciones, audit log, reconciliación y pruebas
adversariales cross-repo.

Brief: [`fase-05-control-supervisado.md`](fase-05-control-supervisado.md).

### F06 — Modelos, presupuestos y contexto

Agrega catálogo vivo, selección por repo/rol/task, fallbacks, decorrelación builder/auditor,
presupuestos, tokens, costos, duración y salud de contexto. Nunca cambia configuración global o carga
modelos locales automáticamente.

Brief: [`fase-06-modelos-presupuestos-contexto.md`](fase-06-modelos-presupuestos-contexto.md).

### F07 — Replay e inteligencia operativa

Permite reproducir corridas sin side effects, detectar loops mediante reglas explicables, estimar
tiempo/costo con intervalos y comparar modelos por outcomes. Las narraciones deben citar evidencia y
las muestras insuficientes deben declararse como tales.

Brief: [`fase-07-inteligencia-replay.md`](fase-07-inteligencia-replay.md).

### F08 — Hardening y preparación de release

Congela contratos, corrige seguridad/privacidad/resiliencia/performance, prueba runtimes ausentes y
app empaquetada, valida E2E, sincroniza documentación y prepara un release candidate. No agrega
features. Ale hace tag y publicación.

Brief: [`fase-08-hardening-y-release.md`](fase-08-hardening-y-release.md).

## Riesgos principales

- vincular una sesión al repo equivocado y ejecutar controles cross-repo;
- exponer credenciales o reasoning sensible en renderer, logs o SQLite;
- afirmar costo, contexto o pensamiento que la fuente no informó;
- depender de stdout humano, HTML o protocolos privados inestables;
- duplicar eventos o usage durante reconnect/retry;
- cortar procesos que GitCron no creó;
- confundir ack de un comando con efecto confirmado;
- bloquear Electron con streams, diffs o historiales grandes;
- comparar modelos con muestras pequeñas o cohorts incompatibles;
- permitir que un agente sea constructor y auditor de su propio trabajo;
- expandir el scope de una fase por deuda heredada.

## Principios no negociables

- aislamiento per-repo real;
- evidencia antes que suposición;
- primero observar, después controlar;
- procedencia visible para datos medidos, estimados y derivados;
- secretos y procesos únicamente en main;
- comandos tipados y allowlisted;
- stop no es rollback;
- builder y auditor de familias distintas;
- compatibilidad degradada antes que una capability inventada;
- checkpoints y autorización humana en decisiones sensibles;
- los agentes no hacen stage, commit, push, merge, tag ni release;
- los agentes no modifican CSS salvo autorización explícita de Ale.

## Fuera de alcance del track

- reemplazar Hermes por un segundo orquestador dentro de GitCron;
- mostrar o reconstruir pensamiento privado que el modelo no emitió;
- ofrecer una terminal arbitraria desde el renderer;
- hacer rollback automático al detener un agente;
- autoaprobar specs, auditorías, merges o releases;
- gestionar API keys o credenciales desde Pipeline;
- instalar/actualizar runtimes o descargar modelos sin permiso;
- declarar un “mejor modelo” solamente por tokens o precio;
- entrenar inicialmente un modelo predictivo complejo;
- realizar cambios visuales CSS por parte de los agentes del track.

## Gobierno de la implementación

Cada fase tiene su propia rama `pipeline/fase-NN-<slug>` y se ejecuta por tandas. Antes de trabajar,
el agente declara IA/runtime/modelo/rol, resume objetivo y scope, anuncia las tandas y pide permiso.

Los checkpoints son paradas reales. El agente no interpreta silencio como aprobación. Debe pedir un
nuevo OK cuando aparece una decisión arquitectónica, costo, dependencia, configuración, borrado,
control real, riesgo difícil de revertir o expansión de scope.

Al finalizar una fase, ejecuta las validaciones correspondientes y entrega a Ale:

- resumen y archivos cambiados;
- resultados de typecheck, tests, fallow y QA aplicables;
- reporte y evidencia visual;
- rama y `git status --short`;
- mensaje de commit sugerido;
- comandos sugeridos para stage, commit y push, sin ejecutarlos;
- STOP sin comenzar la siguiente fase.

El protocolo vinculante completo está en
[`protocolo-ejecucion-agentes.md`](protocolo-ejecucion-agentes.md). Para coordinar con Hermes se usa
[`prompt-maestro-hermes.md`](prompt-maestro-hermes.md).

## Criterio de éxito global

El track está completo cuando una corrida multiagente puede observarse y comprenderse por repo de
punta a punta, con identidad consistente, telemetría honesta, diffs/evidencia, costos/contexto con
procedencia, controles seguros y un historial reproducible.

Además:

- no hay controles cross-repo ni secretos expuestos;
- los runtimes ausentes o incompatibles degradan sin romper GitCron;
- las acciones humanas y automáticas quedan auditadas;
- la app dev y empaquetada funcionan en Windows;
- la UI explica estados desconocidos y consecuencias de detener;
- las comparaciones y estimaciones declaran muestra e incertidumbre;
- documentación, i18n y seguridad quedan sincronizadas;
- no quedan hallazgos P0/P1 abiertos para el release candidate.

## Ejemplo de recorrido final

1. Ale abre un repositorio en GitCron y entra a Pipeline.
2. GitCron muestra si el repo está vinculado a Hermes y sus capabilities.
3. Hermes inicia un builder Claude para una task y registra modelo/rol.
4. Pipeline muestra agente, subagentes, tools, archivos, tiempo, tokens y contexto disponibles.
5. Git y OpenSpec confirman qué task y archivos cambiaron.
6. Los gates fallan; Pipeline muestra el error y el retorno a fixer.
7. El auditor Codex, de otra familia, emite hallazgos y un veredicto.
8. Si el proceso repite el mismo error o gasta sin progreso, Pipeline lo señala con evidencia.
9. Ale puede pausar o enviar una instrucción al punto seguro si la capability existe.
10. Al interrumpir, GitCron muestra el diff parcial; no lo revierte.
11. La corrida termina con reporte, métricas, decisiones e historial reproducible.
12. Ale revisa y decide commit, push y merge.

## Instrucción de arranque para una IA nueva

Una IA que reciba este documento debe comenzar respondiendo, sin editar:

```text
Entendí que Pipeline será una torre de control per-repo para observar y controlar de forma
supervisada a Hermes y sus runtimes, contrastando sus eventos con evidencia local de GitCron.

Antes de implementar voy a verificar:
- estado actual de Git y fases ya cerradas;
- fuente de verdad e invariantes;
- protocolo común de agentes;
- brief y prerrequisitos de la única fase autorizada;
- runtime/modelo/rol con el que estoy operando.

Después presentaré rama, tandas, checkpoints, riesgos y alcance de la primera acción read-only.
No crearé la rama ni haré escrituras hasta recibir autorización. No ejecutaré stage, commit, push,
merge, tag ni release.
```

Si la IA no puede confirmar la fase autorizada o encuentra una contradicción entre documentación y
repositorio, debe detenerse, mostrar evidencia y pedir dirección. No debe inventar continuidad.
