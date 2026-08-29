import fs from 'node:fs';
const ARCHIVO = 'components/RepoSidebar.tsx';
// Sobre el piso: escalon mas cercano. 17px -> md (16px), el salto de 1px mas chico.
const ESCALA = [[12,'xs'],[13,'sm'],[14,'base'],[16,'md'],[18,'lg'],[20,'xl']];
const ROTULOS = {
  "components/RepoSidebar.tsx:242": "atajo de teclado (<kbd>)",
  "components/RepoSidebar.tsx:734": "atajo de teclado (<kbd>)",
  "components/RepoSidebar.tsx:827": "numero de PR (#N, font-mono)",
  "components/RepoSidebar.tsx:863": "badge de color (px-1.5 rounded bg-error)",
  "components/RepoSidebar.tsx:869": "badge de color (px-1.5 rounded bg-border-subtle)",
  "components/RepoSidebar.tsx:1250": "inicial dentro del avatar circular (h-8 w-8 rounded-full)"
};
const LITERAL = /text-\[([\d.]+)(px|rem)\]|fontSize:\s*'?([\d.]+)(px|rem)?'?/g;
const filas = [];
fs.readFileSync(ARCHIVO,'utf8').split('\n').forEach((ln,i)=>{
  LITERAL.lastIndex=0; let m;
  while((m=LITERAL.exec(ln))){
    const raw = m[1] ?? m[3], u = m[2] ?? m[4];
    const px = u==='rem' ? parseFloat(raw)*16 : parseFloat(raw);
    if (Number.isNaN(px)) continue;
    let token, motivo;
    if (px < 12) {
      if (/\buppercase\b/.test(ln))      { token='2xs'; motivo='uppercase (versalita)'; }
      else if (/\bfill-/.test(ln))       { token='2xs'; motivo='texto SVG de eje'; }
      else if (ROTULOS[`${ARCHIVO}:${i+1}`]) { token='2xs'; motivo=ROTULOS[`${ARCHIVO}:${i+1}`]; }
      else                               { token='xs';  motivo='texto que se lee'; }
    } else {
      const e = ESCALA.find(([n])=>n===px) || ESCALA.find(([n])=>Math.abs(n-px)<=1);
      token = e ? e[1] : null; motivo = e ? (e[0]===px?'coincide con el escalon':`escalon mas cercano (${px}px -> ${e[0]}px)`) : 'SIN ESCALON';
    }
    filas.push({linea:i+1, valor:raw+u, px, token, motivo, ctx: ln.trim().slice(0,95)});
  }
});
const g={}; filas.forEach(f=>g[f.token]=(g[f.token]||0)+1);
console.log('TOTAL',filas.length,'->',JSON.stringify(g),'\n');
filas.forEach(f=>console.log(`  :${String(f.linea).padEnd(5)} ${f.valor.padEnd(7)} -> ${String(f.token).padEnd(5)} ${f.motivo}`));
console.log('\n--- contexto de los que NO son uppercase (para revisar la clasificacion) ---');
filas.filter(f=>f.motivo==='texto que se lee').forEach(f=>console.log(`  :${f.linea}  ${f.ctx}`));
fs.writeFileSync(process.argv[2], JSON.stringify(filas,null,1));
