import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Presupuesto de tokens de archivo por tanda. El modelo local tiene ~51k de ventana
// y OpenCode se lleva ~38k de system prompt y herramientas, asi que conviene no pasarse.
const PRESUPUESTO = Number(process.argv[2] || 4500);
const PISO = 12; // px que la escala declara como piso de legibilidad

const b = JSON.parse(fs.readFileSync('lib/baselines/visual-scale-baseline.json', 'utf-8'));
const suma = (o) => Object.values(o).reduce((t, m) => t + Object.values(m).reduce((x, v) => x + (typeof v === 'number' ? v : 0), 0), 0);
const pendTotal = suma(b.pendiente);
const exen = suma(b.exento);

// Archivos que parecen mecanicos pero necesitan criterio de Alejandro. Se declaran
// aca con su motivo para que no salgan por descuido. Vacio: el 2026-08-27 Alejandro
// decidio unificar criterio y que la telemetria tambien suba al piso.
const EXCEPCIONES = {};

// Criterio unificado, decidido el 2026-08-27. Todo tamano de letra por debajo del piso
// va a xs sin excepciones; un literal que ya coincide con un escalon va al token igual,
// porque el objetivo es que no queden literales, no que los valores cambien.
const ESCALA = [
  [12, '--font-size-xs'], [13, '--font-size-sm'], [14, '--font-size-base'],
  [16, '--font-size-md'], [18, '--font-size-lg'], [20, '--font-size-xl'],
];
function aPx(v) {
  const px = v.match(/^([\d.]+)px$/); if (px) return parseFloat(px[1]);
  const rem = v.match(/^([\d.]+)rem$/); if (rem) return parseFloat(rem[1]) * 16;
  return null;
}
function token(v) {
  const px = aPx(v); if (px === null) return null;
  if (px < 12) return '--font-size-xs';            // bajo el piso: todo al piso
  const exacto = ESCALA.find(([n]) => n === px);
  if (exacto) return exacto[1];
  const cerca = ESCALA.find(([n]) => Math.abs(n - px) <= 1);  // 17px -> lg, por proposito
  return cerca ? cerca[1] : null;
}

// Donde estan las declaraciones dentro del archivo, agrupadas en bloques contiguos.
// Asi el modelo lee 600 tokens en vez de 38.000: lo caro nunca fue el archivo,
// era hacerselo leer entero.
function bloques(archivo) {
  const lineas = fs.readFileSync(archivo, 'utf-8').split('\n');
  const hits = [];
  // Solo tamano de letra: text-[...] y fontSize. El espaciado (padding, margin, gap,
  // borderRadius) necesita elegir escalon por proposito y eso no se automatiza.
  lineas.forEach((l, i) => { const m = l.match(/text-\[[\d.]+(px|rem)\]|fontSize:\s*'?[\d.]+(px|rem)?'?/g); if (m) m.forEach(() => hits.push(i + 1)); });
  if (!hits.length) return { rangos: [], tok: 0 };
  const grupos = []; let g = [hits[0]];
  for (let k = 1; k < hits.length; k++) {
    if (hits[k] - g[g.length - 1] > 80) { grupos.push(g); g = [hits[k]]; } else g.push(hits[k]);
  }
  grupos.push(g);
  const rangos = grupos.map(gr => ({
    desde: Math.max(1, gr[0] - 5),
    hasta: Math.min(lineas.length, gr[gr.length - 1] + 5),
    n: gr.length,
  }));
  return { rangos, tok: rangos.reduce((t, r) => t + Math.round((r.hasta - r.desde) * 11 / 3.5), 0) };
}

// Un archivo es apto para el modelo local si todos sus valores son px por debajo del piso:
// no hay nada que decidir, es reemplazo directo. Los que mezclan rem, espaciado o
// tamanos que ya estan en escala necesitan criterio y van al ejecutor grande.
const candidatos = Object.entries(b.pendiente).map(([f, m]) => {
  const vals = Object.entries(m).filter(([, v]) => typeof v === 'number');
  const n = vals.reduce((t, [, v]) => t + v, 0);
  // Todos los valores tienen que resolver a un escalon de tipografia. Si alguno no
  // resuelve, el archivo mezcla espaciado y va con Claude.
  if (EXCEPCIONES[f] || !fs.existsSync(f) || !vals.every(([k]) => token(k))) return null;
  const { rangos, tok } = bloques(f);
  if (!rangos.length || rangos.reduce((t, r) => t + r.n, 0) !== n) return null; // el conteo no cierra: que lo mire Alejandro
  return { f, n, tok, vals, rangos };
}).filter(Boolean).sort((a, b2) => a.tok - b2.tok);

if (!candidatos.length) {
  console.log('No quedan archivos aptos para el modelo local.\n');
  console.log(`Pendiente: ${pendTotal}. Lo que queda necesita criterio y va con Claude:\n`);
  for (const [f, m] of Object.entries(b.pendiente)) {
    const vals = Object.entries(m).filter(([, v]) => typeof v === 'number');
    const n = vals.reduce((t, [, v]) => t + v, 0);
    const motivo = EXCEPCIONES[f] ? EXCEPCIONES[f]
      : vals.some(([k]) => /rem/.test(k)) ? 'tiene valores en rem'
      : vals.some(([k]) => /^\d+px$/.test(k) && parseInt(k) >= PISO) ? 'tiene tamanos que ya estan en escala o fuera de rango'
      : vals.some(([k]) => !/^\d+px$/.test(k)) ? 'tiene valores que no son px enteros'
      : 'el conteo de declaraciones no cierra con el archivo';
    console.log(`  ${String(n).padStart(3)}  ${f}\n       ${motivo}`);
  }
  process.exit(0);
}

// Se agrupan archivos hasta llenar el presupuesto
const tanda = []; let acc = 0;
for (const c of candidatos) { if (acc + c.tok > PRESUPUESTO && tanda.length) break; tanda.push(c); acc += c.tok; }

const migradas = tanda.reduce((t, c) => t + c.n, 0);
const queda = pendTotal - migradas;
const tamanos = [...new Set(tanda.flatMap(c => c.vals.map(([k]) => parseInt(k))))].sort((a, b2) => a - b2);
const listaTamanos = tamanos.length === 1 ? `${tamanos[0]}px` : tamanos.slice(0, -1).join('px, ') + 'px o ' + tamanos.at(-1) + 'px';

// Los archivos sin confirmar que el modelo va a encontrar, para que no los investigue
const sinConfirmar = execSync('git status --short', { encoding: 'utf-8' })
  .split('\n').filter(l => l.trim()).map(l => l.slice(2).trim());

const inventario = tanda.map(c =>
  '  ' + c.f + '\n' +
  c.vals.map(([k, v]) => `      ${k} x${v}`.padEnd(22) + `->  var(${token(k)})`).join('\n') + '\n' +
  c.rangos.map(r => `      lineas ${r.desde}-${r.hasta}  (${r.n} ${r.n === 1 ? 'declaracion' : 'declaraciones'})`).join('\n')
).join('\n');
// Si toda la tanda va a un solo token, el prompt lo puede decir de una
const tokensUsados = [...new Set(tanda.flatMap(c => c.vals.map(([k]) => token(k))))];
const cuentas = tanda.map(c => c.n).join(', ');

const prompt = `
Trabajas en C:\\www\\gitCronos, rama change/unificar-paleta-carbon-soul.
${tanda.length === 1 ? 'UN SOLO ARCHIVO' : tanda.length + ' ARCHIVOS'}, ${migradas} ${migradas === 1 ? 'declaracion' : 'declaraciones'} en total. Nada mas.
No abras AGENTS.md, ni los documentos de openspec, ni app/globals.css.

-- EL ARBOL, PARA QUE NO TENGAS QUE AVERIGUARLO --
Vas a encontrar ${sinConfirmar.length} archivos sin confirmar. Todos estan bien y son de tandas
anteriores de este mismo change:
${sinConfirmar.map(f => '  ' + f).join('\n')}
No los mires ni los verifiques. Si aparece alguno MAS que esos, PARA y reporta cual.

-- QUE HAY QUE HACER --
Estos son los tamanos de letra escritos como literal que hay que migrar:
${inventario}

${tokensUsados.length === 1
  ? `Todos van al mismo escalon: reemplazalos por \`var(${tokensUsados[0]})\`.`
  : `Cada valor va al escalon que dice la flecha de arriba. No los mandes todos al mismo:\nel mapeo esta calculado, respetalo tal cual.`}

IMPORTANTE: **no leas los archivos enteros.** Lei solo los rangos de lineas indicados
arriba, con el offset y el limite de la herramienta de lectura. Ahi esta todo lo que
tenes que cambiar, y algunos de estos archivos pesan mas que tu ventana de contexto.

Dos formas posibles de escritura. **Ojo con el prefijo \`length:\` en la clase**: sin el,
Tailwind no puede saber si un text-[...] con var() adentro es color o tamano, elige color,
y el elemento se queda SIN tamano. Verificado el 2026-08-27: genero 141 clases rotas.
  className="text-[${tanda[0].vals[0][0]}]"    ->  className="text-[length:var(${token(tanda[0].vals[0][0])})]"
  style={{ fontSize: '${tanda[0].vals[0][0]}' }}   ->  style={{ fontSize: 'var(${token(tanda[0].vals[0][0])})' }}

\`text-xs\`, \`text-sm\` y demas son clases estandar de Tailwind, NO literales. No las toques.
Si encontras un tamano literal que no sea ${listaTamanos}, PARA y reporta cual y en que
archivo y linea.

-- LA LISTA DE PENDIENTES --
En lib/baselines/visual-scale-baseline.json, borra ${tanda.length === 1 ? 'la entrada' : 'las ' + tanda.length + ' entradas'} de la seccion
\`pendiente\`. No leas el archivo entero: busca cada entrada y borrala.
Los pendientes arrancan en ${pendTotal} y tienen que terminar en ${queda}. El exento queda en 85.

-- PROHIBICIONES --
- Solo ${tanda.length === 1 ? 'ese archivo' : 'esos ' + tanda.length + ' archivos'} de codigo, mas el baseline.
- No toques lib/visual-scale.ts ni lib/ui-color.ts: son los que miden.
- No toques nada dentro de scripts/.
- Ningun comando Git. Ni siquiera de lectura: no los necesitas.
- No hagas busquedas de texto sobre directorios, solo dentro de cada archivo objetivo.
- No borres ni cambies comentarios que expliquen logica.

-- NO CORRAS NINGUN COMANDO --
Tu trabajo es editar archivos, nada mas. No corras pruebas, ni build, ni tsc, ni git.
La verificacion la hace un script afuera, apenas termines. Si corres comandos solo gastas
contexto y podes cortarte antes de terminar las ediciones.

-- QUE ENTREGAR, CORTO --
1. Cuantas declaraciones migraste en cada archivo. Tienen que ser ${cuentas}.
2. Cualquier tamano literal que no fuera ${listaTamanos}.
Nada mas.

PARA ACA.
`;

// Se deja anotado todo, para que auditar.mjs y tanda.mjs no necesiten argumentos
fs.writeFileSync('scripts/.ultima-tanda.json',
  JSON.stringify({ archivos: tanda.map(c => c.f), esperado: queda, exento: exen, prompt }, null, 2));

if (process.argv.includes('--solo-prompt')) {
  process.stdout.write(prompt);   // para que lo consuma el bucle
} else {
  console.log('\u2550'.repeat(70));
  console.log('  PROMPT PARA OPENCODE  --  copia desde la linea de abajo');
  console.log('\u2550'.repeat(70));
  console.log(prompt);
  console.log('\u2550'.repeat(70));
  console.log('  CUANDO TERMINE, CORRE ESTO EN POWERSHELL:');
  console.log('\u2550'.repeat(70));
  console.log('\n  node scripts/auditar.mjs\n');
  console.log(`Quedan ${candidatos.length - tanda.length} archivos aptos despues de esta tanda.`);
}
