/**
 * Detector de strings de interfaz sin pasar por lib/i18n.ts (invariante 8).
 *
 * COBERTURA (invariante 22) — este detector declara qué recorre:
 *   - Todos los .tsx bajo components/ y app/, recursivo.
 *   - EXCLUYE: cualquier directorio __tests__, y las lineas de comentario.
 *
 * QUE BUSCA, en seis formas:
 *   1. TEXTO entre tags en la misma linea:  <p>Hola</p>
 *   2. TEXTO despues de un tag autocerrado: <Icon /> Mensaje del commit
 *   3. TEXTO antes de un tag:               Renombrando remoto: <strong>
 *   4. TEXTO en una linea sola:             solo la palabra, sin tags
 *   5. ATRIBUTO: placeholder / title / aria-label / alt con string literal
 *   6. RAMA: ternario con dos literales:    cond ? 'Mejora' : 'Otro'
 *
 * LO QUE NO ALCANZA A VER, declarado para que nadie lea el numero como total:
 *   - Strings sueltas en codigo: `setError('Error al preparar rebase')`,
 *     `throw new Error('...')`. Ahi viven casi todos los mensajes de error y este
 *     detector NO los cuenta. Requieren lectura.
 *   - Template literals con interpolacion: `Materialized as ${x}`.
 *   Ambas familias se descubrieron el 2026-08-31, cuando un ejecutor enumero a mano
 *   33 strings en tres archivos que este script no veia. El conteo que da es un
 *   PISO, no un total.
 *
 * QUE NO CUENTA A PROPOSITO, y por que:
 *   - Firmas de tipo (`() => Promise<void>`): no son interfaz.
 *   - Identificadores tecnicos: rutas, URLs, ids de modelo, hashes, extensiones.
 *   - Nombres propios: GitCron, Git, GitHub, OpenSpec, Temporal Agent, Brier.
 *   - Jerga de Git (merge, commit, push...) y del HUD Centauro (TARGET_LOCKED //).
 *   - Claves de i18n elegidas por ternario: son mapa explicito, no interpolacion.
 *   - Valores y clases de CSS, solo dentro de ternarios.
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
// Tres formas que la de arriba NO ve, encontradas el 2026-08-31 leyendo lo que un
// ejecutor reporto a mano en ChronometricGraph, InteractiveRebasePanel y
// RepoActionModals. `TEXTO` exige que el texto empiece con `>` y termine con `<` en
// la MISMA linea; en JSX multilinea eso casi nunca pasa.
const TEXTO_TRAS_TAG = /\/>\s*([A-ZÁÉÍÓÚÜÑa-záéíóúüñ¿¡][^<>{}\n]{2,})\s*$/g;   // <Icon /> Texto
// Texto <strong>. Arranca en MAYUSCULA y sin signos de codigo: sin eso agarraba
// `const [commits, setCommits] = useState<` y cualquier generico de TypeScript,
// porque `useState<Foo>` tambien tiene un `<`.
const TEXTO_ANTES_TAG = /^\s*([A-ZÁÉÍÓÚÜÑ¿¡][^<>{}()[\]=;\n]{2,}?)\s*</g;
// Linea de solo texto. Arranca en MAYUSCULA y no termina en coma: sin esas dos
// condiciones agarraba los parametros de destructuring (`show,`, `expanded,`) y el
// conteo saltaba de 46 a 1722, casi todo ruido.
const TEXTO_SOLO = /^\s*([A-ZÁÉÍÓÚÜÑ¿¡][^<>{}()=;:,\n]{2,})\s*$/g;
const ATRIBUTO = /\b(placeholder|title|aria-label|alt)\s*=\s*"([^"]{3,})"/g;
// Ternario COMPLETO. Con `[?:]` suelto, el `:` de una propiedad de objeto
// (fontSize: 'var(--font-size-md)') se contaba como texto: 1018 de 1093
// hallazgos eran valores CSS. Exigir las dos ramas descarta ese caso.
const RAMA = /\?\s*'([^'\n]{3,})'\s*:\s*'([^'\n]{3,})'/g;

const TIPO_TS = /^(Promise|void|string|number|boolean|null|undefined|React|JSX|Record|Array|Partial|Readonly|Set|Map|Error)$/;
// Nombres propios que no se traducen. `Temporal Agent` es el nombre del subsistema
// y `Brier` el de una metrica estadistica (Brier score): decidido el 2026-08-31 con
// el mismo criterio que la jerga de Git. Sin declararlos aca aparecen para siempre
// como deuda pendiente que nadie va a saldar.
const NOMBRE_PROPIO = /^(GitCron|GitHub|GitHub Releases|Git|OpenSpec|Electron|Next\.?js|TypeScript|Claude|Codex|Temporal Agent|Brier)$/i;

// Valores de CSS y clases de utilidad: no son texto de interfaz.
const VALOR_CSS = /^(var\(|#[0-9a-f]{3,8}$|rgba?\(|calc\(|color-mix\()/i;
const PALABRA_CSS = /^(flex|grid|block|inline|none|auto|hidden|visible|absolute|relative|fixed|sticky|center|start|end|row|column|nowrap|wrap|pointer|default|bold|normal|italic|uppercase|lowercase|capitalize|ellipsis|inherit|initial|unset|transparent|currentColor|truncate|space-between|flex-start|flex-end|flex-1|0 0 auto)$/i;
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

// JERGA DEL HUD "CENTAURO" — decision de Alejandro del 2026-08-31: la rotulacion
// tecnica en versalita de ChronometricGraph es estetica del HUD, no texto que se
// lea. `TARGET_LOCKED // LOCK_STABLE` o `[CHRONO_START // T_MIN]` traducidos rompen
// el registro visual y no ayudan a nadie. Misma familia que `SHA //`.
// Se exige mayusculas MAS una marca tecnica (_ // [ ] @ :) para no ocultar un texto
// normal escrito en mayusculas, que si seria deuda.
const JERGA_HUD = /^(?=.*[_@:[\]]|.*\/\/)[A-Z0-9_@:+[\]/ .·—-]{3,}$/;

// `clase` importa: un placeholder o un texto entre tags NUNCA es una clase de
// Tailwind. Aplicar CLASE_UTIL ahi genera falsos negativos — el 2026-08-31 se
// perdieron tres placeholders de ejemplo ('mi-nuevo-proyecto', 'mi-repo' y una
// URL de muestra) porque el patron de clase los tragaba. Los filtros de forma
// CSS solo valen para RAMA, que es la unica que puede traer clases.
function esRuido(txt, linea, clase) {
  const puedeSerClase = clase === 'RAMA';
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(txt)) return true;   // sin palabra real
  if (TIPO_TS.test(txt) || NOMBRE_PROPIO.test(txt)) return true;
  if (/Promise|=>|\bvoid\b|\bextends\b|\binterface\b/.test(linea)) return true;
  if (/^(https?:|\/|\.|#|@)/.test(txt)) return true;            // ruta, url, selector
  if (/^[a-z0-9-]+\/[a-z0-9.\-]+$/i.test(txt)) return true;     // id de modelo, org/repo
  if (/^[a-f0-9]{7,}$/i.test(txt)) return true;                 // hash
  if (/^\W+$/.test(txt)) return true;                           // solo simbolos
  if (CLAVE_I18N.test(txt)) return true;
  if (puedeSerClase && (VALOR_CSS.test(txt) || PALABRA_CSS.test(txt))) return true;
  if (puedeSerClase && (CLASE_UTIL.test(txt) || MEDIDA.test(txt))) return true;
  if (JERGA_GIT.test(txt) || JERGA_CON_FLAG.test(txt) || JERGA_HUD.test(txt)) return true;
  // Lista de clases de utilidad separadas por espacio:
  // 'hover:border-secondary/35 hover:bg-secondary/5'. Es ruido si TODAS las
  // palabras son clases; basta una palabra normal para que sea texto.
  const palabras = txt.split(/\s+/);
  if (puedeSerClase && palabras.length > 1 && palabras.every((p) => CLASE_UTIL.test(p) || PALABRA_CSS.test(p) || MEDIDA.test(p))) return true;
  return false;
}

const hallazgos = [];
for (const dir of DIRS) {
  for (const archivo of listar(dir)) {
    // Un comentario de bloque se sigue con estado, no linea por linea: sus lineas
    // interiores no siempre empiezan con `*`, y sin esto la prosa de los comentarios
    // largos se contaba como texto de interfaz.
    let enComentario = false;
    fs.readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
      const abre = linea.lastIndexOf('/*');
      const cierra = linea.lastIndexOf('*/');
      const estabaDentro = enComentario;
      if (abre !== -1 && abre > cierra) enComentario = true;
      else if (cierra !== -1 && cierra > abre) enComentario = false;
      if (estabaDentro || enComentario) return;                 // comentario de bloque
      if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return;             // comentario de linea
      const buscar = (re, clase, grupo) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(linea))) {
          const txt = (m[grupo] ?? m[1]).trim();
          if (esRuido(txt, linea, clase)) continue;
          hallazgos.push({ archivo, linea: i + 1, clase, txt: txt.slice(0, 62) });
        }
      };
      if (TAG_JSX.test(linea)) buscar(TEXTO, 'TEXTO', 1);
      buscar(TEXTO_TRAS_TAG, 'TEXTO', 1);
      if (/</.test(linea)) buscar(TEXTO_ANTES_TAG, 'TEXTO', 1);
      // Linea de solo texto: sin signos de codigo. Se exige que el archivo sea .tsx
      // y que la linea no parezca un comentario ni una clave suelta.
      if (!/[<>{}()=;]/.test(linea)) buscar(TEXTO_SOLO, 'TEXTO', 1);
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
