## 1. Base verificada

- [x] 1.1 Confirmar rama, `tsc --noEmit` en cero y `pnpm test` en verde, y registrar el conteo de pruebas de partida
- [x] 1.2 Listar los consumidores reales de `stations`, `now` y del mecanismo de cursores, separando producción de pruebas y verificando cada coincidencia antes de tocarla

## 2. Lectura de artefactos

- [x] 2.1 Extender `OpenSpecChangeEvidence` con el contenido de proposal, design y tasks
- [x] 2.2 Conservar en `repo-evidence-reader` el markdown que hoy se descarta, sólo para el cambio seleccionado
- [x] 2.3 Propagar el contenido por `pipeline-adapter` hasta `OpenSpecChangeSummary`
- [x] 2.4 Mostrarlo en pestañas legibles con `SafeMarkdown`, con estado vacío explícito cuando el artefacto no existe
- [x] 2.5 Prueba: artefacto presente, artefacto ausente y contenido sólo del cambio seleccionado

## 3. Narrativa coalescida

- [x] 3.1 Acumular deltas consecutivos del mismo agente en `runtime-projection`, conservando el `entryId` del primero
- [x] 3.2 Cerrar la acumulación ante un evento de otra clase o un agente distinto
- [x] 3.3 Prueba: cinco deltas dan una entrada; deltas interrumpidos conservan el orden; dos agentes no se mezclan

## 4. Retiro de campos sin consumidor

- [x] 4.1 Retirar `stations` del snapshot, de `pipeline-domain` y de `pipeline-adapter`
- [x] 4.2 Retirar `now` de los mismos lugares
- [x] 4.3 Retirar las cadenas i18n que sólo usaban esos campos, en ES, EN y ZH
- [x] 4.4 Recortar las pruebas afectadas sin borrar cobertura viva

## 5. Retiro del mecanismo de cursores

- [x] 5.1 Retirar `PipelineCursorStore` del lector y del repositorio
- [x] 5.2 Agregar migración `version: 6` con `DROP TABLE IF EXISTS pipeline_cursor` y subir `LATEST_SCHEMA_VERSION`
- [x] 5.3 Verificar que las migraciones anteriores no se editaron
- [x] 5.4 Prueba: una base existente migra sin perder las demás tablas

## 6. Specs coherentes

- [x] 6.1 Confirmar que `pipeline-event-contract` deja de declarar la ingesta del kit y `gate.changed`
- [x] 6.2 Confirmar que la nueva cláusula de narrativa describe lo implementado

## 6 bis. Navegación de artefactos (pedido en revisión)

- [x] 6b.1 Leer el `spec.md` de cada capacidad tocada y transportarlo con su ruta de origen
- [x] 6b.2 Hacer desplegable cada cambio activo por separado, siguiendo al seleccionado por defecto
- [x] 6b.3 Convertir cada archivo listado en un control que abre su contenido en la columna central
- [x] 6b.4 Reparar al cargar las sesiones ya persistidas con la narrativa fragmentada
- [x] 6b.5 Pruebas: spec delta presente y ausente, y reparación de actividad persistida

## 7. Cierre

- [x] 7.1 `pnpm exec tsc --noEmit` en cero
- [x] 7.2 `pnpm test` en verde, con la diferencia de conteo justificada
- [x] 7.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 7.4 `openspec validate polish-openspec-workspace --strict` válido
- [x] 7.5 Reporte en `docs/reports/`
- [ ] 7.6 Frenar antes de staging y entregar a Ale con la QA visual pendiente
