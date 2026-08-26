## Why

El tema claro no es un tema: es un filtro. `app/globals.css:268` declara
`html.light body { filter: invert(0.92) hue-rotate(180deg); }` y vuelve a invertir imágenes, video y
todo lo marcado con `[data-keep-color]`. No redefine **ningún** token. Alejandro lo dijo el
2026-08-26: que no sea «algo tan trucho como solo invertir los colores porque se usa invert en CSS;
sino que tenga sentido y sea suave, no un contraste negativo».

El truco tiene una virtud, y por eso sobrevivió: **alcanza todo**, incluidos los literales que nunca
se migraron a tokens. Y tiene el defecto que se ve: invertir no es diseñar. `invert(0.92)` deja un
ocho por ciento sin invertir, y `hue-rotate(180deg)` sobre un color ya invertido no devuelve el
matiz original: aproxima bien los grises y desvía los saturados.

La medición, hecha el 2026-08-26 sobre un fondo claro Nord (`#eceff4`), umbral WCAG AA 4.5 para
texto normal:

| token | valor | claro | oscuro |
|---|---|---|---|
| `--color-primary` | `#5ed8ff` | **1.43** | 7.58 |
| `--color-error` | `#ff716c` | **2.33** | 4.66 |
| `--color-warning` | `#d8a657` | **1.92** | 5.66 |
| `--color-git-add` | `#a3be8c` | **1.77** | 6.13 |
| `--color-git-mod` | `#fd9d1a` | **1.82** | 5.96 |
| `--color-accent-purple` | `#b58bf8` | **2.27** | 4.77 |

Los seis fallan. Y no alcanza con ir a los equivalentes «oficiales» de Nord: `#5e81ac` da 3.50 y
`#bf616a` da 3.55 —AA sólo para texto grande— y el resto queda debajo. Los acentos de Nord también
están pensados para fondo oscuro.

Los neutros, en cambio, salen de la propia paleta. Ya es Nord: `#2e3440` es nord0, `#4c566a` es
nord3, `#eceff4` es nord6. Y Nord declara su lado claro, Snow Storm. `#2e3440` sobre `#eceff4` da
**10.84**.

De ahí que el trabajo se parta en dos mitades de naturaleza distinta, y ése es el motivo de que este
change exista aparte: **los neutros son un intercambio mecánico y verificable; los seis acentos hay
que diseñarlos**, con el ojo de Alejandro y una verificación de contraste al lado. Igual que en
`remaquetar-cuerpo-de-sdd`, mezclar lo medible con lo opinable hace que se estorben.

## What Changes

- **Los tokens neutros se declaran en claro**, intercambiando Polar Night por Snow Storm. Es lo
  mecánico: la paleta ya es Nord y Nord ya tiene su lado claro.
- **Los seis acentos reciben un valor propio para el tema claro**, oscurecido hasta cumplir AA sobre
  el fondo claro. Ninguno de los valores actuales sirve, y ninguno de los de Nord tampoco.
- **El filtro se retira**, y con él `data-keep-color`, que existe sólo para escapar del filtro: hoy
  son cinco reglas en `app/globals.css` y tres usos en componentes —dos en `CommitGraph.tsx` y uno
  en `RepoTabs.tsx`—.
- **La verificación de contraste pasa a recorrer los dos temas.** Hoy `lib/__tests__/palette-contrast.test.ts`
  sólo declara pares «as text on dark backgrounds»: valida la mitad de lo que existe, que es el
  invariante 22.
- **Las superficies de datos declaran si tienen tema fijo.** Los 212 colores exentos por el
  invariante 12 —`ChronometricGraph.tsx` y `CommitGraph.tsx`— no responden a tokens, así que un tema
  por tokens no los alcanza y quedarían oscuros sobre fondo claro. Un lienzo de datos con tema fijo
  es una decisión legítima; lo que no es legítimo es que quede así sin decidirlo.

**Fuera de alcance, explícitamente:** la migración de literales a tokens, que resuelve
`unificar-paleta-carbon-soul`. No es una separación de conveniencia sino una dependencia dura: el
filtro alcanza los literales y un tema por tokens no. Mientras queden literales sin migrar, retirar
el filtro los deja con color de tema oscuro sobre fondo claro.

## Capabilities

### New Capabilities

- `ui-theme-light`: el tema claro como conjunto declarado de valores, con contraste verificado en
  ambos temas y tratamiento explícito de las superficies de tema fijo.

### Modified Capabilities

Ninguna. `ui-color-source` sigue rigiendo de dónde sale el color; este change agrega qué valor toma
ese color en cada tema.
