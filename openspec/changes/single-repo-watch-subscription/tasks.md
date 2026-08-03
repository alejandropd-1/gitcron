## 1. Separar la observación

- [x] 1.1 Extraer el `useEffect` de observación de `hooks/use-repo-loader.ts` a un hook propio `useRepoWatch`
- [x] 1.2 Conservar los cinco disparadores y el debounce tal como estaban, sin cambiar tiempos
- [x] 1.3 Verificar que `useRepoLoader` ya no monta ningún efecto de alcance global

## 2. Montaje único

- [x] 2.1 Montar `useRepoWatch` una sola vez desde `app/page.tsx`
- [x] 2.2 Declarar en consola, sólo en desarrollo, si la observación se monta más de una vez
- [x] 2.3 Comprobar que el contador del aviso se decrementa en el cleanup, para que un remonte de React en modo estricto no lo dispare

## 3. Cobertura

- [x] 3.1 Test: obtener las funciones de refresco desde varios componentes no crea suscripciones ni temporizadores
- [x] 3.2 Test: montar la observación crea exactamente una suscripción por evento y un temporizador
- [x] 3.3 Test: un cambio de archivo con varios consumidores montados relee el estado una sola vez
- [x] 3.4 Test: el desmontaje cancela el temporizador, quita los listeners y no ejecuta un refresco pendiente

## 4. Cierre

- [x] 4.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 4.2 `pnpm exec tsc --noEmit` en cero
- [x] 4.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 4.4 `openspec validate single-repo-watch-subscription --strict` válido
- [x] 4.5 Reporte en `docs/reports/` con qué se tocó, qué no, y el resultado real de esas comprobaciones
- [x] 4.6 Manifiesto `commit.md` con el mensaje y los archivos exactos que entran
- [ ] 4.7 Ale confirma con la aplicación que la consola ya no declara suscripciones de más
- [x] 4.8 Archivado confirmado por Ale desde la aplicación
