import type { RuntimeDescriptor } from '../../../types/pipeline';
import { ClaudeStreamNormalizer } from './claude-normalizer';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeStartRequest } from './runtime-adapter';
import { StructuredCliRuntimeAdapter } from './structured-cli-adapter';

const FIXTURE_REF = '';

export const CLAUDE_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'claude-code',
  runtime: 'claude',
  adapterKind: 'native-stream',
  transport: 'stream-json',
  runtimeVersion: '2.1.206',
  protocolVersion: null,
  capabilities: [
    { capabilityId: 'session.start', capabilityVersion: null, availability: 'available', evidenceStatus: 'pending_fixture', targetScopes: ['repo', 'run'], constraints: ['edita archivos con Read, Grep, Glob, Edit, Write', 'permission-mode acceptEdits', 'sin acceso a shell'], evidenceRefs: [] },
    { capabilityId: 'events.stream', capabilityVersion: null, availability: 'available', evidenceStatus: 'pending_fixture', targetScopes: ['session'], constraints: ['bounded JSONL'], evidenceRefs: [] },
    { capabilityId: 'telemetry.snapshot', capabilityVersion: null, availability: 'available', evidenceStatus: 'pending_fixture', targetScopes: ['run', 'session'], constraints: ['billing semantics remain unknown'], evidenceRefs: [] },
    { capabilityId: 'session.resume', capabilityVersion: null, availability: 'unknown', evidenceStatus: 'pending_fixture', targetScopes: ['session'], constraints: ['effect not tested'], evidenceRefs: [] },
  ],
};

/**
 * Superficie de herramientas de una sesión de Apply.
 *
 * `Edit` y `Write` están porque sin ellas la sesión no puede completar una tarea
 * ni marcarla en `tasks.md`: el ciclo Apply quedaba decorativo.
 *
 * `Bash` queda **deliberadamente afuera**. Editar archivos es acotado y visible
 * en el diff; ejecutar comandos arbitrarios no lo es, y habilitarlo desde un
 * botón daría acceso a `git push`, borrado y red. Si alguna sesión necesita
 * correr tests, eso se decide y se audita aparte.
 */
const CLAUDE_TOOLS = 'Read,Grep,Glob,Edit,Write';

function buildClaudeArgs(request: RuntimeStartRequest): string[] {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    // `manual` es inservible en modo headless: no hay quién responda el pedido
    // de permiso y la sesión se cuelga en la primera escritura. `acceptEdits`
    // acepta ediciones de archivo sin habilitar todo lo demás.
    '--permission-mode', 'acceptEdits',
    `--tools=${CLAUDE_TOOLS}`,
    `--allowedTools=${CLAUDE_TOOLS}`,
  ];
  if (request.requestedModel) args.push('--model', request.requestedModel);
  return args;
}

export function createClaudeRuntimeAdapter(
  canonicalRepoPath: string,
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): StructuredCliRuntimeAdapter {
  return new StructuredCliRuntimeAdapter(canonicalRepoPath, {
    descriptor: CLAUDE_DESCRIPTOR,
    executable: 'claude',
    versionArgs: ['--version'],
    matchesFixtureVersion: (output) => output === '2.1.206 (Claude Code)',
    buildArgs: buildClaudeArgs,
    createNormalizer: () => new ClaudeStreamNormalizer(),
    evidenceRef: FIXTURE_REF,
  }, runner, now);
}
