'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import PersonCard from './PersonCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState, useCallback } from 'react';

/* ──────────────────────────────────────────────────
   GENERATION LAYOUT: bottom (self) → top (great-grandparents)
   Each generation slot is identified by a unique role key
   ────────────────────────────────────────────────── */
const GENERATIONS: { title: string; roles: string[]; label: string }[] = [
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
  paternal_grandmother: [],
  maternal_grandfather: ['maternal_ggf_1', 'maternal_ggm_1'],
  maternal_grandmother: [],
};

function statusOf(person: Person, documents: DocumentItem[]): 'complete' | 'partial' | 'missing' {
  const docs = documents.filter(d => d.person_id === person.id);
  if (docs.length === 0) return 'missing';
  if (docs.length >= 2) return 'complete';
  return 'partial';
}

interface FamilyTreeProps {
  persons: Person[];
  documents: DocumentItem[];
  selectedPerson: Person | null;
  onSelect: (p: Person) => void;
  onAddRelative?: (role: string) => void;
}

/* ──────────────────────────────────────────────────
   SVG CONNECTOR COMPONENT
   Draws curved bezier lines between parent and child nodes
   ────────────────────────────────────────────────── */
function TreeConnectors({
  persons,
  containerRef,
  cardRefs,
}: {
  persons: Person[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newLines: typeof lines = [];

    // For each child role that has parent roles, draw connections
    for (const [childRole, parentRoles] of Object.entries(LINKS)) {
      const childEl = cardRefs.current[childRole];
      if (!childEl) continue;

      const childRect = childEl.getBoundingClientRect();
      const cx = childRect.left + childRect.width / 2 - rect.left;
      const cy = childRect.top - rect.top; // Top edge of child card

      for (const parentRole of parentRoles) {
        const parentEl = cardRefs.current[parentRole];
        if (!parentEl) continue;

        const parentRect = parentEl.getBoundingClientRect();
        const px = parentRect.left + parentRect.width / 2 - rect.left;
        const py = parentRect.top + parentRect.height - rect.top; // Bottom edge of parent card

        newLines.push({ x1: px, y1: py, x2: cx, y2: cy });
      }
    }
    setLines(newLines);
  }, [containerRef, cardRefs]);

  useEffect(() => {
    computeLines();
    window.addEventListener('resize', computeLines);
    return () => window.removeEventListener('resize', computeLines);
  }, [computeLines, persons]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="treeLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#008751" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FCD116" stopOpacity="0.25" />
        </linearGradient>
        <filter id="treeGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((l, i) => {
        const midY = (l.y1 + l.y2) / 2;
        const path = `M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`;
        return (
          <g key={i}>
            {/* Glow underlay */}
            <path
              d={path}
              fill="none"
              stroke="url(#treeLineGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.2"
              filter="url(#treeGlow)"
            />
            {/* Main line */}
            <path
              d={path}
              fill="none"
              stroke="url(#treeLineGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="6 3"
              opacity="0.6"
            />
            {/* Dot at parent end */}
            <circle cx={l.x1} cy={l.y1} r="3" fill="#008751" opacity="0.6" />
            {/* Dot at child end */}
            <circle cx={l.x2} cy={l.y2} r="3" fill="#FCD116" opacity="0.6" />
          </g>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────────────────────────────
   MAIN FAMILY TREE COMPONENT
   Visual genealogy tree with SVG connectors
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
    <div ref={containerRef} className="relative py-4">
      {/* SVG connector lines */}
      <TreeConnectors
        persons={persons}
        containerRef={containerRef}
        cardRefs={cardRefs}
      />

      {/* Generation rows */}
      <div className="relative z-10 space-y-10">
        {GENERATIONS.map((gen, gIdx) => (
          <div key={gen.title} className="relative">
            {/* Generation label */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, #008751, #FCD116)`,
                }}
              />
              <span className="text-[9px] font-mono font-bold text-[#008751] tracking-[0.3em] uppercase">
                {gen.label}
              </span>
              <h4 className="text-xs font-black tracking-[0.15em] text-white/80 uppercase font-heading">
                {gen.title}
              </h4>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/5 to-transparent" />
            </div>

            {/* Cards row — centered */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {gen.roles.map((role) => {
                const p = persons.find(
                  (x) => x.relation_role === role || (role === 'self' && x.is_self)
                );

                if (!p) {
                  // Empty slot placeholder
                  return (
                    <div
                      key={role}
                      ref={(el) => { cardRefs.current[role] = el; }}
                    >
                      <button
                        onClick={() => onAddRelative?.(role)}
                        className={cn(
                          'flex flex-col items-center justify-center w-[160px] min-h-[100px] rounded-2xl transition-all duration-300',
                          'border-2 border-dashed border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-[#008751]/30 group text-gray-600 hover:text-white'
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#008751]/10 group-hover:text-[#008751] transition-all mb-2">
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
                  <div
                    key={p.id}
                    ref={(el) => { cardRefs.current[role] = el; }}
                  >
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

            {/* Couple connector (horizontal line between pairs) */}
            {gen.roles.length === 2 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[60%] w-[60px] h-[1px] bg-gradient-to-r from-[#E8112D]/20 via-[#FCD116]/20 to-[#E8112D]/20 pointer-events-none hidden md:block" />
            )}
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
            Cliquez sur un emplacement &quot;Ajouter&quot; ci-dessus pour enregistrer votre premier parent
          </p>
        </div>
      )}
    </div>
  );
}
