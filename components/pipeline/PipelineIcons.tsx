/**
 * Iconografía del workspace Pipeline.
 *
 * Trazo de 1.5, grilla de 24 y `currentColor`: heredan el color del contexto,
 * así que un mismo icono sirve en un chip secundario y en un botón primario sin
 * duplicar variantes.
 *
 * Todos son `aria-hidden`. Un icono nunca es el nombre accesible de un control:
 * el texto visible al lado lo es, y cuando no hay texto va `aria-label` en el
 * botón. Un icono solo nunca comunica estado — acompaña a la palabra.
 */

export type PipelineIconProps = {
  className?: string;
};

function Svg({ children, className }: PipelineIconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className ? `pipeline-icon ${className}` : 'pipeline-icon'}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ─────────── canales de la bitácora ─────────── */

/** Narrativa: lo que el agente dijo en prosa. */
export function IconNarrative(props: PipelineIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.5A7 7 0 0 1 8 5h5a7 7 0 0 1 7 7Z" />
    </Svg>
  );
}

/** Razonamiento: el pensamiento intermedio, cuando el runtime lo expone. */
export function IconReasoning(props: PipelineIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8V15a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2.2A3 3 0 0 0 16 7a4 4 0 0 0-4-4Z" />
      <path d="M10 21h4" />
    </Svg>
  );
}

/** Herramienta: una llamada a tool del runtime. */
export function IconTool(props: PipelineIconProps) {
  return (
    <Svg {...props}>
      <path d="m14.5 5.5 4 4M3 21l6.5-6.5M21 7.5a4.5 4.5 0 0 1-5.8 4.3L7.8 19.2a2 2 0 0 1-2.8-2.8l7.4-7.4A4.5 4.5 0 0 1 18.4 3l-3 3 2.6 2.6 3-3c.3.6.5 1.2.5 1.9Z" />
    </Svg>
  );
}

/** Archivos: cambios sobre el árbol de trabajo. */
export function IconFile(props: PipelineIconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3v5h5" />
      <path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z" />
    </Svg>
  );
}

/** Sistema: arranque, cierre, degradaciones del stream. */
export function IconSystem(props: PipelineIconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </Svg>
  );
}
