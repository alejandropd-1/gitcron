# Pipeline — UX de decisiones humanas

> Especificación de producto y contenido para F00, F01, F04 y F05. No es un contrato de transporte
> ni habilita controles por sí sola. F00 cierra el contrato, F01 normaliza los datos, F04 presenta el
> inbox en modo observación y F05 conecta únicamente las acciones soportadas y autorizadas.

## Problema que resuelve

Mostrar eventos, gates, diffs y nombres de agentes no alcanza si la persona no entiende qué le están
pidiendo decidir. Pipeline debe traducir cada solicitud a una decisión concreta:

- qué me piden;
- por qué me lo piden ahora;
- qué evidencia respalda la solicitud;
- qué pasa si digo sí, no o después;
- qué riesgo tiene cada opción;
- dónde puedo ver el detalle técnico.

El objetivo no es ocultar la técnica: es presentar primero una explicación clara y dejar el detalle
sanitizado disponible bajo demanda.

## Contrato conceptual

La forma exacta se cierra en F00. Este modelo evita que F04 improvise contenido desde strings de UI:

```ts
type DecisionKind =
  | 'spec-approval'
  | 'dependency-request'
  | 'protected-diff-approval'
  | 'control-policy-review'
  | 'audit-rejected'
  | 'clarification'
  | 'escalation'
  | 'merge-ready'
  | 'unknown';

type DecisionProvenance = 'runtime' | 'repo' | 'derived' | 'human';
type DecisionRisk = 'low' | 'medium' | 'high' | 'unknown';

type DecisionOption = {
  id: string;
  labelKey: string;
  consequence: string | null;
  capability: string | null;
  available: boolean;
  unavailableReason: string | null;
};

type DecisionRequest = {
  decisionId: string;
  repoId: string;
  changeId: string | null;
  runId: string | null;
  agentId: string | null;
  kind: DecisionKind;
  status: 'pending' | 'answered' | 'expired' | 'unknown';
  title: string;
  summary: string;
  why: string | null;
  options: DecisionOption[];
  risk: DecisionRisk;
  riskReason: string | null;
  riskProvenance: DecisionProvenance | null;
  evidenceRefs: string[];
  technicalContextRef: string | null;
  scopeDigest: string | null;
  provenance: DecisionProvenance;
  requestedAt: string;
  resolvedAt: string | null;
};
```

`risk`, consecuencias y explicaciones no se completan con imaginación. Si ninguna fuente o regla
versionada los respalda, se muestran como `unknown`/“sin datos suficientes”.

## Fuentes y reglas de derivación

| Decisión | Evidencia mínima | Lo que no alcanza por sí solo |
|---|---|---|
| Aprobar spec | request autenticado de Hermes o change OpenSpec esperando aprobación | que exista `proposal.md` |
| Dependencia nueva | constitución/regla C2 aplicable + diff confirmado de manifest/lockfile + paquete identificado | `gates.jsonl` ROJO global |
| Aplicar diff protegido | diff exacto + archivos + digest + regla aplicable; auditor independiente si cambia seguridad/umbrales/baselines/exclusiones | aprobación genérica de “arreglalo” |
| Revisar política de un control | historial comparable con ejecuciones, hallazgos aceptados/falsos positivos y costo humano | una corrida lenta o una opinión aislada |
| Auditor rechazó | reporte/evento de auditor con veredicto y hallazgos correlacionados | texto libre sin identidad de auditor |
| Clarificación | request explícito del agente/runtime con target de repo/run/task | una pregunta encontrada en un log cualquiera |
| Escalada | señal explícita o regla versionada, por ejemplo máximo de fixer loops | inferir frustración por cantidad de tokens |
| Merge listo | gates requeridos satisfechos + auditor aprobado + diff/working tree conocido | `GATES: VERDE` aislado |

Toda decisión derivada incluye referencias a la evidencia y una explicación de la regla aplicada.

## Inbox de decisiones pendientes

Es una zona prioritaria de Pipeline, por encima del feed de actividad. Muestra una decisión por
elemento, ordenada por necesidad humana y no por el último delta recibido.

Cada elemento contiene:

1. **Qué te piden**, en lenguaje claro.
2. **Por qué ahora**, en una o dos líneas.
3. **Opciones**, con consecuencia conocida o “consecuencia no informada”.
4. **Riesgo de la decisión**, con procedencia visible.
5. **Evidencia**, resumida y enlazable.
6. **Contexto técnico expandible**, sanitizado.
7. **Estado de la acción:** informativa, disponible, no soportada o pendiente de F05.

## Separación entre F04 y F05

### F04 — observación

F04 muestra el inbox y permite solamente acciones de navegación/presentación, por ejemplo:

- ver evidencia;
- revisar diff;
- abrir el change;
- copiar una respuesta sugerida;
- abrir Hermes, si existe un deep link seguro.

No responde approvals, no envía prompts, no instala dependencias y no ejecuta merge. Si una opción
todavía no está conectada, explica “Disponible cuando se habilite control supervisado”.

### F05 — control supervisado

F05 puede conectar una opción cuando:

- el Connector negoció la capability;
- el target repo/run/session/agent sigue vigente;
- main valida comando, precondiciones e idempotencia;
- la confirmación explica efecto y riesgo;
- ack y efecto posterior se muestran por separado;
- la acción queda auditada y reconciliada.

“Merge listo” sigue siendo informativo en este track: Ale revisa y ejecuta el merge. No se convierte
automáticamente en un comando Git.

## Glosario técnico → lenguaje claro

Este glosario base usa categorías semánticas, no números C1–C10 universales. Cada repo puede cambiar
sus gates y terminología; Pipeline complementa el glosario desde `OPERADOR.md`, constitución y perfil
del repo, siempre como fuente no confiable que se sanitiza.

| Término técnico | Presentación ES inicial | Cuándo aparece |
|---|---|---|
| gate | control automático | resultado de una comprobación |
| gates verde | todos los controles requeridos informaron OK | cierre de gates |
| gates rojo | uno o más controles fallaron | cierre de gates |
| gates pendiente | hay controles declarados que todavía no están activos | cierre de gates |
| dependency request | quieren agregar una dependencia al proyecto | cambio de manifest confirmado |
| spec / proposal | plan detallado de lo que se va a cambiar | checkpoint de planificación |
| change | bloque de trabajo con nombre | OpenSpec/método |
| task completa/pendiente | paso terminado / paso por hacer | progreso |
| delegación | tarea asignada a una IA concreta | telemetría de agentes |
| auditor decorrelado | una IA de otra familia revisa a la que construyó | auditoría |
| rechazado / aprobado | la revisión encontró problemas / la revisión pasó | veredicto |
| escalada | la IA no puede seguir de forma segura sin una decisión | límite o bloqueo explícito |
| baseline visual | imagen de referencia usada para comparar | QA visual |
| visual diff | comparación automática contra la referencia | QA visual |

Las claves i18n ES/EN/ZH viven en el sistema de traducciones de GitCron. El texto específico de un
repo no se usa como HTML ni como clave dinámica. Los elementos pueden incluir `data-term` para abrir
una explicación estable.

## Plantillas iniciales

### Spec pendiente

- Título: `¿Aprobás el plan de <change>?`
- Por qué: el método requiere tu OK antes de construir.
- F04: `Ver plan`, `Ver evidencia`, `Copiar pedido de cambios`.
- F05, si está soportado: `Aprobar`, `Pedir cambios`, `Después`.

### Dependencia nueva

- Título: `Quieren agregar <dependencia> al proyecto.`
- Por qué: una dependencia se mantiene y actualiza a largo plazo.
- Evidencia: manifest/lockfile y regla aplicable.
- F04: `Ver diff`, `Ver para qué se usaría`.
- F05, si está soportado: `Aprobar`, `Rechazar`, `Pedir alternativa`.

### Auditor rechazó

- Título: `La revisión encontró <n> problemas en <change>.`
- Evidencia: veredicto, hallazgos y archivos afectados.
- F04: `Ver hallazgos`, `Ver diff`.
- F05, si está soportado: `Enviar al fixer`, `Pedir aclaración`, `Después`.

### Diff de zona protegida

- Título: `¿Aprobás aplicar este cambio exacto en <archivos>?`
- Evidencia: diff, digest, alcance, motivo y auditoría independiente cuando corresponda.
- Consecuencia: el agente lo aplica sin cambiar una línea fuera del diff; C3 sigue rojo hasta el
  commit humano.
- F05: `Aprobar este diff`, `Rechazar`, `Pedir cambios`.

### Revisar utilidad de un control

- Título: `El control <nombre> necesita revisión de política.`
- Evidencia: ejecuciones, problemas encontrados, hallazgos aceptados, falsos positivos, espera
  humana, intervenciones, reintentos y tiempo de ciclo.
- Opciones humanas: mantener obligatorio, volver condicional, muestrear o retirar. Pipeline nunca
  cambia la política automáticamente.

### Escalada

- Título: `La IA necesita una decisión para continuar con <tarea>.`
- Evidencia: bloqueo o regla de máximo de intentos.
- Riesgo: solo el informado/derivado por regla; nunca calculado por tono o gasto.

### Listo para revisión humana

- Título: `<change> está listo para tu revisión final.`
- Condición: gates requeridos + auditor aprobado + working tree/diff conocido.
- Acciones: `Revisar diff`, `Ver reporte`, `Después`.
- Ale realiza commit/push/merge según el protocolo vigente.

## Estados vacíos y degradados

- `Todo al día — no hay decisiones esperando. Última actividad: <tiempo>.`
- `Hermes no está conectado — mostramos la evidencia local disponible.`
- `Este repo no usa el kit — no hay gates ni telemetría del método; seguimos mostrando Git,
  Hermes y runtimes disponibles.`
- `La telemetría local no está disponible — puede estar gitignoreada, haberse limpiado o no haberse
  generado todavía.`
- `Hay una solicitud que no podemos traducir con seguridad — mostramos el detalle como desconocido.`

## Accesibilidad y honestidad

- El inbox es una región con heading, no un live region que relee todo por cada delta.
- Nuevas decisiones pueden anunciarse de forma breve y deduplicada.
- Estado, riesgo y disponibilidad no dependen solo del color.
- Teclado y foco vuelven al elemento correcto tras cerrar detalle/confirmación.
- `unknown` se muestra como desconocido, nunca como cero, verde o bajo riesgo.
- Lo derivado se etiqueta y enlaza a su evidencia.
- Payloads, paths, prompts y tareas se sanitizan antes de mostrarse.

## Criterios de aceptación de esta especificación

- F00 cierra el schema y las reglas de procedencia.
- F01 produce decisiones determinísticas desde fixtures y degrada a unknown.
- F04 muestra inbox read-only con empty/degraded states e i18n ES/EN/ZH.
- F05 conecta solo options con capability/precondiciones válidas.
- Ningún repo sin kit pierde el resto de Pipeline.
- Ningún riesgo, consecuencia o decisión se inventa desde prosa ambigua.

## Decisiones UX del operador (2026-07-17, post-cierre astro-migration)

Registradas de la conversacion con Claude tras el primer ciclo completo:

1. **Etapas como cards/solapas clickeables.** Cada change de OpenSpec = una
   carta ("Etapa 1: astro-migration", "Etapa 2: astro-color-tokens"). Grid o
   timeline. Al entrar: resumen, progreso de tasks (43/44), quien hizo que y
   con que modelo (delegations.jsonl), historia de gates (gates.jsonl, con
   los 3 estados VERDE/PENDIENTE/ROJO), reportes del auditor, dolores de la
   bitacora. Fuente de datos: openspec/changes/ + archive/ + docs/ai/logs/.
2. **Las etapas archivadas son inmutables** (registro para "verme en 6
   meses"). Boton "Continuar pendientes" en la carta archivada: junta lo
   diferido (backlog, tareas [MOVED], hallazgos residuales de reports) y
   pre-arma el change siguiente, vinculado visualmente (linaje etapa N ->
   N+1). Jamas se edita una etapa cerrada.
3. **Plan de despacho como pantalla previa al GO:** tabla task -> familia ->
   modelo exacto (default: politica de derivacion v2 de HERMES.md), cada
   fila editable con desplegable para que el operador reasigne antes de
   ejecutar. Al aprobar, se registra y se despacha. Esta pantalla es la
   respuesta a "quiero saber de entrada que IA eligio para que, y poder
   cambiar".
4. **Boton "kickoff" / arranque de una linea:** la UI (o Hermes por texto,
   ya codificado en HERMES.md) arma el contexto sola desde el repo; el
   operador nunca redacta prompts largos. La inteligencia vive en el
   protocolo, no en el prompt del humano.

### Decision UX adicional (2026-07-18): vista "Economia de la etapa"

Cada carta de etapa muestra DONDE SE FUE el tiempo y los tokens, visual:

- **Barra apilada por categoria**: Producto / Infraestructura / Protocolo /
  Desperdicio (el desglose que el cierre T6 registra). El operador ve de un
  vistazo si el dia se fue en el trabajo o en pagar deuda del sistema.
- **Costo por familia de IA**: torta o barras con tokens/USD por familia
  (Claude/Codex/Gemini/local/orquestador), de delegations.jsonl.
- **Velocidad de crucero**: linea comparando duracion vs complejidad entre
  etapas - la tendencia debe BAJAR para changes similares. Vara visible:
  "change simple = horas". Si una etapa rompe la tendencia, la barra de
  categorias explica por que.
- Origen de la decision: el operador tardo un dia en un change de 1h de
  producto (deuda del gate) y no tenia forma de VER donde se fue el tiempo
  sin preguntarle al master. Esta vista elimina esa pregunta.
