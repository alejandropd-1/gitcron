/**
 * Detector de strings de interfaz sin pasar por lib/i18n.ts (invariante 8).
 *
 * COBERTURA (invariante 22) — este detector declara qué recorre:
 *   - Todos los .tsx bajo components/ y app/, recursivo.
 *   - EXCLUYE: cualquier directorio __tests__, y las lineas de comentario.
 *
 * QUE BUSCA, en tres formas:
 *   1. TEXTO   — texto visible entre tags JSX: <p>Hola</p>
 *   2. ATRIBUTO— placeholder / title / aria-label / alt con string literal
 *   3. RAMA    — literales de UI en ternarios y mapas: cond ? 'Mejora' : 'Otro'
 *
 * QUE NO CUENTA, y por que:
 *   - Firmas de tipo (`() => Promise<void>`): no son interfaz.
 *   - Identificadores tecnicos: rutas, URLs, ids de modelo (anthropic/claude-*),
 *     nombres de rama, hashes, extensiones.
 *   - Nombres propios que no se traducen: GitCron, Git, GitHub, OpenSpec.
 *   - Simbolos y puntuacion sueltos.
 *
 * Uso:  node scripts/detectar-i18n.mjs          (resumen)
 *       node scripts/detectar-i18n.mjs --todo   (con el detalle de cada hallazgo)
 */
import fs from 'node:fs';
import path from 'node:path';

const DIRS = ['components', 'app'];
const DETALLE = process.argv.includes('--todo');

const listar = (d) =>
  !fs.existsSync(d)
    ? []
    : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const f = path.join(d, e.name);
        if (e.isDirectory()) return e.name === '__tests__' ? [] : listar(f);
        return f.endsWith('.tsx') ? [f] : [];
      });

// Una linea es JSX si contiene un tag de elemento en minuscula.
const TAG_JSX = /<[a-z][a-zA-Z0-9]*[\s/>]/;

const TEXTO = />\s*([A-ZÁÉÍÓÚÜÑa-záéíóúüñ¿¡][^<>{}\n]{2,}?)\s*</g;
const ATRIBUTO = /\b(placeholder|title|aria-label|alt)\s*=\s*"([^"]{3,})"/g;
// Ternario COMPLETO. Con `[?:]` suelto, el `:` de una propiedad de objeto
// (fontSize: 'var(--font-size-md)') se contaba como texto: 1018 de 1093
// hallazgos eran valores CSS. Exigir las dos ramas descarta ese caso.
const RAMA = /\?\s*'([^'\n]{3,})'\s*:\s*'([^'\n]{3,})'/g;

const TIPO_TS = /^(Promise|void|string|number|boolean|null|undefined|React|JSX|Record|Array|Partial|Readonly|Set|Map|Error)$/;
const NOMBRE_PROPIO = /^(GitCron|GitHub|Git|OpenSpec|Electron|Next\.?js|TypeScript|Claude|Codex)$/i;

// Valores de CSS y clases de utilidad: no son texto de interfaz.
const VALOR_CSS = /^(var\(|#[0-9a-f]{3,8}$|rgba?\(|calc\(|color-mix\()/i;
const PALABRA_CSS = /^(flex|grid|block|inline|none|auto|hidden|visible|absolute|relative|fixed|sticky|center|start|end|row|column|nowrap|wrap|pointer|default|bold|normal|italic|uppercase|lowercase|capitalize|ellipsis|inherit|initial|unset|transparent|currentColor|space-between|flex-start|flex-end|flex-1|0 0 auto)$/i;
const CLASE_UTIL = /^[a-z0-9]+([-:/][a-z0-9[\]/.#]+)+$/;        // text-red-500, w-4, text-[#d9e7fc]
const MEDIDA = /^[\d.]+(px|rem|em|%|s|ms|fr|vh|vw)?$/;
// Clave de i18n, no texto: 'pipeline.openspec.change.collapse'. Un ternario que
// elige entre DOS claves literales es un mapa explícito, que es justo lo que el
// invariante 8 pide; lo que prohíbe es armar la clave por interpolación.
const CLAVE_I18N = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/;

// JERGA DE GIT — decision de Alejandro del 2026-08-31: los terminos del entorno
// se dejan igual en espanol y en ingles. Un usuario de Git busca "merge", no
// "fusionar": traducirlos hace la interfaz MENOS legible, no mas. No son deuda
// de i18n y no se cuentan. Incluye las opciones de comando (--soft, --hard).
const JERGA_GIT = /^(merge|commit|push|pull|fetch|rebase|stash|stage|unstage|staged|unstaged|checkout|branch|tag|remote|worktree|submodule|fast-forward|cherry-pick|squash|reset|revert|diff|hunk|head|upstream|origin|blame|clone|amend|patch|pick|drop|reword|edit|fixup|soft|hard|mixed|pr|repo|remotes|tags|branches|commits|stashes|worktrees|submodules)$/i;
// La misma jerga cuando viene con su opcion: "Soft (--soft)", "Hard (--hard)".
const JERGA_CON_FLAG = /^[A-Za-z-]+\s*\(--[a-z-]+\)$/;

function esRuido(txt, linea) {
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(txt)) return true;   // sin palabra real
  if (TIPO_TS.test(txt) || NOMBRE_PROPIO.test(txt)) return true;
  if (/Promise|=>|\bvoid\b|\bextends\b|\binterface\b/.test(linea)) return true;
  if (/^(https?:|\/|\.|#|@)/.test(txt)) return true;            // ruta, url, selector
  if (/^[a-z0-9-]+\/[a-z0-9.\-]+$/i.test(txt)) return true;     // id de modelo, org/repo
  if (/^[a-f0-9]{7,}$/i.test(txt)) return true;                 // hash
  if (/^\W+$/.test(txt)) return true;                           // solo simbolos
  if (VALOR_CSS.test(txt) || PALABRA_CSS.test(txt)) return true;
  if (CLASE_UTIL.test(txt) || MEDIDA.test(txt) || CLAVE_I18N.test(txt)) return true;
  if (JERGA_GIT.test(txt) || JERGA_CON_FLAG.test(txt)) return true;
  // Lista de clases de utilidad separadas por espacio:
  // 'hover:border-secondary/35 hover:bg-secondary/5'. Es ruido si TODAS las
  // palabras son clases; basta una palabra normal para que sea texto.
  const palabras = txt.split(/\s+/);
  if (palabras.length > 1 && palabras.every((p) => CLASE_UTIL.test(p) || PALABRA_CSS.test(p) || MEDIDA.test(p))) return true;
  return false;
}

const hallazgos = [];
for (const dir of DIRS) {
  for (const archivo of listar(dir)) {
    fs.readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return;             // comentario
      const buscar = (re, clase, grupo) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(linea))) {
          const txt = (m[grupo] ?? m[1]).trim();
          if (esRuido(txt, linea)) continue;
          hallazgos.push({ archivo, linea: i + 1, clase, txt: txt.slice(0, 62) });
        }
      };
      if (TAG_JSX.test(linea)) buscar(TEXTO, 'TEXTO', 1);
      buscar(ATRIBUTO, 'ATRIBUTO', 2);
      buscar(RAMA, 'RAMA', 1); buscar(RAMA, 'RAMA', 2);
    });
  }
}

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
