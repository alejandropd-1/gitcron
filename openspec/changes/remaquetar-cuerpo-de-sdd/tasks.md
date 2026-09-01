# Tareas

Las fases se envían por separado. Cada una se valida entera antes de pasar a la siguiente, y entre
fase y fase hay revisión visual de Alejandro. Este change no arranca hasta que
`unificar-paleta-carbon-soul` esté cerrado: buena parte de lo que hoy se ve mal es color y escala, y
juzgar la disposición a través de ese ruido lleva a decidir dos veces.

## 0. Adelantado fuera de este change

Se hizo el 2026-08-26 dentro de `unificar-paleta-carbon-soul`, porque Alejandro lo vio mirando la
aplicación y no tenía sentido dejarlo roto hasta que este change arranque. Queda anotado para que no
se releve dos veces.

- [x] 0.1 Convención de chevrons en acordeones: **cerrado apunta abajo, abierto apunta arriba**, y el
  indicador se ve siempre —antes era `opacity-0 group-hover:opacity-100`, o sea invisible hasta pasar
  el mouse—. Tocados: `RepoSidebarParts.tsx:68`, `:341` y `:588`, `GitFailureNotice.tsx:73`,
  `ChangelogPreview.tsx:99` y la regla `.changeToggle svg` de `OpenSpecDashboard.module.css:157`.
  Cubierto por una prueba nueva en `components/__tests__/navigation-and-controls.test.tsx`.
- [x] 0.2 El panel de IA del centro de SDD no se distinguía del fondo: `.aiPanel` declaraba un velo
  del 2% mientras `.aiFacts`, que vive adentro, usaba fondo sólido. Pasó a `--color-bg-overlay`, con
  `.aiFacts` hundido en `--color-bg-surface`.

## 1. Relevamiento acumulado

Ocho observaciones de Alejandro entre el 2026-08-24 y el 2026-08-25, con archivo y línea. Están
declaradas acá para que no vivan en el chat, que es donde se pierden.

- [ ] 1.1 Confirmar cada una contra el árbol antes de proponer nada, y declarar las que ya no
  apliquen —el change de la paleta puede haber cambiado alguna—.

  1. **La cabecera ocupa el primer tercio.** Volver, nombre, «Creado 21/08/2026, 07:51», la intención
     en tres renglones **cortada con puntos suspensivos** —ni se lee entera ni se puede saltear—,
     tres solapas y tres botones. Recién después empieza el trabajo.
  2. **El aviso de rama es más grande que los avisos que se retiraron.** Usa `.readiness`, la caja
     del aviso viejo, en `ChangeBranchNotice.tsx:44`.
  3. **Los tres botones pesan igual.** «Continuar con X» es la acción; «Archivar cambio» y «Ver
     diff» son accesorias.
  4. **El avance aparece dos veces:** en la barra del lateral y en el texto del siguiente paso.
  5. **La ficha de tarea dice «No informado» tres de cuatro veces** —Agente, Fuente, Árbol al
     cerrar, Última—.
  6. **Las pastillas de Artefactos se leen como botones.** Ya son solapas por dentro
     (`PipelineDetails.tsx:61`, `role="tab"` sobre `role="tablist"`); lo que falla es el estilo.
  7. **Las fichas de artefactos repiten «HECHO» cuatro veces.** `PipelineArtifactGraph.tsx` — un
     ícono dice lo mismo sin gastar una palabra por ficha.
  8. **El panel de evidencia vive en `app/globals.css`**, no en la hoja de la vista, y tuvo reglas
     duplicadas que hubo que resolver en la paleta.

- [ ] 1.2 Las tres preguntas que decide Alejandro sobre lo relevado, antes de proponer disposición:
  **(a)** Al entrar a un cambio, ¿qué querés ver primero?
  **(b)** Las tres solapas —Trabajo, Actividad, Artefactos—, ¿son tres pantallas o una? Hoy son
  excluyentes: mirando la actividad se pierden de vista las tareas.
  **(c)** La intención del cambio, ¿se lee alguna vez? Si sí tiene que caber; si no, alcanza el
  nombre y se va.
  **Las decide Alejandro.**

## 2. La disposición nueva

- [ ] 2.1 Proponer la disposición sobre lo relevado y lo decidido, sin implementarla. **La decide
  Alejandro.**
- [ ] 2.2 Implementar lo aprobado. Mover, agrupar y jerarquizar lo que ya está: este change no
  agrega información ni la quita.
- [ ] 2.3 Los controles declaran su jerarquía: la acción principal se distingue de las accesorias.
- [ ] 2.4 Las solapas se ven como solapas. Es estilo, no semántica: el rol ya está bien.
- [ ] 2.5 Lo repetido deja de repetirse, según los casos 4, 5 y 7 del relevamiento.
- [ ] 2.6 El panel de evidencia se muda a la hoja de la vista.

## 3. Verificación

- [ ] 3.1 En tests, sostener lo que se decidió: que un bloque no vuelva a duplicarse, que un rótulo
  no falte, que el orden sea el acordado. Afirmar sobre el DOM montado y sobre el orden.
  Una prueba puede sostener una decisión ya tomada; no puede tomarla.
- [ ] 3.2 Declarar qué NO cubre la verificación de este change, declarando qué archivos recorre: una comprobación vale lo que abarca.

## 4. Cierre y validación

- [ ] 4.1 `pnpm build` sin errores.
- [ ] 4.2 `pnpm exec tsc --noEmit` sin errores de tipado.
- [ ] 4.3 `pnpm test` en verde en dos pasadas consecutivas, informando «Test Files» y «Tests».
- [ ] 4.4 `openspec validate remaquetar-cuerpo-de-sdd --strict` en cero.
- [ ] 4.5 `git diff --check` en cero y `git status --short --branch` informado.
- [ ] 4.6 Revisión visual completa: el cuerpo se lee de arriba abajo, lo primero es lo que se va a
  hacer, y nada se dice dos veces. **La marca Alejandro.**
