/**
 * Validador único del slug de un change de OpenSpec, compartido por el proceso
 * principal y el renderer.
 *
 * Vive en `lib/` a propósito: antes había dos regex que no coincidían entre sí
 * —`CHANGE_ID_PATTERN` (main) aceptaba guiones consecutivos y finales, y
 * `CHANGE_SLUG_PATTERN` (renderer) exigía letra inicial y por tanto rechazaba
 * los slugs numéricos válidos desde OpenSpec 1.7/1.8—. Centralizar la gramática
 * acá es lo que impide que vuelvan a divergir.
 *
 * Gramática objetivo (OpenSpec 1.8): inicial de letra o número; sólo minúsculas,
 * números y guiones; sin guiones consecutivos ni finales; sin espacios,
 * mayúsculas, underscores ni puntos. La base `OPENSPEC_CHANGE_SLUG_PATTERN`
 * prohíbe además todo carácter que no sea `[a-z0-9-]`, lo que la hace segura
 * frente al shell y al traversal: no admite `/`, `..`, `;`, espacios ni comillas,
 * así un slug válido nunca puede escapar el argumento que lo contiene.
 */

/**
 * Límite máximo de longitud de slug en OpenSpec 1.8.0 (`validateChangeName()`).
 * Evidencia: `@fission-ai/openspec@1.8.0` limita la longitud del slug a 200 caracteres.
 */
export const MAX_OPENSPEC_CHANGE_SLUG = 200;

/**
 * Regex canónica del slug de un change.
 *
 * - `(?=[a-z0-9])` exige que el primer carácter sea una letra minúscula o un
 *   dígito (acepta el prefijo numérico de 1.8).
 * - `(?!.*--)` rechaza los guiones consecutivos.
 * - `[a-z0-9](?:[a-z0-9-]*[a-z0-9])?` exige empezar y terminar en alfanumérico,
 *   con un cuerpo de minúsculas, dígitos y guiones; admite el caso de un solo
 *   carácter.
 */
export const OPENSPEC_CHANGE_SLUG_PATTERN =
  /^(?=[a-z0-9])(?!.*--)(?=.{1,200}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Valida un slug de change contra la gramática de OpenSpec 1.8, incluido el
 * límite de longitud. Es la fuente única: todo punto que necesite validar un
 * change-id (IPC, formulario, wrapper del CLI) debe llamarla en vez de redefinir
 * un regex propio.
 */
export function isValidOpenSpecChangeSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_OPENSPEC_CHANGE_SLUG) return false;
  return OPENSPEC_CHANGE_SLUG_PATTERN.test(value);
}
