'use client';

import type { BranchDecisionRow, PredictionRunRow, SpeculativeBranchRow } from '@/electron/db/types';
import { translate, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type DecisionKind = 'accepted' | 'materialized' | 'rejected' | 'deferred' | 'undecided';

const DECISION_COLOR: Record<DecisionKind, string> = {
  accepted: 'var(--color-git-add)',
  materialized: 'var(--color-primary)',
  rejected: 'var(--color-error)',
  deferred: 'var(--color-git-mod)',
  undecided: 'var(--color-text-secondary)',
};

const REF_STATUS_COLOR = {
  active: 'var(--color-git-add)',
  deleted: 'var(--color-text-secondary)',
};

interface PredictionDetailProps {
  run: PredictionRunRow;
  branch: SpeculativeBranchRow;
  decisions: BranchDecisionRow[];
  currentBranches: readonly string[];
  lang: Lang;
  onBack: () => void;
}

function localeForLang(lang: Lang): string {
  if (lang === 'en') return 'en-US';
  if (lang === 'zh') return 'zh-CN';
  return 'es-AR';
}

function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeForLang(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const text = String(value).trim();
  return text.length > 0 ? text : '—';
}

function shortSha(value: string | null | undefined): string {
  const text = formatValue(value);
  return text === '—' ? text : text.slice(0, 8);
}

function decisionKind(value: string | null | undefined): DecisionKind {
  if (value === 'accepted' || value === 'materialized' || value === 'rejected' || value === 'deferred') {
    return value;
  }
  return 'undecided';
}

function translatedType(type: string, lang: Lang): string {
  const key = `branchType.${type}`;
  const translated = translate(key, lang);
  return translated === key ? formatValue(type) : translated;
}

function chronologicalDecisions(decisions: BranchDecisionRow[]): BranchDecisionRow[] {
  return [...decisions].sort((a, b) => {
    const at = new Date(a.decidedAt).getTime();
    const bt = new Date(b.decidedAt).getTime();
    return (Number.isNaN(at) ? 0 : at) - (Number.isNaN(bt) ? 0 : bt);
  });
}

function DetailField({
  label,
  value,
  mono = false,
  multiline = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="min-w-0 rounded border border-border-subtle/15 bg-bg-surface/55 px-3 py-2">
      <div className="text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-text-secondary/80">{label}</div>
      <div
        className={cn(
          'mt-1 text-[var(--font-size-xs)] leading-relaxed text-text-primary/90',
          value === '—' && 'text-text-secondary/60',
          mono && 'font-mono text-primary/85',
          multiline ? 'whitespace-pre-line' : 'truncate',
        )}
        title={multiline ? undefined : value}
      >
        {value}
      </div>
    </div>
  );
}

function DecisionBadge({ kind, lang }: { kind: DecisionKind; lang: Lang }) {
  const color = DECISION_COLOR[kind];
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[var(--font-size-xs)] font-bold uppercase tracking-wider"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {translate(`decision.${kind}`, lang)}
    </span>
  );
}

export function PredictionDetail({
  run,
  branch,
  decisions,
  currentBranches,
  lang,
  onBack,
}: PredictionDetailProps) {
  const currentBranchSet = new Set(currentBranches);
  const sortedDecisions = chronologicalDecisions(decisions);
  const confidence = `${Math.round(branch.confidence * 100)}%`;

  return (
    <div className="flex flex-col gap-3 px-4 py-2.5 font-mono">
      <div className="flex items-center justify-between gap-3 border-b border-primary/15 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-primary/25 bg-primary/10 px-2.5 py-1 text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-primary transition-colors hover:border-primary/55 hover:bg-primary/15"
        >
          ← {translate('predictionDetail.back', lang)}
        </button>
        <div className="min-w-0 text-right">
          <div className="text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-text-secondary/75">
            {translate('predictionDetail.title', lang)}
          </div>
          <div className="truncate text-[var(--font-size-xs)] font-bold text-text-primary">{formatValue(branch.message)}</div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2">
        <DetailField label={translate('predictionDetail.generated', lang)} value={formatDateTime(run.generatedAt, lang)} />
        <DetailField label={translate('predictionDetail.commit', lang)} value={shortSha(run.headSha)} mono />
        <DetailField label={translate('predictionDetail.model', lang)} value={formatValue(run.model)} />
        <DetailField label={translate('predictionDetail.provider', lang)} value={formatValue(run.provider)} />
      </section>

      <section className="grid gap-2">
        <DetailField label={translate('predictionDetail.predictionTitle', lang)} value={formatValue(branch.message)} />
        <DetailField label={translate('predictionDetail.description', lang)} value={formatValue(branch.description)} multiline />
        <DetailField label={translate('predictionDetail.rationale', lang)} value={formatValue(branch.rationale)} multiline />
        <div className="grid grid-cols-2 gap-2">
          <DetailField label={translate('predictionDetail.type', lang)} value={translatedType(branch.type, lang)} />
          <DetailField label={translate('predictionDetail.confidence', lang)} value={confidence} mono />
        </div>
      </section>

      <section className="overflow-hidden rounded border border-border-subtle/15 bg-bg-surface/55">
        <header className="border-b border-border-subtle/15 px-3 py-2 text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-text-secondary">
          {translate('predictionDetail.decisions', lang)}
        </header>
        {sortedDecisions.length > 0 ? (
          <ol className="divide-y divide-border-subtle/10">
            {sortedDecisions.map((decision) => {
              const kind = decisionKind(decision.decision);
              const materializedRef = formatValue(decision.materializedRef);
              const isMaterialized = kind === 'materialized' && materializedRef !== '—';
              const refExists = isMaterialized && currentBranchSet.has(materializedRef);

              return (
                <li key={decision.id} className="flex flex-col gap-1.5 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <DecisionBadge kind={kind} lang={lang} />
                    <time className="text-[var(--font-size-xs)] text-text-secondary/75" dateTime={decision.decidedAt}>
                      {formatDateTime(decision.decidedAt, lang)}
                    </time>
                  </div>
                  {isMaterialized && (
                    <div className="flex flex-wrap items-center gap-2 text-[var(--font-size-xs)]">
                      <span className="text-text-secondary/80">{translate('predictionDetail.materializedRef', lang)}</span>
                      <span
                        className={cn(
                          'break-all rounded border px-1.5 py-0.5 font-mono',
                          !refExists && 'line-through',
                        )}
                        style={{
                          color: refExists ? 'color-mix(in srgb, var(--color-git-add) 85%, transparent)' : 'color-mix(in srgb, var(--color-text-secondary) 80%, transparent)',
                          borderColor: refExists ? 'color-mix(in srgb, var(--color-git-add) 25%, transparent)' : 'color-mix(in srgb, var(--color-text-secondary) 25%, transparent)',
                          background: refExists ? 'color-mix(in srgb, var(--color-git-add) 8%, transparent)' : 'color-mix(in srgb, var(--color-text-secondary) 8%, transparent)',
                        }}
                      >
                        {materializedRef}
                      </span>
                      <span
                        className="rounded border px-1.5 py-0.5 font-bold uppercase tracking-wider shadow-[0_0_12px_color-mix(in_srgb,var(--color-text-secondary)_12%,transparent)]"
                        style={{
                          color: refExists ? 'color-mix(in srgb, var(--color-git-add) 85%, transparent)' : 'var(--color-text-secondary)',
                          borderColor: refExists ? 'color-mix(in srgb, var(--color-git-add) 35%, transparent)' : 'color-mix(in srgb, var(--color-text-secondary) 35%, transparent)',
                          background: refExists ? 'color-mix(in srgb, var(--color-git-add) 12%, transparent)' : 'color-mix(in srgb, var(--color-text-secondary) 12%, transparent)',
                        }}
                      >
                        {!refExists && <span aria-hidden="true">✕ </span>}
                        {translate(refExists ? 'predictionDetail.refActive' : 'predictionDetail.refDeleted', lang)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-3 py-2 text-[var(--font-size-xs)] italic text-text-secondary/70">
            {translate('predictionDetail.noDecisions', lang)}
          </p>
        )}
      </section>
    </div>
  );
}
