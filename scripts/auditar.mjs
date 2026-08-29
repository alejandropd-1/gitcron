import { execSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
let archivos = args.filter(a => !/^[0-9]+$/.test(a));
const nums = args.filter(a => /^[0-9]+$/.test(a));
let esperado = nums.length ? Number(nums[nums.length-1]) : null;

// Sin argumentos se audita la ultima tanda que pidio siguiente-tanda.mjs
if (!archivos.length) {
  try {
    const u = JSON.parse(fs.readFileSync('scripts/.ultima-tanda.json', 'utf-8'));
    archivos = u.archivos; if (esperado === null) esperado = u.esperado;
    if (typeof u.exento === 'number') globalThis.__exentoEsperado = u.exento;
    console.log(`  (auditando la ultima tanda pedida: ${archivos.length} archivos)\n`);
  } catch {
    console.error('No hay tanda anotada. Corre primero: node scripts/siguiente-tanda.mjs');
    console.error('O pasale los archivos a mano: node scripts/auditar.mjs <archivo...> <numero>');
    process.exit(2);
  }
}

const sh = (c) => { try { return { out: execSync(c, {encoding:'utf-8', stdio:['ignore','pipe','pipe']}), code: 0 }; }
                    catch (e) { return { out: (e.stdout||'') + (e.stderr||''), code: e.status ?? 1 }; } };
const sinColor = (s) => s.replace(/\[[0-9;]*m/g, '');
const fallos = [];
const L = (k, v) => console.log('  ' + k.padEnd(13) + v);

// 1 y 2. por cada archivo: literales que quedaron, y que el diff toque solo escala
for (const archivo of archivos) {
  const src = fs.readFileSync(archivo, 'utf-8');
  // Cubre px y rem en las dos formas de escritura. Hasta el 2026-08-28 no veia
  // text-[Nrem] ni fontSize:'Npx', asi que informaba 0 literales en archivos que si
  // los tenian (ContextMenus.tsx, con 0.8125rem y 0.625rem): era un falso verde.
  const lit = (src.match(/text-\[\d+(\.\d+)?(px|rem)\]|fontSize:\s*'?[\d.]+(px|rem)?'?/g) || []).length;
  const tok = (src.match(/var\(--font-size-|var\(--space-|var\(--radius-/g) || []).length;
  const ajenas = sh(`git diff -- "${archivo}"`).out.split('\n')
    .filter(l => /^[+-]/.test(l) && !/^[+-][+-]/.test(l))
    .filter(l => !/font-size-|--space-|--radius-|text-\[\d|fontSize/.test(l));
  L('archivo', archivo);
  L('  literales', `${lit} restantes · ${tok} a token · diff ${ajenas.length === 0 ? 'solo escala' : ajenas.length + ' lineas ajenas'}`);
  if (lit > 0) fallos.push(`quedan ${lit} literales en ${archivo}`);
  if (ajenas.length) { fallos.push(`el diff de ${archivo} toca cosas que no son escala`); ajenas.slice(0,4).forEach(l => console.log('       ' + l.trim().slice(0,90))); }
}

// 3. linea de base
const b = JSON.parse(fs.readFileSync('lib/baselines/visual-scale-baseline.json','utf-8'));
const suma = (o) => Object.values(o).reduce((t,m) => t + Object.values(m).reduce((x,v) => x + (typeof v === 'number' ? v : 0), 0), 0);
const pend = suma(b.pendiente), exen = suma(b.exento);
L('baseline', `pendiente ${pend} · exento ${exen}` + (esperado !== null ? ` (esperado ${esperado})` : ''));
for (const a of archivos) if (b.pendiente[a]) fallos.push(`${a} sigue declarado en la linea de base`);
if (esperado !== null && pend !== esperado) fallos.push(`pendiente es ${pend}, se esperaba ${esperado}`);
// El exento solo cambia cuando se declara algo a proposito: si baja, se perdio una exencion
const exenEsperado = globalThis.__exentoEsperado;
if (typeof exenEsperado === 'number' && exen !== exenEsperado) fallos.push(`el exento es ${exen}, se esperaba ${exenEsperado}`);

// 4. las seis validaciones
// El build va PRIMERO: desde el 2026-08-27 la suite incluye una comprobacion que lee el
// CSS compilado de out/, asi que sin build previo `pnpm test` falla por falta de artefacto
// y no por un defecto real.
let build = sh('pnpm build');
if (build.code !== 0 && /Compiled successfully/.test(build.out)) build = sh('pnpm build'); // falso negativo por concurrencia
const test = sinColor(sh('pnpm test').out);
const tf = test.match(/Test Files\s+(\d+) passed/), tt = test.match(/Tests\s+(\d+) passed/);
const verde = tf && tt && !/\d+ failed/.test(test);
const tsc = sh('pnpm exec tsc --noEmit');
const osp = sh('pnpm exec openspec validate unificar-paleta-carbon-soul --strict');
const dch = sh('git diff --check');
L('validaciones', `build ${build.code} · tsc ${tsc.code} · ${verde ? tf[1]+'/'+tt[1] : 'TESTS EN ROJO'} · openspec ${/is valid/.test(osp.out) ? 'ok' : 'FALLA'} · diff-check ${dch.code}`);
if (build.code) fallos.push(`build salio ${build.code}`);
if (tsc.code) fallos.push(`tsc salio ${tsc.code}`);
if (dch.code) fallos.push(`git diff --check salio ${dch.code}`);
if (!verde) fallos.push('la suite no esta en verde');
if (!/is valid/.test(osp.out)) fallos.push('openspec no valida');

// 5. estado del arbol
const st = sh('git status --short').out.trim().split('\n').filter(Boolean);
L('git status', `${st.length} archivos modificados`);

console.log('');
console.log(fallos.length === 0 ? '  VEREDICTO     OK' : '  VEREDICTO     REVISAR');
fallos.forEach(f => console.log('     - ' + f));
process.exit(fallos.length === 0 ? 0 : 1);
