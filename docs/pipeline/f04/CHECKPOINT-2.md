# Pipeline F04 — CHECKPOINT 2 · Vía, "Ahora", decisiones y piel visual

Fecha: `2026-07-24`
Builder: `Claude Opus 5 / direct`
Rama: `pipeline/fase-04-workspace-ui`
Estado: `Implementado y verificado en la app corriendo`

---

## 1. Cambio de política registrado

Ale decidió el 2026-07-24 que **el CSS lo hace el agente que construye la UI**, no él. Eso revierte
dos reglas del material de F04:

- brief: *"Ale escribe el CSS"* y el criterio de aceptación *"cero cambios CSS hechos por agentes"*;
- prompt: *"Si creés necesitar CSS, detenete y pedí dirección"*.

Ambos documentos quedaron actualizados con la fecha y el motivo. Sin eso, el próximo agente heredaba
una regla muerta — el mismo problema que tuvimos con la premisa vieja de LM Studio en F03.

## 2. Qué entrega esta tanda

`PipelineNow`, `DecisionInbox` + `DecisionCard`, `ChangePath`, y el CSS completo del workspace.

## 3. La vía del change: diagonal, sin canvas

Ale pidió algo *"parecido a cronométrico, no exactamente igual, en diagonal, usando lo que hay"*.

Lo que **no** hice: reusar `ChronometricGraph`. Son 3944 líneas que proyectan commits sobre un canvas
con pan/zoom, viewport y proyección temporal. Acá hay **siete estaciones fijas**. Traer ese motor
sería pagar toda su complejidad para dibujar una escalera.

Lo que hice: tomar su **ADN visual**. Un `<ol>` con cada estación desplazada por
`transform: translateY(calc(var(--station-index) * var(--pipeline-station-rise)))`, donde la pendiente
es un token propio derivado de `DEFAULT_CHRONOMETRIC_SLOPE = 0.85`. Misma familia visual, cero canvas,
y sigue siendo una lista ordenada para lectores de pantalla.

**Verificado en el navegador** — los desplazamientos reales fueron:

```
0 → 28.7 → 57.4 → 86.1 → 114.8 → 143.4 → 172.1 px
```

Lineal y perfecto. La diagonal existe de verdad, no es una maqueta.

## 4. Decisiones de diseño que no dependen del color

Tres, porque el brief pide distinguir hecho/inferencia/futuro semánticamente:

| Distinción | Cómo se ve, además del color |
|---|---|
| Compuerta humana vs. paso de IA | marcador **cuadrado** (`radius-sm`) vs. redondo (`radius-full`) — verificado: 1.875px vs 9999px |
| Ocurrido vs. camino posible | riel **sólido** vs. **punteado** |
| Procedencia del dato | el borde del badge cambia de **estilo**, no sólo de color |
| Riesgo sin evaluar | borde **punteado neutro** — nunca verde, porque "sin evaluar" no es "inofensivo" |

## 5. Error propio, corregido

Modelé `title`, `why` y `consequence` como claves i18n. El contrato de
`docs/pipeline/UX-DECISIONES.md` los define como **texto plano sanitizado** que redacta la fuente de
la decisión. Se notó al ver el fixture: el título de una decisión mostraba "Decisiones pendientes".

Corregido: esos tres campos son ahora `string`, con el comentario de que nunca se usan como HTML ni
como clave dinámica. Las etiquetas de opción sí siguen siendo claves, como fija el contrato.

## 6. Verificación visual real

Con la app corriendo, el workspace renderiza así:

```
AHORA
claude está corrigiendo lo que marcó la revisión.
AGENTE claude · TAREA corregir hallazgos · TIEMPO 0:45
COSTO  sin datos / sin base de costo conocida
Necesita una decisión tuya.

DECISIONES PENDIENTES
Quieren agregar "react-markdown" al proyecto.
  RIESGO alto · derivado por GitCron · verificado
  [Ver evidencia]  [Aprobar] → Disponible cuando se habilite control supervisado.
La IA necesita saber si el panel derecho se oculta.
  RIESGO sin evaluar · sin datos

VÍA DEL CHANGE
Plan hecho › Tu aprobación hecho (decidís vos) › Construcción hecho ›
Controles automáticos hecho › Revisión independiente rechazado ›
Correcciones en curso › Integración camino posible (decidís vos)
La revisión encontró problemas y el trabajo volvió al fixer.
```

Confirmado en el DOM: fondo `rgb(2,15,30)` = `--color-bg-base`, el orden del inbox pone riesgo alto
primero, y las seis instancias de "sin datos" se renderizan como tales. **Ningún cero falso.**

Nota: la verificación se hizo con un parche temporal que forzaba el fixture, ya revertido (`grep`
confirma 0 ocurrencias de `FIXTURES` y de la ruta hardcodeada en el código final).

## 7. Pendiente de pulido

`claude está corrigiendo...` usa el identificador del runtime en minúscula. Falta un mapa de nombres
para mostrar `Claude`, `Codex`, `LM Studio`. Es cosmético y va en TANDA 3, junto al árbol de agentes
que necesita el mismo mapa.

## 8. Validación

- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm test`: **62 archivos / 392 tests** verde.
- `pnpm build`: OK.
- `eslint` sobre lo tocado: limpio.
- `gates.ps1 fast`: **VERDE**.
- CSS: 445 líneas nuevas en `app/globals.css`, **cero colores literales** — todo sobre tokens.
