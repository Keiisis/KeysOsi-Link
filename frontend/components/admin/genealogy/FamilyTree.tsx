'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import PersonCard from './PersonCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────────
   ARBRE DÉTERMINISTE — positions calculées, jamais de croisement.

   Principe : chaque carte occupe un "slot" sur une grille à
   largeur fixe. La position X de chaque parent est déduite
   mathématiquement de celle de son enfant → symétrie parfaite,
   liens toujours verticaux/orthogonaux.
   ────────────────────────────────────────────────────────────── */

const CARD_W = 168;   // largeur carte
const CARD_H = 108;   // hauteur carte
const GAP_X = 28;     // espace entre deux cartes d'un couple
const ROW_GAP = 96;   // espace vertical entre générations

// Slot = unité horizontale d'un "individu feuille" en bas (GEN 4)
const SLOT = CARD_W + GAP_X; // 196

/* Structure de l'arbre : on part de "self" et on remonte.
   Chaque nœud connaît son rôle + ses 2 parents. */
type Node = { role: string; gen: number; col: number };

/* GEN indexée de 0 (self, en bas) à 3 (arrière-gd-parents, en haut).
   col = position horizontale en "demi-slots" pour centrer. */

// On construit la disposition : 8 colonnes en haut, repli vers le centre.
// Colonnes (gen4) : 0..7  →  centre = 3.5
const LAYOUT: Node[] = [
  // GEN 4 — Arrière-grands-parents (8 colonnes)
  { role: 'paternal_ggf_1', gen: 3, col: 0 },
  { role: 'paternal_ggm_1', gen: 3, col: 1 },
  { role: 'maternal_ggf_1', gen: 3, col: 4 },
  { role: 'maternal_ggm_1', gen: 3, col: 5 },
  // GEN 3 — Grands-parents (centrés sur leurs parents)
  { role: 'paternal_grandfather', gen: 2, col: 0.5 },
  { role: 'paternal_grandmother', gen: 2, col: 2.5 },
  { role: 'maternal_grandfather', gen: 2, col: 4.5 },
  { role: 'maternal_grandmother', gen: 2, col: 6.5 },
  // GEN 2 — Parents
  { role: 'father', gen: 1, col: 1.5 },
  { role: 'mother', gen: 1, col: 5.5 },
  // GEN 1 — Self
  { role: 'self', gen: 0, col: 3.5 },
];

const GEN_TITLES = [
  { label: 'GEN 1', title: 'Vous' },
  { label: 'GEN 2', title: 'Parents' },
  { label: 'GEN 3', title: 'Grands-Parents' },
  { label: 'GEN 4', title: 'Arrière-Grands-Parents' },
];

/* child_role → [parent gauche, parent droite] */
const LINKS: Record<string, [string, string]> = {
  self: ['father', 'mother'],
  father: ['paternal_grandfather', 'paternal_grandmother'],
  mother: ['maternal_grandfather', 'maternal_grandmother'],
  paternal_grandfather: ['paternal_ggf_1', 'paternal_ggm_1'],
  maternal_grandfather: ['maternal_ggf_1', 'maternal_ggm_1'],
};

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

export default function FamilyTree({
  persons,
  documents,
  selectedPerson,
  onSelect,
  onAddRelative,
}: FamilyTreeProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  // Dimensions logiques du canvas
  const COLS = 8;
  const ROWS = 4;
  const boardW = COLS * SLOT;
  const boardH = ROWS * CARD_H + (ROWS - 1) * ROW_GAP;

  // Coord X (centre carte) depuis col, Y (haut carte) depuis gen
  const xOf = (col: number) => col * SLOT + CARD_W / 2;
  const yTop = (gen: number) => (ROWS - 1 - gen) * (CARD_H + ROW_GAP);
  const yBottom = (gen: number) => yTop(gen) + CARD_H;

  // Responsive : on scale le board pour qu'il rentre dans le conteneur
  const recompute = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const avail = el.clientWidth - 32;
    setScale(Math.min(1, avail / boardW));
  }, [boardW]);

  useEffect(() => {
    recompute();
    window.addEventListener('resize', recompute);
    const ro = new ResizeObserver(recompute);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      window.removeEventListener('resize', recompute);
      ro.disconnect();
    };
  }, [recompute]);

  const nodeOf = (role: string) => LAYOUT.find((n) => n.role === role)!;

  const findPerson = (role: string) =>
    persons.find((x) => x.relation_role === role || (role === 'self' && x.is_self));

  /* ── Construction des chemins SVG (orthogonaux, déterministes, conditionnels) ── */
  const couplePaths = COUPLES.map(([a, b]) => {
    const personA = findPerson(a);
    const personB = findPerson(b);
    if (!personA || !personB) return null;
    const na = nodeOf(a);
    const nb = nodeOf(b);
    const y = yBottom(na.gen);
    const x1 = Math.min(xOf(na.col), xOf(nb.col));
    const x2 = Math.max(xOf(na.col), xOf(nb.col));
    return { x1, x2, y, mx: (x1 + x2) / 2 };
  }).filter(Boolean) as { x1: number; x2: number; y: number; mx: number }[];

  const childPaths = Object.entries(LINKS).map(([childRole, [pa, pb]]) => {
    const childPerson = findPerson(childRole);
    const parentAPerson = findPerson(pa);
    const parentBPerson = findPerson(pb);
    if (!childPerson || (!parentAPerson && !parentBPerson)) return null;

    const child = nodeOf(childRole);
    const npa = nodeOf(pa);
    const npb = nodeOf(pb);
    const childX = xOf(child.col);
    const childY = yTop(child.gen);
    
    let parentMidX = (xOf(npa.col) + xOf(npb.col)) / 2;
    if (parentAPerson && !parentBPerson) {
      parentMidX = xOf(npa.col);
    } else if (!parentAPerson && parentBPerson) {
      parentMidX = xOf(npb.col);
    }

    const parentY = yBottom(npa.gen);
    const busY = parentY + ROW_GAP / 2; // barre horizontale à mi-chemin
    return {
      d: `M ${parentMidX} ${parentY} V ${busY} H ${childX} V ${childY}`,
    };
  }).filter(Boolean) as { d: string }[];

  const renderCard = (role: string) => {
    const node = nodeOf(role);
    const p = findPerson(role);
    const left = node.col * SLOT;
    const top = yTop(node.gen);

    return (
      <div
        key={role}
        className="absolute"
        style={{ left, top, width: CARD_W, height: CARD_H }}
      >
        {p ? (
          <PersonCard
            person={p}
            status={statusOf(p, documents)}
            selected={selectedPerson?.id === p.id}
            onClick={() => onSelect(p)}
          />
        ) : (
          <button
            onClick={() => onAddRelative?.(role)}
            className={cn(
              'group flex h-full w-full flex-col items-center justify-center rounded-2xl transition-all duration-300',
              'border-2 border-dashed border-white/[0.07] bg-white/[0.015]',
              'hover:bg-white/[0.04] hover:border-[#008751]/50 hover:shadow-[0_0_30px_-12px_#008751]'
            )}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all group-hover:scale-110 group-hover:bg-[#008751]/15">
              <Plus size={16} className="text-gray-500 transition-colors group-hover:text-[#008751]" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 transition-colors group-hover:text-gray-300">
              Ajouter
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-[2rem] py-6">
      {/* Halo de fond */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-60"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(0,135,81,0.08), transparent 70%)' }}
      />

      {/* Étiquettes de génération (colonne gauche, suivent le scale) */}
      <div className="relative mx-auto" style={{ width: boardW * scale }}>
        {/* Board scalé */}
        <div
          className="relative mx-auto"
          style={{
            width: boardW,
            height: boardH,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Connecteurs SVG — calculés, parfaitement orthogonaux */}
          <svg
            className="absolute inset-0 z-0 pointer-events-none"
            width={boardW}
            height={boardH}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="treeLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FCD116" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#008751" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="coupleGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8112D" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#FCD116" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#E8112D" stopOpacity="0.25" />
              </linearGradient>
              <filter id="treeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Liens parent → enfant */}
            {childPaths.map((p, i) => (
              <g key={`c-${i}`}>
                <path d={p.d} fill="none" stroke="url(#treeLineGrad)" strokeWidth="4"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.1" filter="url(#treeGlow)" />
                <path d={p.d} fill="none" stroke="url(#treeLineGrad)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" opacity="0.85">
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.6s" repeatCount="indefinite" />
                </path>
              </g>
            ))}

            {/* Barres de mariage */}
            {couplePaths.map((b, i) => (
              <g key={`m-${i}`}>
                <line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y}
                  stroke="url(#coupleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#treeGlow)" />
                <circle cx={b.mx} cy={b.y} r="7" fill="none" stroke="#FCD116" strokeWidth="0.75" opacity="0.3" />
                <circle cx={b.mx} cy={b.y} r="4" fill="#FCD116">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="r" values="3.2;4.4;3.2" dur="2.6s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>

          {/* Cartes positionnées en absolu */}
          <div className="relative z-10">
            {LAYOUT.map((n) => renderCard(n.role))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {persons.length === 0 && (
        <div className="relative z-20 mt-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-bold text-white">Commencez votre arbre</p>
          <p className="mt-1 max-w-[220px] text-[10px] text-gray-500">
            Cliquez sur un emplacement « Ajouter » pour enregistrer votre premier parent
          </p>
        </div>
      )}
    </div>
  );
}