import { create } from 'zustand';

/**
 * El borrador de un cambio nuevo, fuera del componente que lo muestra.
 *
 * Vive acá porque las solapas de la aplicación no se ocultan: se desmontan. En
 * `components/RepoMainView.tsx` cada una es un `return` distinto, así que ir al
 * grafo desmonta `PipelineWorkspace` y React se lleva todo su `useState`. Ale lo
 * encontró yendo a mirar algo a Graph a mitad de empezar un cambio: al volver la
 * pantalla no estaba y tuvo que rehacerlo.
 *
 * Se descartó mantener el panel montado y ocultarlo con CSS —salvaría más, pero
 * lo dejaría suscrito a los refrescos, y cada refresco hace trabajo de Git real:
 * 97 ms de `git log`, 63–105 de `rev-list`, 71–133 de `status`, medidos—.
 *
 * En memoria y no en disco: el problema medido es cambiar de solapa, no
 * reiniciar, y persistir texto a medio escribir crea preguntas —cuándo caduca,
 * qué pasa si el repositorio cambió— que nadie pidió responder.
 */

export type NewChangeDraftMode = 'propose' | 'explore';

export type NewChangeDraft = {
  /** Si el flujo está a la vista. Vivía en `flowMode`, arriba del formulario. */
  open: boolean;
  mode: NewChangeDraftMode;
  objective: string;
  slug: string;
  constraints: string;
  /** El texto del modo explorar, que es su único campo. */
  description: string;
  withBranch: boolean;
  fromMain: boolean;
};

/**
 * El estado de partida.
 *
 * `withBranch` arranca marcado por la misma razón de siempre: desmarcado dejaría
 * la función invisible y el trabajo seguiría en `main` por inercia. `fromMain`
 * arranca desmarcado porque elegir la base por la persona perdería de vista el
 * trabajo sin fusionar a propósito.
 */
export const EMPTY_NEW_CHANGE_DRAFT: NewChangeDraft = {
  open: false,
  mode: 'propose',
  objective: '',
  slug: '',
  constraints: '',
  description: '',
  withBranch: true,
  fromMain: false,
};

type NewChangeDraftStore = {
  /** Por ruta de repositorio: el borrador de uno no aparece en otro. */
  drafts: Record<string, NewChangeDraft>;
  patchDraft(repoPath: string, patch: Partial<NewChangeDraft>): void;
  clearDraft(repoPath: string): void;
};

export const useNewChangeDraftStore = create<NewChangeDraftStore>((set) => ({
  drafts: {},
  patchDraft: (repoPath, patch) => set((state) => ({
    drafts: {
      ...state.drafts,
      [repoPath]: { ...(state.drafts[repoPath] ?? EMPTY_NEW_CHANGE_DRAFT), ...patch },
    },
  })),
  clearDraft: (repoPath) => set((state) => {
    if (!(repoPath in state.drafts)) return state;
    const drafts = { ...state.drafts };
    delete drafts[repoPath];
    return { drafts };
  }),
}));

/**
 * El borrador de un repositorio, siempre completo.
 *
 * Un repositorio sin borrador devuelve el estado inicial y no `undefined`: los
 * componentes leen campos y un nulo los obligaría a repetir el mismo `??` en
 * cada uno.
 */
export function useNewChangeDraft(repoPath: string): NewChangeDraft {
  return useNewChangeDraftStore((state) => state.drafts[repoPath]) ?? EMPTY_NEW_CHANGE_DRAFT;
}
