'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/hooks/use-translation';

const GREEN = 'var(--color-git-add)';

export function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleCopy}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 6,
          border: '1px solid var(--color-border-subtle)',
          background: 'color-mix(in srgb, var(--color-text-primary) 3.5%, transparent)',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-git-add) 35%, transparent)';
          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)';
          e.currentTarget.style.color = 'var(--color-git-add)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text-primary) 3.5%, transparent)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title={t('common.copy')}
      >
        {copied ? <Check size={14} style={{ color: 'var(--color-git-add)' }} /> : <Copy size={14} />}
      </button>
      {copied && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            background: 'var(--color-bg-surface)',
            color: GREEN,
            border: '1px solid color-mix(in srgb, var(--color-git-add) 30%, transparent)',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--color-bg-base) 40%, transparent)',
          }}
        >
          {t('common.copied')}
        </span>
      )}
    </div>
  );
}
