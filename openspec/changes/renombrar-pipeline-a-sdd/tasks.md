# Tareas

## 1. Relevamiento

- [ ] 1.1 Buscar en todo el árbol dónde se lee «Pipeline» en pantalla, y distinguir esas apariciones
  de las que son identificador interno —claves, nombres de capacidad, de archivo y de componente—.
  Declarar la lista en el reporte. El relevamiento previo contó nueve valores en `lib/i18n.ts`; esta
  tarea confirma que no hay ninguno más escrito dentro de un componente.
- [ ] 1.2 Si aparece alguno escrito dentro de un componente, declararlo: es un incumplimiento del
  invariante 8 y se corrige llevándolo a `lib/i18n.ts`, no reemplazando el literal en el JSX.

## 2. El rótulo

- [ ] 2.1 Cambiar a `SDD` el valor de `tab.pipeline` en ES, EN y ZH.
- [ ] 2.2 Cambiar a `SDD` el valor de `pipeline.title` en los tres idiomas.
- [ ] 2.3 Ajustar `pipeline.hud.title` en los tres idiomas para que nombre a SDD conservando lo que
  la frase dice —es el estado de la vista, no su título—.
- [ ] 2.4 Ajustar `shortcuts.pipelineTab` en los tres idiomas del mismo modo.
- [ ] 2.5 **Las claves NO se renombran.** `tab.pipeline` sigue llamándose así aunque devuelva `SDD`.
  Renombrarlas obligaría a tocar los 107 archivos que las consumen sin que nadie note la diferencia.
- [ ] 2.6 **El identificador interno de vista NO se toca.** `activeTab === 'Pipeline'` sigue diciendo
  `'Pipeline'`: gobierna qué se renderiza, no es un texto.

## 3. Pruebas

- [ ] 3.1 Actualizar las aserciones existentes que fijan el rótulo visible de la vista. Reescribirlas,
  no borrarlas, y declarar en el reporte cuáles cambiaron.
- [ ] 3.2 Cubrir que la vista se nombra `SDD` en los tres idiomas, leyendo de `lib/i18n.ts` y no de un
  doble que devuelva la cadena que el test quiere oír.
- [ ] 3.3 Cubrir que ninguna superficie visible sigue diciendo «Pipeline» ni `流水线`.
- [ ] 3.4 Verificar que el test de paridad de claves sigue en verde: no se agregan ni se retiran
  claves, sólo cambian valores.

## 4. Cierre y validación

- [ ] 4.1 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 4.2 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests» de cada
  una.
- [ ] 4.3 `openspec validate renombrar-pipeline-a-sdd --strict` en cero.
- [ ] 4.4 `git diff --check` en cero y `git status --short --branch` informado, sin confirmar nada en
  Git.
- [ ] 4.5 Informar cuántos valores se cambiaron y confirmar que ninguna clave se renombró.
- [ ] 4.6 Revisión visual en la aplicación: el desplegable de vistas dice SDD, el título de la vista
  dice SDD, el atajo la nombra SDD, y nada quedó diciendo Pipeline. **La marca Alejandro.**
