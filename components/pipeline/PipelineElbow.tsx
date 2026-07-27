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
 *   V = 24   ancho del brazo vertical (la espina)
 *   H = 16   alto del brazo horizontal (la barra del encabezado)
 *   Ro = 24  radio exterior — el que da la silueta
 *   Ri = 12  radio interior — el que hace que se lea como una pieza doblada
 *            y no como dos barras pegadas
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

const TOP_LEFT = [
  'M0 64',
  'L0 24',
  'A24 24 0 0 1 24 0',
  'L64 0',
  'L64 16',
  'L36 16',
  'A12 12 0 0 0 24 28',
  'L24 64',
  'Z',
].join(' ');

const BOTTOM_LEFT = [
  'M0 0',
  'L0 40',
  'A24 24 0 0 0 24 64',
  'L64 64',
  'L64 48',
  'L36 48',
  'A12 12 0 0 1 24 36',
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
