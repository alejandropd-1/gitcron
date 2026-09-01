/**
 * Reporte de linea de comandos del detector de i18n.
 *
 * La deteccion vive en scripts/deteccion/i18n.mjs. Este archivo solo la consume y
 * la imprime, para que el generador de tandas pueda usar la misma deteccion sin
 * pasar por la consola.
 *
 * Uso:  node scripts/detectar-i18n.mjs          (resumen)
 *       node scripts/detectar-i18n.mjs --todo   (con el detalle de cada hallazgo)
 */
import { detectar, DIRS, listar } from './deteccion/i18n.mjs';

const DETALLE = process.argv.includes('--todo');
const hallazgos = detectar();

const porArchivo = {};
for (const h of hallazgos) (porArchivo[h.archivo] ??= []).push(h);
const porClase = {};
for (const h of hallazgos) porClase[h.clase] = (porClase[h.clase] || 0) + 1;

const archivosRecorridos = DIRS.flatMap(listar).length;
console.log(`COBERTURA  ${archivosRecorridos} archivos .tsx bajo ${DIRS.join(' y ')}, sin __tests__`);
console.log(`HALLAZGOS  ${hallazgos.length} strings en ${Object.keys(porArchivo).length} archivos`);
console.log(`POR CLASE  ${Object.entries(porClase).map(([k, v]) => `${k} ${v}`).join(' · ')}\n`);

for (const [f, hs] of Object.entries(porArchivo).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(hs.length).padStart(3)}  ${f}`);
  if (DETALLE) hs.forEach((h) => console.log(`       :${String(h.linea).padEnd(5)} ${h.clase.padEnd(9)} ${h.txt}`));
}
