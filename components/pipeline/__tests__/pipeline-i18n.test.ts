import { describe, expect, it } from 'vitest';
import { translate, LANGS, type Lang } from '@/lib/i18n';

const LANGUAGES: Lang[] = ['es', 'en', 'zh'];

/** Claves que TANDA 1 estrena. Crece con cada tanda. */
const PIPELINE_KEYS = [
  'tab.pipeline',
  'pipeline.title',
  'pipeline.loading',
  'pipeline.noRepo.title',
  'pipeline.noRepo.body',
  'pipeline.noPipeline.title',
  'pipeline.noPipeline.body',
  'pipeline.incompatible.title',
  'pipeline.incompatible.unknownVersion',
  'pipeline.error.title',
  'pipeline.error.retry',
  'pipeline.source.git',
  'pipeline.source.runtime',
  'pipeline.source.openspec',
  'pipeline.unknown.notReported',
  'pipeline.unknown.notApplicable',
  'pipeline.unknown.pendingFixture',
  'pipeline.unknown.unknown',
  'pipeline.unknown.notReported.help',
  'pipeline.unknown.notApplicable.help',
  'pipeline.unknown.pendingFixture.help',
  'pipeline.unknown.unknown.help',
  'pipeline.provenance.runtime',
  'pipeline.provenance.repo',
  'pipeline.provenance.derived',
  'pipeline.provenance.human',
  'pipeline.evidence.verified',
  'pipeline.evidence.inferred',
  'pipeline.evidence.unknown',
  'pipeline.evidence.blocked',
  'pipeline.evidence.pending_fixture',
  'pipeline.option.viewEvidence',
  'pipeline.option.approve',
  'pipeline.option.copyAnswer',
  'pipeline.agents.title',
  'pipeline.agents.empty',
  'pipeline.agent.model',
  'pipeline.agent.provider',
  'pipeline.agent.tokens',
  'pipeline.agentState.running',
  'pipeline.agentState.done',
  'pipeline.agentState.failed',
  'pipeline.agentState.unknown',
  'pipeline.role.builder',
  'pipeline.role.auditor',
  'pipeline.role.orchestrator',
  'pipeline.role.scout',
  'pipeline.activity.title',
  'pipeline.activity.filters',
  'pipeline.activity.empty',
  'pipeline.activity.noReasoning',
  'pipeline.channel.narrative',
  'pipeline.channel.reasoning',
  'pipeline.channel.tool',
  'pipeline.channel.file',
  'pipeline.channel.system',
  'pipeline.economy.title',
  'pipeline.economy.input',
  'pipeline.economy.output',
  'pipeline.economy.reasoning',
  'pipeline.economy.cacheRead',
  'pipeline.economy.cost',
  'pipeline.economy.contextMax',
  'pipeline.economy.contextCurrent',
  'pipeline.economy.compactions',
  'pipeline.details.title',
  'pipeline.details.proposal',
  'pipeline.details.diffs',
  'pipeline.details.touchedFiles',
  'pipeline.details.provenance',
  'pipeline.details.location',
  'pipeline.details.recommendation',
  'pipeline.details.noProposal',
  'pipeline.details.noDiffs',
  'pipeline.details.noFindings',
  'pipeline.details.noGateHistory',
  'pipeline.control.title',
  'pipeline.control.pauseDelegations',
  'pipeline.control.pauseAfterTask',
  'pipeline.control.steer',
  'pipeline.control.queue',
  'pipeline.control.send',
  'pipeline.control.ackPending',
  'pipeline.control.ackSuccess',
  'pipeline.control.ackError',
  'pipeline.control.cancelRun',
  'pipeline.health.healthy',
  'pipeline.hud.title',
  'pipeline.hud.phase',
  'pipeline.hud.noPhase',
  'pipeline.hud.decisions',
  'pipeline.hud.needsYou',
  'pipeline.hud.allClear',
  'pipeline.openspec.activity.noneForChange',
  'pipeline.openspec.activity.repoScope',
  'pipeline.openspec.activity.ranAt',
  'pipeline.openspec.graph.label',
  'pipeline.openspec.graph.state.done',
  'pipeline.openspec.graph.state.ready',
  'pipeline.openspec.graph.state.blocked',
  'pipeline.openspec.graph.state.skipped',
  'pipeline.openspec.graph.state.unknown',
  'pipeline.openspec.graph.missingDeps',
  'pipeline.newChange.propose.nature',
  'pipeline.newChange.propose.objectiveHelp',
  'pipeline.newChange.propose.slugTarget',
  'pipeline.newChange.propose.constraintsHelp',
  // Pantalla de entrada del repositorio.
  'pipeline.openspec.start.title',
  'pipeline.openspec.start.back',
  'pipeline.openspec.start.inProgress',
  'pipeline.openspec.start.enter',
  'pipeline.openspec.start.branchMatch',
  'pipeline.openspec.start.tasks',
  'pipeline.openspec.start.noTasks',
  'pipeline.openspec.start.pending',
  'pipeline.openspec.start.pending.one',
  'pipeline.next.noSelection.title',
  'pipeline.next.noSelection.help',
  'pipeline.openspec.start.noActive',
  'pipeline.openspec.start.closed',
  'pipeline.openspec.start.neverArchived',
  'pipeline.openspec.start.archivedCount',
  'pipeline.openspec.start.archivedCount.one',
  'pipeline.openspec.start.specificationsCount',
  'pipeline.openspec.start.specsPending',
  // Preparación del commit del repositorio. Van acá para que las tres lenguas
  // queden exigidas: el riesgo real no es que falte una traducción sino que
  // quede una que hable "del cambio" sobre una superficie que ya no lo es.
  'pipeline.openspec.prepare.title',
  'pipeline.openspec.prepare.help',
  'pipeline.openspec.prepare.open',
  'pipeline.openspec.prepare.toBranch',
  'pipeline.newChange.propose.branch',
  'pipeline.newChange.propose.branchHelp',
  'pipeline.newChange.propose.branchFailed',
  'pipeline.openspec.prepare.stagedTitle',
  'pipeline.openspec.prepare.stagedEmpty',
  'pipeline.openspec.prepare.close',
  'pipeline.openspec.prepare.selected',
  'pipeline.openspec.prepare.message',
  'pipeline.openspec.prepare.messagePlaceholder',
  'pipeline.openspec.prepare.action',
  'pipeline.openspec.prepare.done',
  'pipeline.openspec.prepare.done.one',
  'pipeline.openspec.prepare.groupChange',
  'pipeline.openspec.prepare.groupChangeHelp',
  'pipeline.openspec.prepare.groupArchived',
  'pipeline.openspec.prepare.groupArchivedHelp',
  'pipeline.openspec.prepare.groupArchivedHelpPlain',
  'pipeline.openspec.prepare.groupUnattributed',
  'pipeline.openspec.prepare.groupUnattributedHelp',
  'pipeline.openspec.prepare.kind.code',
  'pipeline.openspec.prepare.kind.test',
  'pipeline.openspec.prepare.kind.docs',
  'pipeline.openspec.prepare.kind.config',
  'pipeline.openspec.prepare.kind.artifact',
  'pipeline.openspec.prepare.state.untracked',
  'pipeline.openspec.prepare.state.modified',
  'pipeline.openspec.prepare.state.deleted',
  'pipeline.openspec.prepare.state.renamed',
  'pipeline.openspec.prepare.state.added',
  'pipeline.openspec.prepare.selectAll',
  'pipeline.openspec.prepare.deselectAll',
  'pipeline.openspec.prepare.preparedSummary',
  'pipeline.openspec.prepare.preparedSummary.one',
  'pipeline.openspec.prepare.empty',
  // Sub-namespace pipeline.openspec.engine.* (2.13) y avisos agrupados (2.9)
  'pipeline.openspec.notices.title',
  'pipeline.openspec.engine.cardTitle',
  'pipeline.openspec.engine.provenance.global',
  'pipeline.openspec.engine.provenance.local',
  'pipeline.openspec.engine.provenance.managed',
  'pipeline.openspec.engine.provenance.unknown',
  'pipeline.openspec.engine.axis.engine',
  'pipeline.openspec.engine.axis.repo',
  'pipeline.openspec.engine.axis.integration',
  'pipeline.openspec.engine.status.absent',
  'pipeline.openspec.engine.repoState.initialized',
  'pipeline.openspec.engine.repoState.not-initialized',
  'pipeline.openspec.engine.repoState.notInitialized',
  'pipeline.openspec.engine.repoState.unknown',
  'pipeline.openspec.engine.integrationState.up-to-date',
  'pipeline.openspec.engine.integrationState.upToDate',
  'pipeline.openspec.engine.integrationState.outdated',
  'pipeline.openspec.engine.integrationState.custom',
  'pipeline.openspec.engine.integrationState.conflicted',
  'pipeline.openspec.engine.integrationState.unknown',
  'pipeline.openspec.engine.latestAvailable',
  'pipeline.openspec.engine.cacheStatus.online',
  'pipeline.openspec.engine.cacheStatus.cached',
  'pipeline.openspec.engine.cacheStatus.cachedStale',
  'pipeline.openspec.engine.cacheStatus.offline',
  'pipeline.openspec.engine.generatedByLabel',
  'pipeline.openspec.engine.outputsTitle',
  'pipeline.openspec.engine.output.repoLocal',
  'pipeline.openspec.engine.output.externalGlobal',
  'pipeline.openspec.engine.output.blockedBadge',
  'pipeline.openspec.engine.output.githubDesc',
  'pipeline.openspec.engine.output.minimaxDesc',
  'pipeline.openspec.engine.preview.partial',
  'pipeline.openspec.engine.preview.notAvailable',
  'pipeline.openspec.engine.preview.blockedReason',
  'pipeline.openspec.engine.execute.pocRequired',
  'pipeline.openspec.engine.generalStatus.ready',
  'pipeline.openspec.engine.generalStatus.needsAttention',
  'pipeline.openspec.engine.generalStatus.unknown',
  'pipeline.openspec.engine.showAdvanced',
  'pipeline.openspec.engine.hideAdvanced',
  'pipeline.openspec.engine.agentsConfigured',
  'pipeline.openspec.engine.agentsConfiguredRatio',
  'pipeline.openspec.engine.presence.present',
  'pipeline.openspec.engine.presence.absent',
  'pipeline.openspec.engine.presence.unreadable',
  'pipeline.openspec.engine.presence.conflicting',
  'pipeline.openspec.engine.advanced.routeAndProvenance',
  'pipeline.openspec.engine.advanced.profileAndWorkflows',
  'pipeline.openspec.engine.advanced.repoEvidence',
  'pipeline.openspec.engine.advanced.globalLabel',
  'pipeline.openspec.engine.advanced.repoLabel',
  'pipeline.openspec.engine.advanced.showAbsentOutputs',
  'pipeline.openspec.engine.advanced.hideAbsentOutputs',
  'pipeline.openspec.engine.advanced.convergentNotice',
  'pipeline.openspec.engine.advanced.divergentNotice',
  'pipeline.openspec.engine.advanced.undeterminedNotice',
  'pipeline.openspec.engine.openToolsTab',
  'pipeline.openspec.engine.attentionNotice',
  'pipeline.openspec.engine.attentionReason.outdated',
  'pipeline.openspec.engine.attentionReason.notInitialized',
  'pipeline.openspec.engine.attentionReason.divergent',
  'pipeline.openspec.engine.divergence.none',
  'pipeline.openspec.engine.divergence.profileMismatch',
  'pipeline.openspec.engine.divergence.targetWorkflows',
  'pipeline.openspec.engine.outputsHelp',
  'pipeline.openspec.engine.absentOutputsHelp',
  'pipeline.openspec.engine.reviewAction',
  'pipeline.openspec.engine.closeReviewAction',
  'pipeline.openspec.engine.review.title',
  'pipeline.openspec.engine.review.close',
  'pipeline.openspec.engine.review.safetyTitle',
  'pipeline.openspec.engine.review.safetyHelp',
  'pipeline.openspec.engine.matrix.title',
  'pipeline.openspec.engine.matrix.actionLabel',
  'pipeline.openspec.engine.matrix.init',
  'pipeline.openspec.engine.matrix.update',
  'pipeline.openspec.engine.matrix.upgradeInit',
  'pipeline.openspec.engine.matrix.upgradeUpdate',
  'pipeline.openspec.engine.matrix.none',
  'pipeline.openspec.engine.matrix.blocked',
  'pipeline.openspec.engine.matrix.blockedReason',
  'pipeline.openspec.engine.matrix.commandTitle',
  'pipeline.openspec.engine.matrix.commandHelp',
  'pipeline.openspec.engine.matrix.copyCommand',
  'pipeline.openspec.engine.matrix.commandCopied',
  'pipeline.openspec.engine.guide.title',
  'pipeline.openspec.engine.guide.toolsArg',
  'pipeline.openspec.engine.guide.profileArg',
  'pipeline.openspec.engine.guide.noAnimationArg',
  'pipeline.openspec.engine.guide.copilotArg',
  'pipeline.openspec.engine.guide.forceWarning',
  'pipeline.openspec.engine.coexistence.title',
  'pipeline.openspec.engine.coexistence.legacyTitle',
  'pipeline.openspec.engine.coexistence.legacyHelp',
  'pipeline.openspec.engine.coexistence.newTitle',
  'pipeline.openspec.engine.coexistence.newHelp',
  'pipeline.openspec.engine.coexistence.officialOtherTitle',
  'pipeline.openspec.engine.coexistence.officialOtherHelp',
  'pipeline.openspec.engine.coexistence.customTitle',
  'pipeline.openspec.engine.coexistence.customHelp',
  'pipeline.openspec.engine.coexistence.noLegacy',
  'pipeline.openspec.engine.coexistence.noNew',
  'pipeline.openspec.engine.coexistence.noOfficialOther',
  'pipeline.openspec.engine.coexistence.noCustom',
  'pipeline.openspec.engine.coexistence.collisionsTitle',
  'pipeline.openspec.engine.coexistence.noCollisions',
  'pipeline.openspec.engine.freshness.cliUpToDate',
  'pipeline.openspec.engine.freshness.cliUpgradeAvailable',
  'pipeline.openspec.engine.freshness.offline',
  'pipeline.openspec.engine.versionClass.supported',
  'pipeline.openspec.engine.versionClass.tooOld',
  'pipeline.openspec.engine.versionClass.tooNew',
  'pipeline.openspec.engine.versionClass.unknown',
  'pipeline.openspec.engine.hostUpgrade.title',
  'pipeline.openspec.engine.hostUpgrade.help',
  'pipeline.openspec.engine.hostUpgrade.command',
  'pipeline.openspec.engine.hostUpgrade.copy',
  'pipeline.openspec.engine.hostUpgrade.copied',
  'pipeline.openspec.engine.review.executeUpdate',
  'pipeline.openspec.engine.review.updating',
  'pipeline.openspec.engine.review.completedTitle',
  'pipeline.openspec.engine.review.filesUpdatedSummary',
  'pipeline.openspec.engine.review.prepareCommit',
  'pipeline.openspec.engine.review.incompleteTitle',
  'pipeline.openspec.engine.review.incompleteHelp',
  'pipeline.openspec.engine.review.blockedBranchMain',
  'pipeline.openspec.engine.review.blockedDirty',
  'pipeline.openspec.engine.review.errorTitle',
  'pipeline.openspec.engine.review.errorGeneric',
  'pipeline.openspec.engine.review.errorCliNotFound',
  'pipeline.openspec.engine.review.errorBranchDetached',
  'pipeline.openspec.engine.review.forceOptionTitle',
  'pipeline.openspec.engine.review.forceConfirmLabel',
  'pipeline.openspec.engine.review.forceWarning',
  'pipeline.openspec.engine.review.forceFilesToClean',
  'pipeline.openspec.engine.review.forceButton',
  'toolbar.actionsMenu',
  'toolbar.toolsMenu',
  'toolbar.branchFilter',
  'sidebar.navigation',
  'canvas.controls',
  'canvas.zoomIn',
  'canvas.zoomOut',
  'canvas.resetZoom',
  'canvas.speculativeBranches',
  'canvas.openCentauro',
  'shortcuts.pipelineTab',
  'shortcuts.terminal',
  'shortcuts.branchFilter',
  'graph.colBranchTag',
  'graph.colGraph',
  'graph.colMessage',
  'graph.colDate',
  'graph.colCommit',
  'history.header',
  'history.filteredHeader',
] as const;

describe('Pipeline i18n', () => {
  it('covers the three shipped languages', () => {
    expect(LANGS.map((entry) => entry.code).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(LANGUAGES)('resolves every pipeline key in %s', (lang) => {
    const missing = PIPELINE_KEYS.filter((key) => {
      const value = translate(key, lang);
      // translate() devuelve la clave cuando no encuentra traducción.
      return !value || value === key;
    });
    expect(missing).toEqual([]);
  });

  it('interpolates the version into the incompatible message in every language', () => {
    for (const lang of LANGUAGES) {
      const text = translate('pipeline.incompatible.body', lang, { version: '9.9' });
      expect(text).toContain('9.9');
      expect(text).not.toContain('{version}');
    }
  });

  it('interpolates every multi-variable string in all languages', () => {
    for (const lang of LANGUAGES) {
      const coverage = translate('pipeline.economy.partialCoverage', lang, { withCost: 2, total: 3 });
      expect(coverage).toContain('2');
      expect(coverage).toContain('3');
      expect(coverage).not.toMatch(/\{\{/);

      const tokens = translate('pipeline.agent.tokensValue', lang, { input: 10, output: 20 });
      expect(tokens).toContain('10');
      expect(tokens).not.toMatch(/\{\{/);

      const progress = translate('pipeline.now.taskProgress', lang, { done: 3, total: 7 });
      expect(progress).not.toMatch(/\{\{/);

      const selected = translate('pipeline.openspec.prepare.selected', lang, { count: 2, total: 5 });
      expect(selected).toContain('2');
      expect(selected).toContain('5');
      expect(selected).not.toMatch(/\{\{/);

      // El rótulo del grupo tiene que poder nombrar el cambio en las tres
      // lenguas: sin el identificador, dos grupos se leerían igual.
      const group = translate('pipeline.openspec.prepare.groupChange', lang, { change: 'mi-cambio' });
      expect(group).toContain('mi-cambio');
      expect(group).not.toMatch(/\{\{/);

      // El avance de un cambio en la pantalla de entrada: sin los dos números,
      // un repositorio casi terminado se lee igual que uno recién empezado.
      const tasks = translate('pipeline.openspec.start.tasks', lang, { done: 5, total: 6 });
      expect(tasks).toContain('5');
      expect(tasks).toContain('6');
      expect(tasks).not.toMatch(/\{\{/);

      // Divergencia de perfiles y workflows estructurada en las 3 lenguas
      const profileDiv = translate('pipeline.openspec.engine.divergence.profileMismatch', lang, {
        global: 'core',
        repo: 'custom',
      });
      expect(profileDiv).toContain('core');
      expect(profileDiv).toContain('custom');
      expect(profileDiv).not.toMatch(/\{\{/);

      const targetDiv = translate('pipeline.openspec.engine.divergence.targetWorkflows', lang, {
        target: 'Agents Multi-Agent',
        targetCount: 0,
        targetWorkflows: translate('pipeline.openspec.engine.divergence.none', lang),
        globalCount: 5,
        globalWorkflows: 'apply, archive, explore, propose, sync',
      });
      expect(targetDiv).toContain('Agents Multi-Agent');
      expect(targetDiv).toContain('apply, archive, explore, propose, sync');
      expect(targetDiv).not.toMatch(/\{\{/);
    }
  });

  it('never renders a missing value as zero', () => {
    // La regla central del brief: unknown no es cero.
    for (const lang of LANGUAGES) {
      for (const key of ['pipeline.unknown.unknown', 'pipeline.unknown.notReported'] as const) {
        expect(translate(key, lang).trim()).not.toBe('0');
      }
    }
  });
});
