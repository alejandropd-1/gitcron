'use client';

import React, { useMemo } from 'react';

type SafeMarkdownProps = {
  content: string;
  className?: string;
};

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'codeblock'; language?: string; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

function parseMarkdown(raw: string): Block[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const blocks: Block[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: 'list', items: [...currentList] });
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block check
    if (trimmed.startsWith('```')) {
      flushList();
      if (inCodeBlock) {
        blocks.push({
          type: 'codeblock',
          language: codeLang,
          text: codeLines.join('\n'),
        });
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // List check
    const listMatch = line.match(/^[\s]*[-*]\s+(.*)$/);
    if (listMatch) {
      currentList.push(listMatch[1]);
      continue;
    } else {
      flushList();
    }

    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
    } else if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', text: trimmed.slice(2).trim() });
    } else {
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }

  flushList();
  if (inCodeBlock) {
    blocks.push({
      type: 'codeblock',
      language: codeLang,
      text: codeLines.join('\n'),
    });
  }

  return blocks;
}

/** Renderiza inline markdown: **bold** e `code`. Sin usar dangerouslySetInnerHTML. */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="pipeline-markdown__strong">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="pipeline-markdown__inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={`pipeline-markdown ${className ?? ''}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h3 key={idx} className="pipeline-markdown__h1">
                {renderInline(block.text)}
              </h3>
            );
          case 'h2':
            return (
              <h4 key={idx} className="pipeline-markdown__h2">
                {renderInline(block.text)}
              </h4>
            );
          case 'h3':
            return (
              <h5 key={idx} className="pipeline-markdown__h3">
                {renderInline(block.text)}
              </h5>
            );
          case 'blockquote':
            return (
              <blockquote key={idx} className="pipeline-markdown__blockquote">
                {renderInline(block.text)}
              </blockquote>
            );
          case 'codeblock':
            return (
              <pre key={idx} className="pipeline-markdown__codeblock">
                <code>{block.text}</code>
              </pre>
            );
          case 'list':
            return (
              <ul key={idx} className="pipeline-markdown__list">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'paragraph':
            return (
              <p key={idx} className="pipeline-markdown__paragraph">
                {renderInline(block.text)}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
