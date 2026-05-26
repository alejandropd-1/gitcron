export type ChangelogBullet = {
  title: string;
  detail?: string;
};

export type ChangelogGroup = {
  label: string;
  items: ChangelogBullet[];
};

export type ChangelogEntry = {
  version: string;
  date?: string;
  title: string;
  groups: ChangelogGroup[];
};

type ChangelogParseState = {
  entries: ChangelogEntry[];
  currentEntry: ChangelogEntry | null;
  currentArea: string | null;
  currentGroup: ChangelogGroup | null;
  isComplete: boolean;
};

function cleanChangelogText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*>\s?!?\[?(?:NOTE|TIP|WARNING|IMPORTANT)?\]?\s*/i, '')
    .trim();
}

function splitChangelogBullet(value: string): ChangelogBullet {
  const clean = cleanChangelogText(value);
  const match = clean.match(/^([^:]{3,96}):\s+(.+)$/);
  if (!match) return { title: clean };
  return { title: match[1], detail: match[2] };
}

function changelogSectionLabel(area: string | null, section: string | null): string {
  const sectionLabels: Record<string, string> = {
    Added: 'Novedades',
    Fixed: 'Correcciones',
    Refactored: 'Mejoras internas',
    Docs: 'Documentación',
    Packaging: 'Empaquetado',
    Tests: 'Pruebas',
    Stability: 'Estabilidad',
  };
  const parts = [
    area ? cleanChangelogText(area).replace(/^[^\wÁÉÍÓÚÜÑáéíóúüñ]+/, '') : null,
    section ? (sectionLabels[section] ?? cleanChangelogText(section)) : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Cambios';
}

function ensureGroup(state: ChangelogParseState, section: string | null) {
  if (!state.currentEntry) return null;

  const label = changelogSectionLabel(state.currentArea, section);
  state.currentGroup = state.currentEntry.groups.find((group) => group.label === label) ?? null;
  if (!state.currentGroup) {
    state.currentGroup = { label, items: [] };
    state.currentEntry.groups.push(state.currentGroup);
  }

  return state.currentGroup;
}

function startEntryFromLine(line: string, state: ChangelogParseState, maxEntries: number): boolean {
  const versionMatch = line.match(/^##\s+\[?v?([^\]\s]+)\]?\s*(?:-\s*([0-9-]+))?\s*(?:-\s*(.+))?$/);
  if (!versionMatch) return false;

  if (state.entries.length >= maxEntries) {
    state.isComplete = true;
    return true;
  }

  state.currentEntry = {
    version: versionMatch[1],
    date: versionMatch[2],
    title: cleanChangelogText(versionMatch[3] ?? ''),
    groups: [],
  };
  state.entries.push(state.currentEntry);
  state.currentArea = null;
  state.currentGroup = null;
  return true;
}

function captureAreaHeading(line: string, state: ChangelogParseState): boolean {
  const areaMatch = line.match(/^###\s+(.+)$/);
  if (!areaMatch) return false;

  state.currentArea = areaMatch[1];
  state.currentGroup = null;
  return true;
}

function captureSectionHeading(line: string, state: ChangelogParseState): boolean {
  const sectionMatch = line.match(/^####\s+(.+)$/);
  if (!sectionMatch) return false;

  ensureGroup(state, sectionMatch[1]);
  return true;
}

function appendBullet(line: string, state: ChangelogParseState) {
  const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
  if (!bulletMatch) return;

  const group = state.currentGroup ?? ensureGroup(state, null);
  if (!group) return;

  const isNested = /^\s{2,}[*-]\s+/.test(line);
  if (isNested && group.items.length > 0) {
    const last = group.items[group.items.length - 1];
    const nested = cleanChangelogText(bulletMatch[1]);
    last.detail = [last.detail, nested].filter(Boolean).join(' ');
    return;
  }

  if (group.items.length < 5) {
    group.items.push(splitChangelogBullet(bulletMatch[1]));
  }
}

export function parseChangelog(raw: string, maxEntries = 5): ChangelogEntry[] {
  const state: ChangelogParseState = {
    entries: [],
    currentEntry: null,
    currentArea: null,
    currentGroup: null,
    isComplete: false,
  };

  for (const line of raw.split(/\r?\n/)) {
    if (startEntryFromLine(line, state, maxEntries)) {
      if (state.isComplete) break;
      continue;
    }
    if (!state.currentEntry) continue;
    if (captureAreaHeading(line, state)) continue;
    if (captureSectionHeading(line, state)) continue;
    appendBullet(line, state);
  }

  return state.entries.filter((entry) => entry.groups.some((group) => group.items.length > 0));
}
