// Bucle completo de migracion: genera la tanda, se la da al modelo local, verifica,
// y repite. Para al primer problema en vez de seguir a ciegas.
//
//   node scripts/tanda.mjs           una tanda
//   node scripts/tanda.mjs 5         hasta cinco tandas seguidas
//   node scripts/tanda.mjs 99        hasta que no queden archivos aptos
//
// El modelo se elige con la variable OPENCODE_MODEL. Por omision usa el Qwen local.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const MAX = Number(process.argv[2] || 1);
const MODELO = process.env.OPENCODE_MODEL || 'unslothpc/unsloth/Qwen3.8-27B-GGUF';
const t0 = Date.now();

const node = (args) => spawnSync(process.execPath, args, { encoding: 'utf-8' });

// opencode puede ser un .cmd en Windows: se prueban las dos formas
function opencode(prompt) {
  for (const bin of ['opencode', 'opencode.cmd']) {
    const r = spawnSync(bin, ['run', '--model', MODELO, prompt], { encoding: 'utf-8', stdio: 'inherit' });
    if (!r.error) return r;
  }
  return { error: new Error('no se encontro el ejecutable de opencode en el PATH') };
}

let hechas = 0;
for (let i = 1; i <= MAX; i++) {
  console.log(`\n${'─'.repeat(66)}\n  TANDA ${i} de ${MAX}\n${'─'.repeat(66)}`);

  // 1. generar
  const gen = node(['scripts/siguiente-tanda.mjs', '--solo-prompt']);
  if (gen.stdout.includes('No quedan archivos aptos')) {
    console.log('\nNo quedan archivos aptos para el modelo local.');
    console.log('Corre "node scripts/siguiente-tanda.mjs" para ver que queda y por que.');
    break;
  }
  const { archivos, esperado } = JSON.parse(fs.readFileSync('scripts/.ultima-tanda.json', 'utf-8'));
  console.log(`  ${archivos.length} archivo(s), pendiente deberia quedar en ${esperado}\n`);

  // 2. ejecutar. El prompt va como un solo argumento: no pasa por el shell,
  //    asi que los saltos de linea y las comillas viajan intactos.
  const run = opencode(gen.stdout);
  if (run.error) { console.error(`\nNo se pudo invocar opencode: ${run.error.message}`); process.exit(2); }

  // 3. verificar
  console.log(`\n${'─'.repeat(66)}\n  VERIFICANDO\n${'─'.repeat(66)}`);
  const aud = node(['scripts/auditar.mjs']);
  console.log(aud.stdout);
  if (aud.status !== 0) {
    fs.writeFileSync('scripts/.para-claude.txt',
      `Tanda ${i} fallo.\nArchivos: ${archivos.join(', ')}\nPendiente esperado: ${esperado}\n\n${aud.stdout}`);
    console.log('El bucle para aca. El detalle quedo en scripts/.para-claude.txt: pasaselo a Claude.');
    process.exit(1);
  }
  hechas++;
}

const min = Math.round((Date.now() - t0) / 60000);
console.log(`\n${hechas} tanda(s) completada(s) sin problemas, en ${min} min.`);
