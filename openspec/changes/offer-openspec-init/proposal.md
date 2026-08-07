## Why

Abrir en el panel un repositorio sin `openspec/` muestra cuatro ceros y ninguna salida. `C:\www\odontoPia`
es un repositorio Git sin `openspec/`, y quien lo abre no recibe ninguna indicación de qué le falta.

Pero el caso que de verdad duele es otro, y se comprobó esta semana. Un repositorio puede tener OpenSpec
inicializado y aun así dejar a un ejecutor trabajando a ciegas, si esa herramienta no tiene instalados
sus archivos. En `C:\www\odontoPau` convivían `.codex/skills/openspec-*` —cinco archivos— y **ningún**
`.agent/`, que es donde OpenSpec instala los de Antigravity. Codex recibía el método y Antigravity no.
Nadie lo vio hasta que un artefacto salió mal, y para diagnosticarlo hubo que comparar directorios a
mano.

Esa asimetría es invisible por diseño: nada en la pantalla dice qué herramientas usa el repositorio ni
cuáles están configuradas. La aplicación tiene todo para mostrarlo —le alcanza con mirar el disco— y es
exactamente lo que este panel existe para hacer: mostrar qué está pasando con el método, para que la
persona lo sepa antes de que un agente escriba cualquier cosa.

## What Changes

- El panel muestra el estado de OpenSpec del repositorio: si está inicializado, qué herramientas usa y
  cuáles tienen sus archivos instalados.
- Declara el estado sin `openspec/` como tal, y no como un repositorio sin cambios activos.
- Ofrece inicializar. El comando detecta solo las herramientas presentes, así que sólo hace falta
  preguntar cuando no detecta ninguna.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el panel muestra el estado de OpenSpec del repositorio y ofrece
  inicializarlo.

## Impact

**Producción:** el lector de evidencia —para distinguir los tres estados y detectar herramientas—,
`types/pipeline/index.ts`, la pantalla de arranque del panel, y un canal para ejecutar la
inicialización.

**Sin tocar:** el flujo de cambios, el archivado, y el comportamiento del panel en un repositorio ya
inicializado y con todo configurado.

**Fuera de alcance:** sembrar reglas del proyecto en repositorios ajenos. Se descartó tras auditar
`prune-duplicated-rules`: sólo tres reglas resultaron universales, y tres reglas no justifican una
función. Tampoco entra elegir esquema ni escribir `AGENTS.md`.

**Dependencias:** ninguna.

**Riesgo:** medio, porque inicializar escribe en un repositorio del usuario. Mitigación: se enumera qué
se va a escribir antes de escribirlo y la acción es explícitamente humana. Está medido que `init` no
pisa el `config.yaml` existente —se comprobó por hash sobre `odontoPau`— y que es incremental: en un
repositorio ya inicializado sólo agrega la herramienta que falta.

## Lo que las sondas cambiaron del plan original

La primera versión de esta propuesta quería que la aplicación resolviera cosas que el CLI ya resuelve.
Medido sobre repositorios de prueba:

`openspec init` **detecta solo** las herramientas presentes por sus directorios y configura todas: con
`.codex`, `.agent` y `.claude` en el mismo repositorio, configuró las tres sin que se le dijera nada.
Cae la lista de treinta herramientas en el panel y cae elegir por defecto: sólo hay que preguntar cuando
el CLI no detecta ninguna, que es el único caso en que falla.

`init` **no pisa** el `config.yaml`. Se escribió uno con marcas, se re-inicializó, y quedó idéntico.

Y `init` **no llena** el canal: después de inicializar, `openspec instructions` sigue devolviendo
contexto vacío y cero reglas, porque el `config.yaml` que deja son veinte líneas comentadas. Eso no lo
arregla el panel: lo escribe quien conoce el proyecto.
