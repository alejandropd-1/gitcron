import {
  composeExploreInstruction,
  composeProposeInstruction,
  isValidChangeSlug,
  type EngineInstructionInput,
} from './pipeline-next-action';

/**
 * Reglas del flujo guiado, fuera de los componentes.
 *
 * El entorno de test del repo es `node` sin DOM, así que cualquier regla que
 * viva dentro del JSX queda sin cubrir. Sacarlas acá no es sólo por los tests:
 * "cuándo se puede arrancar un runtime" es una decisión de seguridad, y una
 * decisión de seguridad no debería depender del orden de render.
 */

export type ProposeFormErrors = {
  objective?: 'pipeline.newChange.error.objective';
  slug?: 'pipeline.newChange.error.slug';
};

export type ProposeFormResult = {
  errors: ProposeFormErrors;
  /** Primer campo inválido, para llevarle el foco. `null` si el formulario es válido. */
  focus: 'objective' | 'slug' | null;
  /** Sólo existe cuando el formulario es válido. */
  instruction: string | null;
};

export function validateProposeForm(input: {
  objective: string;
  slug: string;
  constraints?: string;
  engine?: EngineInstructionInput;
}): ProposeFormResult {
  const errors: ProposeFormErrors = {};
  if (!input.objective.trim()) errors.objective = 'pipeline.newChange.error.objective';
  if (!isValidChangeSlug(input.slug.trim())) errors.slug = 'pipeline.newChange.error.slug';

  const focus = errors.objective ? 'objective' : errors.slug ? 'slug' : null;
  return {
    errors,
    focus,
    instruction: focus === null
      ? composeProposeInstruction(input.slug.trim(), input.objective, input.constraints, input.engine)
      : null,
  };
}

export type ExploreFormResult = {
  errors: { description?: 'pipeline.newChange.error.description' };
  focus: 'description' | null;
  instruction: string | null;
};

export function validateExploreForm(input: {
  description: string;
  engine?: EngineInstructionInput;
}): ExploreFormResult {
  if (!input.description.trim()) {
    return { errors: { description: 'pipeline.newChange.error.description' }, focus: 'description', instruction: null };
  }
  return { errors: {}, focus: null, instruction: composeExploreInstruction(input.description, input.engine) };
}

/**
 * Única compuerta de arranque de una sesión de runtime desde el renderer.
 *
 * Cada condición corresponde a una forma real de romper algo:
 * - fixture: arrancaría un proceso real desde datos inventados;
 * - runtime no lanzable: `RuntimeSessionHub.start()` abortaría igual;
 * - sesión activa: dos corridas sobre el mismo working tree se pisan;
 * - instrucción vacía: el hub responde `instruction_required`.
 */
export function canStartRuntimeSession(input: {
  blockedByFixture: boolean;
  runtimeSelected: string;
  runtimeLaunchable: boolean;
  instruction: string;
  sessionActive: boolean;
  busy: boolean;
  /** `true` si la sesión puede escribir en el working tree. */
  modifiesRepo?: boolean;
  /** Confirmación explícita de la persona para una sesión que escribe. */
  writeConfirmed?: boolean;
}): boolean {
  if (input.blockedByFixture) return false;
  if (input.busy) return false;
  if (input.sessionActive) return false;
  if (!input.runtimeSelected) return false;
  if (!input.runtimeLaunchable) return false;
  // Una sesión que edita el repositorio no se lanza con un solo clic. La
  // confirmación se exige acá y no en el render para que no dependa de que un
  // componente se acuerde de pedirla.
  if (input.modifiesRepo && !input.writeConfirmed) return false;
  return input.instruction.trim().length > 0;
}
