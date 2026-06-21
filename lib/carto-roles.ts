import type { CartoNode } from './carto-types';

export type CartoRoleId =
  | 'ui'
  | 'styles'
  | 'database'
  | 'critical'
  | 'logic'
  | 'config'
  | 'other';

export interface CartoRoleDefinition {
  id: CartoRoleId;
  labelKey: string;
  color: string;
}

export const CARTO_ROLE_DEFINITIONS: readonly CartoRoleDefinition[] = [
  { id: 'ui', labelKey: 'cartography.role.ui', color: 'var(--color-carto-role-ui)' },
  { id: 'styles', labelKey: 'cartography.role.styles', color: 'var(--color-carto-role-styles)' },
  { id: 'database', labelKey: 'cartography.role.database', color: 'var(--color-carto-role-database)' },
  { id: 'critical', labelKey: 'cartography.role.critical', color: 'var(--color-carto-role-critical)' },
  { id: 'logic', labelKey: 'cartography.role.logic', color: 'var(--color-carto-role-logic)' },
  { id: 'config', labelKey: 'cartography.role.config', color: 'var(--color-carto-role-config)' },
  { id: 'other', labelKey: 'cartography.role.other', color: 'var(--color-carto-role-other)' },
];

export const CARTO_ROLE_BY_ID: Record<CartoRoleId, CartoRoleDefinition> =
  Object.fromEntries(CARTO_ROLE_DEFINITIONS.map((role) => [role.id, role])) as Record<
    CartoRoleId,
    CartoRoleDefinition
  >;

const CONFIG_FILE_RE =
  /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig[^/]*\.json|next\.config\.[cm]?[jt]s|tailwind\.config\.[cm]?[jt]s|postcss\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s|tsup\.config\.[cm]?[jt]s|\.fallowrc\.json|\.gitignore|\.npmrc)$/;
const STYLE_FILE_RE = /(^|\/)(globals|tokens|theme)\.(css|scss|sass|less)$|(\.module)?\.(css|scss|sass|less)$/;
const DATABASE_RE = /(^|\/)(db|database|migrations?|schema|persistence)(\/|$)|\.(sql|sqlite)$/;
const PERSISTENCE_STORE_RE = /(^|\/).*(persist|persistence|repository|store).*\.(ts|tsx|js|jsx)$/;
const CRITICAL_RE =
  /(^|\/)(electron\/(main|preload)\.ts|electron\/ipc\/|electron\/git|electron\/shell|electron\/watchers|lib\/git-|hooks\/git-actions\/|types\/electron\.d\.ts)/;
const UI_RE = /(^|\/)(components|app)\/.*\.(tsx|jsx)$|(^|\/).*\.tsx$/;
const LOGIC_RE = /(^|\/)(lib|hooks|types)\//;

function normalizedPath(input: CartoNode | string): string {
  const filePath = typeof input === 'string' ? input : input.filePath;
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

export function classifyCartoRole(input: CartoNode | string): CartoRoleId {
  const p = normalizedPath(input);
  const kind = typeof input === 'string' ? '' : input.kind.toLowerCase();

  if (CONFIG_FILE_RE.test(p)) return 'config';
  if (STYLE_FILE_RE.test(p)) return 'styles';
  if (DATABASE_RE.test(p) || PERSISTENCE_STORE_RE.test(p)) return 'database';
  if (CRITICAL_RE.test(p)) return 'critical';
  if (UI_RE.test(p) || kind === 'component') return 'ui';
  if (LOGIC_RE.test(p)) return 'logic';
  return 'other';
}
