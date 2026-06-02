'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import PersonCard from './PersonCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState, useCallback } from 'react';

/* ──────────────────────────────────────────────────
   GENERATION LAYOUT: top (great-grandparents) → bottom (self)
   ────────────────────────────────────────────────── */
const GENERATIONS: { title: string; label: string; roles: string[] }[] = [
  {
    title: 'Arrière-Grands-Parents',
    label: 'GEN 4',
    roles: ['paternal_ggf_1', 'paternal_ggm_1', 'maternal_ggf_1', 'maternal_ggm_1'],
  },
  {
    title: 'Grands-Parents',
    label: 'GEN 3',
    roles: ['paternal_grandfather', 'paternal_grandmother', 'maternal_grandfather', 'maternal_grandmother'],
  },
  {
    title: 'Parents',
    label: 'GEN 2',
    roles: ['father', 'mother'],
  },
  {
    title: 'Vous',
    label: 'GEN 1',
    roles: ['self'],
  },
];

/* Parent-child link map: child_role → [parent_role_1, parent_role_2] */
const LINKS: Record<string, string[]> = {
  self: ['father', 'mother'],
  father: ['paternal_grandfather', 'paternal_grandmother'],
  mother: ['maternal_grandfather', 'maternal_grandmother'],
  paternal_grandfather: ['paternal_ggf_1', 'paternal_ggm_1'],
  maternal_grandfather: ['maternal_ggf_1', 'maternal_ggm_1'],
};

/* Couple bars: pairs to connect with a horizontal "marriage" line */
const COUPLES: [string, string][] = [
  ['father', 'mother'],
  ['paternal_grandfather', 'paternal_grandmother'],
  ['maternal_grandfather', 'maternal_grandmother'],
  ['paternal_ggf_1', 'paternal_ggm_1'],
  ['maternal_ggf_1', 'maternal_ggm_1'],
];

function statusOf(person: Person, documents: DocumentItem[]): 'complete' | 'partial' | 'missing' {
  const docs = documents.filter((d) => d.person_id === person.id);
  const hasCore = person.first_name && person.last_name && person.birth_date;
  if (docs.length > 0 && hasCore) return 'complete';
  if (docs.length > 0 || hasCore) return 'partial';
  return 'missing';
}

interface FamilyTreeProps {
  persons: Person[];
  documents: DocumentItem[];
  selectedPerson?: Person | null;
  onSelect: (person: Person) => void;
  onAddRelative?: (role: string) => void;
}

/* ──────────────────────────────────────────────────
   SVG CONNECTORS — curved animated bezier links + couple bars
   ────────────────────────────────────────────────── */
type Line = { x1: number; y1: number; x2: number; y2: number };
type Bar = { x1: number; x2: number; y: number };

function TreeConnectors({
  persons,
  containerRef,
  cardRefs,
}: {
  persons: Person[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [bars, setBars] = useState<Bar[]>([]);

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const newLines: Line[] = [];
    for (const [childRole, parentRoles] of Object.entries(LINKS)) {
      const childEl = cardRefs.current[childRole];
      if (!childEl) continue;
      const c = childEl.getBoundingClientRect();
      const cx = c.left + c.width / 2 - rect.left;
      const cy = c.top - rect.top;

      // If both parents exist, anchor child link to the midpoint of the couple bar
      const existingParents = parentRoles.filter((r) => cardRefs.current[r]);
      if (existingParents.length === 2) {
        const a = cardRefs.current[existingParents[0]]!.getBoundingClientRect();
        const b = cardRefs.current[existingParents[1]]!.getBoundingClientRect();
        const midX =
          ((a.left + a.width / 2) + (b.left + b.width / 2)) / 2 - rect.left;
        const midY = Math.max(a.bottom, b.bottom) - rect.top;
        newLines.push({ x1: midX, y1: midY, x2: cx, y2: cy });
      } else {
        for (const parentRole of existingParents) {
          const p = cardRefs.current[parentRole]!.getBoundingClientRect();
          const px = p.left + p.width / 2 - rect.left;
          const py = p.top + p.height - rect.top;
          newLines.push({ x1: px, y1: py, x2: cx, y2: cy });
        }
      }
    }

    const newBars: Bar[] = [];
    for (const [a, b] of COUPLES) {
      const ea = cardRefs.current[a];
      const eb = cardRefs.current[b];
      if (!ea || !eb) continue;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - rect.left;
      const x2 = rb.left + rb.width / 2 - rect.left;
      const y = Math.max(ra.bottom, rb.bottom) - rect.top;
      newBars.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), y });
    }

    setLines(newLines);
    setBars(newBars);
  }, [containerRef, cardRefs]);

  useEffect(() => {
    // Recompute on next paint + after a tick (layout settles)
    const raf = requestAnimationFrame(compute);
    const t = setTimeout(compute, 120);
    window.addEventListener('resize', compute);
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', compute);
      ro.disconnect();
    };
  }, [compute, persons]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="treeLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#008751" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FCD116" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="coupleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E8112D" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FCD116" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E8112D" stopOpacity="0.3" />
        </linearGradient>
        <filter id="treeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Couple (marriage) bars */}
      {bars.map((b, i) => (
        <g key={`bar-${i}`}>
          <line
            x1={b.x1}
            y1={b.y}
            x2={b.x2}
            y2={b.y}
            stroke="url(#coupleGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#treeGlow)"
          />
          <circle cx={(b.x1 + b.x2) / 2} cy={b.y} r="3.5" fill="#FCD116" opacity="0.8">
            <animate attributeName="r" values="3;4.5;3" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Parent → child curved links */}
      {lines.map((l, i) => {
        const midY = (l.y1 + l.y2) / 2;
        const path = `M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`;
        return (
          <g key={`line-${i}`}>
            {/* glow underlay */}
            <path
              d={path}
              fill="none"
              stroke="url(#treeLineGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.15"
              filter="url(#treeGlow)"
            />
            {/* animated dashed main line */}
            <path
              d={path}
              fill="none"
              stroke="url(#treeLineGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="6 4"
              opacity="0.7"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </path>
            <circle cx={l.x1} cy={l.y1} r="2.5" fill="#008751" opacity="0.7" />
            <circle cx={l.x2} cy={l.y2} r="2.5" fill="#FCD116" opacity="0.7" />
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────────────────────────────
   MAIN FAMILY TREE
   ────────────────────────────────────────────────── */
export default function FamilyTree({
  persons,
  documents,
  selectedPerson,
  onSelect,
  onAddRelative,
}: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  return (
    <div ref={containerRef} className="relative py-6 overflow-x-auto">
      {/* Central spine glow */}
      <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-emerald-500/15 via-yellow-500/8 to-transparent pointer-events-none hidden lg:block" />

      {/* SVG connectors */}
      <TreeConnectors persons={persons} containerRef={containerRef} cardRefs={cardRefs} />

      {/* Generation rows */}
      <div className="relative z-10 space-y-12 min-w-[680px]">
        {GENERATIONS.map((gen) => (
          <div key={gen.title} className="relative animate-in fade-in duration-500">
            {/* Generation label */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #008751, #FCD116)' }}
              />
              <span className="text-[9px] font-mono font-bold text-[#008751] tracking-[0.3em] uppercase">
                {gen.label}
              </span>
              <h4 className="text-xs font-black tracking-[0.15em] text-white/80 uppercase font-heading">
                {gen.title}
              </h4>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/8 to-transparent" />
            </div>

            {/* Cards row — centered */}
            <div className="flex flex-wrap items-stretch justify-center gap-5">
              {gen.roles.map((role) => {
                const p = persons.find(
                  (x) => x.relation_role === role || (role === 'self' && x.is_self)
                );

                if (!p) {
                  return (
                    <div key={role} ref={(el) => { cardRefs.current[role] = el; }}>
                      <button
                        onClick={() => onAddRelative?.(role)}
                        className={cn(
                          'flex flex-col items-center justify-center w-[160px] min-h-[100px] rounded-2xl transition-all duration-300',
                          'border-2 border-dashed border-white/[0.06] bg-white/[0.01]',
                          'hover:bg-white/[0.04] hover:border-[#008751]/40 group text-gray-600 hover:text-white'
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#008751]/15 group-hover:text-[#008751] transition-all mb-2">
                          <Plus size={14} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300">
                          Ajouter
                        </span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={p.id} ref={(el) => { cardRefs.current[role] = el; }}>
                    <PersonCard
                      person={p}
                      status={statusOf(p, documents)}
                      selected={selectedPerson?.id === p.id}
                      onClick={() => onSelect(p)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {persons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#008751]/50">
              <path d="M12 2v6m0 0l-3-3m3 3l3-3M12 22v-6m0 0l-3 3m3-3l3 3M2 12h6m0 0L5 9m3 3L5 15M22 12h-6m0 0l3-3m-3 3l3 3" />
            </svg>
          </div>
          <p className="text-sm font-bold text-white mb-1">Commencez votre arbre</p>
          <p className="text-[10px] text-gray-500 max-w-[200px]">
            Cliquez sur un emplacement « Ajouter » pour enregistrer votre premier parent
          </p>
        </div>
      )}
    </div>
  );
}