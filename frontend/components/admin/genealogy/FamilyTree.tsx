'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import PersonCard from './PersonCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────────
   ARBRE DÉTERMINISTE & COATEL DE CLIENT PREMIUM
   Positions de la ligne principale fixes, collatéraux dynamiques.
   ────────────────────────────────────────────────────────────── */

const CARD_W = 168;   // largeur carte
const CARD_H = 108;   // hauteur carte
const GAP_X = 28;     // espace horizontal
const ROW_GAP = 96;   // espace vertical

const SLOT = CARD_W + GAP_X; // 196

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

  // Dimensions logiques du canvas (5 générations : gen 0 à gen 4)
  const COLS = 8;
  const ROWS = 5;
  const boardW = COLS * SLOT;
  const boardH = ROWS * CARD_H + (ROWS - 1) * ROW_GAP;

  const xOf = (col: number) => col * SLOT + CARD_W / 2;
  const yTop = (gen: number) => (ROWS - 1 - gen) * (CARD_H + ROW_GAP);
  const yBottom = (gen: number) => yTop(gen) + CARD_H;

  // Responsive scaling
  const recompute = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const avail = el.clientWidth - 32;
    setScale(Math.max(0.65, Math.min(1, avail / boardW)));
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

  // 1. Base Layout (Direct line) - Shifted up by 1 generation so child is 0
  const baseNodes: Record<string, { gen: number; col: number }> = {
    self: { gen: 1, col: 3.5 },
    father: { gen: 2, col: 1.5 },
    mother: { gen: 2, col: 5.5 },
    paternal_grandfather: { gen: 3, col: 0.5 },
    paternal_grandmother: { gen: 3, col: 2.5 },
    maternal_grandfather: { gen: 3, col: 4.5 },
    maternal_grandmother: { gen: 3, col: 6.5 },
    paternal_ggf_1: { gen: 4, col: 0 },
    paternal_ggm_1: { gen: 4, col: 1 },
    paternal_ggf_2: { gen: 4, col: 2 },
    paternal_ggm_2: { gen: 4, col: 3 },
    maternal_ggf_1: { gen: 4, col: 4 },
    maternal_ggm_1: { gen: 4, col: 5 },
    maternal_ggf_2: { gen: 4, col: 6 },
    maternal_ggm_2: { gen: 4, col: 7 },
  };

  // 2. Classify persons
  const siblings = persons
    .filter(p => !p.is_self && ['brother', 'sister', 'sibling'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const paternalUncles = persons
    .filter(p => ['paternal_uncle', 'paternal_aunt'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const maternalUncles = persons
    .filter(p => ['maternal_uncle', 'maternal_aunt'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const children = persons
    .filter(p => p.relation_role === 'child')
    .sort((a, b) => a.id.localeCompare(b.id));

  // 3. Assign dynamic positions
  const positions: Record<string, { gen: number; col: number; role: string }> = {};

  // Direct line positions
  Object.entries(baseNodes).forEach(([role, pos]) => {
    positions[role] = { ...pos, role };
  });

  // Sibling layout (around self - gen 1, col 3.5)
  siblings.forEach((sib, i) => {
    const offset = Math.floor(i / 2) + 1;
    const sign = i % 2 === 0 ? -1 : 1;
    const col = 3.5 + sign * offset * 1.25;
    positions[sib.id] = { gen: 1, col, role: sib.relation_role || 'sibling' };
  });

  // Paternal Uncles layout (around father - gen 2, col 1.5)
  paternalUncles.forEach((unc, i) => {
    const offset = Math.floor(i / 2) + 1;
    const sign = i % 2 === 0 ? -1 : 1;
    const col = 1.5 + sign * offset * 1.1;
    positions[unc.id] = { gen: 2, col, role: unc.relation_role || 'paternal_uncle' };
  });

  // Maternal Uncles layout (around mother - gen 2, col 5.5)
  maternalUncles.forEach((unc, i) => {
    const offset = Math.floor(i / 2) + 1;
    const sign = i % 2 === 0 ? -1 : 1;
    const col = 5.5 + sign * offset * 1.1;
    positions[unc.id] = { gen: 2, col, role: unc.relation_role || 'maternal_aunt' };
  });

  // Children layout (around self - gen 0, col 3.5)
  children.forEach((child, i) => {
    const offset = Math.floor(i / 2) + 1;
    const sign = i % 2 === 0 ? -1 : 1;
    const col = 3.5 + sign * offset * 1.25;
    positions[child.id] = { gen: 0, col, role: 'child' };
  });

  // Helper to find a registered person by role or ID
  const findPerson = (roleOrId: string) => {
    return persons.find(p => p.id === roleOrId || p.relation_role === roleOrId || (roleOrId === 'self' && p.is_self));
  };

  const getPosition = (roleOrId: string) => {
    const p = findPerson(roleOrId);
    if (p && positions[p.id]) return positions[p.id];
    return positions[roleOrId] || null;
  };

  // 4. Generate SVG Paths
  const connectionPaths: string[] = [];
  const couplePaths: { x1: number; x2: number; y: number; mx: number }[] = [];

  // Marriage Couple bars (direct line only)
  const couples: [string, string][] = [
    ['father', 'mother'],
    ['paternal_grandfather', 'paternal_grandmother'],
    ['maternal_grandfather', 'maternal_grandmother'],
    ['paternal_ggf_1', 'paternal_ggm_1'],
    ['paternal_ggf_2', 'paternal_ggm_2'],
    ['maternal_ggf_1', 'maternal_ggm_1'],
    ['maternal_ggf_2', 'maternal_ggm_2'],
  ];

  couples.forEach(([roleA, roleB]) => {
    const pA = findPerson(roleA);
    const pB = findPerson(roleB);
    const posA = getPosition(roleA);
    const posB = getPosition(roleB);

    if (pA && pB && posA && posB) {
      const y = yBottom(posA.gen);
      const x1 = Math.min(xOf(posA.col), xOf(posB.col));
      const x2 = Math.max(xOf(posA.col), xOf(posB.col));
      couplePaths.push({ x1, x2, y, mx: (x1 + x2) / 2 });
    }
  });

  // Dynamic Fork connections for siblings
  const addFork = (
    parentMidX: number,
    parentY: number,
    busY: number,
    childY: number,
    childrenXs: number[]
  ) => {
    if (childrenXs.length === 0) return;
    
    // Vertical drop from parents to horizontal bar
    connectionPaths.push(`M ${parentMidX} ${parentY} V ${busY}`);
    
    // Horizontal bus
    const minX = Math.min(...childrenXs);
    const maxX = Math.max(...childrenXs);
    connectionPaths.push(`M ${minX} ${busY} H ${maxX}`);
    
    // Vertical drop to each child
    childrenXs.forEach(cx => {
      connectionPaths.push(`M ${cx} ${busY} V ${childY}`);
    });
  };

  // Group 1: Self and siblings -> children of Father and Mother
  const pFather = findPerson('father');
  const pMother = findPerson('mother');
  if (pFather || pMother) {
    const posF = getPosition('father');
    const posM = getPosition('mother');
    const fX = posF ? xOf(posF.col) : null;
    const mX = posM ? xOf(posM.col) : null;
    
    let parentMidX = 3.5 * SLOT + CARD_W / 2;
    if (fX !== null && mX !== null) parentMidX = (fX + mX) / 2;
    else if (fX !== null) parentMidX = fX;
    else if (mX !== null) parentMidX = mX;

    const parentY = yBottom(2);
    const busY = parentY + ROW_GAP / 2;
    const childY = yTop(1);

    const childrenXs: number[] = [];
    const pSelf = findPerson('self');
    if (pSelf) childrenXs.push(xOf(3.5));
    siblings.forEach(sib => {
      const pos = getPosition(sib.id);
      if (pos) childrenXs.push(xOf(pos.col));
    });

    addFork(parentMidX, parentY, busY, childY, childrenXs);
  }

  // Group 2: Father and paternal uncles/aunts -> children of paternal grandparents
  const pPGF = findPerson('paternal_grandfather');
  const pPGM = findPerson('paternal_grandmother');
  if (pPGF || pPGM) {
    const posGF = getPosition('paternal_grandfather');
    const posGM = getPosition('paternal_grandmother');
    const gfX = posGF ? xOf(posGF.col) : null;
    const gmX = posGM ? xOf(posGM.col) : null;

    let parentMidX = 1.5 * SLOT + CARD_W / 2;
    if (gfX !== null && gmX !== null) parentMidX = (gfX + gmX) / 2;
    else if (gfX !== null) parentMidX = gfX;
    else if (gmX !== null) parentMidX = gmX;

    const parentY = yBottom(3);
    const busY = parentY + ROW_GAP / 2;
    const childY = yTop(2);

    const childrenXs: number[] = [];
    if (pFather) {
      const pos = getPosition('father');
      if (pos) childrenXs.push(xOf(pos.col));
    }
    paternalUncles.forEach(unc => {
      const pos = getPosition(unc.id);
      if (pos) childrenXs.push(xOf(pos.col));
    });

    addFork(parentMidX, parentY, busY, childY, childrenXs);
  }

  // Group 3: Mother and maternal uncles/aunts -> children of maternal grandparents
  const pMGF = findPerson('maternal_grandfather');
  const pMGM = findPerson('maternal_grandmother');
  if (pMGF || pMGM) {
    const posGF = getPosition('maternal_grandfather');
    const posGM = getPosition('maternal_grandmother');
    const gfX = posGF ? xOf(posGF.col) : null;
    const gmX = posGM ? xOf(posGM.col) : null;

    let parentMidX = 5.5 * SLOT + CARD_W / 2;
    if (gfX !== null && gmX !== null) parentMidX = (gfX + gmX) / 2;
    else if (gfX !== null) parentMidX = gfX;
    else if (gmX !== null) parentMidX = gmX;

    const parentY = yBottom(3);
    const busY = parentY + ROW_GAP / 2;
    const childY = yTop(2);

    const childrenXs: number[] = [];
    if (pMother) {
      const pos = getPosition('mother');
      if (pos) childrenXs.push(xOf(pos.col));
    }
    maternalUncles.forEach(unc => {
      const pos = getPosition(unc.id);
      if (pos) childrenXs.push(xOf(pos.col));
    });

    addFork(parentMidX, parentY, busY, childY, childrenXs);
  }

  // Group 4: Children -> children of Self
  const pSelf = findPerson('self');
  if (pSelf && children.length > 0) {
    const posSelf = getPosition('self');
    const parentMidX = posSelf ? xOf(posSelf.col) : 3.5 * SLOT + CARD_W / 2;
    const parentY = yBottom(1);
    const busY = parentY + ROW_GAP / 2;
    const childY = yTop(0);

    const childrenXs: number[] = [];
    children.forEach(c => {
      const pos = getPosition(c.id);
      if (pos) childrenXs.push(xOf(pos.col));
    });

    addFork(parentMidX, parentY, busY, childY, childrenXs);
  }

  // Skeletons child connections (back-links for empty slots)
  const skeletonChildPaths: string[] = [];
  const directLineLinks: Record<string, [string, string]> = {
    self: ['father', 'mother'],
    father: ['paternal_grandfather', 'paternal_grandmother'],
    mother: ['maternal_grandfather', 'maternal_grandmother'],
    paternal_grandfather: ['paternal_ggf_1', 'paternal_ggm_1'],
    maternal_grandfather: ['maternal_ggf_1', 'maternal_ggm_1'],
  };

  Object.entries(directLineLinks).forEach(([childRole, [pa, pb]]) => {
    const childPos = baseNodes[childRole];
    const npa = baseNodes[pa];
    const npb = baseNodes[pb];
    const childX = xOf(childPos.col);
    const childY = yTop(childPos.gen);
    const parentMidX = (xOf(npa.col) + xOf(npb.col)) / 2;
    const parentY = yBottom(npa.gen);
    const busY = parentY + ROW_GAP / 2;
    skeletonChildPaths.push(`M ${parentMidX} ${parentY} V ${busY} H ${childX} V ${childY}`);
  });

  const skeletonCouplePaths = couples.map(([a, b]) => {
    const na = baseNodes[a];
    const nb = baseNodes[b];
    const y = yBottom(na.gen);
    const x1 = Math.min(xOf(na.col), xOf(nb.col));
    const x2 = Math.max(xOf(na.col), xOf(nb.col));
    return { x1, x2, y, mx: (x1 + x2) / 2 };
  });

  function statusOf(person: Person, documents: DocumentItem[]): 'complete' | 'partial' | 'missing' {
    const docs = documents.filter((d) => d.person_id === person.id);
    const hasCore = person.first_name && person.last_name && person.birth_date;
    if (docs.length > 0 && hasCore) return 'complete';
    if (docs.length > 0 || hasCore) return 'partial';
    return 'missing';
  }

  const renderCardAt = (role: string, col: number, gen: number, person?: Person) => {
    const left = col * SLOT;
    const top = yTop(gen);

    return (
      <div
        key={person ? person.id : role}
        className="absolute group/card relative"
        style={{ left, top, width: CARD_W, height: CARD_H }}
      >
        {person ? (
          <>
            <PersonCard
              person={person}
              status={statusOf(person, documents)}
              selected={selectedPerson?.id === person.id}
              onClick={() => onSelect(person)}
            />
            {/* Quick action buttons on card hover */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-[#080d12] border border-white/10 rounded-full px-2 py-0.5 z-30 shadow-2xl">
              {(role === 'self' || person.is_self) && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddRelative?.('brother'); }}
                    title="Ajouter un frère ou une sœur"
                    className="p-1 text-gray-400 hover:text-[#FCD116] transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddRelative?.('child'); }}
                    title="Ajouter un enfant"
                    className="p-1 text-gray-400 hover:text-[#008751] transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </>
              )}
              {(role === 'father' || person.relation_role === 'father') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddRelative?.('paternal_uncle'); }}
                  title="Ajouter un frère ou sœur (Oncle/Tante)"
                  className="p-1 text-gray-400 hover:text-[#FCD116] transition-colors"
                >
                  <Plus size={11} />
                </button>
              )}
              {(role === 'mother' || person.relation_role === 'mother') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddRelative?.('maternal_uncle'); }}
                  title="Ajouter un frère ou sœur (Oncle/Tante)"
                  className="p-1 text-gray-400 hover:text-[#FCD116] transition-colors"
                >
                  <Plus size={11} />
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => onAddRelative?.(role)}
            className={cn(
              'group flex h-full w-full flex-col items-center justify-center rounded-2xl transition-all duration-300 p-2 text-center',
              'border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]',
              'hover:shadow-[0_0_24px_-12px_rgba(0,135,81,0.5)]'
            )}
          >
            <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-all group-hover:scale-110 group-hover:bg-emerald-500/10">
              <Plus size={14} className="text-gray-400 transition-colors group-hover:text-[#008751]" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors leading-tight">
              {ROLE_LABELS[role] || 'Ajouter'}
            </span>
            <span className="mt-0.5 text-[8px] text-gray-600 group-hover:text-emerald-500/80 transition-colors">
              (Vide)
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-auto rounded-[2rem] py-6 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-60"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(0,135,81,0.08), transparent 70%)' }}
      />

      <div className="relative mx-auto animate-in fade-in duration-700" style={{ width: boardW * scale }}>
        {/* Scaled Board */}
        <div
          className="relative mx-auto"
          style={{
            width: boardW,
            height: boardH,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* SVG Connector Lines */}
          <svg
            className="absolute inset-0 z-0 pointer-events-none"
            width={boardW}
            height={boardH}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="treeLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FCD116" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#008751" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="coupleGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8112D" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#FCD116" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#E8112D" stopOpacity="0.3" />
              </linearGradient>
              <filter id="treeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Skeleton backline */}
            {skeletonChildPaths.map((d, i) => (
              <path key={`skc-${i}`} d={d} fill="none" stroke="white" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />
            ))}
            {skeletonCouplePaths.map((b, i) => (
              <g key={`skm-${i}`}>
                <line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y} stroke="white" strokeWidth="1.2"
                  strokeLinecap="round" opacity="0.08" />
                <circle cx={b.mx} cy={b.y} r="3" fill="white" opacity="0.1" />
              </g>
            ))}

            {/* Active connections for siblings & direct links */}
            {connectionPaths.map((d, i) => (
              <g key={`c-${i}`}>
                <path d={d} fill="none" stroke="url(#treeLineGrad)" strokeWidth="5"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.2" filter="url(#treeGlow)" />
                <path d={d} fill="none" stroke="url(#treeLineGrad)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" opacity="0.85">
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
                </path>
              </g>
            ))}

            {/* Red-Yellow Marriage connector bars */}
            {couplePaths.map((b, i) => (
              <g key={`m-${i}`}>
                <line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y}
                  stroke="url(#coupleGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#treeGlow)" />
                <circle cx={b.mx} cy={b.y} r="8" fill="none" stroke="#FCD116" strokeWidth="1" opacity="0.4" />
                <circle cx={b.mx} cy={b.y} r="4.5" fill="#FCD116">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="r" values="3.5;4.8;3.5" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>

          {/* Cards container */}
          <div className="relative z-10">
            {/* 1. Direct line base cards */}
            {Object.entries(baseNodes).map(([role, pos]) => {
              const p = findPerson(role);
              return renderCardAt(role, pos.col, pos.gen, p);
            })}

            {/* 2. Sibling cards */}
            {siblings.map(sib => {
              const pos = getPosition(sib.id);
              if (!pos) return null;
              return renderCardAt(sib.relation_role || 'sibling', pos.col, pos.gen, sib);
            })}

            {/* 3. Paternal Uncles & Aunts */}
            {paternalUncles.map(unc => {
              const pos = getPosition(unc.id);
              if (!pos) return null;
              return renderCardAt(unc.relation_role || 'paternal_uncle', pos.col, pos.gen, unc);
            })}

            {/* 4. Maternal Uncles & Aunts */}
            {maternalUncles.map(unc => {
              const pos = getPosition(unc.id);
              if (!pos) return null;
              return renderCardAt(unc.relation_role || 'maternal_aunt', pos.col, pos.gen, unc);
            })}

            {/* 5. Children */}
            {children.map(child => {
              const pos = getPosition(child.id);
              if (!pos) return null;
              return renderCardAt('child', pos.col, pos.gen, child);
            })}
          </div>
        </div>
      </div>

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