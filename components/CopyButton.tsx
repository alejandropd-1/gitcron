'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/hooks/use-translation';

const GREEN = '#a3f185';

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
          border: '1px solid rgba(217, 231, 252, 0.15)',
          background: 'rgba(217, 231, 252, 0.035)',
          color: '#9eacc0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(163, 241, 133, 0.35)';
          e.currentTarget.style.background = 'rgba(217, 231, 252, 0.1)';
          e.currentTarget.style.color = '#a3f185';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(217, 231, 252, 0.15)';
          e.currentTarget.style.background = 'rgba(217, 231, 252, 0.035)';
          e.currentTarget.style.color = '#9eacc0';
        }}
        title={t('common.copy')}
      >
        {copied ? <Check size={14} style={{ color: '#a3f185' }} /> : <Copy size={14} />}
      </button>
      {copied && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            background: '#0D0E12',
            color: GREEN,
            border: `1px solid ${GREEN}30`,
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {t('common.copied')}
        </span>
      )}
    </div>
  );
}
