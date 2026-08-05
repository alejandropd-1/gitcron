## 1. Agrupación del movimiento

- [x] 1.1 Extraer en `lib/change-commit-scope.ts` el identificador de una ruta de archivado quitando el prefijo `YYYY-MM-DD-`, devolviendo nada cuando la carpeta no lo tiene
- [x] 1.2 Calcular en `deriveRepoCommitScope` el conjunto de identificadores archivados presentes antes de clasificar cada archivo
- [x] 1.3 Clasificar como archivado todo archivo bajo `openspec/changes/<id>/` cuyo `<id>` esté en ese conjunto, dejando intactos los de cambios no archivados
- [x] 1.4 Verificar que la función sigue siendo pura: no recibe estado de Git ni la forma de `GitFile`

## 2. Mensaje del archivado

- [x] 2.1 Hacer que `soleChangeId` lea identificadores también de las rutas bajo `archive/`
- [x] 2.2 Confirmar que con un cambio activo y un archivado distintos la descripción sigue quedando vacía

## 3. Cobertura

- [x] 3.1 Test del archivado completo: las dos mitades en un solo grupo
- [x] 3.2 Test de control: un archivo bajo la ruta de un cambio sin carpeta de archivado sigue en el grupo de ese cambio
- [x] 3.3 Test de que el mensaje del archivado nombra el cambio archivado
- [x] 3.4 Test de que una carpeta de archivado sin prefijo de fecha no aporta identificador y sus archivos quedan como restos
- [x] 3.5 Verificar que los tests del panel que ya existen siguen pasando sin cambios

## 4. Cierre

- [x] 4.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 4.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 4.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 4.4 Dejar `openspec validate group-archive-move-together --strict` válido
- [ ] 4.5 Ale valida en el próximo archivado y marca esta casilla: que las dos mitades salgan en un grupo y que el commit del archivado se llame con el identificador del cambio
