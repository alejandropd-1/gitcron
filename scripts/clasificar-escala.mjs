import fs from 'node:fs';

// Invariante 23: el token se elige por lo que SIGNIFICA. Regla determinista:
//   2xs (10px) = rotulacion accesoria: se reconoce, no se lee.
//   xs  (12px) = todo lo que se lee.
// Se decide por marcas objetivas de la clase, no por el valor del literal.
const ARCHIVOS = [
  'components/ContextMenus.tsx', 'components/DiffViewer.tsx',
  'components/InteractiveRebasePanel.tsx', 'components/cartography/SemanticGraphLens.tsx',
  'components/RepoDetailsPanel.tsx', 'components/temporal/AgentDashboard.tsx',
];

// Rotulos sin `uppercase` en la clase. Cada uno con su motivo, para que se audite.
const ROTULOS = {
  'components/RepoDetailsPanel.tsx:341': 'indicador de estado de UNA letra (w-4)',
  'components/RepoDetailsPanel.tsx:397': 'indicador de estado de UNA letra (w-4)',
  'components/RepoDetailsPanel.tsx:407': 'badge "staged"',
  'components/temporal/AgentDashboard.tsx:317': 'etiqueta numerica de eje (font-mono)',
  'components/temporal/AgentDashboard.tsx:497': 'etiqueta numerica de eje (font-mono)',
  'components/temporal/AgentDashboard.tsx:461': 'leyenda del grafico (font-mono)',
  'components/temporal/AgentDashboard.tsx:620': 'leyenda del grafico (font-mono)',
  'components/temporal/AgentDashboard.tsx:624': 'abreviatura "Mat"',
  'components/temporal/AgentDashboard.tsx:628': 'abreviatura "Acept"',
  'components/temporal/AgentDashboard.tsx:632': 'abreviatura "Difer"',
  'components/temporal/AgentDashboard.tsx:636': 'abreviatura "Rech"',
  'components/ContextMenus.tsx:71': 'atajo de teclado del menu',
  'components/DiffViewer.tsx:270': 'numero de linea (select-none)',
  'components/DiffViewer.tsx:273': 'numero de linea (select-none)',
  'components/cartography/SemanticGraphLens.tsx:283': 'pildora de estado del HUD',
  'components/cartography/SemanticGraphLens.tsx:289': 'pildora de estado del HUD',
};

// Fuera de la tanda automatica, por decision del 2026-08-28.
const EXCLUIDOS = {
  'components/cartography/SemanticGraphLens.tsx:478':
    'fontSize numerico en labelStyle de React Flow (etiqueta de arista): pasa a var() como CSS, '
    + 'pero si React Flow usa el numero para posicionar la etiqueta, con var() no puede. Ademas cambia '
    + 'como se ve el grafo. Necesita validacion visual de Alejandro.',
};

const LITERAL = /text-\[([\d.]+)(px|rem)\]|fontSize:\s*'?([\d.]+)(px|rem)?'?/g;
const aPx = (n, u) => u === 'rem' ? parseFloat(n) * 16 : parseFloat(n);

const filas = [];
for (const archivo of ARCHIVOS) {
  fs.readFileSync(archivo, 'utf8').split('\n').forEach((ln, i) => {
    LITERAL.lastIndex = 0; let m;
    while ((m = LITERAL.exec(ln))) {
      const px = m[1] ? aPx(m[1], m[2]) : aPx(m[3], m[4]);
      if (px === null || Number.isNaN(px) || px > 13) continue;
      const clave = `${archivo}:${i + 1}`;
      const esUpper = /\buppercase\b/.test(ln);
      const esSvg = /\bfill-/.test(ln);
      const rotulo = ROTULOS[clave];
      let token, motivo;
      if (EXCLUIDOS[clave]) { token = 'EXCLUIDO'; motivo = 'fuera de la tanda'; }
      else if (esUpper) { token = '--font-size-2xs'; motivo = 'uppercase (versalita)'; }
      else if (esSvg) { token = '--font-size-2xs'; motivo = 'texto SVG de eje (fill-)'; }
      else if (rotulo) { token = '--font-size-2xs'; motivo = rotulo; }
      else { token = '--font-size-xs'; motivo = 'texto que se lee'; }
      filas.push({ archivo, linea: i + 1, valor: m[1] ? m[1] + m[2] : m[3] + (m[4] || ''), px, token, motivo });
    }
  });
}
const c2 = filas.filter(f => f.token === '--font-size-2xs');
const cx = filas.filter(f => f.token === '--font-size-xs');
const ce = filas.filter(f => f.token === 'EXCLUIDO');
console.log(`TOTAL ${filas.length}   ->  2xs: ${c2.length}   xs: ${cx.length}   excluido: ${ce.length}\n`);
for (const archivo of ARCHIVOS) {
  const fs_ = filas.filter(f => f.archivo === archivo);
  if (!fs_.length) continue;
  const a = fs_.filter(f=>f.token==='--font-size-2xs').length, b = fs_.filter(f=>f.token==='--font-size-xs').length;
  console.log(`${archivo}  (${fs_.length}: ${a} a 2xs, ${b} a xs)`);
  fs_.forEach(f => console.log(`   :${String(f.linea).padEnd(4)} ${f.valor.padEnd(9)} -> ${f.token.replace('--font-size-','').padEnd(9)} ${f.motivo}`));
}
fs.writeFileSync(process.argv[2] || 'clasificacion.json', JSON.stringify(filas, null, 1));
