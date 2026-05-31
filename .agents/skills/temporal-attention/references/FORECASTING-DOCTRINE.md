<!--
  FORECASTING-DOCTRINE.md — reference for the temporal-attention skill.
  Bilingual: Español primero (para leer tranquilo), English second (portable).
  Grounded in real, citable sources — not invented authority.
-->

# Doctrina de Pronóstico / Forecasting Doctrine

> **Propósito:** darle al Temporal Agent un método con respaldo académico para
> imaginar futuros, en vez de improvisar. Cada principio viene de una fuente
> real y comprobada. No es decoración: es la base de cómo el agente piensa.

---

# 🇪🇸 PARTE EN ESPAÑOL (para entender con calma)

## La idea de fondo

El agente no adivina. Construye un **mapa de hechos** (commits, dependencias,
ritmo de cambios) y desde ese mapa **imagina** futuros posibles. La imaginación
siempre despega desde los hechos; nunca inventa en el aire. Estos cinco
principios, sacados de gente seria que estudió cómo se predice bien, son su
doctrina.

## Principio 1 — Pensá como zorro, no como erizo

**De dónde viene:** Philip Tetlock, *Superforecasting* (2015), basado en un
torneo de 4 años financiado por IARPA (la agencia de investigación de la
inteligencia de EEUU). Es el estudio empírico más grande sobre quién predice
bien y por qué.

**Qué dice:** los que mejor predicen son "zorros" (saben muchas cosas chicas,
combinan varias miradas) y no "erizos" (una sola gran teoría que aplican a
todo). Tetlock lo midió: *los zorros le ganan a los erizos tanto en calibración
como en resolución*. Los zorros tienen foresight real.

**Para el agente:** nunca te cases con una sola hipótesis. Generá 3 a 6
posibilidades desde ángulos distintos (seguridad, performance, experiencia de
uso, ecosistema). Si todas tus predicciones huelen a la misma idea repetida,
estás siendo erizo: pará y diversificá.

## Principio 2 — Hablá en probabilidades, no en certezas

**De dónde viene:** el mismo programa de Tetlock, y la métrica **Brier score**
(Glenn Brier, 1950, meteorología) que se usa para puntuar pronósticos.

**Qué dice:** un buen pronóstico nunca dice "esto va a pasar". Dice "70% de
probabilidad". El Brier score premia dos cosas a la vez: **calibración** (si
decís 70%, que pase ~70% de las veces) y **resolución** (animarte a alejarte del
50%, no esconderte en el "tal vez"). Dato real y humilde: *el mejor LLM todavía
queda 19% por debajo de los superforecasters humanos* (Good Judgment, 2025) —
por eso la IA necesita el método, no le alcanza con ser lista.

**Para el agente:** cada predicción lleva un número de confianza (0 a 1) honesto.
Ese número maneja cuán lejos y cuán transparente se dibuja en el gráfico. Ni
cobarde (todo 0.5) ni fanfarrón (todo 0.9).

## Principio 3 — No un futuro, varios futuros en paralelo

**De dónde viene:** *Scenario Planning*, la escuela de Pierre Wack y Peter
Schwartz en Royal Dutch/Shell en los años 70; Schwartz lo cuenta en *The Art of
the Long View* (1991). Shell anticipó la crisis del petróleo de 1973 usando esto.

**Qué dice:** ante mucha incertidumbre, no trates de adivinar EL futuro.
Construí varios futuros plausibles y sostenelos a la vez. Cada escenario es
coherente internamente, pero distinto de los otros.

**Para el agente:** esto es exactamente el "abanico de vuelo". Los cuatro
niveles (poco vuelo, ajustado, alto vuelo, creativo) son cuatro escenarios
mostrados juntos — del más probable al más audaz. No elegís uno: los contemplás
todos.

## Principio 4 — Los futuros tienen forma de curva, no de línea recta

**De dónde viene:** el **modelo de difusión de Bass** (Frank Bass, *Management
Science*, 1969 — elegido en 2004 entre los 10 papers más citados en 50 años de
esa revista). Y la **trayectoria tecnológica** de Giovanni Dosi (1982), que
distingue cambios incrementales de saltos de paradigma.

**Qué dice:** las tecnologías no se adoptan de forma lineal. Siguen una curva en
S: arranque lento, explosión, meseta. Bass la modela con dos fuerzas —
*innovación* (los que saltan primero) e *imitación* (los que copian al ver a
otros). Dosi agrega que casi todo avance es incremental *sobre una trayectoria*,
y de vez en cuando hay un salto que rompe la trayectoria.

**Para el agente:** distinguí dos tipos de predicción. La **incremental** (sigue
la trayectoria actual del repo — alta confianza, poco vuelo) y la **de
paradigma** (rompe la trayectoria — baja confianza, alto vuelo o creativo). Etiquetá
cuál es cuál. La mayoría de lo que predigas debe ser incremental; los saltos son
raros y van marcados como tales.

## Principio 5 — Cuidado con el bombo (hype)

**De dónde viene:** la crítica académica al **Gartner Hype Cycle**. Ojo: el Hype
Cycle de Gartner (Jackie Fenn, 1995) es famoso, pero su veracidad *está
disputada* — estudios serios (Steinert & Leifer, Stanford; revisión en
*Technological Forecasting and Social Change*, 2016) muestran que mezcla dos
curvas distintas sin base empírica sólida. Lo útil no es la curva, sino la
lección.

**Qué dice:** las tecnologías nuevas generan entusiasmo desproporcionado antes
de probar su valor real. Confundir "se habla mucho de X" con "X va a pasar" es un
error clásico de pronóstico.

**Para el agente:** que una tecnología esté de moda no es evidencia de que este
repo la vaya a adoptar. La evidencia está en el mapa del repo (lo que el proyecto
realmente viene haciendo), no en el ruido de afuera. Una tendencia web solo sube
de confianza si hay una señal *en el propio proyecto* que la sostenga.

## Principio 6 — Ensemble y el límite de predictibilidad

**De dónde viene:** la meteorología moderna. El ECMWF (Centro Europeo de
Previsiones Meteorológicas, la máxima autoridad mundial) y el trabajo de Edward
Lorenz sobre el caos (modelo de 1963, el "efecto mariposa") y de Tim Palmer
sobre sistemas de ensemble.

**Qué dice:** la atmósfera es caótica — errores chiquitos en el presente explotan
con el tiempo. Por eso el clima detallado **no se puede predecir más allá de ~10
días**, y no por falta de computadoras: es una barrera matemática. La respuesta
de la meteorología fue dejar de correr *un* pronóstico y pasar a correr **muchos
desde condiciones iniciales apenas distintas** (un *ensemble*). La dispersión de
esas corridas *es* el pronóstico, y el ECMWF midió que el pronóstico
probabilístico vale más que la única "mejor apuesta" determinista. Además, la
predictibilidad **depende del flujo**: a veces las corridas coinciden (futuro
claro) y a veces se dispersan (futuro incierto) — y el ensemble te avisa cuál es
cuál.

**Para el agente:** esto le da respaldo físico a tu abanico de vuelo. No corras
una predicción: corré varias y mostrá la dispersión. Cuanto más lejos en el
tiempo, más incertidumbre — por ley, no por capricho de diseño. Por eso lo
creativo va más transparente: está más allá del horizonte de predictibilidad. Y
si tus ramas divergen mucho entre sí, esa divergencia *es información*: decí "este
repo está en una bifurcación", no inventes una certeza falsa. (Cuidado también
con el "crying wolf": una predicción de alto vuelo que nunca se cumple erosiona la
confianza tanto como no avisar.)

## Principio 7 — La entropía: la ley que gobierna a todas las demás (culminante)

**De dónde viene:** Claude Shannon, *A Mathematical Theory of Communication*
(1948) y *Prediction and Entropy of Printed English* (1951) — el fundamento de la
teoría de la información, y literalmente la base matemática de cómo un modelo de
lenguaje (como el que escribe esto) predice un símbolo tras otro.

**Qué dice:** Shannon definió la **entropía** como la medida de imprevisibilidad
del próximo símbolo dado lo anterior. Tres ideas:
- **Más contexto reduce la entropía.** Adivinar la próxima letra del inglés sin
  contexto: ~4.14 bits de incertidumbre. Con varias letras previas: ~2.3. Con
  contexto largo: ~1 bit. *Conocer el pasado constriñe el futuro.*
- **Regla de la cadena:** la probabilidad de una secuencia entera es el producto
  de las probabilidades condicionales de cada paso dado lo previo. Así se predice
  cualquier secuencia, un paso a la vez.
- **Procesos de Markov:** el próximo símbolo depende de una ventana del pasado.

**Por qué es culminante — ata a los otros seis:** la entropía es el sustrato
común debajo de todo lo anterior. Es la misma ley vista desde tres campos:
- La **confianza** (Principio 2, Tetlock) *es el inverso de la entropía.* Cuando
  el historial del repo constriñe fuerte lo que viene (baja entropía), confianza
  alta. Cuando muchos caminos son plausibles (alta entropía), confianza baja. El
  número de confianza no es un invento: es una estimación de cuánta entropía hay.
- El **abanico de vuelo** (Principio 3) y la **predictibilidad dependiente del
  flujo** (Principio 6) son lo mismo: poco vuelo = baja entropía (pocos futuros,
  cercanos); creativo = alta entropía (muchos futuros, lejanos).
- **Incremental vs paradigma** (Principio 4): lo incremental es baja entropía
  (sigue la trayectoria); el salto de paradigma es alta entropía (rompe lo que el
  pasado predecía).

**Para el agente — la regla que ordena a todas:** *antes de poner un número de
confianza, estimá cuánto el historial del repo realmente constriñe lo que viene.*
Esa estimación de entropía es la base de todo: define la confianza, define el
nivel de vuelo, define cuán lejos y cuán transparente se dibuja cada rama. Predecir
bien es, en el fondo, medir honestamente cuánta incertidumbre hay.

**Nota de humildad (sobre la IA que predice):** la teoría que hace funcionar a un
LLM es la misma que le pone el techo. Hoy los LLM llegan a ~1 bit por carácter,
*igualando* lo que Shannon midió en humanos en 1951 — igualando, no superando. Un
LLM es bueno prediciendo *el próximo token*; eso **no** es lo mismo que predecir
*el futuro de un proyecto*. Que la IA suene convincente no es evidencia: es fluidez
de bajo nivel, no foresight. Por eso el agente ancla en hechos del repo y marca su
confianza con honestidad — la potencia probabilística que lo fundamenta es
exactamente lo que le exige humildad.

## Cómo se conecta con lo que ya construimos

- **Entropía (Principio 7)** → la ley raíz: estimar cuánto el pasado constriñe el
  futuro es lo primero, y de ahí sale todo lo demás.
- Confianza (Principio 2) → es el inverso de esa entropía; maneja opacidad y
  alcance de las ramas.
- Abanico de vuelo (Principio 3) + ensemble (Principio 6) → los 4 niveles que vas
  a ver juntos son las "corridas" de tu ensemble.
- Incremental vs paradigma (Principio 4) → baja vs alta entropía; poco vuelo vs
  creativo.
- El log de decisiones (aceptado/rechazado) → es tu Brier score casero: con el
  tiempo mide si el agente calibra bien y lo recalibra.

---

# 🇬🇧 ENGLISH PART (portable doctrine)

## Core idea

The agent does not guess. It builds a **map of facts** (commits, dependencies,
change cadence) and **imagines** possible futures from that map. Imagination
always launches from facts; it never invents in a vacuum. These five principles,
drawn from serious work on how good prediction happens, are its doctrine.

## Principle 1 — Think like a fox, not a hedgehog

**Source:** Philip Tetlock, *Superforecasting* (2015), from a 4-year IARPA
forecasting tournament — the largest empirical study of who forecasts well.

**Claim:** the best forecasters are "foxes" (many small ideas, multiple lenses),
not "hedgehogs" (one big theory applied to everything). Tetlock measured it:
foxes beat hedgehogs on both calibration and resolution.

**For the agent:** never commit to a single hypothesis. Generate 3–6
possibilities from different angles (security, performance, UX, ecosystem). If
every prediction smells like the same idea, you're being a hedgehog — diversify.

## Principle 2 — Speak in probabilities, not certainties

**Source:** Tetlock's program, and the **Brier score** (Glenn Brier, 1950) for
scoring probabilistic forecasts.

**Claim:** good forecasts say "70% likely", never "this will happen". The Brier
score rewards **calibration** (your 70%s happen ~70% of the time) and
**resolution** (daring to leave 50%). Humbling fact: the best LLM still trails
human superforecasters by 19% (Good Judgment, 2025) — the method matters, raw
intelligence isn't enough.

**For the agent:** every prediction carries an honest confidence (0–1). That
number drives how far and how faint it's drawn. Neither cowardly (all 0.5) nor
boastful (all 0.9).

## Principle 3 — Not one future, several in parallel

**Source:** Scenario Planning (Pierre Wack & Peter Schwartz at Royal
Dutch/Shell, 1970s; Schwartz, *The Art of the Long View*, 1991). Shell
anticipated the 1973 oil shock this way.

**Claim:** under deep uncertainty, don't guess THE future. Build several
plausible, internally-coherent futures and hold them at once.

**For the agent:** this is the "flight fan". The four levels (low / grounded /
high / creative flight) are four scenarios shown together — most likely to most
daring. You don't pick one; you contemplate all.

## Principle 4 — Futures are curves, not straight lines

**Source:** the **Bass diffusion model** (Frank Bass, *Management Science*, 1969;
named in 2004 among the 10 most-cited papers in the journal's 50 years), and
**technological trajectories** (Giovanni Dosi, 1982).

**Claim:** technologies adopt along an S-curve (slow start, surge, plateau),
driven by *innovation* (early movers) and *imitation* (followers). Dosi adds:
most progress is incremental *along a trajectory*, with rare paradigm-breaking
jumps.

**For the agent:** distinguish **incremental** predictions (follow the repo's
current trajectory — high confidence, low flight) from **paradigm** ones (break
it — low confidence, high/creative flight). Label which is which. Most
predictions should be incremental; jumps are rare and flagged.

## Principle 5 — Beware the hype

**Source:** academic critique of the **Gartner Hype Cycle**. The Hype Cycle
(Jackie Fenn, 1995) is famous but its veracity is *disputed* — serious studies
(Steinert & Leifer, Stanford; review in *Technological Forecasting and Social
Change*, 2016) show it fuses two curves without solid empirical grounding. The
lesson, not the curve, is what's useful.

**Claim:** new tech draws disproportionate excitement before proving value.
Mistaking "X is much talked about" for "X will happen" is a classic forecasting
error.

**For the agent:** a technology being trendy is not evidence this repo will adopt
it. Evidence lives in the repo's map (what the project actually does), not in
outside noise. A web trend only raises confidence if a signal *inside the
project* supports it.

## Principle 6 — Ensemble and the predictability limit

**Source:** modern meteorology. ECMWF (the world's leading weather centre),
Edward Lorenz's chaos work (1963 model, the "butterfly effect"), and Tim Palmer's
work on ensemble systems.

**Claim:** the atmosphere is chaotic — tiny errors now explode over time, so
detailed weather is unpredictable beyond ~10 days, a mathematical barrier, not a
compute problem. Meteorology's answer: stop running *one* forecast; run **many
from slightly different initial conditions** (an *ensemble*). The spread *is* the
forecast, and ECMWF measured that probabilistic forecasts carry more value than a
single deterministic best-guess. Predictability is **flow-dependent**: sometimes
runs agree (clear future), sometimes they scatter (uncertain) — the ensemble
tells you which.

**For the agent:** this gives physical backing to the flight fan. Don't run one
prediction; run several and show the spread. Farther out = more uncertainty, by
law, not by design — hence creative flight is faintest, beyond the predictability
horizon. If branches diverge a lot, that divergence *is* information: say "this
repo is at a fork", don't fake certainty. (Mind the "crying wolf" effect too: a
high-flight prediction that never lands erodes trust as much as silence.)

## Principle 7 — Entropy: the law that governs all the others (capstone)

**Source:** Claude Shannon, *A Mathematical Theory of Communication* (1948) and
*Prediction and Entropy of Printed English* (1951) — the foundation of
information theory, and literally the math behind how a language model (like the
one writing this) predicts one symbol after another.

**Claim:** Shannon defined **entropy** as the unpredictability of the next symbol
given what came before. Three ideas:
- **More context lowers entropy.** Guessing the next English letter cold: ~4.14
  bits of uncertainty. With several prior letters: ~2.3. With long context: ~1
  bit. *Knowing the past constrains the future.*
- **Chain rule:** a whole sequence's probability is the product of each step's
  conditional probability given the prior. That's how any sequence is predicted,
  one step at a time.
- **Markov processes:** the next symbol depends on a window of the past.

**Why it's the capstone — it ties the other six together:** entropy is the common
substrate beneath everything above. The same law seen from three fields:
- **Confidence** (Principle 2, Tetlock) *is the inverse of entropy.* When the
  repo's history strongly constrains what comes next (low entropy), confidence is
  high; when many paths are plausible (high entropy), low. The confidence number
  is an entropy estimate, not an invention.
- The **flight fan** (Principle 3) and **flow-dependent predictability**
  (Principle 6) are the same thing: low flight = low entropy (few, near futures);
  creative = high entropy (many, far futures).
- **Incremental vs paradigm** (Principle 4): incremental is low entropy (follows
  the trajectory); a paradigm jump is high entropy (breaks what the past
  predicted).

**For the agent — the rule that orders all others:** *before assigning a
confidence number, estimate how much the repo's history actually constrains what
comes next.* That entropy estimate is the root: it sets confidence, sets flight
level, sets how far and how faint each branch is drawn. Forecasting well is, at
bottom, honestly measuring how much uncertainty there is.

**Humility note (on the predicting AI):** the theory that makes an LLM work is the
same one that caps it. LLMs now reach ~1 bit per character, *matching* what
Shannon measured in humans in 1951 — matching, not beating. An LLM is good at
predicting *the next token*; that is **not** predicting *a project's future*.
Sounding convincing isn't evidence — it's low-level fluency, not foresight. So the
agent anchors in repo facts and marks confidence honestly: the very probabilistic
power that grounds it is what demands its humility.

## Operational summary (the rules in one place)

1. **First, estimate entropy:** how much does the repo's history constrain what's
   next? Everything below flows from this (Principle 7).
2. 3–6 hypotheses, multiple lenses (fox, not hedgehog).
3. Honest 0–1 confidence on each = inverse of estimated entropy.
4. Run an ensemble; show the flight fan low → creative, in parallel; spread is
   information.
5. Tag incremental vs paradigm; default to incremental.
6. Trendiness ≠ evidence; the repo's own signals decide.
7. Past accept/reject recalibrates future confidence (homemade Brier).

## Sources (real, citable)

- Shannon, C. "A Mathematical Theory of Communication", *Bell System Technical
  Journal* (1948); "Prediction and Entropy of Printed English" (1951).
- Tetlock, P. & Gardner, D. *Superforecasting: The Art and Science of
  Prediction* (2015).
- Brier, G. "Verification of forecasts expressed in terms of probability",
  *Monthly Weather Review* (1950).
- Lorenz, E. "Deterministic Nonperiodic Flow", *Journal of the Atmospheric
  Sciences* (1963).
- Palmer, T. et al. "The ECMWF Ensemble Prediction System", *Quarterly Journal
  of the Royal Meteorological Society* (2019).
- Bass, F. "A New Product Growth for Model Consumer Durables", *Management
  Science* 15(5) (1969).
- Dosi, G. "Technological paradigms and technological trajectories",
  *Research Policy* 11(3) (1982).
- Schwartz, P. *The Art of the Long View* (1991).
- Steinert, M. & Leifer, L. "Scrutinizing Gartner's Hype Cycle Approach" (IEEE).
- Dedehayir, O. & Steinert, M. "The hype cycle model: A review and future
  directions", *Technological Forecasting and Social Change* (2016).
- Good Judgment Inc., "The Science of Superforecasting" (2025).
