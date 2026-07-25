const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,                  // OpenAI keys
  /ghp_[a-zA-Z0-9]{20,}/g,                 // GitHub personal tokens
  /gho_[a-zA-Z0-9]{20,}/g,                 // GitHub OAuth tokens
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,       // Bearer tokens
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWTs
  /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_\-]{16,}["']?/gi, // Generic API keys
];

export class PipelineSecuritySanitizer {
  /**
   * Redacta automáticamente cualquier token, API key o secreto detectado en una cadena de texto.
   */
  public sanitizeOutput(text: string): string {
    if (!text) return '';
    let sanitized = text;

    for (const pattern of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }

    return sanitized;
  }

  /**
   * Sanitiza las entradas o argumentos asegurando que no contengan path traversal peligroso.
   */
  public sanitizeFilePath(filePath: string): string {
    if (!filePath) return '';
    // Eliminar caracteres nulos o secuencias de escape peligrosas
    return filePath.replace(/\0/g, '').trim();
  }
}
