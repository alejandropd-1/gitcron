import type { RuntimeCapabilityAvailability, RuntimeSessionRequest } from '../../../types/pipeline';
import type { RuntimeAdapter } from './runtime-adapter';

const CAPABILITY_METHODS = {
  'session.start': 'start',
  'session.attach': 'attach',
  'session.resume': 'resume',
  'events.stream': 'events',
  'telemetry.snapshot': 'telemetry',
  'session.shutdown': 'shutdown',
} as const satisfies Record<string, keyof RuntimeAdapter>;

const IMPLEMENTABLE: RuntimeCapabilityAvailability[] = ['available', 'degraded'];

export function validateRuntimeAdapterContract(adapter: RuntimeAdapter): string[] {
  const errors: string[] = [];
  const { descriptor } = adapter;
  if (!descriptor.adapterId.trim()) errors.push('adapterId is required');
  if (!descriptor.transport.trim()) errors.push('transport is required');

  const seen = new Set<string>();
  for (const capability of descriptor.capabilities) {
    if (seen.has(capability.capabilityId)) errors.push(`duplicate capability: ${capability.capabilityId}`);
    seen.add(capability.capabilityId);

    const method = CAPABILITY_METHODS[capability.capabilityId as keyof typeof CAPABILITY_METHODS];
    if (method && IMPLEMENTABLE.includes(capability.availability) && typeof adapter[method] !== 'function') {
      errors.push(`${capability.capabilityId} is ${capability.availability} but ${method} is not implemented`);
    }
    if (capability.availability === 'available' && capability.evidenceStatus !== 'verified') {
      errors.push(`${capability.capabilityId} is available without verified evidence`);
    }
  }
  return errors;
}

export function validateRuntimeSessionRequest(request: RuntimeSessionRequest): string[] {
  const errors: string[] = [];
  const required: Array<keyof RuntimeSessionRequest> = [
    'repoId',
    'canonicalRepoPath',
    'runId',
    'attemptId',
  ];
  for (const key of required) {
    const value = request[key];
    if (typeof value !== 'string' || !value.trim()) errors.push(`${key} is required`);
  }
  return errors;
}
