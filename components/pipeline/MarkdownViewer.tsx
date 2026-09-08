'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Componente unificado para renderizar Markdown en GitCron utilizando react-markdown y remark-gfm.
 * - Cero uso de dangerouslySetInnerHTML.
 * - Por omisión, react-markdown escapa y no interpreta HTML crudo.
 * - Los enlaces se abren de forma segura en el navegador externo del sistema (shellOpenExternal).
 * - Los encabezados (# a ######) se mapean desplazados dos niveles (h3 a h6, tope en h6) para
 *   encajar dentro de la jerarquía accesible del panel contenedor.
 */
export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  if (!content) return null;

  return (
    <div className={`pipeline-markdown ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h3 className="pipeline-markdown__h1" {...props}>
              {children}
            </h3>
          ),
          h2: ({ children, ...props }) => (
            <h4 className="pipeline-markdown__h2" {...props}>
              {children}
            </h4>
          ),
          h3: ({ children, ...props }) => (
            <h5 className="pipeline-markdown__h3" {...props}>
              {children}
            </h5>
          ),
          h4: ({ children, ...props }) => (
            <h6 className="pipeline-markdown__h4" {...props}>
              {children}
            </h6>
          ),
          h5: ({ children, ...props }) => (
            <h6 className="pipeline-markdown__h5" {...props}>
              {children}
            </h6>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="pipeline-markdown__h6" {...props}>
              {children}
            </h6>
          ),
          p: ({ children, ...props }) => (
            <p className="pipeline-markdown__paragraph" {...props}>
              {children}
            </p>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="pipeline-markdown__blockquote" {...props}>
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }) => (
            <pre className="pipeline-markdown__codeblock" {...props}>
              {children}
            </pre>
          ),
          code: ({ children, className: codeClassName, ...props }) => (
            <code className={`pipeline-markdown__inline-code ${codeClassName ?? ''}`} {...props}>
              {children}
            </code>
          ),
          ul: ({ children, className: ulClassName, ...props }) => (
            <ul className={`pipeline-markdown__list ${ulClassName ?? ''}`} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, className: olClassName, ...props }) => (
            <ol className={`pipeline-markdown__list ${olClassName ?? ''}`} {...props}>
              {children}
            </ol>
          ),
          table: ({ children, ...props }) => (
            <div className="pipeline-markdown__table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
          strong: ({ children, ...props }) => (
            <strong className="pipeline-markdown__strong" {...props}>
              {children}
            </strong>
          ),
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (href && typeof window !== 'undefined' && window.api?.shellOpenExternal) {
                  e.preventDefault();
                  void window.api.shellOpenExternal(href);
                }
              }}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
