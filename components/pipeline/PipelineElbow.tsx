'use client';

/**
 * El codo LCARS, dibujado como path.
 *
 * Por qué no es CSS: un codo tiene DOS radios distintos en la misma pieza —el
 * exterior, amplio, y el interior, cerrado— unidos por dos brazos de grosor
 * diferente. `border-radius` sólo sabe redondear las esquinas de un rectángulo,
 * así que con CSS lo más cercano es una aproximación por bloques apilados, y se
 * nota: el interior queda en ángulo recto donde debería curvar.
 *
 * Geometría, en coordenadas del viewBox (64×64):
 *
 *   V  = 24  ancho del brazo vertical (la espina)
 *   H  = 28  alto del brazo horizontal (la barra del encabezado)
 *   Ro = 28  radio exterior — el que da la silueta
 *   Ri = 14  radio interior — el que hace que se lea como una pieza doblada
 *            y no como dos barras pegadas
 *
 * `H` vale 28 porque el encabezado mide 28px de alto en CSS y el SVG se dibuja
 * a 64×64 px, o sea 1 unidad = 1 píxel. Si los dos números se separan, aparece
 * un escalón en la unión entre el codo y la barra. Van juntos o no van.
 *
 * El path se recorre por fuera y vuelve por dentro: baja el flanco izquierdo,
 * curva al tope, corre hasta el borde derecho, baja el grosor de la barra,
 * vuelve hacia la izquierda, curva hacia abajo por el interior y cierra.
 *
 * Tamaño FIJO a propósito. Estirar un SVG con `preserveAspectRatio="none"`
 * deformaría los radios y el codo se vería ovalado en paneles anchos. Acá el
 * codo mide siempre lo mismo y los tramos rectos los estira el CSS, que es la
 * única parte que puede estirarse sin mentir sobre su forma.
 */

export type PipelineElbowProps = {
  /** `top-left` es el codo del encabezado; `bottom-left` cierra el panel. */
  corner?: 'top-left' | 'bottom-left';
  className?: string;
};

/* Se recorre por fuera y vuelve por dentro: sube el flanco, curva al tope,
   corre hasta el borde derecho, baja el grosor del brazo, vuelve a la
   izquierda, curva hacia abajo por el interior y cierra sobre la espina. */
const TOP_LEFT = [
  'M0 64',
  'L0 28',
  'A28 28 0 0 1 28 0',
  'L64 0',
  'L64 28',
  'L38 28',
  'A14 14 0 0 0 24 42',
  'L24 64',
  'Z',
].join(' ');

/* El mismo recorrido espejado en vertical, para cerrar el panel abajo. */
const BOTTOM_LEFT = [
  'M0 0',
  'L0 36',
  'A28 28 0 0 0 28 64',
  'L64 64',
  'L64 36',
  'L38 36',
  'A14 14 0 0 1 24 22',
  'L24 0',
  'Z',
].join(' ');

export function PipelineElbow({ corner = 'top-left', className }: PipelineElbowProps) {
  return (
    <svg
      className={className ? `pipeline-elbow ${className}` : 'pipeline-elbow'}
      viewBox="0 0 64 64"
      width="64"
      height="64"
      // Decorativo: la pieza no aporta información que el texto no dé ya.
      aria-hidden="true"
      focusable="false"
    >
      {/* `currentColor` para que el codo herede el tono de la card —atención,
          vivo o neutro— sin duplicar una variante por color. */}
      <path d={corner === 'top-left' ? TOP_LEFT : BOTTOM_LEFT} fill="currentColor" />
    </svg>
  );
}
