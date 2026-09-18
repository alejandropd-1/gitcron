'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { CoexistenceDiagnostic } from '@/lib/openspec-update-guide';
import type { OpenSpecInstalledSkill } from '@/types/pipeline';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecCoexistenceTableProps {
  coexistence: CoexistenceDiagnostic;
}

export function extractToolFolderFromPath(pathStr: string): string {
  const normalized = pathStr.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const skillsIdx = segments.indexOf('skills');
  if (skillsIdx > 0) {
    return segments[skillsIdx - 1];
  }
  const dotSegment = segments.find((s) => s.startsWith('.'));
  if (dotSegment) {
    return dotSegment;
  }
  return segments[0] || pathStr;
}

export const OpenSpecCoexistenceTable: React.FC<OpenSpecCoexistenceTableProps> = ({
  coexistence,
}) => {
  const t = useT();

  const allSkills: OpenSpecInstalledSkill[] = [
    ...coexistence.legacySkills,
    ...coexistence.newAgentsSkills,
    ...coexistence.officialOtherSkills,
    ...coexistence.customPreexistingSkills,
    ...coexistence.customOtherSkills,
  ];

  // Carpetas detectadas derivadas de path
  const rawFolders: string[] = [];
  for (const s of allSkills) {
    const folder = extractToolFolderFromPath(s.path);
    if (!rawFolders.includes(folder)) {
      rawFolders.push(folder);
    }
  }
  // .agents primero si existe, y las demás en el orden en que aparecen
  const toolFolders = rawFolders.includes('.agents')
    ? ['.agents', ...rawFolders.filter((f) => f !== '.agents')]
    : rawFolders;

  // Una fila por nombre de skill (unión de todas las listas, sin repetir)
  const skillNames: string[] = [];
  for (const s of allSkills) {
    if (!skillNames.includes(s.name)) {
      skillNames.push(s.name);
    }
  }

  // Mapa rápido (skillName -> folder -> skill)
  const skillFolderMap = new Map<string, Map<string, OpenSpecInstalledSkill>>();
  for (const s of allSkills) {
    const folder = extractToolFolderFromPath(s.path);
    let fMap = skillFolderMap.get(s.name);
    if (!fMap) {
      fMap = new Map();
      skillFolderMap.set(s.name, fMap);
    }
    if (!fMap.has(folder)) {
      fMap.set(folder, s);
    }
  }

  return (
    <div>
      <table className={styles.coexistenceTable}>
        <caption>{t('pipeline.openspec.coexistence.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('pipeline.openspec.coexistence.colSkill')}</th>
            {toolFolders.map((folder) => (
              <th key={folder} scope="col" data-align="center">
                {folder}
              </th>
            ))}
            <th scope="col">{t('pipeline.openspec.coexistence.colType')}</th>
          </tr>
        </thead>
        <tbody>
          {skillNames.map((name) => {
            const fMap = skillFolderMap.get(name);
            const entries = allSkills.filter((s) => s.name === name);
            const inOfficial = entries.some(
              (e) => e.origin === 'new-agents' || e.origin === 'official-other',
            );
            const inCustom = entries.some(
              (e) => e.origin === 'custom-agents' || e.origin === 'custom-other',
            );
            const typeKind = inOfficial ? 'official' : inCustom ? 'custom' : 'legacy';
            const typeKey = inOfficial
              ? 'pipeline.openspec.coexistence.typeOfficial'
              : inCustom
              ? 'pipeline.openspec.coexistence.typeCustom'
              : 'pipeline.openspec.coexistence.typeLegacy';

            return (
              <tr key={name}>
                <td>
                  <code className={styles.coexistenceSkillCode}>{name}</code>
                </td>
                {toolFolders.map((folder) => {
                  const entry = fMap?.get(folder);
                  if (!entry) {
                    return <td key={folder} data-align="center" />;
                  }
                  const originKind =
                    entry.isOfficial ||
                    entry.origin === 'new-agents' ||
                    entry.origin === 'official-other'
                      ? 'official'
                      : entry.origin === 'custom-agents' || entry.origin === 'custom-other'
                      ? 'custom'
                      : 'legacy';

                  return (
                    <td key={folder} data-align="center">
                      <span
                        className={styles.coexistenceCheck}
                        data-origin={originKind}
                        aria-label={`${name} en ${folder}`}
                      >
                        ✓
                      </span>
                    </td>
                  );
                })}
                <td>
                  <span className={styles.coexistenceTypeTag} data-type={typeKind}>
                    {t(typeKey)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Colisiones o conflictos debajo de la tabla */}
      <div style={{ marginTop: 'var(--space-2)' }}>
        <span className={styles.reviewFactLabel}>
          {t('pipeline.openspec.engine.coexistence.collisionsTitle')}:{' '}
        </span>
        {coexistence.nameCollisions.length === 0 && coexistence.conflicts.length === 0 ? (
          <span style={{ color: 'var(--color-git-add)', fontSize: 'var(--font-size-xs)' }}>
            {t('pipeline.openspec.engine.coexistence.noCollisions')}
          </span>
        ) : (
          <div style={{ marginTop: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {coexistence.nameCollisions.map((col) => (
              <span key={col} style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-xs)' }}>
                ⚠️ Colisión de nombre: <code>{col}</code> existe en configuración legacy y nueva.
              </span>
            ))}
            {coexistence.conflicts.map((conf, idx) => (
              <span key={idx} style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
                ⚠️ Conflicto: {conf}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
