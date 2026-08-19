## ADDED Requirements

### Requirement: GitCron distingue la compatibilidad del motor de la disponibilidad de versiones más recientes en el registro
GitCron SHALL evaluar de manera independiente la compatibilidad del CLI local/global respecto al rango
soportado (`supported`, `too-old`, `too-new`, `absent`) y la existencia de versiones más nuevas en el
registro npm (`cli-up-to-date`, `cli-upgrade-available`, `offline`). GitCron SHALL NOT etiquetar un motor
como «Desactualizado» de forma alarmista cuando su versión instalada está dentro del rango soportado.

El fundamento es que un CLI 1.5.0 es plenamente compatible y funcional para trabajar con las specs del
repositorio. Tratarlo como un error o una desactualización crítica sólo porque en npm existe la versión
1.9.0 confunde al usuario y provoca diagnósticos circulares en la matriz.

#### Scenario: Motor en versión soportada con versión más nueva en npm
- **WHEN** el CLI resuelto tiene versión 1.5.0 y en npm la última publicada es 1.9.0
- **THEN** el motor se clasifica como `supported` en compatibilidad y `cli-upgrade-available` en novedad, indicando claramente que es compatible y que existe una versión superior opcional

#### Scenario: Motor en versión obsoleta
- **WHEN** el CLI resuelto tiene versión 1.4.9 (menor al mínimo 1.5.0)
- **THEN** el motor se clasifica como `too-old` y la matriz requiere actualización del motor antes de operar

### Requirement: GitCron no muta paquetes del sistema operativo y expone comandos de actualización del motor en modo de sólo lectura
GitCron SHALL NOT ejecutar comandos de instalación global de paquetes (`npm install -g`, `pnpm add -g`,
`brew`, etc.) en el sistema operativo del usuario. GitCron SHALL exponer el comando exacto no traducido
en la tarjeta del motor y en la revisión de actualización con un botón de copiado al portapapeles.

El fundamento es que el entorno de Electron empaqueta Node.js pero no npm, y ejecutar gestores globales
requiere privilegios elevados en el host que escapan a la autoridad del repositorio. Guiar al usuario con
el comando exacto previene fallos de permisos y corrupción de entornos de Node.

#### Scenario: Exposición del comando oficial de actualización del CLI
- **WHEN** el usuario consulta cómo actualizar el motor OpenSpec en su sistema
- **THEN** GitCron muestra `npm i -g @fission-ai/openspec@latest` con un botón de copiado al portapapeles y no ejecuta llamadas a gestores de paquetes

## MODIFIED Requirements

### Requirement: GitCron declara un rango de versiones soportadas de OpenSpec
GitCron SHALL declarar un rango de versiones soportadas que abarca desde 1.5.0 hasta 1.9.0 inclusive, y
SHALL clasificar la versión detectada como `supported`, `too-old` o `too-new`. El rango SHALL viajar con
el estado del motor.

El fundamento es que OpenSpec 1.9.0 conserva total retrocompatibilidad con las estructuras y esquemas de
1.8.0 requeridos por GitCron (`spec-driven`, JSON de `status`, comandos de `update` y `validate`), por lo
que ampliar el soporte a 1.9.0 garantiza el funcionamiento con la versión oficial vigente sin riesgos de
incompatibilidad.

#### Scenario: Versión dentro del rango 1.5.0 a 1.9.0
- **WHEN** la versión detectada está entre 1.5.0 y 1.9.0 inclusive
- **THEN** el estado la declara `supported`

#### Scenario: CLI más viejo que el soportado
- **WHEN** la versión es inferior a 1.5.0
- **THEN** el estado la declara `too-old` con el mínimo requerido 1.5.0

#### Scenario: CLI más nuevo que el soportado
- **WHEN** la versión es superior a 1.9.0
- **THEN** el estado la declara `too-new` indicando que supera el rango probado
