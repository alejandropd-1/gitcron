# Tasks — pin-archived-header-and-single-scroll

## 1. Un solo scroll al confirmar

- [x] 1.1 El centro entero es el único con scroll: ninguna región se desplaza por su cuenta
- [x] 1.2 La confirmación empuja lo de abajo en vez de reemplazarlo
- [x] 1.3 Los controles quedan alcanzables sin encimarse sobre el contenido

## 2. Ficha del archivado en una sola pieza

- [x] 2.1 Envolver tilde, nombre, fecha y ubicación en su propio contenedor, separados por una línea
- [x] 2.2 Sin fijado ni fondo propio: el cuerpo se recorre entero, de una sola pieza

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [ ] 3.2 `pnpm test` en verde — **no se puede tildar**: la suite falla de forma intermitente (ver reporte)
- [x] 3.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.4 `openspec validate pin-archived-header-and-single-scroll --strict` válido
- [x] 3.5 Reporte en `docs/reports/`
- [x] 3.6 Archivado confirmado por Ale desde la aplicación
