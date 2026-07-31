## MODIFIED Requirements

### Requirement: IPC y suscripción read-only

Electron SHALL exponer snapshot y actualización tipados sin aceptar SQL, shell, argv, PID ni
operaciones que escriban en el repositorio.

La suscripción SHALL recordar la última selección manual de change informada por el renderer y
SHALL usarla en los refrescos que dispara el watcher, para que un snapshot emitido no revierta a
la selección automática por branch.

Los refrescos concurrentes de un mismo repositorio con la misma selección SHALL compartir una
única lectura en vuelo. Si llega una notificación de cambio mientras hay una lectura en vuelo,
Pipeline SHALL agendar exactamente una relectura posterior, de modo que ninguna evidencia
observada quede sin leer y las notificaciones no acumulen lecturas superpuestas.

#### Scenario: Cambio observado por watcher

- **WHEN** el watcher existente notifica un cambio para un repo suscripto
- **THEN** main refresca y emite un snapshot tipado mediante `pipeline:snapshot-updated`

#### Scenario: Unsubscribe

- **WHEN** el renderer deja de observar un repo
- **THEN** main elimina la suscripción Pipeline sin crear ni dejar un watcher adicional

#### Scenario: Watcher con selección manual vigente

- **WHEN** el renderer se suscribió informando una selección manual y el watcher notifica un cambio
- **THEN** el snapshot emitido conserva esa selección y no revierte a la selección automática

#### Scenario: Pedidos concurrentes idénticos

- **WHEN** dos pedidos de refresco para el mismo repo y la misma selección se solapan en el tiempo
- **THEN** ambos se resuelven con una única lectura de evidencia

#### Scenario: Cambio notificado durante una lectura en vuelo

- **WHEN** el watcher notifica un cambio mientras una lectura del mismo repo está en curso
- **THEN** Pipeline agenda una única relectura posterior en lugar de iniciar otra en paralelo
