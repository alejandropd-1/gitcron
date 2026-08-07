## Why

GitCron empaqueta su propio navegador: corre sobre Electron 42, con el Chromium que esa versión trae.
El motor no lo elige quien abre la aplicación, lo elige el proyecto al fijar la versión. Eso no está
declarado en ninguna parte, así que cada decisión sobre usar una función moderna del navegador se
resuelve de cero.

Pasó al implementar `fade-active-change-reorder`. La guía de prácticas modernas devolvió que las
transiciones de vista son «Baseline newly available» desde 2025-10-14 y describió su estrategia de
respaldo. Parte del trabajo fue decidir si ese respaldo hacía falta acá, y la respuesta en este proyecto
es siempre la misma. Sin declararla, el próximo ejecutor la vuelve a razonar, y el riesgo peor es que
escriba el respaldo «por las dudas»: código que nunca se va a ejecutar y que hay que mantener igual.

La herramienta que responde esas consultas ya está construida para leer una política así. Sus propias
instrucciones dicen que hay que sugerir documentarla en `AGENTS.md` cuando el proyecto corre sobre un
runtime acotado como Electron, y que si existe una declaración explícita de soporte, la usa para decidir
si un respaldo puede omitirse. Hoy no encuentra ninguna.

## What Changes

- `AGENTS.md` declara que la aplicación corre sobre Electron 42 y que se pueden usar funciones del
  navegador ya disponibles de forma amplia sin escribir código de respaldo.
- La declaración nombra el límite: qué sí queda fuera, para que no se lea como permiso para cualquier
  cosa.
- `openspec/config.yaml` la menciona, para que también viaje por el canal de instrucciones.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el proyecto declara sobre qué runtime corre y qué implica para el uso de
  funciones del navegador.

## Impact

**Producción:** `AGENTS.md` y `openspec/config.yaml`. Ningún cambio de código.

**Sin tocar:** el código ya escrito. Esto no habilita a reescribir nada: describe qué se puede asumir de
acá en adelante, no manda a quitar respaldos existentes.

**Fuera de alcance:** definir política para el sitio o para cualquier superficie que no sea la
aplicación de escritorio, y elegir por adelantado qué APIs usar. La declaración dice qué se puede
asumir, no qué hay que hacer.

**Dependencias:** ninguna.

**Riesgo:** bajo, y conviene nombrarlo igual. Si algún día el producto tuviera que correr fuera de
Electron, la política queda vieja y habilitaría decisiones equivocadas. Mitigación: nombra la versión
concreta, así queda evidente contra qué se escribió y cuándo revisarla.
