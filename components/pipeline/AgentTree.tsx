'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import {
  buildAgentTree,
  formatElapsed,
  runtimeDisplayName,
  type AgentNode,
  type AgentTreeNode,
} from './pipeline-domain';

export type AgentTreeProps = {
  agents: AgentNode[];
};

function AgentBranch({ node, depth }: { node: AgentTreeNode; depth: number }) {
  const t = useT();
  const elapsed = formatElapsed(node.elapsedMs);
  const runtime = runtimeDisplayName(node.runtime);

  return (
    <li className="pipeline-agent" data-estado={node.state} data-depth={depth}>
      <div className="pipeline-agent__head">
        <span className="pipeline-agent__runtime">
          {runtime ?? <UnknownValue reason="not-reported" />}
        </span>
        {node.role && <span className="pipeline-agent__role">{t(`pipeline.role.${node.role}`)}</span>}
        <span className="pipeline-agent__state">{t(`pipeline.agentState.${node.state}`)}</span>
      </div>

      <dl className="pipeline-agent__meta">
        <div>
          <dt>{t('pipeline.agent.model')}</dt>
          <dd>{node.model ?? <UnknownValue reason="not-reported" />}</dd>
        </div>
        <div>
          <dt>{t('pipeline.agent.provider')}</dt>
          <dd>{node.provider ?? <UnknownValue reason="not-reported" />}</dd>
        </div>
        <div>
          <dt>{t('pipeline.agent.elapsed')}</dt>
          <dd>{elapsed ?? <UnknownValue reason="not-reported" />}</dd>
        </div>
        <div>
          <dt>{t('pipeline.agent.tokens')}</dt>
          <dd>
            {node.inputTokens === null && node.outputTokens === null ? (
              <UnknownValue reason="not-reported" />
            ) : (
              <span className="pipeline-agent__tokens">
                {t('pipeline.agent.tokensValue', {
                  input: node.inputTokens ?? '—',
                  output: node.outputTokens ?? '—',
                })}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {node.children.length > 0 && (
        <ul className="pipeline-agent__children">
          {node.children.map((child) => (
            <AgentBranch key={child.agentId} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Árbol parent/child de los agentes de la corrida.
 *
 * Usa listas anidadas nativas: un lector de pantalla anuncia la profundidad sin
 * que haya que declarar `role="tree"` ni gestionar foco a mano.
 */
export function AgentTree({ agents }: AgentTreeProps) {
  const t = useT();
  const roots = buildAgentTree(agents);

  return (
    <section className="pipeline-agents" aria-labelledby="pipeline-agents-title">
      <h3 id="pipeline-agents-title" className="pipeline-section__title">
        {t('pipeline.agents.title')}
      </h3>

      {roots.length === 0 ? (
        <p className="pipeline-agents__empty">{t('pipeline.agents.empty')}</p>
      ) : (
        <ul className="pipeline-agents__tree">
          {roots.map((node) => (
            <AgentBranch key={node.agentId} node={node} depth={0} />
          ))}
        </ul>
      )}
    </section>
  );
}
