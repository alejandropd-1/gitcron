import { tNow } from '@/hooks/use-translation';

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return tNow('graph.justNow');
  if (diffMin < 60) return tNow('graph.minutesAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return tNow('graph.hoursAgo', { n: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return tNow('graph.daysAgo', { n: diffD });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}
