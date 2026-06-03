'use client';

import { HelpCircle, Layers, FileText, Sparkles, Zap, RotateCcw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useT } from '@/hooks/use-translation';
import { StatusBadge } from '@/components/HelpModal';

export interface HelpPanelProps {
  selectedHelpSection: string;
  handleViewChange: (view: 'repository' | 'settings' | 'help' | 'profile') => void;
}

export function HelpPanel({
  selectedHelpSection,
  handleViewChange,
}: HelpPanelProps) {
  const t = useT();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
      <div className="border-b border-border-subtle/15 shrink-0">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <HelpCircle size={18} className="text-secondary shrink-0" />
            <h2 className="truncate text-base font-bold text-text-primary">
              {selectedHelpSection === 'whatis' && t('page.help.whatis.title')}
              {selectedHelpSection === 'columns' && t('page.help.columns.title')}
              {selectedHelpSection === 'tabs' && t('page.help.tabs.title')}
              {selectedHelpSection === 'states' && t('page.help.states.title')}
              {selectedHelpSection === 'buttons' && t('page.help.buttons.title')}
              {selectedHelpSection === 'flow' && t('page.help.flow.title')}
              {selectedHelpSection === 'security' && t('page.help.security.title')}
            </h2>
          </div>
          <button
            onClick={() => handleViewChange('repository')}
            className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
          >
            {t('common.backToRepo')}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto w-full select-text leading-relaxed text-sm text-text-secondary">
        <div className="mx-auto w-full max-w-4xl p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedHelpSection}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {selectedHelpSection === 'whatis' && (
                <p className="text-text-secondary">{t('page.help.whatis.desc')}</p>
              )}

              {selectedHelpSection === 'columns' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.sidebarTitle')}</span>
                    <span>{t('page.help.columns.sidebarDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.centerTitle')}</span>
                    <span>{t('page.help.columns.centerDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.rightTitle')}</span>
                    <span>{t('page.help.columns.rightDesc')}</span>
                  </div>
                </div>
              )}

              {selectedHelpSection === 'tabs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.commitTitle')}</span>
                    <span>{t('page.help.tabs.commitDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.graphTitle')}</span>
                    <span>{t('page.help.tabs.graphDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.historyTitle')}</span>
                    <span>{t('page.help.tabs.historyDesc')}</span>
                  </div>
                </div>
              )}

              {selectedHelpSection === 'states' && (
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary/70 mb-2">{t('page.help.states.intro')}</p>
                  <div className="grid grid-cols-2 gap-3 bg-bg-base/40 p-4 rounded-xl border border-border-subtle/15">
                    <StatusBadge label={t('page.help.states.modified')} count={0} color="var(--color-git-mod)" letter="M" />
                    <StatusBadge label={t('page.help.states.added')} count={0} color="var(--color-git-add)" letter="A" />
                    <StatusBadge label={t('page.help.states.deleted')} count={0} color="var(--color-git-delete)" letter="D" />
                    <StatusBadge label={t('page.help.states.untracked')} count={0} color="var(--color-text-secondary)" letter="U" />
                    <StatusBadge label={t('page.help.states.renamed')} count={0} color="var(--color-primary)" letter="R" />
                  </div>
                </div>
              )}

              {selectedHelpSection === 'buttons' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.pullTitle')}</span>
                    <span>{t('page.help.buttons.pullDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.pushTitle')}</span>
                    <span>{t('page.help.buttons.pushDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.branchTitle')}</span>
                    <span>{t('page.help.buttons.branchDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.stashTitle')}</span>
                    <span>{t('page.help.buttons.stashDesc')}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.terminalTitle')}</span>
                    <span>{t('page.help.buttons.terminalDesc')}</span>
                  </div>
                </div>
              )}

              {selectedHelpSection === 'flow' && (
                <div className="space-y-2 bg-bg-base/40 p-4 rounded-xl border border-border-subtle/15">
                  <ol className="space-y-3 font-semibold text-text-primary text-xs">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">1</span>
                      <span>{t('page.help.flow.step1')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">2</span>
                      <span>{t('page.help.flow.step2')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">3</span>
                      <span>{t('page.help.flow.step3')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">4</span>
                      <span>{t('page.help.flow.step4')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">5</span>
                      <span>{t('page.help.flow.step5')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-secondary text-[#052900] flex items-center justify-center">✓</span>
                      <span>Click <strong className="text-secondary">{t('page.help.flow.step6')}</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-secondary text-[#052900] flex items-center justify-center">✓</span>
                      <span>Click <strong className="text-secondary">{t('page.help.flow.step7')}</strong></span>
                    </li>
                  </ol>
                </div>
              )}

              {selectedHelpSection === 'security' && (
                <p className="text-text-secondary leading-relaxed">{t('page.help.security.desc')}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
