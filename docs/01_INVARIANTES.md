# GitCron — Invariantes (aplican a TODO change, sin excepción)

> Estas reglas son condición de aceptación. Si una invariante choca con "que funcione",
> **pará y preguntá**. No degrades nada para destrabar algo.

## Seguridad

1. **Secretos cifrados por OS.** Tokens y API keys SOLO con Electron `safeStorage`
   (DPAPI/Keychain/libsecret) en `userData`. Nunca `localStorage`, nunca env var en texto
   plano, nunca disco sin cifrar.
2. **Secretos nunca en el renderer.** Las keys viven y se usan SOLO en el proceso main.
   El renderer solo conoce un booleano "existe" (+ fingerprint SHA-256 de 8 hex).
3. **Secretos nunca logueados.** Todo `console.*` y todo lo que vuelve al renderer pasa
   por `sanitizeForLog()`. Proveedor nuevo de auth ⇒ extender el sanitizador.
4. **CSP estricta.** `connect-src` solo: api.github.com, github.com, openrouter.ai (+ el
   endpoint del proveedor activo si cambia). Todo dominio nuevo se documenta en
   `SECURITY.md`. `'unsafe-eval'` / localhost siguen siendo dev-only.
5. **Electron baseline intacto.** `contextIsolation: true`, `nodeIntegration: false`,
   `sandbox: true`, `webSecurity: true`. Guard de navegación y contención de paths
   `app://` de v1.8.0 no se tocan.

## Funcionalidad

6. **La lógica de Git no cambia de comportamiento** en fases de refactor/visuales. Las
   únicas escrituras de Git nuevas permitidas son las que el brief de la fase autorice
   explícitamente, siempre con confirmación del usuario para acciones destructivas.
7. **Features vivas intocables:** i18n ES/EN/ZH, Temporal Agent completo (predicciones,
   FUTUROS, Centauro, materialización, SQLite, providers), ramas `imagined/*` y tags
   `flight/*`, vista cronométrica + pan/zoom, conflict resolver (dentro del cuerpo
   central, no modal flotante), stash avanzado, clean untracked, GitHub auth.
8. **Toda string de UI via `lib/i18n.ts`** con sus tres idiomas (ES fuente de verdad;
   EN y ZH completos). Nada hardcodeado.
9. **`node:sqlite` con prefijo `node:` preservado** (tsup external + onSuccess patch en
   `tsup.config.ts`). No "arreglar" imports quitando el prefijo.
10. **Cero predicciones de IA en testing.** Usar el caché (`ai:load-prediction`) o mocks.
    Disparar OpenRouter consume crédito real de Ale — solo él lo dispara.

## Estética

11. **La estética GitCron es oscura, sobria y con aire.** Paleta "The Compiled Carbon Soul" y
    glass sobrio. La estructura es la de una aplicación de trabajo: la barra lateral y la
    superior comparten el fondo del armazón, el cuerpo se apoya sobre un fondo propio y se
    separa de ellas con esquina redondeada, y los paneles laterales se muestran u ocultan
    desde controles visibles. Mucha información no se resuelve apretándola: se resuelve con
    espaciado, jerarquía y una escala de tamaños que se respeta. Lo especulativo (IA)
    jamás puede confundirse visualmente con lo real.
    - **Una sola paleta, declarada, y ninguna propia.** Todo color de la aplicación sale de
      los tokens de `app/globals.css`. Ninguna vista, panel ni componente define colores
      propios, ni "para este caso", ni por conveniencia de un momento. Agregar un color a la
      paleta es una decisión de Ale, igual que escribir una regla. El caso que lo motiva es
      real y está a la vista: la vista Pipeline construyó su propia paleta en su hoja de
      estilos, de modo que al cambiar la general quedó desafinada respecto del resto de la
      aplicación; y el verde de éxito, elegido para la paleta anterior, sobrevive en la nueva
      desentonando por saturación aunque cumpla el contraste exigido. Una paleta que se
      respeta en cuatro pantallas y se reinventa en la quinta no es una paleta.
      *(Agregado el 2026-08-20 por decisión de Ale.)*
    - **Revisado el 2026-08-19 por decisión de Ale.** Se retiran dos cláusulas que
      empujaban a comprimir la interfaz: «denso» —leído como justificación para achicar
      texto y quitar espacio— y «nada de landing pages ni textos explicativos dentro de la
      app». Lo que se conserva es la sobriedad: sin decoración, sin héroes, sin prosa que
      no aporte. La referencia declarada son las aplicaciones de trabajo del estilo de
      Codex o Unsloth, que muestran tanta información como GitCron y se leen sin esfuerzo.
12. Geometría de `ChronometricGraph.tsx` / `CommitGraph.tsx`: no tocar sin validación
    visual explícita de Ale.

## Proceso

13. **Un change por vez.** El alcance es el que declaran los artefactos OpenSpec del change.
    Lo que no está en el change no es parte del trabajo; si hace falta, se amplía el change.
14. **Cierre obligatorio:** `pnpm exec tsc --noEmit` en 0 + `pnpm test` verde +
    `openspec validate <change> --strict` válido + **STOP**. Un reporte en `docs/reports/` no es
    obligatorio, pero sigue siendo la forma de dejar registrado lo que las comprobaciones no
    demuestran: qué se tocó, qué no, y el resultado real —incluido "no mejoró"—.
15. **Scope cerrado.** No tocar `README.md` ni `CHANGELOG.md` mientras se implementa —
    la documentación se actualiza en una pasada propia al cierre, indicada por Ale.
16. **No revertir cambios ajenos.** No eliminar código sólo porque un análisis marque
    complejidad: confirmar primero con CodeGraph que no sostiene features vivas.
17. **Fallow y CodeGraph son rutinas que pide Ale**, no automatismos del cierre.
18. Ante cualquier ambigüedad de alcance: **preguntar, no asumir.**
19. **Una suite que no termina no está en verde, y ningún recorrido del disco puede
    ser infinito.** Dos caras del mismo caso real (2026-08-14, change
    `actualizar-integracion-openspec-1-8`): `computeDirContentHash` recorría carpetas
    con una cola **sin tope de profundidad ni registro de lo ya visitado**, y cuatro
    tests le pasaban un `readdir` falso que devolvía las mismas entradas para toda ruta
    que contuviera `.agents`. El resultado fue un bucle **sincrónico** infinito: los
    ~1215 tests pasaban, se imprimía verde, y el proceso no salía nunca.
    - **No se sube un `testTimeout` para destrabar una suite.** Un timeout de test no
      puede interrumpir un bucle sincrónico: subirlo de 5 a 15 s no arregló nada y
      además tapó el síntoma. Si la suite no devuelve exit code, se aísla el archivo
      (bisección por grupo y por tanda), no se afloja el reloj.
    - **`pnpm test` cuenta sólo con exit code observado.** "Vi verde en pantalla" no es
      evidencia: el verde se imprime antes del cierre del proceso.
    - **Todo recorrido de directorios en el proceso principal lleva tope** de
      profundidad y de entradas, y corta ante lo ya visitado. Congelar el main de
      Electron congela la aplicación entera y no se puede cancelar.
    - **Un doble de disco no puede describir un árbol infinito.** Si el `readdir`
      falso responde por coincidencia de subcadena (`p.includes('.agents')`), todo
      descendiente vuelve a coincidir. Los dobles se anclan a rutas exactas.
20. **Cuando un parámetro cambia de rol, hay que re-auditar todos sus callers.** Caso real
    (2026-08-16, change `actualizar-integracion-openspec-1-8`): `repoPath` servía sólo para
    **etiquetar** la procedencia del CLI —la resolución siempre recorría el `PATH`—, así que
    una ruta sin validar era inofensiva. Al agregar la resolución local al proyecto, ese
    mismo `repoPath` pasó a **decidir qué binario se ejecuta**
    (`<repoPath>/node_modules/.bin/openspec`). El parámetro no cambió de nombre ni de tipo:
    cambió de poder, y ningún compilador avisa de eso.
    - **Un control de seguridad duplicado se desincroniza.** Había **cinco** copias de
      `validRepoPath` y sólo una exigía autorización; las otras cuatro habían quedado viejas
      cuando esa se endureció. Guarda compartida, una sola definición.
    - **Ampliar el poder de un parámetro es cambiar su superficie de ataque.** Antes de
      hacerlo, listar sus callers y comprobar qué valida cada uno. La revisión no es del
      código nuevo: es de todo lo que ya le pasaba ese valor.
    - **Ejecutar algo que vino con un repositorio es una superficie de confianza nueva.**
      Va con contención verificada tras canonicalizar (un symlink no puede sacar la
      ejecución fuera del repo) y con la autorización exigida en el borde **y** en la
      resolución, para que un caller futuro no reabra el agujero.
21. **Una prueba sólo vale si el camino que ejercita es el que corre en
    producción.** Caso real (2026-08-18, change
    `actualizar-openspec-desde-la-herramienta`): tres defectos distintos,
    los tres con cobertura verde, los tres invisibles para la revisión de
    código.
    - **El caller es parte de la prueba.** `deriveUpdateMatrixAction`
      (`lib/openspec-update-guide.ts`) recibía los tres ejes y derivaba la
      acción correctamente, con su test llamándola de verdad y fallando
      ante el sabotaje. Pero la decisión que veía el usuario se tomaba en
      `electron/pipeline/openspec-preview.ts`, con un `if/else` paralelo
      que nadie tocó. Antes de dar por cubierta una función, buscar sus
      callers **fuera** de `__tests__`: si no los tiene, lo que se probó
      es una segunda implementación, no el sistema.
    - **Un contrato con un proceso externo se verifica ejecutándolo.**
      `statusOpenSpecChangeWithCli` invocaba
      `['status', changeId, '--json']` y su test afirmaba ese argv exacto.
      La firma real del CLI es `openspec status --change <id> --json`,
      idéntica en 1.5.0 y en 1.9.0; la forma posicional devuelve
      `too many arguments` y exit 1. La función estaba cableada en
      producción (`electron/pipeline/repo-evidence-reader.ts`) y **nunca
      devolvió un dato real**. Un test que fija el argv fija la creencia
      del que lo escribió, no el contrato del programa del otro lado: el
      contrato se comprueba corriendo el binario una vez y pegando su
      salida.
    - **Probar el caso que funciona no es cobertura.** La tarjeta del
      motor armaba la clave i18n por interpolación
      (`versionClass.${cli.versionClass}`), generando `too-old` cuando la
      clave definida era `tooOld`. Como `translate()` devuelve la clave
      ante ausencia, la pantalla mostraba `pipeline.openspec.engine.…`
      crudo. El test cubría únicamente `supported` —el único de los cuatro
      valores que funcionaba—. Cuando un valor viene de una unión de
      tipos, el test recorre **todos** sus miembros, no el representativo.
    - **Las claves i18n no se arman por interpolación.** Un `t()` con
      template no falla en compilación ni en runtime: degrada a texto
      crudo en pantalla. Mapa explícito de valor a clave, siempre.
    - **El sabotaje mide lo que toca, no lo que uno cree que toca.**
      Desactivar la protección y ver el test en rojo demuestra que el test
      depende de ese código; no demuestra que ese código gobierne la
      aplicación. Cuando la corrección es una delegación, el sabotaje
      tiene que hacer fallar un test **del otro lado** de la delegación.

22. **Una comprobación automática vale lo que abarca.** Una verificación que
    recorre un **conjunto** de archivos para hacer cumplir una regla declara,
    en su propio archivo, cuáles recorre y cuáles deja afuera, con el motivo.
    La que promete más de lo que mira es peor que no tenerla: da permiso.
    - **Alcance de esta regla.** Aplica a las que recorren un conjunto —listas
      blancas, escaneos de hojas de estilo o de componentes, comprobaciones de
      escala, de color, de tamaño de objetivo—. **No** aplica a la prueba que
      lee un archivo puntual: un fixture, la salida de un binario, un
      artefacto. Y **no obliga a reescribir lo que ya está**: rige para lo que
      se escriba o se toque de acá en adelante.
    - **No alcanza con recorrer: hay que notar cuando se deja de recorrer.**
      Una verificación con línea de base tiene que fallar también cuando una
      violación declarada **desaparece**, porque eso es o progreso —y hay que
      podar la lista— o el escáner que se quedó ciego. Las dos ameritan que
      alguien mire.
    - **Casos reales del change `compartir-paneles-laterales-entre-vistas`,
      2026-08-24.** `visual-scale-scan` escaneaba `app/globals.css` y una hoja
      de módulo, y ningún `.tsx`: pasaba en verde con 95 tamaños literales
      fuera de escala, que están justamente en los `.tsx`. La prueba «los
      componentes del armazón no declaran líneas de borde de maqueta» miraba
      la barra de título, dos `aside` y el `main`, y nunca entraba al interior
      de los paneles: dos `divide-y` nuevos pasaron sin que nadie los viera. Y
      la lista blanca de bordes de `commit-graph-frame` conservaba la entrada
      `/\.railTabs/` protegiendo una regla que ya estaba muerta. Las dos
      primeras las corrigen las tareas 1.5 y 1.6 de
      `unificar-paleta-carbon-soul`.

23. **Un token se elige por lo que significa, no por su valor.** Dos tokens con
    el mismo valor hexadecimal no son intercambiables si nombran cosas distintas,
    y elegir por valor reintroduce la confusión que el token vino a resolver.
    - **El caso real del change `unificar-paleta-carbon-soul`, 2026-08-26.**
      `--color-warning` (#d8a657) se agregó en `unificar-paleta-carbon-soul` como
      el único token nuevo del change, justamente para no colapsar «atención del
      sistema» con «archivo modificado» (`--color-git-mod`, #fd9d1a). Al migrar
      `components/TemporalAgentSettings.tsx` se eligió `--color-git-mod` porque su
      valor era idéntico al literal viejo, y ocho elementos que avisan de costo, de
      clave faltante y de error quedaron pintados como si fueran modificaciones de
      archivo. El nombre que se le puso a la constante —`COLOR_WARNING` apuntando a
      `git-mod`— fue la evidencia de que el rol real era el otro. Costó una tanda
      entera detectarlo y otra corregirlo.

24. **En Tailwind CSS v4, las clases arbitrarias de tamaño exigen prefijo de tipo.**
    La utilidad `text-[...]` es sobrecargada: por omisión Tailwind la resuelve como
    color (`color: var(...)`), no como tamaño tipográfico (`font-size: var(...)`), a
    menos que el valor tenga una unidad evidente o lleve el prefijo explícito
    `text-[length:var(--font-size-*)]`. Sin el prefijo `length:`, una clase como
    `text-[var(--font-size-*)]` genera `color: var(--font-size-*)` en el CSS compilado,
    dejando el texto con el tamaño heredado y un color roto.
    - **El caso real del change `unificar-paleta-carbon-soul`, 2026-08-27.**
      Al migrar encabezados y rótulos a tokens tipográficos con clases arbitrarias de
      Tailwind, `text-[var(--font-size-*)]` (como `lg` o `xs`) compilaron silenciosamente a
      propiedades de `color`. Se construyó la guarda `lib/__tests__/font-size-as-color.test.ts`
      y la directiva `@source not` en `app/globals.css` para verificar el CSS generado
      en build y asegurar que ningún token `--font-size-*` termine emitiéndose en una
      propiedad `color`.

25. **Un fallo de `pnpm build` con `ENOENT ...nft.json` es caché stale y se cura con `rm -rf .next`.**
    Cuando Next.js completa la compilación con éxito pero falla en la fase de recolección
    de trazas de empaquetado (`Collecting build traces...`) con error de tipo
    `ENOENT: no such file or directory, open '...nft.json'`, la causa es un estado residual
    o inconsistente de compilaciones previas en el directorio `.next/`.
    - **Regla de recuperación.** No alterar código ni configuración ante este fallo.
      La solución operativa es purgar el directorio de compilación (`rm -rf .next` o
      `Remove-Item -Recurse -Force .next` en PowerShell) y relanzar `pnpm build`. En
      cambios que modifican módulos CSS o configuración de compilación, limpiar `.next`
      antes de construir evita falsos negativos.
