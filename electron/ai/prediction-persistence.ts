import { createHash } from 'node:crypto';
import simpleGit from 'simple-git';
import { insertPrediction } from '../db/repository';
import type {
  ContextScope,
  NewPrediction,
  ProviderId as DbProviderId,
} from '../db/types';
import type { ProviderId as RuntimeProviderId } from './providers';
import type {
  PredictionInput,
  PredictionResult,
  TemporalAgentConfig,
} from '../../types/temporal-agent';

interface PersistPredictionArgs {
  repoPath: string;
  config: TemporalAgentConfig;
  providerId: RuntimeProviderId;
  predictionInput: PredictionInput;
  result: PredictionResult;
}

interface PersistPredictionOptions {
  insertPrediction?: (input: NewPrediction) => { runId: string; branchIds: string[] };
  readHeadSha?: (repoPath: string) => Promise<string | undefined>;
  logError?: (error: unknown) => void;
}

export async function persistPredictionRun(
  args: PersistPredictionArgs,
  options: PersistPredictionOptions = {},
): Promise<boolean> {
  try {
    const headSha = await (options.readHeadSha ?? readHeadSha)(args.repoPath);
    const inputHash = hashPredictionInput(args.predictionInput);
    const dto = buildNewPrediction(args, headSha, inputHash);
    (options.insertPrediction ?? insertPrediction)(dto);
    return true;
  } catch (error) {
    options.logError?.(error);
    return false;
  }
}

export async function readHeadSha(repoPath: string): Promise<string | undefined> {
  try {
    const head = await simpleGit(repoPath).revparse(['HEAD']);
    const trimmed = head.trim();
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}

export function hashPredictionInput(input: PredictionInput): string {
  return createHash('sha256').update(stableStringify(input)).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function buildNewPrediction(
  args: PersistPredictionArgs,
  headSha: string | undefined,
  inputHash: string,
): NewPrediction {
  return {
    repoPath: args.repoPath,
    provider: databaseProvider(args.providerId, args.result.provider, args.config.model),
    model: predictionModel(args.result.provider, args.config.model),
    contextScope: databaseContextScope(args.config.privacyScope),
    inputCommitCount: args.predictionInput.commitMessages.length,
    webTrends: Boolean(args.predictionInput.webTrends),
    headSha,
    inputHash,
    generatedAt: args.result.generatedAt,
    branches: args.result.branches.map((branch) => ({
      id: branch.id,
      sourceId: branch.sourceId,
      message: branch.message,
      description: branch.description,
      rationale: branch.rationale,
      type: branch.type,
      confidence: branch.confidence,
    })),
  };
}

function databaseProvider(
  providerId: RuntimeProviderId,
  resultProvider: string,
  configuredModel?: string,
): DbProviderId {
  if (providerId !== 'openrouter') return providerId;

  const model = predictionModel(resultProvider, configuredModel)?.trim().toLowerCase();
  if (!model) return 'openrouter';
  return model.split('/')[0] || model;
}

function predictionModel(resultProvider: string, configuredModel?: string): string | undefined {
  if (resultProvider.startsWith('openrouter:')) {
    return resultProvider.slice('openrouter:'.length) || configuredModel?.trim() || undefined;
  }
  return configuredModel?.trim() || undefined;
}

function databaseContextScope(privacyScope: TemporalAgentConfig['privacyScope']): ContextScope {
  return privacyScope === 'metadata-plus-files' ? 'metadata_filenames' : 'metadata';
}
