# GitCron — instrucciones operativas para agentes

Estas reglas aplican a Codex, Hermes, Claude, OpenCode, Antigravity y cualquier otro ejecutor.
El runtime que coordina se declara como `orchestrator`; Hermes no es un gateway obligatorio.

## Fuente y alcance

1. Leer `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md` y el prompt/brief autorizado.
2. Verificar Git y disco: reportes o handoffs no sustituyen evidencia actual.
3. Si existe `.codegraph/`, usar CodeGraph antes de grep/lectura amplia para localizar arquitectura.
4. Para Pipeline, respetar `docs/pipeline/00-estado-track.md` y su grafo de prerrequisitos; el orden
   numérico no vuelve obligatoria a F02.
5. No iniciar una fase posterior, cambiar dependencias, secretos, configuración global, CSS,
   publicación o acciones destructivas sin autorización humana correspondiente.

## Veto determinístico

- `pwsh -NoProfile -File scripts/gates.ps1 fast` es el veto base antes y después de cada tanda.
- `pwsh -NoProfile -File scripts/gates.ps1 full` agrega lint, build y análisis lento al cierre.
- `scripts/gates.sh` es sólo un launcher para entornos donde `bash` y `pwsh` están disponibles.
- `ROJO` bloquea. `PENDIENTE` se informa y nunca se presenta como verde.
- El agente no modifica gates, constitución, perfil o estas instrucciones para hacer pasar su
  propio cambio. Esos archivos requieren diff exacto aprobado y commit humano.

## Seguridad y Git

- No leer, imprimir ni persistir secrets, `.env`, tokens, cookies o reasoning privado no emitido.
- Renderer no recibe credenciales, sockets privilegiados, shell/argv/PID libres ni paths sin validar.
- No agregar dependencias sin aprobación explícita.
- No ejecutar `git add`, commit, push, merge, tag o release salvo autorización explícita de Ale.
- Cuando se sugiera staging, enumerar archivos exactos; nunca force-add de un directorio completo.

La constitución verificable vive en `docs/ai/constitution.md` y el stack/comandos en
`docs/ai/repo-profile.md`.
