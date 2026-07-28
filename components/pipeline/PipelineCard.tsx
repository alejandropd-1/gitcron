'use client';

import type { ReactNode } from 'react';
import { PipelineElbow } from './PipelineElbow';

export type PipelineCardTone = 'neutral' | 'attention' | 'live';

export type PipelineCardProps = {
  /** Id del `<h3>`; el contenedor lo referencia con `aria-labelledby`. */
  titleId: string;
  title: string;
  icon: ReactNode;
  /**
   * Cuántos elementos hay. Se muestra SIEMPRE que se pase, incluso en `0`:
   * que algo esté en cero es información, y esconder el contador obligaría a
   * abrir el panel para descubrir que está vacío.
   */
  count?: number;
  /** Zona derecha del encabezado: chips de estado, filtros. */
  aside?: ReactNode;
  /**
   * `attention` = algo espera a una persona · `live` = hay stream entrando.
   * El tono agrega borde y color, nunca reemplaza al texto que ya lo dice.
   */
  tone?: PipelineCardTone;
  /** Área del grid al que se asigna la card. */
  area: string;
  /** `true` cuando el cuerpo debe scrollear por dentro en vez de crecer. */
  scrolls?: boolean;
  /**
   * Panel secundario: se pliega. Usa `<details>` nativo, así que el teclado y
   * el lector de pantalla funcionan sin una línea de JS ni `aria-expanded`
   * hecho a mano.
   */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Cierra el bloque con un segundo codo y una barra de instrumentación. */
  frameEnd?: boolean;
  /** Código técnico decorativo de la zona, no una string traducible. */
  zoneCode?: string;
  children: ReactNode;
};

function Header({
  titleId,
  title,
  icon,
  count,
  aside,
}: Pick<PipelineCardProps, 'titleId' | 'title' | 'icon' | 'count' | 'aside'>) {
  return (
    <>
      <span className="pipeline-card__icon" aria-hidden="true">{icon}</span>
      <h3 id={titleId} className="pipeline-card__title">{title}</h3>
      {count !== undefined && (
        <span className="pipeline-badge" data-tone={count > 0 ? undefined : 'empty'}>{count}</span>
      )}
      {aside && <div className="pipeline-card__aside">{aside}</div>}
    </>
  );
}

/**
 * Marco común de todos los paneles del tablero.
 *
 * Dos reglas lo gobiernan, y la segunda salió de ver el diseño anterior roto:
 *
 * 1. El encabezado es siempre `icono + título + contador`. Repetir la
 *    estructura es lo que permite barrer el tablero con la vista.
 * 2. **Sólo scrollea lo genuinamente ilimitado.** Una bitácora o una lista de
 *    decisiones pueden crecer sin techo y llevan `scrolls`. Un panel de cuatro
 *    datos, no: se dimensiona por su contenido. Forzarlo a una fila fija lo
 *    hacía cortar sus propios datos a mitad de palabra, que es peor UX que
 *    dejar scrollear la página.
 */
export function PipelineCard({
  titleId,
  title,
  icon,
  count,
  aside,
  tone = 'neutral',
  area,
  scrolls = false,
  collapsible = false,
  defaultOpen = false,
  frameEnd = false,
  zoneCode,
  children,
}: PipelineCardProps) {
  const toneAttr = tone === 'neutral' ? undefined : tone;

  if (collapsible) {
    return (
      <details
        className="pipeline-card"
        style={{ gridArea: area }}
        data-area={area}
        data-tone={toneAttr}
        data-collapsible="true"
        data-framed={frameEnd || undefined}
        open={defaultOpen}
      >
        <PipelineElbow corner="top-left" className="pipeline-card__frame" />
        <summary className="pipeline-card__header">
          <span className="pipeline-card__chevron" aria-hidden="true" />
          <Header titleId={titleId} title={title} icon={icon} count={count} aside={aside} />
        </summary>
        <div className="pipeline-card__body">{children}</div>
        {frameEnd && (
          <>
            <PipelineElbow corner="bottom-left" className="pipeline-card__frame pipeline-card__frame--bottom" />
            <span className="pipeline-card__foot" aria-hidden="true">
              <span className="pipeline-card__window" />
              {zoneCode && <span className="pipeline-card__code">{zoneCode}</span>}
            </span>
          </>
        )}
      </details>
    );
  }

  return (
    <section
      className="pipeline-card"
      style={{ gridArea: area }}
      data-area={area}
      data-tone={toneAttr}
      data-scrolls={scrolls || undefined}
      data-framed={frameEnd || undefined}
      aria-labelledby={titleId}
    >
      {/* El codo se dibuja como path, no con `border-radius`: la pieza tiene un
          radio exterior amplio y uno interior cerrado a la vez, y una caja CSS
          sólo sabe redondear sus propias esquinas. */}
      <PipelineElbow corner="top-left" className="pipeline-card__frame" />
      <header className="pipeline-card__header">
        <Header titleId={titleId} title={title} icon={icon} count={count} aside={aside} />
      </header>
      <div className="pipeline-card__body">{children}</div>
      {frameEnd && (
        <>
          <PipelineElbow corner="bottom-left" className="pipeline-card__frame pipeline-card__frame--bottom" />
          <span className="pipeline-card__foot" aria-hidden="true">
            <span className="pipeline-card__window" />
            {zoneCode && <span className="pipeline-card__code">{zoneCode}</span>}
          </span>
        </>
      )}
    </section>
  );
}
