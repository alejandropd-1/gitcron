# Tasks

## 1. Fijación exacta en la instalación local (proceso principal)

- [ ] 1.1 En `electron/pipeline/package-manager.ts`, `getPackageManagerInstallArgs` acepta un indicador opcional de exactitud y, en modo local, agrega `--save-exact` (pnpm, npm) o `--exact` (yarn, bun); sin el indicador los argumentos no cambian. Verificar con pruebas unitarias de los cuatro gestores, con y sin indicador, y que el modo global lo ignora.
- [ ] 1.2 En `electron/pipeline/openspec-install.ts`, `installOpenSpecLocal` lee el `package.json` del repositorio antes de ejecutar y pide exactitud sólo si la entrada de `@fission-ai/openspec` (en `devDependencies` o `dependencies`) es una versión exacta sin prefijo; rango o ausencia → sin indicador. `commandExecuted` muestra el indicador. Verificar con pruebas que inyectan el lector de archivos: exacta `1.5.0` → comando con `--save-exact`; `^1.5.0` → sin indicador; sin entrada → sin indicador; `package.json` ilegible → sin indicador y la instalación sigue.

## 2. Verificar la versión pedida (dominio)

- [ ] 2.1 En `components/pipeline/pipeline-domain.ts`, agregar al lado de `assessOpenSpecEngineAfterInstall` (sin cambiar su firma ni a sus consumidores) una evaluación que recibe el estado recalculado y la versión pedida: `ok` sólo si pasan las comprobaciones existentes **y** la versión que responde es igual a la pedida por comparación semver (`lib/openspec-version.ts`); si responde otra, `version-mismatch` con versión pedida, respondida y procedencia; `broken` y `unverified` como hoy. Verificar con pruebas unitarias de los cuatro veredictos, incluido el caso OdontoPau (pedida 1.13.2, responde 1.5.0 con procedencia `local`).

## 3. El recorrido combinado actualiza donde vive el motor

- [ ] 3.1 `OpenSpecUpdateReview.tsx` pasa al runner la procedencia del motor resuelto (`status.cli.provenance`) junto con `installed` y `latest`. El texto del plan cambia según la procedencia: local → «actualizar el motor de este repositorio a v{{latest}}», global → el texto actual («…en toda la máquina…»), en `es`, `en` y `zh` de `lib/i18n.ts`. Verificar con pruebas del runner que muestran cada texto según la procedencia.
- [ ] 3.2 En `OpenSpecUpdateRunner.tsx`, con procedencia `local` el paso del motor llama `installLocal({ repoPath, targetVersion: latest })` y nunca `installGlobal`; con `global`, `installGlobal({ repoPath, targetVersion: latest })`. Verificar actualizando `pipeline-openspec-update-runner.test.tsx`: la expectativa actual `toHaveBeenCalledWith({ repoPath: '/mock/repo' })` pasa a incluir `targetVersion`, y se agrega el caso local que comprueba que `installGlobal` no se llama.
- [ ] 3.3 Con procedencia `managed` o `unknown`, el paso del motor no ofrece ejecutar: se declara no disponible con un texto que dice por qué (en los tres idiomas), y si había integración planeada, no corre en el mismo recorrido. Verificar con prueba del runner que no llama a ningún canal de instalación.
- [ ] 3.4 El runner usa la evaluación de 2.1 con `targetVersion = latest`. Con `version-mismatch` el paso falla con un texto que dice versión pedida, versión que respondió y de dónde salió (local del repositorio / sistema), y la integración no corre (`stoppedAfterEngine`). El cartel «Listo: motor v…» no aparece. Verificar con una prueba que reproduce OdontoPau: instalación exitosa, estado recalculado con 1.5.0 local, pedida 1.13.2 → paso fallido, `runUpdate` sin llamar, sin «Listo».
- [ ] 3.5 «Volver a la versión anterior» vuelve por el mismo canal por el que se instaló, con `targetVersion: installed`, y verifica con la evaluación de 2.1. Verificar con pruebas: tras actualizar local, volver atrás llama `installLocal` y no `installGlobal`; tras actualizar global, llama `installGlobal`.

## 4. Confirmación global dentro del recorrido

- [ ] 4.1 Con procedencia `global`, tocar «Actualizar» no instala: muestra la confirmación global con comando, ruta del gestor y repositorios abiertos afectados (comando y gestor del canal `pipeline:openspec:install-plan`; repositorios de `openRepoPaths`, que `OpenSpecUpdateReview` ya recibe). Confirmar ejecuta **una sola** instalación y el recorrido sigue con la verificación de 3.4 y la integración; cancelar no invoca ningún gestor y deja el botón como estaba. Verificar con pruebas del runner: antes de confirmar, `installGlobal` no se llamó; después, se llamó una vez; al cancelar, cero veces. La advertencia de rama `main` / árbol sucio sigue apareciendo antes, como hoy.
- [ ] 4.2 Con procedencia `local` no aparece la confirmación global (la instalación local es reversible con Git). Verificar con prueba del runner.

## 5. Integración

- [ ] 5.1 Correr `pnpm verificar` en la rama del cambio y dejar todo en verde (build, pruebas ×2, tipos, eslint sobre lo tocado, `openspec validate --strict`, `git diff --check`, trampas).
- [ ] 5.2 Revisión en pantalla (la marca Alejandro): en OdontoPau, sin confirmar lo que quede, el plan dice «actualizar el motor de este repositorio a v1.13.2»; al correr, el `package.json` queda con `"@fission-ai/openspec": "1.13.2"` exacto y el lockfile modificados sin confirmar, el motor responde 1.13.2 y la integración escribe archivos. En gitCronos (motor del sistema) aparece la confirmación global antes de instalar. Descartar después en OdontoPau los cambios de prueba si Alejandro no quiere quedarse con la actualización.
