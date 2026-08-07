## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (105 archivos / 770 tests antes de tocar nada)
- [x] 1.2 Leer cómo resuelve el mismo control el resto de la aplicación:
      `components/SettingsPanel.tsx:344` usa borde, padding y etiqueta en caja normal
- [x] 1.3 Confirmar qué usa hoy `.backToStart` y desde dónde: `border: 0`, `background: none`, y dos
      consumidores —el encabezado del panel y la vista de una especificación—

## 2. Estilo

- [x] 2.1 Dar contorno y respiro a `.backToStart`, con los tokens del panel y la escala `--sp-*`
- [x] 2.2 Reforzar el hover con el borde fuerte, para que el control responda visiblemente
- [x] 2.3 Conservar la tipografía monoespaciada y la versalita: volver es una acción secundaria y lo que
      faltaba era el contorno, no el tamaño
- [x] 2.4 No tocar el marcado de los dos botones ni el de Configuración

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base de 1.1
- [x] 3.3 `openspec validate align-back-control-style --strict` válido
- [x] 3.4 Reporte en `docs/reports/2026-08-07-align-back-control-style.md`
- [ ] 3.5 **Ale valida visualmente**: es la única comprobación posible. Ninguna prueba distingue "parece
      un botón" de "parece un texto", así que no se declara cubierto por la suite
