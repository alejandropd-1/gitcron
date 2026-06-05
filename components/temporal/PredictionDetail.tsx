'use client';

import type { BranchDecisionRow, PredictionRunRow, SpeculativeBranchRow } from '@/electron/db/types';
import { translate, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type DecisionKind = 'accepted' | 'materialized' | 'rejected' | 'deferred' | 'undecided';

const DECISION_COLOR: Record<DecisionKind, string> = {
  accepted: '#a3f185',
  materialized: '#5ed8ff',
  rejected: '#dc6a6a',
  deferred: '#fd9d1a',
  undecided: '#697789',
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
    <div className="min-w-0 rounded border border-[#d9e7fc]/10 bg-[#061625]/55 px-3 py-2">
      <div className="text-[8px] font-bold uppercase tracking-wider text-[#697789]/80">{label}</div>
      <div
        className={cn(
          'mt-1 text-[10px] leading-relaxed text-[#d9e7fc]/90',
          value === '—' && 'text-[#697789]/60',
          mono && 'font-mono text-[#5ed8ff]/85',
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
      className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{
        color,
        borderColor: `${color}40`,
        background: `${color}10`,
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
      <div className="flex items-center justify-between gap-3 border-b border-[#5ed8ff]/15 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-[#5ed8ff]/25 bg-[#5ed8ff]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5ed8ff] transition-colors hover:border-[#5ed8ff]/55 hover:bg-[#5ed8ff]/14"
        >
          ← {translate('predictionDetail.back', lang)}
        </button>
        <div className="min-w-0 text-right">
          <div className="text-[8px] font-bold uppercase tracking-wider text-[#697789]/75">
            {translate('predictionDetail.title', lang)}
          </div>
          <div className="truncate text-[11px] font-bold text-[#d9e7fc]">{formatValue(branch.message)}</div>
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

      <section className="overflow-hidden rounded border border-[#d9e7fc]/10 bg-[#061625]/55">
        <header className="border-b border-[#d9e7fc]/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#9eacc0]">
          {translate('predictionDetail.decisions', lang)}
        </header>
        {sortedDecisions.length > 0 ? (
          <ol className="divide-y divide-[#d9e7fc]/8">
            {sortedDecisions.map((decision) => {
              const kind = decisionKind(decision.decision);
              const materializedRef = formatValue(decision.materializedRef);
              const isMaterialized = kind === 'materialized' && materializedRef !== '—';
              const refExists = isMaterialized && currentBranchSet.has(materializedRef);

              return (
                <li key={decision.id} className="flex flex-col gap-1.5 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <DecisionBadge kind={kind} lang={lang} />
                    <time className="text-[9px] text-[#697789]/75" dateTime={decision.decidedAt}>
                      {formatDateTime(decision.decidedAt, lang)}
                    </time>
                  </div>
                  {isMaterialized && (
                    <div className="flex flex-wrap items-center gap-2 text-[9px]">
                      <span className="text-[#697789]/80">{translate('predictionDetail.materializedRef', lang)}</span>
                      <span
                        className={cn(
                          'break-all rounded border px-1.5 py-0.5 font-mono',
                          refExists
                            ? 'border-[#a3f185]/25 bg-[#a3f185]/8 text-[#a3f185]/85'
                            : 'border-[#697789]/25 bg-[#697789]/8 text-[#697789]/70 line-through',
                        )}
                      >
                        {materializedRef}
                      </span>
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 font-bold uppercase tracking-wider',
                          refExists
                            ? 'border-[#a3f185]/25 text-[#a3f185]/80'
                            : 'border-[#697789]/25 text-[#697789]/70',
                        )}
                      >
                        {translate(refExists ? 'predictionDetail.refActive' : 'predictionDetail.refDeleted', lang)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-3 py-2 text-[10px] italic text-[#697789]/70">
            {translate('predictionDetail.noDecisions', lang)}
          </p>
        )}
      </section>
    </div>
  );
}
