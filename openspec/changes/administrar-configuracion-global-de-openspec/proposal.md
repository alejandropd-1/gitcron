# Administrar la configuración global de OpenSpec

## Why

La configuración global de OpenSpec afecta a varios repositorios, pero su edición aparece dentro de la revisión de uno solo. Mover esa administración a Configuración de GitCron permite entender su alcance y conservar en SDD únicamente el estado efectivo del repositorio.

## What Changes

- Trasladar edición de perfil y opciones globales a Configuración; reutilizar los canales existentes.
- Separar valor global, integración instalada y estado efectivo por repositorio.
- Mostrar preview de modificaciones/reset y releer el CLI tras ejecutar, sin prometer que las skills instaladas ya cambiaron.
- Declarar opciones conocidas, desconocidas y no editables sin copiar un catálogo permanente del CLI.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-openspec-engine`: administración global y repercusión sobre repositorios.

## Impact

SettingsPanel, OpenSpecEngineCard, handlers de config del motor, preload e i18n. Sin editar openspec/config.yaml del repositorio ni duplicar credenciales IA.

## Dependencies

Independiente del mapa de pantallas y Centauro. La dependencia antigua gestionar-ciclo-openspec-desde-gitcron ya fue archivada; reutilizar su implementación. Coordinar catálogo con completar-cobertura-operativa-de-openspec.
