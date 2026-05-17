'use client';

import { motion } from 'motion/react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';

export function StatusBadge({ label, count, color, letter }: { label: string; count: number; color: string; letter: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: `${color}33`, color }}>
        {letter}
      </div>
      <span className="text-[#d9e7fc]">{label}</span>
      <span className="text-[#9eacc0] ml-auto font-mono">{count}</span>
    </div>
  );
}

export function FlowStep({ n, done, children }: { n: number; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold', done ? 'bg-[#a3f185] text-[#052900]' : 'bg-[#3c495a] text-[#9eacc0]')}>
        {done ? '✓' : n}
      </span>
      <span className={cn('flex-1', done && 'text-[#9eacc0]')}>{children}</span>
    </li>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[#a3f185] font-bold text-base mb-3 pb-1 border-b border-[#3c495a]/20">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function HelpRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm leading-relaxed">
      <span className="font-semibold text-[#5ed8ff] text-xs uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-[#9eacc0]">{children}</span>
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl w-full max-w-3xl max-h-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#3c495a]/15 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-[#a3f185] flex items-center gap-2 text-base"><HelpCircle size={18} /> {t('help.title')}</h2>
          <button onClick={onClose} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-[#d9e7fc]">
          <HelpSection title="¿Qué es GitCron?">
            <p className="text-[#9eacc0] leading-relaxed">Cliente git visual estilo GitKraken. Te muestra tus commits como un grafo con branches que se ramifican, y te deja stagear, commitear, hacer push/pull sin escribir comandos en la terminal.</p>
          </HelpSection>
          <HelpSection title="Las 3 columnas">
            <HelpRow label="Izquierda — Sidebar">Branches locales y remotas, stashes, tags, submódulos. Click en una branch local hace checkout. El verde indica la branch activa.</HelpRow>
            <HelpRow label="Centro — Contenido principal">Cambia según la solapa que tengas activa. También se transforma en visor de diff cuando hacés click en un archivo de la derecha.</HelpRow>
            <HelpRow label="Derecha — Workspace / Commit">Si estás navegando commits → muestra detalles y archivos del commit. Si no → muestra tu working tree dividido en <strong>Unstaged</strong> arriba y <strong>Staged</strong> abajo.</HelpRow>
          </HelpSection>
          <HelpSection title="Las 3 solapas">
            <HelpRow label="Commit">Modo "vamos a commitear". Muestra un resumen del workspace con stats y el flujo paso a paso.</HelpRow>
            <HelpRow label="Graph (default)">Vista visual del historial. Cada commit es un punto, las branches son líneas verticales de colores.</HelpRow>
            <HelpRow label="History">Lista cronológica plana de todos los commits (sin SVG). Más cómoda para leer mensajes largos.</HelpRow>
          </HelpSection>
          <HelpSection title="Estados de archivo (la letrita al lado)">
            <div className="grid grid-cols-2 gap-2">
              <StatusBadge label="Modified — cambios sin commitear" count={0} color="#fd9d1a" letter="M" />
              <StatusBadge label="Added — nuevo y staged" count={0} color="#a3f185" letter="A" />
              <StatusBadge label="Deleted — borrado" count={0} color="#ff716c" letter="D" />
              <StatusBadge label="Untracked — git no lo conoce" count={0} color="#9eacc0" letter="U" />
              <StatusBadge label="Renamed — renombrado" count={0} color="#5ed8ff" letter="R" />
            </div>
          </HelpSection>
          <HelpSection title="Botones del toolbar">
            <HelpRow label="Pull (↓)">Baja commits del repo remoto a tu local.</HelpRow>
            <HelpRow label="Push (↑)">Sube tus commits locales al repo remoto (GitHub).</HelpRow>
            <HelpRow label="Branch">Crea una branch nueva.</HelpRow>
            <HelpRow label="Stash">Guarda tus cambios actuales en una "pila" temporal.</HelpRow>
            <HelpRow label="Terminal">Abre la terminal en la carpeta del repo.</HelpRow>
          </HelpSection>
          <HelpSection title="Flujo típico (de cero a push)">
            <ol className="space-y-2 ml-2">
              <li>1. Abrí o creá un repo desde el empty state</li>
              <li>2. (Opcional) Conectá tu cuenta de GitHub en Settings</li>
              <li>3. Modificá archivos en tu editor</li>
              <li>4. En GitCron click <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">+</code> en cada archivo que querés incluir</li>
              <li>5. Escribí un mensaje en la caja de la derecha</li>
              <li>6. Click <strong className="text-[#a3f185]">Commit Changes</strong></li>
              <li>7. Click <strong className="text-[#a3f185]">Push</strong> para subirlo a GitHub</li>
            </ol>
          </HelpSection>
          <HelpSection title="Seguridad de tu token de GitHub">
            <p className="text-[#9eacc0] leading-relaxed">Tu access token se guarda <strong>encriptado</strong> por el sistema operativo (Windows DPAPI / macOS Keychain). Al hacer push/pull, el token NUNCA se escribe en el <code className="bg-[#020f1e] px-1 rounded text-xs">.git/config</code> del repo.</p>
          </HelpSection>
        </div>
        <div className="px-6 py-3 border-t border-[#3c495a]/15 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 text-[#052900] text-sm font-bold rounded transition-colors">Entendido</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
