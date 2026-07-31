# Tasks — sign-and-commit-from-archive

## 1. Convención de firma y manifiesto

- [x] 1.1 Declarar el texto literal de la tarea de firma y el formato de `commit.md` en `AGENTS.md`
- [x] 1.2 Actualizar en `AGENTS.md` la regla de Git: el click de archivado es la autorización, acotada y sin publicar
- [x] 1.3 Dar a los tres changes activos su `commit.md` y su tarea de firma

## 2. Marcar la firma

- [x] 2.1 Marcar en `tasks.md` la tarea cuyo texto coincide con el literal declarado, sólo esa
- [x] 2.2 No marcar nada si el cambio no declara tarea de firma
- [x] 2.3 Tests: se marca la de firma; las demás pendientes quedan intactas; sin firma no se marca nada

## 3. Alcance del commit

- [x] 3.1 Parsear `commit.md`: mensaje y lista de archivos
- [x] 3.2 Agregar los artefactos del change y su reporte, que son rutas deterministas
- [x] 3.3 Calcular los archivos modificados que quedan fuera, para mostrarlos
- [x] 3.4 Tests del parseo y del cálculo de incluidos/excluidos

## 4. Orquestación

- [x] 4.1 Secuencia: firma → commit del trabajo → archivado → commit del archivado
- [x] 4.2 Frenar ante el fallo del commit del trabajo, sin archivar
- [x] 4.3 Informar sin declarar éxito si falla el commit del archivado con el archivado ya hecho
- [x] 4.4 Nunca ejecutar `push`, `merge` ni `tag`
- [x] 4.5 Tests de la secuencia y de los dos caminos de fallo

## 5. Confirmación a la vista

- [x] 5.1 El panel muestra los dos mensajes, los archivos incluidos y los que quedan fuera
- [x] 5.2 Nada se ejecuta hasta confirmar
- [x] 5.3 i18n en ES, EN y ZH
- [x] 5.4 Test: lo que se muestra es lo que se ejecuta

## 6. Cierre

- [x] 6.1 `pnpm exec tsc --noEmit` en cero
- [x] 6.2 `pnpm test` en verde
- [x] 6.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.4 `openspec validate sign-and-commit-from-archive --strict` válido
- [x] 6.5 Reporte en `docs/reports/`
- [ ] 6.6 Archivado confirmado por Ale desde la aplicación
