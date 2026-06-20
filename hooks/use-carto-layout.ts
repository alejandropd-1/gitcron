'use client';

// hooks/use-carto-layout.ts
//
// Cartografía — Fase 4. Layout arrastrable de la vista: ancho de la columna de
// chat (IA) y alto del panel de relaciones. Mismo idiom que use-panel-layout
// (mousedown → listeners en document → clamp → persist en localStorage), para
// que el comportamiento de resize sea idéntico al resto de GitCron.
//
// Dos divisores:
//   · vertical (cursor-row-resize): entre el árbol y el panel de relaciones.
//     El panel de relaciones crece HACIA ARRIBA, así que el delta se invierte.
//   · horizontal (cursor-col-resize): entre la columna del explorador y la del
//     chat de IA. El chat crece HACIA LA IZQUIERDA, así que el delta se invierte.

import { useCallback, useEffect, useRef, useState } from 'react';

const CHAT_W = { default: 380, min: 280, max: 760 };
const RELATIONS_H = { default: 240, min: 120, max: 640 };

const LS_CHAT_W = 'gitcron:cartoChatW';
const LS_RELATIONS_H = 'gitcron:cartoRelationsH';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function useCartoLayout() {
  const [chatW, setChatW] = useState(CHAT_W.default);
  const [relationsH, setRelationsH] = useState(RELATIONS_H.default);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{ axis: 'chat' | 'relations'; start: number; startSize: number } | null>(null);

  const beginChatDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { axis: 'chat', start: e.clientX, startSize: chatW };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      // El chat está a la derecha: arrastrar a la IZQUIERDA lo agranda → delta invertido.
      const delta = dragRef.current.start - ev.clientX;
      const w = clamp(dragRef.current.startSize + delta, CHAT_W.min, CHAT_W.max);
      setChatW(w);
      localStorage.setItem(LS_CHAT_W, String(w));
    };
    const onUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [chatW]);

  const beginRelationsDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { axis: 'relations', start: e.clientY, startSize: relationsH };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      // El panel de relaciones está abajo: arrastrar HACIA ARRIBA lo agranda → delta invertido.
      const delta = dragRef.current.start - ev.clientY;
      const h = clamp(dragRef.current.startSize + delta, RELATIONS_H.min, RELATIONS_H.max);
      setRelationsH(h);
      localStorage.setItem(LS_RELATIONS_H, String(h));
    };
    const onUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [relationsH]);

  // Hidratar desde localStorage en cliente (evita mismatch de SSR).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const w = parseInt(localStorage.getItem(LS_CHAT_W) ?? '', 10);
    const h = parseInt(localStorage.getItem(LS_RELATIONS_H) ?? '', 10);
    if (!Number.isNaN(w)) setChatW(clamp(w, CHAT_W.min, CHAT_W.max));
    if (!Number.isNaN(h)) setRelationsH(clamp(h, RELATIONS_H.min, RELATIONS_H.max));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { chatW, relationsH, isDragging, beginChatDrag, beginRelationsDrag };
}
