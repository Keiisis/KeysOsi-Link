'use client';

import { Person, DocumentItem } from '@/lib/genealogy/types';
import { ROLE_LABELS } from '@/lib/genealogy/requirements';
import PersonCard from './PersonCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

/* ══════════════════════════════════════════════════════════════════
   ARBRE GÉNÉALOGIQUE PROFESSIONNEL — LAYOUT HIÉRARCHIQUE
   
   Architecture de rendu :
   - Chaque génération est une ligne horizontale
   - Les couples sont liés par un nœud mariage (♥)
   - Les enfants descendent depuis le nœud mariage
   - Courbes de Bézier pour les connexions
   - Design premium avec dégradés et animations
   ══════════════════════════════════════════════════════════════════ */

/* ─── Dimensions ─── */
const CARD_W   = 180;
const CARD_H   = 120;
const H_GAP    = 32;      // espace horizontal entre cartes
const V_GAP    = 100;     // espace vertical entre générations
const COUPLE_R = 12;      // rayon du nœud mariage
const UNIT     = CARD_W + H_GAP;  // unité de grille

/* ─── Types internes ─── */
interface TreeNode {
  id: string;
  role: string;
  person?: Person;
  x: number;
  y: number;
  gen: number;
}

interface CoupleLink {
  leftNode: TreeNode;
  rightNode: TreeNode;
  midX: number;
  midY: number;
}

interface ChildLink {
  parentMidX: number;
  parentMidY: number;
  childX: number;
  childTopY: number;
}

interface SiblingGroup {
  parentMidX: number;
  parentMidY: number;
  children: { x: number; topY: number }[];
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

  /* ─── Helpers: find person by role ─── */
  const byRole = useMemo(() => {
    const map: Record<string, Person> = {};
    persons.forEach(p => {
      if (p.is_self) map['self'] = p;
      if (p.relation_role) map[p.relation_role] = p;
    });
    return map;
  }, [persons]);

  const findPerson = (role: string) => byRole[role] || undefined;

  /* ─── Collateral persons ─── */
  const siblings = persons
    .filter(p => !p.is_self && ['brother', 'sister', 'sibling'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const paternalUncles = persons
    .filter(p => ['paternal_uncle', 'paternal_aunt'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const maternalUncles = persons
    .filter(p => ['maternal_uncle', 'maternal_aunt'].includes(p.relation_role || ''))
    .sort((a, b) => a.id.localeCompare(b.id));

  const childPersons = persons
    .filter(p => p.relation_role === 'child')
    .sort((a, b) => a.id.localeCompare(b.id));

  /* ═══════════════════════════════════════════════════════════════
     LAYOUT ENGINE — Positionnement hiérarchique
     
     Génération 0 (haut)  : Arrière-grands-parents
     Génération 1         : Grands-parents
     Génération 2         : Parents + oncles/tantes
     Génération 3         : Self + fratrie
     Génération 4 (bas)   : Enfants
     ═══════════════════════════════════════════════════════════════ */

  const layout = useMemo(() => {
    const nodes: TreeNode[] = [];
    const couples: CoupleLink[] = [];
    const childLinks: ChildLink[] = [];
    const siblingGroups: SiblingGroup[] = [];

    const genY = (gen: number) => gen * (CARD_H + V_GAP) + 40;

    /* ─── Gen 0: Arrière-grands-parents (8 slots) ─── */
    // Paternal side (left half)
    const ggRoles = [
      // Father's father's parents
      { role: 'paternal_ggf_1', col: 0 },
      { role: 'paternal_ggm_1', col: 1 },
      // Father's mother's parents
      { role: 'paternal_ggf_2', col: 2.5 },
      { role: 'paternal_ggm_2', col: 3.5 },
      // Mother's father's parents
      { role: 'maternal_ggf_1', col: 5 },
      { role: 'maternal_ggm_1', col: 6 },
      // Mother's mother's parents
      { role: 'maternal_ggf_2', col: 7.5 },
      { role: 'maternal_ggm_2', col: 8.5 },
    ];

    ggRoles.forEach(({ role, col }) => {
      nodes.push({
        id: role,
        role,
        person: findPerson(role),
        x: col * UNIT,
        y: genY(0),
        gen: 0,
      });
    });

    // GG couples
    const ggCouples: [string, string][] = [
      ['paternal_ggf_1', 'paternal_ggm_1'],
      ['paternal_ggf_2', 'paternal_ggm_2'],
      ['maternal_ggf_1', 'maternal_ggm_1'],
      ['maternal_ggf_2', 'maternal_ggm_2'],
    ];

    /* ─── Gen 1: Grands-parents (4 slots) ─── */
    const gpRoles = [
      { role: 'paternal_grandfather', col: 0.5 },
      { role: 'paternal_grandmother', col: 3 },
      { role: 'maternal_grandfather', col: 5.5 },
      { role: 'maternal_grandmother', col: 8 },
    ];

    gpRoles.forEach(({ role, col }) => {
      nodes.push({
        id: role,
        role,
        person: findPerson(role),
        x: col * UNIT,
        y: genY(1),
        gen: 1,
      });
    });

    // GP couples
    const gpCouples: [string, string][] = [
      ['paternal_grandfather', 'paternal_grandmother'],
      ['maternal_grandfather', 'maternal_grandmother'],
    ];

    /* ─── Gen 2: Parents + oncles/tantes ─── */
    // Paternal uncles/aunts on left, Father in middle-left
    const fatherCol = 1.75;
    const motherCol = 6.75;

    // Father
    nodes.push({
      id: 'father',
      role: 'father',
      person: findPerson('father'),
      x: fatherCol * UNIT,
      y: genY(2),
      gen: 2,
    });

    // Mother
    nodes.push({
      id: 'mother',
      role: 'mother',
      person: findPerson('mother'),
      x: motherCol * UNIT,
      y: genY(2),
      gen: 2,
    });

    // Paternal uncles/aunts
    paternalUncles.forEach((unc, i) => {
      const offset = i % 2 === 0 ? -(Math.floor(i / 2) + 1) : (Math.floor(i / 2) + 1);
      const col = fatherCol + offset * 1.4;
      nodes.push({
        id: unc.id,
        role: unc.relation_role || 'paternal_uncle',
        person: unc,
        x: col * UNIT,
        y: genY(2),
        gen: 2,
      });
    });

    // Maternal uncles/aunts
    maternalUncles.forEach((unc, i) => {
      const offset = i % 2 === 0 ? (Math.floor(i / 2) + 1) : -(Math.floor(i / 2) + 1);
      const col = motherCol + offset * 1.4;
      nodes.push({
        id: unc.id,
        role: unc.relation_role || 'maternal_uncle',
        person: unc,
        x: col * UNIT,
        y: genY(2),
        gen: 2,
      });
    });

    /* ─── Gen 3: Self + siblings ─── */
    const selfCol = (fatherCol + motherCol) / 2;
    nodes.push({
      id: 'self',
      role: 'self',
      person: findPerson('self'),
      x: selfCol * UNIT,
      y: genY(3),
      gen: 3,
    });

    siblings.forEach((sib, i) => {
      const offset = i % 2 === 0 ? (Math.floor(i / 2) + 1) : -(Math.floor(i / 2) + 1);
      const col = selfCol + offset * 1.2;
      nodes.push({
        id: sib.id,
        role: sib.relation_role || 'sibling',
        person: sib,
        x: col * UNIT,
        y: genY(3),
        gen: 3,
      });
    });

    /* ─── Gen 4: Children ─── */
    childPersons.forEach((child, i) => {
      const total = childPersons.length;
      const startCol = selfCol - ((total - 1) * 0.6) / 2;
      const col = startCol + i * 0.6;
      nodes.push({
        id: child.id,
        role: 'child',
        person: child,
        x: col * UNIT,
        y: genY(4),
        gen: 4,
      });
    });

    /* ═══ BUILD CONNECTIONS ═══ */
    const nodeMap: Record<string, TreeNode> = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Helper to get center bottom / center top of a node
    const cx = (n: TreeNode) => n.x + CARD_W / 2;
    const bot = (n: TreeNode) => n.y + CARD_H;
    const top = (n: TreeNode) => n.y;

    // Build couple links
    const allCouples: [string, string][] = [
      ...ggCouples,
      ...gpCouples,
      ['father', 'mother'],
    ];

    allCouples.forEach(([a, b]) => {
      const nA = nodeMap[a];
      const nB = nodeMap[b];
      if (nA && nB) {
        const midX = (cx(nA) + cx(nB)) / 2;
        const midY = bot(nA) + 16;
        couples.push({ leftNode: nA, rightNode: nB, midX, midY });
      }
    });

    // Build parent-to-child links using couple midpoints
    // GG couples -> GP children
    const ggToGp: Record<string, string> = {
      'paternal_ggf_1,paternal_ggm_1': 'paternal_grandfather',
      'paternal_ggf_2,paternal_ggm_2': 'paternal_grandmother',
      'maternal_ggf_1,maternal_ggm_1': 'maternal_grandfather',
      'maternal_ggf_2,maternal_ggm_2': 'maternal_grandmother',
    };

    Object.entries(ggToGp).forEach(([coupleKey, childRole]) => {
      const couple = couples.find(c => {
        const key = `${c.leftNode.id},${c.rightNode.id}`;
        return key === coupleKey;
      });
      const childNode = nodeMap[childRole];
      if (couple && childNode) {
        childLinks.push({
          parentMidX: couple.midX,
          parentMidY: couple.midY,
          childX: cx(childNode),
          childTopY: top(childNode),
        });
      }
    });

    // GP couples -> parents + uncles/aunts
    const pgfCouple = couples.find(c => c.leftNode.id === 'paternal_grandfather' && c.rightNode.id === 'paternal_grandmother');
    if (pgfCouple) {
      const fatherSiblings = [nodeMap['father'], ...paternalUncles.map(u => nodeMap[u.id])].filter(Boolean);
      if (fatherSiblings.length > 0) {
        siblingGroups.push({
          parentMidX: pgfCouple.midX,
          parentMidY: pgfCouple.midY,
          children: fatherSiblings.map(n => ({ x: cx(n), topY: top(n) })),
        });
      }
    }

    const mgfCouple = couples.find(c => c.leftNode.id === 'maternal_grandfather' && c.rightNode.id === 'maternal_grandmother');
    if (mgfCouple) {
      const motherSiblings = [nodeMap['mother'], ...maternalUncles.map(u => nodeMap[u.id])].filter(Boolean);
      if (motherSiblings.length > 0) {
        siblingGroups.push({
          parentMidX: mgfCouple.midX,
          parentMidY: mgfCouple.midY,
          children: motherSiblings.map(n => ({ x: cx(n), topY: top(n) })),
        });
      }
    }

    // Parents couple -> self + siblings
    const parentsCouple = couples.find(c => c.leftNode.id === 'father' && c.rightNode.id === 'mother');
    if (parentsCouple) {
      const selfSiblings = [nodeMap['self'], ...siblings.map(s => nodeMap[s.id])].filter(Boolean);
      if (selfSiblings.length > 0) {
        siblingGroups.push({
          parentMidX: parentsCouple.midX,
          parentMidY: parentsCouple.midY,
          children: selfSiblings.map(n => ({ x: cx(n), topY: top(n) })),
        });
      }
    }

    // Self -> children
    const selfNode = nodeMap['self'];
    if (selfNode && childPersons.length > 0) {
      const selfMidX = cx(selfNode);
      const selfMidY = bot(selfNode) + 16;
      siblingGroups.push({
        parentMidX: selfMidX,
        parentMidY: selfMidY,
        children: childPersons.map(c => {
          const n = nodeMap[c.id];
          return n ? { x: cx(n), topY: top(n) } : { x: selfMidX, topY: genY(4) };
        }),
      });
    }

    // Calculate canvas dimensions
    const allX = nodes.map(n => n.x);
    const allY = nodes.map(n => n.y);
    const minX = Math.min(...allX, 0);
    const maxX = Math.max(...allX.map(x => x + CARD_W), CARD_W);
    const maxY = Math.max(...allY.map(y => y + CARD_H), CARD_H) + 60;

    return { nodes, couples, childLinks, siblingGroups, width: maxX - minX + 80, height: maxY + 40, offsetX: -minX + 40 };
  }, [persons, byRole, siblings, paternalUncles, maternalUncles, childPersons]);

  /* ─── Document status ─── */
  function statusOf(person: Person, docs: DocumentItem[]): 'complete' | 'partial' | 'missing' {
    const d = docs.filter(doc => doc.person_id === person.id);
    const hasCore = person.first_name && person.last_name && person.birth_date;
    if (d.length > 0 && hasCore) return 'complete';
    if (d.length > 0 || hasCore) return 'partial';
    return 'missing';
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  const { nodes, couples, childLinks, siblingGroups, width, height, offsetX } = layout;

  // Generation labels
  const genLabels: Record<number, string> = {
    0: 'Arrière-grands-parents',
    1: 'Grands-parents',
    2: 'Parents',
    3: 'Sujet & Fratrie',
    4: 'Descendants',
  };

  const activeGens = new Set(nodes.filter(n => n.person).map(n => n.gen));

  return (
    <div
      className="relative"
      style={{ width, height, minWidth: width }}
    >
      {/* ─── SVG Background Layer: connections ─── */}
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for main tree lines */}
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#008751" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FCD116" stopOpacity="0.7" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="lineGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Heart gradient for couple nodes */}
          <radialGradient id="heartGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD116" />
            <stop offset="100%" stopColor="#E8112D" />
          </radialGradient>

          {/* Subtle skeleton line style */}
          <linearGradient id="skelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ── Generation bands (subtle stripes) ── */}
        {[0, 1, 2, 3, 4].map(gen => {
          const y = gen * (CARD_H + V_GAP) + 40;
          return (
            <g key={`gen-band-${gen}`}>
              <rect
                x={0}
                y={y - 10}
                width={width}
                height={CARD_H + 20}
                fill={gen % 2 === 0 ? 'rgba(0,135,81,0.015)' : 'rgba(252,209,22,0.008)'}
                rx="16"
              />
              {/* Gen label */}
              <text
                x={16}
                y={y + CARD_H / 2 + 4}
                fill="rgba(255,255,255,0.08)"
                fontSize="10"
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
                textAnchor="start"
                letterSpacing="0.15em"
              >
                {genLabels[gen]?.toUpperCase() || ''}
              </text>
            </g>
          );
        })}

        {/* ── Couple horizontal bars ── */}
        {couples.map((couple, i) => {
          const lx = couple.leftNode.x + offsetX + CARD_W / 2;
          const rx = couple.rightNode.x + offsetX + CARD_W / 2;
          const by = couple.leftNode.y + CARD_H;
          const my = couple.midY;
          const mx = (lx + rx) / 2;
          const hasLeft = !!couple.leftNode.person;
          const hasRight = !!couple.rightNode.person;
          const active = hasLeft || hasRight;

          return (
            <g key={`couple-${i}`} opacity={active ? 1 : 0.15}>
              {/* Vertical drops from each card to the marriage bar level */}
              <path
                d={`M ${lx} ${by} V ${my}`}
                fill="none"
                stroke={active ? 'url(#lineGrad)' : 'url(#skelGrad)'}
                strokeWidth={active ? 2 : 1}
                strokeLinecap="round"
              />
              <path
                d={`M ${rx} ${by} V ${my}`}
                fill="none"
                stroke={active ? 'url(#lineGrad)' : 'url(#skelGrad)'}
                strokeWidth={active ? 2 : 1}
                strokeLinecap="round"
              />
              {/* Horizontal bar */}
              <line
                x1={lx} y1={my}
                x2={rx} y2={my}
                stroke={active ? '#FCD116' : 'rgba(255,255,255,0.06)'}
                strokeWidth={active ? 2.5 : 1}
                strokeLinecap="round"
              />
              {/* Marriage/union node (heart) */}
              {active && (
                <g>
                  <circle cx={mx} cy={my} r={COUPLE_R + 4} fill="none" stroke="#FCD116" strokeWidth="1" opacity="0.2">
                    <animate attributeName="r" values={`${COUPLE_R + 2};${COUPLE_R + 6};${COUPLE_R + 2}`} dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={mx} cy={my} r={COUPLE_R} fill="#0a0f18" stroke="#FCD116" strokeWidth="2" />
                  <text
                    x={mx}
                    y={my + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#FCD116"
                  >
                    ♥
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ── Single child links (GG -> GP) ── */}
        {childLinks.map((link, i) => {
          const px = link.parentMidX + offsetX;
          const py = link.parentMidY;
          const childCx = link.childX + offsetX;
          const childTy = link.childTopY;
          const midY = (py + childTy) / 2;

          return (
            <g key={`child-link-${i}`}>
              {/* Glow background */}
              <path
                d={`M ${px} ${py} C ${px} ${midY}, ${childCx} ${midY}, ${childCx} ${childTy}`}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.12"
                filter="url(#lineGlow)"
              />
              {/* Main line */}
              <path
                d={`M ${px} ${py} C ${px} ${midY}, ${childCx} ${midY}, ${childCx} ${childTy}`}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Animated dot */}
              <circle r="3" fill="#008751" opacity="0.8">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  path={`M ${px} ${py} C ${px} ${midY}, ${childCx} ${midY}, ${childCx} ${childTy}`}
                />
              </circle>
            </g>
          );
        })}

        {/* ── Sibling group fork lines (parents -> multiple children) ── */}
        {siblingGroups.map((group, gi) => {
          const px = group.parentMidX + offsetX;
          const py = group.parentMidY;
          const busY = py + (V_GAP - 24) / 2 + 12;

          // Sort children by x for horizontal bus
          const sorted = [...group.children].sort((a, b) => a.x - b.x);
          if (sorted.length === 0) return null;

          const minCx = sorted[0].x + offsetX;
          const maxCx = sorted[sorted.length - 1].x + offsetX;
          const firstTopY = sorted[0].topY;

          return (
            <g key={`fork-${gi}`}>
              {/* Vertical drop from couple mid to bus level */}
              <path
                d={`M ${px} ${py} V ${busY}`}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
              />
              {/* Glow under vertical drop */}
              <path
                d={`M ${px} ${py} V ${busY}`}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.08"
                filter="url(#lineGlow)"
              />

              {/* Horizontal bus bar */}
              {sorted.length > 1 && (
                <>
                  <line
                    x1={minCx} y1={busY}
                    x2={maxCx} y2={busY}
                    stroke="url(#lineGrad)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <line
                    x1={minCx} y1={busY}
                    x2={maxCx} y2={busY}
                    stroke="url(#lineGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.06"
                    filter="url(#lineGlow)"
                  />
                </>
              )}

              {/* Vertical drops to each child */}
              {sorted.map((child, ci) => {
                const childCx = child.x + offsetX;
                return (
                  <g key={`fork-child-${gi}-${ci}`}>
                    <path
                      d={`M ${childCx} ${busY} V ${child.topY}`}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.65"
                    />
                    {/* Small dot at junction */}
                    <circle cx={childCx} cy={busY} r="3" fill="#008751" opacity="0.5" />
                  </g>
                );
              })}

              {/* Main junction dot */}
              <circle cx={px} cy={busY} r="4" fill="#008751" opacity="0.7" />
            </g>
          );
        })}
      </svg>

      {/* ─── HTML Card Layer ─── */}
      <div className="relative z-10">
        {nodes.map((node) => {
          return (
            <div
              key={node.id}
              className="absolute group/card"
              style={{
                left: node.x + offsetX,
                top: node.y,
                width: CARD_W,
                height: CARD_H,
              }}
            >
              {node.person ? (
                <>
                  <PersonCard
                    person={node.person}
                    status={statusOf(node.person, documents)}
                    selected={selectedPerson?.id === node.person.id}
                    onClick={() => onSelect(node.person!)}
                  />
                  {/* Quick action overlay on hover */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300 bg-[#080d12]/95 border border-white/10 rounded-full px-2.5 py-1 z-30 shadow-2xl backdrop-blur-md">
                    {(node.role === 'self' || node.person.is_self) && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAddRelative?.('brother'); }}
                          title="Ajouter un frère / sœur"
                          className="p-1 text-gray-400 hover:text-[#FCD116] transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <div className="w-px h-3 bg-white/10" />
                        <button
                          onClick={(e) => { e.stopPropagation(); onAddRelative?.('child'); }}
                          title="Ajouter un enfant"
                          className="p-1 text-gray-400 hover:text-[#008751] transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </>
                    )}
                    {(node.role === 'father' || node.person.relation_role === 'father') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddRelative?.('paternal_uncle'); }}
                        title="Ajouter un oncle/tante paternel(le)"
                        className="p-1 text-gray-400 hover:text-[#FCD116] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                    {(node.role === 'mother' || node.person.relation_role === 'mother') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddRelative?.('maternal_uncle'); }}
                        title="Ajouter un oncle/tante maternel(le)"
                        className="p-1 text-gray-400 hover:text-[#008751] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => onAddRelative?.(node.role)}
                  className={cn(
                    'group flex h-full w-full flex-col items-center justify-center rounded-2xl transition-all duration-300 p-3 text-center',
                    'border-2 border-dashed border-white/[0.07] bg-white/[0.015]',
                    'hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]',
                    'hover:shadow-[0_0_30px_-12px_rgba(0,135,81,0.4)]'
                  )}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] transition-all group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
                    <Plus size={16} className="text-gray-500 transition-colors group-hover:text-[#008751]" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 group-hover:text-white transition-colors leading-tight">
                    {ROLE_LABELS[node.role] || 'Ajouter'}
                  </span>
                  <span className="mt-0.5 text-[7px] font-semibold text-gray-700 group-hover:text-emerald-500/70 transition-colors uppercase tracking-wider">
                    Cliquer pour ajouter
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Empty state ─── */}
      {persons.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#008751]/20 to-[#FCD116]/10 flex items-center justify-center border border-white/10">
              <Plus size={24} className="text-[#008751]" />
            </div>
            <p className="text-sm font-black text-white mb-1">Commencez votre arbre</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Cliquez sur un emplacement pour ajouter votre premier membre de famille
            </p>
          </div>
        </div>
      )}
    </div>
  );
}