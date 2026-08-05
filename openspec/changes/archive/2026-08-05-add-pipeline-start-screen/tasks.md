## 1. Retiro de la selección por descarte

- [x] 1.1 Reducir `selectedId` en `OpenSpecDashboard.tsx` a la elección explícita, retirando los descartes `activeChanges[0]` y `archivedChanges[0]`
- [x] 1.2 Retirar `unreportedSelection` y su efecto, verificando antes con CodeGraph que nada más lo consume
- [x] 1.3 Confirmar que `selectChange` sigue informando la elección con `onSelectChange` cuando una persona entra a un cambio
- [x] 1.4 Reemplazar en `pipeline-selection-sync.test.tsx` el caso que verifica el descarte al primer activo por su contrario: sin elección explícita no se informa ninguno ni se muestra ningún cambio
- [x] 1.5 Conservar el caso de ese archivo que verifica que seleccionar un cambio no lo despliega

## 2. Pantalla de entrada

- [x] 2.1 Renderizar la pantalla de entrada en el centro cuando no hay cambio ni archivado elegido, absorbiendo la sección `noActiveChange`
- [x] 2.2 Listar los cambios en curso con su avance de tareas, ordenados por avance descendente, cada uno con el control para entrar
- [x] 2.3 Señalar el cambio que el estado del repositorio derivó de la rama actual, distinguiéndolo de una elección de persona
- [x] 2.4 Declarar lo archivado y las especificaciones distinguiendo el cero que significa "todavía no se archivó" del que significa "no hay trabajo abierto"
- [x] 2.5 Ofrecer abrir un cambio nuevo desde la pantalla, con el flujo de creación que hoy vive en `noActiveChange`
- [x] 2.6 Permitir volver a la pantalla de entrada después de haber entrado a un cambio

## 3. Textos

- [x] 3.1 Escribir en ES las claves de la pantalla nueva, sin textos explicativos ni de bienvenida, según la invariante 11
- [x] 3.2 Completar esas claves en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 4. Cobertura del caso que motiva el trabajo

- [x] 4.1 Sumar un test con el estado de odontoPau —cambios activos, cero archivados, cero especificaciones, tareas mayormente hechas— que verifique que el avance real se muestra y el estado no se declara vacío
- [x] 4.2 Verificar que con varios cambios activos y sin elección previa no se entra a ninguno
- [x] 4.3 Verificar que la correspondencia derivada de la rama se señala sin entrar al cambio

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate add-pipeline-start-screen --strict` válido
- [x] 5.5 Ale valida visualmente la pantalla y marca esta casilla: que no parezca una landing, que un repositorio sin archivar se lea bien, y si el orden de los cambios conviene por avance o por última actividad
