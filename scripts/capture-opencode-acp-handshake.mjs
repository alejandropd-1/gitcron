import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const MAX_STDOUT_BYTES = 64 * 1024;
const MAX_STDERR_BYTES = 16 * 1024;
const TIMEOUT_MS = 10_000;

const executableArg = process.argv[2];
if (!executableArg) {
  throw new Error('Usage: node scripts/capture-opencode-acp-handshake.mjs <absolute-opencode-exe>');
}

const executable = realpathSync(executableArg);
if (basename(executable).toLowerCase() !== 'opencode.exe') {
  throw new Error('Expected an absolute path resolving to opencode.exe');
}

const allowedEnvironmentKeys = [
  'SystemRoot',
  'WINDIR',
  'PATH',
  'Path',
  'PATHEXT',
  'TEMP',
  'TMP',
  'APPDATA',
  'LOCALAPPDATA',
  'USERPROFILE',
];

const childEnvironment = Object.fromEntries(
  allowedEnvironmentKeys.flatMap((key) => (
    process.env[key] === undefined ? [] : [[key, process.env[key]]]
  )),
);

const fixtureRoot = mkdtempSync(join(tmpdir(), 'gitcron-f03-acp-'));

function readVersion() {
  const result = spawnSync(executable, ['--version'], {
    cwd: fixtureRoot,
    env: childEnvironment,
    encoding: 'utf8',
    shell: false,
    timeout: TIMEOUT_MS,
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('OpenCode version probe failed');
  return result.stdout.trim();
}

function sanitizeResponse(message) {
  const result = message?.result ?? {};
  const info = result.agentInfo ?? {};
  const authMethods = Array.isArray(result.authMethods) ? result.authMethods : [];
  return {
    jsonrpc: message?.jsonrpc ?? null,
    id: message?.id ?? null,
    result: {
      protocolVersion: result.protocolVersion ?? null,
      agentCapabilities: result.agentCapabilities ?? null,
      agentInfo: {
        name: info.name ?? null,
        title: info.title ?? null,
        version: info.version ?? null,
      },
      authMethodCount: authMethods.length,
      authMethodFieldSets: authMethods.map((method) => Object.keys(method).sort()),
    },
  };
}

async function captureHandshake() {
  const child = spawn(executable, ['acp', '--cwd', fixtureRoot], {
    cwd: fixtureRoot,
    env: childEnvironment,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stdoutBuffer = '';
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let response = null;
  let failure = null;

  const responsePromise = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        reject(new Error('ACP stdout exceeded capture limit'));
        return;
      }
      stdoutBuffer += chunk.toString('utf8');
      for (;;) {
        const newlineIndex = stdoutBuffer.indexOf('\n');
        if (newlineIndex < 0) return;
        const line = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id !== 0) continue;
        if (message.error) {
          reject(new Error(`ACP initialize failed with code ${message.error.code ?? 'unknown'}`));
          return;
        }
        response = sanitizeResponse(message);
        resolve();
        return;
      }
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_STDERR_BYTES) reject(new Error('ACP stderr exceeded capture limit'));
    });
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('ACP initialize timed out')), TIMEOUT_MS).unref();
  });

  const initializeRequest = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: 1,
      clientCapabilities: {},
      clientInfo: {
        name: 'gitcron-fixture',
        title: 'GitCron Fixture',
        version: '0.0.0',
      },
    },
  };

  child.stdin.write(`${JSON.stringify(initializeRequest)}\n`);

  try {
    await Promise.race([responsePromise, timeoutPromise]);
  } catch (error) {
    failure = error;
  } finally {
    child.stdin.end();
    if (child.exitCode === null && !child.killed) child.kill();
  }

  const closeResult = await new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve({ exitCode: child.exitCode, signal: child.signalCode });
      return;
    }
    const cleanupTimer = setTimeout(() => {
      if (child.exitCode === null && !child.killed) child.kill('SIGKILL');
    }, 2_000);
    child.once('close', (exitCode, signal) => {
      clearTimeout(cleanupTimer);
      resolve({ exitCode, signal });
    });
  });

  if (failure) throw failure;
  if (!response) throw new Error('ACP initialize produced no matching response');

  return {
    schemaVersion: '1.0',
    fixtureType: 'real-sanitized-acp-initialize',
    runtime: 'opencode',
    runtimeVersion: readVersion(),
    transport: 'acp-ndjson-stdio',
    request: initializeRequest,
    response,
    capture: {
      inferenceRequested: false,
      sessionCreated: false,
      stderrBytes,
      ownedProcessClosed: closeResult.exitCode !== null || closeResult.signal !== null,
    },
  };
}

try {
  const fixture = await captureHandshake();
  process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
