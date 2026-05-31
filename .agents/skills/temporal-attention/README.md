<!--
  README de orientación para la skill temporal-attention.
  Para vos (Alejandro) cuando vuelvas en una semana y no quieras reconstruir
  toda la conversación en la cabeza. Bilingüe: español primero.
-->

# temporal-attention — Cómo funciona esta carpeta

## Qué hay acá

```
.agents/skills/temporal-attention/
├── SKILL.md                              ← la skill (enfoca al agente)
├── README.md                             ← este archivo
└── references/
    ├── FORECASTING-DOCTRINE.md           ← los 7 principios de pronóstico (bilingüe)
    └── CONTEXT-FEEDBACK-FORMAT.md        ← cómo se guarda y reinyecta el aprendizaje
```

## La idea en una frase

Estos archivos **no hacen nada solos**. Son documentos que se *leen*. La pregunta
clave es siempre: **¿quién los lee?** Hay dos lectores muy distintos.

## Los dos lectores (esto es lo importante)

### Lector 1 — El agente que te ayuda a programar GitCron
*(Claude Code, Codex, Gemini CLI, etc. — cuando vos estás escribiendo código.)*

- Lee el `SKILL.md` **automáticamente**, sin que tengas que hacer nada.
- Funciona **hoy mismo**: con solo tener esta carpeta en `.agents/skills/`, el
  agente la detecta cuando trabajás en temas de pronóstico/timeline.
- **No necesita código.** Es igual que tus otras skills (accessibility, html…).

### Lector 2 — El Temporal Agent DENTRO de GitCron
*(La feature que dibuja ramas especulativas en el grafo cronométrico — Feature B.)*

- Estos archivos son **datos que tu app tiene que leer y mandarle a la IA.**
- Una skill en `.agents/skills/` **NO se ejecuta sola dentro de tu app.** Tu
  código (`electron/ai/predict.ts`) tiene que abrir el archivo, leerlo y pegarlo
  en el prompt. Eso lo hacen las funciones `loadSkillText()` y
  `loadDoctrineText()`.
- Funciona **cuando la Feature B esté conectada al proveedor de IA** (la fontanería
  pendiente).

### Tabla rápida

| | Agente que programa | Temporal Agent (app) |
|---|---|---|
| ¿Lee el SKILL.md? | Sí, automático | Solo si `predict.ts` lo carga |
| ¿Necesita código? | No | Sí (`loadSkillText`) |
| ¿Funciona hoy? | Sí | Cuando termine Feature B |
| ¿Le sirve la doctrina? | Poco | Mucho (va al prompt de predicción) |

## Qué hace cada archivo

- **`SKILL.md`** — La doctrina operativa: el agente razona solo sobre la
  *trayectoria* del repo, estima entropía primero, propone 3-6 ramas
  especulativas calibradas. Define el contrato de salida (JSON `PredictionResult`).
- **`references/FORECASTING-DOCTRINE.md`** — Los 7 principios de pronóstico, con
  fuentes reales (Shannon, Tetlock, ECMWF/Lorenz, Bass, Dosi, Schwartz). Bilingüe.
  El Principio 7 (entropía) es el culminante: confianza = inverso de la entropía.
- **`references/CONTEXT-FEEDBACK-FORMAT.md`** — Cómo se guarda lo que el usuario
  acepta/rechaza (en `userData`, no en el repo) y cómo eso se reinyecta en el
  próximo análisis para que el agente afine su foco con el tiempo.

## De dónde viene el formato (por las dudas)

El **formato** (frontmatter + body + `references/`) es el estándar de Anthropic,
el mismo que ya usás en tus otras skills y el mismo de skills.sh / autoskills /
fallow-skills. El **contenido** es propio de GitCron — la filosofía está inspirada
en herramientas probadas (fallow, CodeGraph: "mapeá antes de leer"), pero ningún
texto fue copiado de ellas.

## Si querés publicarla algún día

Como respeta el formato estándar, esta skill es publicable tal cual: la empujás a
un repo y queda instalable con `npx skills add tu-usuario/tu-repo`. No es
necesario, pero la puerta queda abierta.

---

# 🇬🇧 How this folder works

## The one-sentence idea

These files **do nothing on their own**. They are documents that get *read*. The
key question is always: **who reads them?** There are two very different readers.

## The two readers

### Reader 1 — The agent that helps you build GitCron
*(Claude Code, Codex, Gemini CLI — while you write code.)*
- Reads `SKILL.md` **automatically**, no setup.
- Works **today**: just having this folder in `.agents/skills/` is enough.
- **No code needed.** Same as your other skills.

### Reader 2 — The Temporal Agent INSIDE GitCron
*(The feature that draws speculative branches — Feature B.)*
- These files are **data your app must read and send to the AI.**
- A skill in `.agents/skills/` **does NOT run itself inside your app.** Your code
  (`electron/ai/predict.ts`) opens, reads, and injects it via `loadSkillText()`
  and `loadDoctrineText()`.
- Works **once Feature B is wired to the AI provider.**

| | Coding agent | Temporal Agent (app) |
|---|---|---|
| Reads SKILL.md? | Yes, automatic | Only if `predict.ts` loads it |
| Needs code? | No | Yes (`loadSkillText`) |
| Works today? | Yes | When Feature B ships |
| Doctrine useful? | A little | A lot (goes into the prediction prompt) |

## Format vs content

The **format** is Anthropic's standard (same as your other skills and as
skills.sh / autoskills / fallow-skills). The **content** is GitCron-specific —
its philosophy is inspired by proven tools (fallow, CodeGraph: "map before you
read"), but no text was copied from them.
