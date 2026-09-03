## 1. Por qué no se resuelven

- [ ] 1.1 Medir, con la aplicación corriendo, qué devuelve el descubrimiento para `codex` y
  `opencode`: si el adaptador no encuentra el ejecutable, si lo encuentra y falla al invocarlo, o
  si lo resuelve y el filtro posterior lo descarta. Dejar la medición escrita con archivo y línea.
- [ ] 1.2 Comparar el entorno con que la aplicación resuelve un ejecutable contra el del shell del
  sistema. En Windows un proceso de Electron no hereda el `PATH` del shell del mismo modo, y ésa es
  la primera hipótesis a descartar o confirmar; no se da por buena sin medirla.
- [ ] 1.3 Declarar si `agy` queda fuera por su `launchable: false` y nada más, para no arrastrar a
  `make-agy-launchable` dentro de este cambio.

## 2. Ofrecer lo que está instalado

- [ ] 2.1 Resolver la causa medida en 1.1 y 1.2 de modo que un runtime instalado cuyo adaptador se
  declara lanzable quede lanzable. Si la resolución del ejecutable pasa a compartirse entre
  runtimes, que viva en un solo lugar: hoy cada adaptador la resuelve por su cuenta.
- [ ] 2.2 Un runtime que no se pudo resolver se lista con el motivo real —no «no instalado» si está
  instalado—, con la misma honestidad que ya se le exige a la procedencia del motor OpenSpec.

## 3. Pruebas

- [ ] 3.1 Con dos runtimes instalados y lanzables, el descubrimiento los devuelve a los dos.
- [ ] 3.2 Un runtime instalado que la aplicación no resuelve aparece listado con su motivo y no
  desaparece de la lista.
- [ ] 3.3 Un adaptador con `launchable: false` sigue sin ser lanzable y se lista con su motivo, sin
  que este cambio lo vuelva lanzable por accidente.

## 4. Comprobación en la aplicación

- [ ] 4.1 Abrir el desplegable de runtime y ver ofrecidos los que están instalados, con los que no
  se puedan ofrecer listados y con motivo. **La comprueba Alejandro.**
- [ ] 4.2 Comprobarlo también sobre la aplicación empaquetada, no sólo en desarrollo: la resolución
  de ejecutables es distinta ahí, y es donde la mide la persona que la usa. **La marca Alejandro.**

## 5. Cierre

- [ ] 5.1 `pnpm build` en cero. Va primero: la suite lee el CSS compilado de `out/`.
- [ ] 5.2 `pnpm exec tsc --noEmit` en cero.
- [ ] 5.3 `pnpm test` en verde.
- [ ] 5.4 `pnpm exec eslint` limpio sobre lo tocado.
- [ ] 5.5 `openspec validate descubrir-runtimes-instalados --strict` en cero.
