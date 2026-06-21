// lib/carto-types.ts
//
// Cartografía — Fase 3 (grounding estructural con CodeGraph).
//
// CONTRATO NORMALIZADO de Cartografía. Estas son las ÚNICAS formas que la vista
// (renderer) puede consumir; nunca ve la forma cruda del motor CodeGraph. El
// motor es un detalle de implementación del proceso main: vive detrás del
// adapter `lib/carto-from-codegraph.ts`, que traduce sus `Node`/`Edge`/`Subgraph`
// a estos tipos. Mantener esta frontera estable nos deja cambiar (o reemplazar)
// el motor sin tocar la UI, y es lo que evita que la IA invente relaciones: todo
// lo que muestra la vista sale, verificado, de este contrato.
//
// Sin I/O, sin Electron, sin tipos del motor: tipos planos serializables por IPC.

/**
 * Clase de símbolo, normalizada desde `NodeKind` de CodeGraph. Mantenemos el
 * vocabulario del motor (es expresivo y estable) pero como `string` abierto para
 * no acoplar la vista a la enum exacta del motor; la UI sólo lo usa para iconos
 * y etiquetas, degradando a un genérico si aparece un kind nuevo.
 */
export type CartoNodeKind = string;

/**
 * Tipo de relación entre dos símbolos/archivos, normalizado desde `EdgeKind`.
 * Colapsamos las ~12 aristas del motor a las pocas que la vista distingue: las
 * dos centrales del brief (`import` / `call`) más un puñado útil. Cualquier
 * arista desconocida cae en `'other'` — nunca se pierde, sólo se generaliza.
 */
export type CartoEdgeRelation =
  | 'import'
  | 'call'
  | 'reference'
  | 'extends'
  | 'contains'
  | 'export'
  | 'other';

/** Nodo del grafo cartográfico: un símbolo del código (función, clase, archivo…). */
export interface CartoNode {
  /** Id estable opaco. Puede venir del motor o de un nodo normalizado de archivo. */
  id: string;
  /** Nombre simple (p. ej. `calculateTotal`). */
  name: string;
  /** Clase del símbolo (normalizada, ver {@link CartoNodeKind}). */
  kind: CartoNodeKind;
  /** Ruta del archivo relativa a la raíz del repo (POSIX). */
  filePath: string;
  /** Línea inicial (1-indexada). */
  startLine: number;
  /** Línea final (1-indexada). */
  endLine: number;
  /** `true` si el símbolo está exportado (cuando el motor lo sabe). */
  exported?: boolean;
  /** Firma del símbolo, si el motor la extrajo (para tooltips). */
  signature?: string;
}

/** Arista del grafo cartográfico: una relación dirigida entre dos nodos. */
export interface CartoEdge {
  /** Id del nodo origen. */
  fromId: string;
  /** Id del nodo destino. */
  toId: string;
  /** Tipo de relación normalizado (import/call/…). */
  relation: CartoEdgeRelation;
  /** Línea del sitio de la relación (p. ej. el call site), si se conoce. */
  line?: number;
}

/**
 * Foto global, acotada y serializable del grafo cartográfico. En F7 se usa para
 * la lente "Grafo semántico": la UI dibuja archivos como nodos y relaciones
 * reales como aristas, siempre desde este contrato normalizado.
 */
export interface CartoGraph {
  /** Nodos visibles del tablero, normalmente nodos `file` del motor. */
  nodes: CartoNode[];
  /**
   * Set completo de archivos del repo para vistas agregadas por rol. Puede ser
   * mayor que `nodes`: el tablero "Nodos" se acota por rendimiento, pero
   * Columnas/Panorama necesitan contar y listar todos los archivos reales.
   */
  allNodes?: CartoNode[];
  /** Aristas reales entre nodos visibles. */
  edges: CartoEdge[];
  /** Totales del índice antes del recorte defensivo. */
  totals: {
    nodes: number;
    edges: number;
  };
  /** `true` si la foto se recortó para proteger repos grandes. */
  truncated: boolean;
  /** Epoch ms de generación de esta foto. */
  generatedAt: number;
}

/**
 * Símbolo relacionado con un nodo focal, anotado con CÓMO se relaciona. Es la
 * forma que devuelven callers/callees: un nodo + el tipo de arista que lo une al
 * foco (+ el call site cuando aplica).
 */
export interface CartoRelatedSymbol {
  node: CartoNode;
  relation: CartoEdgeRelation;
  line?: number;
}

/** Hit de búsqueda de símbolos: un nodo más su score de relevancia del motor. */
export interface CartoSearchHit {
  node: CartoNode;
  /** Score crudo de relevancia del motor (mayor = más relevante). Sólo para ordenar. */
  score: number;
}

/**
 * Radio de impacto de un cambio: qué podría romperse si tocás el foco. Agregado
 * a nivel ARCHIVO para que sea verificable a ojo (cuántos/ qué archivos y una
 * muestra de símbolos), no un volcado de cientos de nodos.
 */
export interface CartoImpact {
  /** Archivos distintos alcanzados por el radio de impacto (excluye el foco). */
  impactedFiles: string[];
  /** Muestra acotada de símbolos impactados, para listar en la UI. */
  impactedSymbols: CartoNode[];
  /** Total de símbolos impactados antes de acotar (para mostrar "+N más"). */
  total: number;
  /** `true` si la muestra quedó recortada por el tope. */
  truncated: boolean;
}

/**
 * Relaciones de un ARCHIVO, el paquete que alimenta el panel de QA del
 * Explorador (tarea 6 de la fase): "importa a / es usado por / impacto".
 */
export interface CartoFileRelations {
  /** Ruta del archivo focal (relativa al repo, POSIX). */
  filePath: string;
  /**
   * `true` si el motor TRACKEA este archivo (es código de un lenguaje soportado y
   * está en el índice). `false` para assets no-código (SVG, imágenes, etc.), que
   * no participan del grafo: la vista distingue "fuera del grafo" de "código sin
   * relaciones" para no mostrar un 0 ambiguo.
   */
  indexed: boolean;
  /** Archivos que este archivo importa ("importa a"). */
  imports: string[];
  /** Archivos que importan a este ("es usado por"). */
  usedBy: string[];
  /** Radio de impacto agregado de los símbolos del archivo. */
  impact: CartoImpact;
}

/** Estado del índice CodeGraph para un repo, expuesto al renderer. */
export type CartoGraphState = 'idle' | 'indexing' | 'ready' | 'error';

/** Fase del indexado en curso (espejo acotado de `IndexProgress` del motor). */
export interface CartoGraphProgress {
  phase: 'scanning' | 'parsing' | 'storing' | 'resolving';
  current: number;
  total: number;
}

/** Foto serializable del estado del índice de un repo. */
export interface CartoGraphStatus {
  state: CartoGraphState;
  /** Progreso del indexado en curso (sólo en `state === 'indexing'`). */
  progress?: CartoGraphProgress;
  /** Métricas del último índice (sólo en `state === 'ready'`). */
  stats?: {
    files: number;
    nodes: number;
    edges: number;
  };
  /** Epoch ms del último indexado completo, o null si nunca se indexó. */
  lastIndexedAt?: number | null;
  /** Mensaje de error (sólo en `state === 'error'`). */
  error?: string;
}
