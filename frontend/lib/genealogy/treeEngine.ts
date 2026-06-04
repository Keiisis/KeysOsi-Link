/**
 * treeEngine.ts — Moteur de layout récursif pour arbre généalogique dynamique
 *
 * Remplace le layout statique basé sur les rôles par un algorithme récursif
 * qui suit les liens father_id / mother_id pour supporter un nombre illimité
 * de générations.
 */

import { Person } from './types';
import { ROLE_LABELS } from './requirements';

/* ─── Dimensions (identiques au FamilyTree original) ─── */
const CARD_W = 220;
const CARD_H = 140;
const H_GAP = 48;
const V_GAP = 120;
const COUPLE_R = 14;
const UNIT = CARD_W + H_GAP;

/* ─── Types exportés ─── */
export interface TreeNode {
  id: string;
  role: string;
  label: string;
  person?: Person;
  x: number;
  y: number;
  gen: number;  // gen 0 = self, -1 = parents, -2 = grandparents, +1 = children ...
}

export interface CoupleLink {
  leftNode: TreeNode;
  rightNode: TreeNode;
  midX: number;
  midY: number;
}

export interface ChildLink {
  parentMidX: number;
  parentMidY: number;
  childX: number;
  childTopY: number;
  active?: boolean;
}

export interface SiblingGroup {
  parentMidX: number;
  parentMidY: number;
  children: { x: number; topY: number; active?: boolean }[];
  active?: boolean;
}

export interface LayoutResult {
  nodes: TreeNode[];
  couples: CoupleLink[];
  childLinks: ChildLink[];
  siblingGroups: SiblingGroup[];
  width: number;
  height: number;
  offsetX: number;
  minGen: number;
  maxGen: number;
}

/* ─── Helpers ─── */

/** Find all children of a person */
export function findChildrenOf(personId: string, allPersons: Person[]): Person[] {
  return allPersons.filter(
    p => p.father_id === personId || p.mother_id === personId
  );
}

/** Get the partner of a person (someone who shares a child) */
function findPartners(personId: string, allPersons: Person[]): Person[] {
  const children = findChildrenOf(personId, allPersons);
  const partnerIds = new Set<string>();
  for (const child of children) {
    if (child.father_id && child.father_id !== personId) partnerIds.add(child.father_id);
    if (child.mother_id && child.mother_id !== personId) partnerIds.add(child.mother_id);
  }
  // Also include persons with partner roles linked directly
  for (const p of allPersons) {
    if (['husband', 'wife', 'fiance', 'fiancee'].includes(p.relation_role || '')) {
      // Check if this partner is related to the person (shares children or is on same level)
      const self = allPersons.find(x => x.is_self || x.relation_role === 'self');
      if (self && self.id === personId) {
        partnerIds.add(p.id);
      }
    }
  }
  return allPersons.filter(p => partnerIds.has(p.id));
}

/** Generate a descriptive label for a person based on their position in the tree */
export function getPersonLabel(person: Person, allPersons: Person[]): string {
  // If person has a known role label, use it
  if (person.relation_role && ROLE_LABELS[person.relation_role] && person.relation_role !== 'other' && person.relation_role !== 'ancestor') {
    return ROLE_LABELS[person.relation_role];
  }
  // For ancestors beyond known roles, build a descriptive path
  return person.relation_role === 'ancestor' ? 'Ancêtre' : ROLE_LABELS[person.relation_role || 'other'] || 'Membre';
}

/** Generation label for a given gen offset */
export function getGenerationLabel(gen: number, minGen: number, maxGen: number): string {
  if (gen === 0) return 'Sujet & Fratrie';
  if (gen === 1) return 'Descendants';
  if (gen > 1) return `Descendants (Gén. +${gen})`;
  if (gen === -1) return 'Parents';
  if (gen === -2) return 'Grands-parents';
  if (gen === -3) return 'Arrière-grands-parents';
  // Beyond gen -3, use numbered format
  const depth = Math.abs(gen);
  if (depth === 4) return 'Arrière-arrière-grands-parents';
  return `Ancêtres (Gén. ${depth})`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LAYOUT ENGINE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute the full tree layout from person data.
 * 
 * Algorithm:
 * 1. Find the "self" person (anchor at gen 0)
 * 2. Recursively climb ancestors via father_id/mother_id (gen -1, -2, ...)
 * 3. Place children below (gen +1, +2, ...)
 * 4. Position nodes using binary tree spacing (each ancestor couple gets 2x width)
 */
export function computeTreeLayout(persons: Person[]): LayoutResult {
  const nodes: TreeNode[] = [];
  const couples: CoupleLink[] = [];
  const childLinks: ChildLink[] = [];
  const siblingGroups: SiblingGroup[] = [];

  if (persons.length === 0) {
    return { nodes, couples, childLinks, siblingGroups, width: CARD_W * 2, height: CARD_H * 2, offsetX: 40, minGen: 0, maxGen: 0 };
  }

  // Find the self person
  const selfPerson = persons.find(p => p.is_self || p.relation_role === 'self');
  if (!selfPerson) {
    // If no self, show all persons in a flat row
    persons.forEach((p, i) => {
      nodes.push({
        id: p.id,
        role: p.relation_role || 'other',
        label: getPersonLabel(p, persons),
        person: p,
        x: i * UNIT,
        y: 40,
        gen: 0,
      });
    });
    const w = persons.length * UNIT + 80;
    return { nodes, couples, childLinks, siblingGroups, width: w, height: CARD_H + 120, offsetX: 40, minGen: 0, maxGen: 0 };
  }

  // ─── Build ancestor tree structure ───
  // We need to find the maximum ancestor depth to calculate spacing
  interface AncestorNode {
    person?: Person;
    placeholder?: string;  // role placeholder if no person
    gen: number;
    father?: AncestorNode;
    mother?: AncestorNode;
    col: number;  // computed column position
  }

  const personById = new Map<string, Person>();
  persons.forEach(p => personById.set(p.id, p));

  // Recursively build ancestor tree
  const visitedAncestors = new Set<string>();
  
  function buildAncestorNode(person: Person | undefined, gen: number, side: string): AncestorNode {
    const node: AncestorNode = { person, gen, col: 0 };
    
    if (person && !visitedAncestors.has(person.id)) {
      visitedAncestors.add(person.id);
      
      const father = person.father_id ? personById.get(person.father_id) : undefined;
      const mother = person.mother_id ? personById.get(person.mother_id) : undefined;
      
      if (father || (person.father_id && personById.has(person.father_id))) {
        node.father = buildAncestorNode(father, gen - 1, side + '_f');
      }
      if (mother || (person.mother_id && personById.has(person.mother_id))) {
        node.mother = buildAncestorNode(mother, gen - 1, side + '_m');
      }
    }
    
    return node;
  }

  // Build from father and mother of self
  const fatherPerson = selfPerson.father_id ? personById.get(selfPerson.father_id) : undefined;
  const motherPerson = selfPerson.mother_id ? personById.get(selfPerson.mother_id) : undefined;

  const fatherTree = buildAncestorNode(fatherPerson, -1, 'pat');
  const motherTree = buildAncestorNode(motherPerson, -1, 'mat');

  // Find the deepest generation
  function findMinGen(node: AncestorNode): number {
    let min = node.gen;
    if (node.father) min = Math.min(min, findMinGen(node.father));
    if (node.mother) min = Math.min(min, findMinGen(node.mother));
    return min;
  }
  
  const minGenFather = fatherPerson ? findMinGen(fatherTree) : 0;
  const minGenMother = motherPerson ? findMinGen(motherTree) : 0;
  const minGen = Math.min(minGenFather, minGenMother, -1);

  // ─── Compute column positions ───
  // Each ancestor at deepest gen gets 1 slot, parents get centered between their parents
  // Total width at the deepest generation = 2^|minGen| slots
  
  const deepestDepth = Math.abs(minGen);
  const totalTopSlots = Math.pow(2, deepestDepth);
  
  // Assign columns to ancestor nodes (leaf-first, bottom-up centering)
  let nextSlot = 0;
  
  function assignColumns(node: AncestorNode, depth: number): void {
    const nodeDepth = Math.abs(node.gen);
    
    if (node.father) {
      assignColumns(node.father, depth);
    }
    if (node.mother) {
      assignColumns(node.mother, depth);
    }
    
    if (!node.father && !node.mother) {
      // Leaf node at this branch — assign column
      // Calculate how many slots this leaf should span based on its depth vs max
      const slotsPerLeaf = Math.pow(2, deepestDepth - nodeDepth);
      node.col = nextSlot + slotsPerLeaf / 2 - 0.5;
      nextSlot += slotsPerLeaf;
    } else if (node.father && node.mother) {
      // Center between children
      node.col = (node.father.col + node.mother.col) / 2;
    } else if (node.father) {
      node.col = node.father.col;
    } else if (node.mother) {
      node.col = node.mother.col;
    }
  }

  // Process father's side
  if (fatherPerson) {
    assignColumns(fatherTree, 0);
  } else {
    // No father: reserve left half for potential father placeholder
    const slotsForSide = totalTopSlots / 2;
    fatherTree.col = slotsForSide / 2 - 0.5;
    nextSlot = slotsForSide;
  }

  // Process mother's side
  if (motherPerson) {
    assignColumns(motherTree, 0);
  } else {
    // No mother: use right half
    const slotsForSide = totalTopSlots / 2;
    motherTree.col = nextSlot + slotsForSide / 2 - 0.5;
    nextSlot += slotsForSide;
  }

  // Ensure minimum spacing between father and mother sides
  const MIN_COUPLE_SPACING = 3;
  if (motherTree.col - fatherTree.col < MIN_COUPLE_SPACING) {
    const shift = (MIN_COUPLE_SPACING - (motherTree.col - fatherTree.col)) / 2;
    function shiftNode(node: AncestorNode, delta: number) {
      node.col += delta;
      if (node.father) shiftNode(node.father, delta);
      if (node.mother) shiftNode(node.mother, delta);
    }
    shiftNode(fatherTree, -shift);
    shiftNode(motherTree, shift);
  }

  // ─── Y position helper ───
  // gen 0 is at the anchor, negatives go up, positives go down
  // We normalize so that minGen maps to y=40 (top)
  const genY = (gen: number) => (gen - minGen) * (CARD_H + V_GAP) + 40;

  // ─── Create nodes from ancestor tree ───
  function createAncestorNodes(aNode: AncestorNode, roleHint: string): void {
    const id = aNode.person?.id || `placeholder_${roleHint}`;
    const x = aNode.col * UNIT;
    const y = genY(aNode.gen);
    
    let label = roleHint;
    if (aNode.person) {
      label = getPersonLabel(aNode.person, persons);
    } else {
      // Generate a label from roleHint  
      label = ROLE_LABELS[roleHint] || roleHint;
    }

    nodes.push({
      id,
      role: aNode.person?.relation_role || roleHint,
      label,
      person: aNode.person,
      x,
      y,
      gen: aNode.gen,
    });

    if (aNode.father) {
      createAncestorNodes(aNode.father, roleHint + '_father');
    }
    if (aNode.mother) {
      createAncestorNodes(aNode.mother, roleHint + '_mother');
    }
  }

  createAncestorNodes(fatherTree, 'father');
  createAncestorNodes(motherTree, 'mother');

  // ─── Find siblings, partners, children for the self ───
  const selfPartners = persons.filter(p =>
    ['husband', 'wife', 'fiance', 'fiancee'].includes(p.relation_role || '')
  );

  const selfChildren = persons.filter(p =>
    p.relation_role === 'child' ||
    (selfPerson && (p.father_id === selfPerson.id || p.mother_id === selfPerson.id))
  ).filter(p => p.id !== selfPerson.id && !visitedAncestors.has(p.id));

  // Siblings: same parents as self (excluding self)  
  const selfSiblings = persons.filter(p => {
    if (p.id === selfPerson.id) return false;
    if (visitedAncestors.has(p.id)) return false;
    if (['brother', 'sister', 'sibling'].includes(p.relation_role || '')) return true;
    if (fatherPerson && p.father_id === fatherPerson.id && p.id !== selfPerson.id) return true;
    if (motherPerson && p.mother_id === motherPerson.id && p.id !== selfPerson.id) return true;
    return false;
  }).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // Paternal uncles/aunts: children of paternal grandparents (excluding father)
  const pGrandfather = fatherPerson?.father_id ? personById.get(fatherPerson.father_id) : undefined;
  const pGrandmother = fatherPerson?.mother_id ? personById.get(fatherPerson.mother_id) : undefined;
  
  const paternalUncles = persons.filter(p => {
    if (p.id === fatherPerson?.id) return false;
    if (visitedAncestors.has(p.id)) return false;
    if (['paternal_uncle', 'paternal_aunt'].includes(p.relation_role || '')) return true;
    if (pGrandfather && p.father_id === pGrandfather.id) return true;
    if (pGrandmother && p.mother_id === pGrandmother.id) return true;
    return false;
  }).filter(p => !['father', 'mother', 'self'].includes(p.relation_role || '') && !p.is_self)
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // Maternal uncles/aunts
  const mGrandfather = motherPerson?.father_id ? personById.get(motherPerson.father_id) : undefined;
  const mGrandmother = motherPerson?.mother_id ? personById.get(motherPerson.mother_id) : undefined;
  
  const maternalUncles = persons.filter(p => {
    if (p.id === motherPerson?.id) return false;
    if (visitedAncestors.has(p.id)) return false;
    if (['maternal_uncle', 'maternal_aunt'].includes(p.relation_role || '')) return true;
    if (mGrandfather && p.father_id === mGrandfather.id) return true;
    if (mGrandmother && p.mother_id === mGrandmother.id) return true;
    return false;
  }).filter(p => !['father', 'mother', 'self'].includes(p.relation_role || '') && !p.is_self)
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // ─── Self node ───
  const selfCol = (fatherTree.col + motherTree.col) / 2;
  const hasPartner = selfPartners.length > 0;
  const selfActualCol = hasPartner ? selfCol - 0.6 : selfCol;
  const partnerCol = selfCol + 0.6;

  nodes.push({
    id: 'self',
    role: 'self',
    label: 'Vous',
    person: selfPerson,
    x: selfActualCol * UNIT,
    y: genY(0),
    gen: 0,
  });

  // Partners
  selfPartners.forEach((partner, i) => {
    nodes.push({
      id: partner.id,
      role: partner.relation_role || 'husband',
      label: getPersonLabel(partner, persons),
      person: partner,
      x: (partnerCol + i * 1.2) * UNIT,
      y: genY(0),
      gen: 0,
    });
  });

  // Siblings
  selfSiblings.forEach((sib, i) => {
    nodes.push({
      id: sib.id,
      role: sib.relation_role || 'sibling',
      label: getPersonLabel(sib, persons),
      person: sib,
      x: (selfActualCol - 1.5 - i * 1.5) * UNIT,
      y: genY(0),
      gen: 0,
    });
  });

  // Paternal uncles/aunts (gen -1)
  paternalUncles.forEach((unc, i) => {
    const fatherNode = nodes.find(n => n.id === fatherPerson?.id);
    const fatherColPos = fatherNode ? fatherNode.x / UNIT : fatherTree.col;
    const offset = i % 2 === 0 ? -(Math.floor(i / 2) + 1) : (Math.floor(i / 2) + 1);
    nodes.push({
      id: unc.id,
      role: unc.relation_role || 'paternal_uncle',
      label: getPersonLabel(unc, persons),
      person: unc,
      x: (fatherColPos + offset * 1.4) * UNIT,
      y: genY(-1),
      gen: -1,
    });
  });

  // Maternal uncles/aunts (gen -1)
  maternalUncles.forEach((unc, i) => {
    const motherNode = nodes.find(n => n.id === motherPerson?.id);
    const motherColPos = motherNode ? motherNode.x / UNIT : motherTree.col;
    const offset = i % 2 === 0 ? (Math.floor(i / 2) + 1) : -(Math.floor(i / 2) + 1);
    nodes.push({
      id: unc.id,
      role: unc.relation_role || 'maternal_uncle',
      label: getPersonLabel(unc, persons),
      person: unc,
      x: (motherColPos + offset * 1.4) * UNIT,
      y: genY(-1),
      gen: -1,
    });
  });

  // ─── Children (gen +1) ───
  // Deduplicate children
  const uniqueChildren = selfChildren.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  const childrenCenterCol = hasPartner ? (selfActualCol + partnerCol) / 2 : selfActualCol;
  const CHILD_SPREAD = 2.2;
  
  uniqueChildren.forEach((child, i) => {
    const total = uniqueChildren.length;
    const startCol = childrenCenterCol - ((total - 1) * CHILD_SPREAD) / 2;
    const col = startCol + i * CHILD_SPREAD;
    nodes.push({
      id: child.id,
      role: 'child',
      label: getPersonLabel(child, persons),
      person: child,
      x: col * UNIT,
      y: genY(1),
      gen: 1,
    });
  });

  // Also check for descendants of any other person (not self)
  // Find children of any person who is not self and not already placed
  const placedIds = new Set(nodes.map(n => n.id));
  
  // For each placed person, find their unplaced children
  function placeDescendants(parentNode: TreeNode) {
    if (!parentNode.person) return;
    const children = findChildrenOf(parentNode.person.id, persons)
      .filter(c => !placedIds.has(c.id));
    
    if (children.length === 0) return;

    const parentCol = parentNode.x / UNIT;
    const spread = 1.8;
    children.forEach((child, i) => {
      const total = children.length;
      const startCol = parentCol - ((total - 1) * spread) / 2;
      const col = startCol + i * spread;
      const childGen = parentNode.gen + 1;
      const childNode: TreeNode = {
        id: child.id,
        role: child.relation_role || 'child',
        label: getPersonLabel(child, persons),
        person: child,
        x: col * UNIT,
        y: genY(childGen),
        gen: childGen,
      };
      nodes.push(childNode);
      placedIds.add(child.id);
      
      // Recurse for grandchildren etc.
      placeDescendants(childNode);
    });
  }

  // Place descendants of non-self persons (like uncle's children)
  const currentNodes = [...nodes];
  for (const node of currentNodes) {
    if (node.id !== 'self' && node.person && node.gen !== 1) {
      placeDescendants(node);
    }
  }

  // ─── Check for any unplaced persons and add them ───
  const allPlacedIds = new Set(nodes.map(n => n.id));
  const unplaced = persons.filter(p => !allPlacedIds.has(p.id));
  if (unplaced.length > 0) {
    // Find the max gen for unplaced positioning
    const maxGenSoFar = Math.max(...nodes.map(n => n.gen), 0);
    const unplacedGen = maxGenSoFar + 1;
    unplaced.forEach((p, i) => {
      nodes.push({
        id: p.id,
        role: p.relation_role || 'other',
        label: getPersonLabel(p, persons),
        person: p,
        x: i * UNIT,
        y: genY(unplacedGen),
        gen: unplacedGen,
      });
    });
  }

  // ═══ BUILD CONNECTIONS ═══
  const nodeMap: Record<string, TreeNode> = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const cx = (n: TreeNode) => n.x + CARD_W / 2;
  const bot = (n: TreeNode) => n.y + CARD_H;
  const top_ = (n: TreeNode) => n.y;

  // ─── Build couple links from ancestor tree ───
  function buildAncestorCouples(aNode: AncestorNode, roleHint: string) {
    if (aNode.father && aNode.mother) {
      const fatherId = aNode.father.person?.id || `placeholder_${roleHint}_father`;
      const motherId = aNode.mother.person?.id || `placeholder_${roleHint}_mother`;
      const nF = nodeMap[fatherId];
      const nM = nodeMap[motherId];
      if (nF && nM) {
        const midX = (cx(nF) + cx(nM)) / 2;
        const midY = bot(nF) + 16;
        couples.push({ leftNode: nF, rightNode: nM, midX, midY });

        // Child link from this couple to the child (aNode itself)
        const childId = aNode.person?.id || `placeholder_${roleHint}`;
        const childNode = nodeMap[childId];
        if (childNode) {
          const hasParents = !!nF.person || !!nM.person;
          const hasChild = !!childNode.person;
          childLinks.push({
            parentMidX: midX,
            parentMidY: midY,
            childX: cx(childNode),
            childTopY: top_(childNode),
            active: hasParents && hasChild,
          });
        }
      }
    } else if (aNode.father) {
      // Only father, build single parent link
      const fatherId = aNode.father.person?.id || `placeholder_${roleHint}_father`;
      const nF = nodeMap[fatherId];
      const childId = aNode.person?.id || `placeholder_${roleHint}`;
      const childNode = nodeMap[childId];
      if (nF && childNode) {
        childLinks.push({
          parentMidX: cx(nF),
          parentMidY: bot(nF) + 16,
          childX: cx(childNode),
          childTopY: top_(childNode),
          active: !!nF.person && !!childNode.person,
        });
      }
    } else if (aNode.mother) {
      const motherId = aNode.mother.person?.id || `placeholder_${roleHint}_mother`;
      const nM = nodeMap[motherId];
      const childId = aNode.person?.id || `placeholder_${roleHint}`;
      const childNode = nodeMap[childId];
      if (nM && childNode) {
        childLinks.push({
          parentMidX: cx(nM),
          parentMidY: bot(nM) + 16,
          childX: cx(childNode),
          childTopY: top_(childNode),
          active: !!nM.person && !!childNode.person,
        });
      }
    }

    // Recurse
    if (aNode.father) buildAncestorCouples(aNode.father, roleHint + '_father');
    if (aNode.mother) buildAncestorCouples(aNode.mother, roleHint + '_mother');
  }

  // Father-Mother of self = main couple
  const nFather = nodeMap[fatherPerson?.id || 'placeholder_father'];
  const nMother = nodeMap[motherPerson?.id || 'placeholder_mother'];
  if (nFather && nMother) {
    const midX = (cx(nFather) + cx(nMother)) / 2;
    const midY = bot(nFather) + 16;
    couples.push({ leftNode: nFather, rightNode: nMother, midX, midY });

    // Build sibling group: self + siblings descend from parents
    const selfNode = nodeMap['self'];
    const siblingNodes = [selfNode, ...selfSiblings.map(s => nodeMap[s.id])].filter(Boolean);
    if (siblingNodes.length > 0) {
      const hasParents = !!nFather.person || !!nMother.person;
      siblingGroups.push({
        parentMidX: midX,
        parentMidY: midY,
        children: siblingNodes.map(n => ({ x: cx(n), topY: top_(n), active: hasParents && !!n.person })),
        active: hasParents,
      });
    }
  }

  // Build ancestor couples recursively
  buildAncestorCouples(fatherTree, 'father');
  buildAncestorCouples(motherTree, 'mother');

  // Paternal uncles: paternal grandparents → father + uncles
  if (pGrandfather || pGrandmother) {
    const pgfNode = nodeMap[pGrandfather?.id || ''];
    const pgmNode = nodeMap[pGrandmother?.id || ''];
    if (pgfNode && pgmNode) {
      // Already coupled above; build sibling group
      const existingCouple = couples.find(c =>
        (c.leftNode.id === pgfNode.id && c.rightNode.id === pgmNode.id) ||
        (c.leftNode.id === pgmNode.id && c.rightNode.id === pgfNode.id)
      );
      if (existingCouple && paternalUncles.length > 0) {
        const fatherNodeRef = nodeMap[fatherPerson?.id || ''];
        const allSibs = [fatherNodeRef, ...paternalUncles.map(u => nodeMap[u.id])].filter(Boolean);
        if (allSibs.length > 1) {
          siblingGroups.push({
            parentMidX: existingCouple.midX,
            parentMidY: existingCouple.midY,
            children: allSibs.map(n => ({ x: cx(n), topY: top_(n), active: !!n.person })),
            active: !!pgfNode.person || !!pgmNode.person,
          });
          // Remove the single childLink for father since it's now part of a sibling group
          const fatherIdx = childLinks.findIndex(cl =>
            fatherNodeRef && Math.abs(cl.childX - cx(fatherNodeRef)) < 1 && Math.abs(cl.parentMidX - existingCouple.midX) < 1
          );
          if (fatherIdx >= 0) childLinks.splice(fatherIdx, 1);
        }
      }
    }
  }

  // Maternal uncles
  if (mGrandfather || mGrandmother) {
    const mgfNode = nodeMap[mGrandfather?.id || ''];
    const mgmNode = nodeMap[mGrandmother?.id || ''];
    if (mgfNode && mgmNode) {
      const existingCouple = couples.find(c =>
        (c.leftNode.id === mgfNode.id && c.rightNode.id === mgmNode.id) ||
        (c.leftNode.id === mgmNode.id && c.rightNode.id === mgfNode.id)
      );
      if (existingCouple && maternalUncles.length > 0) {
        const motherNodeRef = nodeMap[motherPerson?.id || ''];
        const allSibs = [motherNodeRef, ...maternalUncles.map(u => nodeMap[u.id])].filter(Boolean);
        if (allSibs.length > 1) {
          siblingGroups.push({
            parentMidX: existingCouple.midX,
            parentMidY: existingCouple.midY,
            children: allSibs.map(n => ({ x: cx(n), topY: top_(n), active: !!n.person })),
            active: !!mgfNode.person || !!mgmNode.person,
          });
          const motherIdx = childLinks.findIndex(cl =>
            motherNodeRef && Math.abs(cl.childX - cx(motherNodeRef)) < 1 && Math.abs(cl.parentMidX - existingCouple.midX) < 1
          );
          if (motherIdx >= 0) childLinks.splice(motherIdx, 1);
        }
      }
    }
  }

  // Self + partner couple links
  selfPartners.forEach(partner => {
    const selfNode = nodeMap['self'];
    const partnerNode = nodeMap[partner.id];
    if (selfNode && partnerNode) {
      const midX = (cx(selfNode) + cx(partnerNode)) / 2;
      const midY = bot(selfNode) + 16;
      couples.push({ leftNode: selfNode, rightNode: partnerNode, midX, midY });
    }
  });

  // Self → children
  const selfNode = nodeMap['self'];
  if (selfNode && uniqueChildren.length > 0) {
    const selfPartnerCouple = selfPartners.length > 0
      ? couples.find(c => c.leftNode.id === 'self' && selfPartners.some(p => p.id === c.rightNode.id))
      : null;

    const parentMidX = selfPartnerCouple ? selfPartnerCouple.midX : cx(selfNode);
    const parentMidY = selfPartnerCouple ? selfPartnerCouple.midY : bot(selfNode) + 16;
    const hasSelf = !!selfNode.person;
    
    siblingGroups.push({
      parentMidX,
      parentMidY,
      children: uniqueChildren.map(c => {
        const n = nodeMap[c.id];
        return n
          ? { x: cx(n), topY: top_(n), active: hasSelf && !!n.person }
          : { x: parentMidX, topY: genY(1), active: false };
      }),
      active: hasSelf,
    });
  }

  // ─── Calculate canvas dimensions ───
  const allX = nodes.map(n => n.x);
  const allY = nodes.map(n => n.y);
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX.map(x => x + CARD_W), CARD_W);
  const maxY = Math.max(...allY.map(y => y + CARD_H), CARD_H) + 60;
  const maxGen = Math.max(...nodes.map(n => n.gen), 0);

  return {
    nodes,
    couples,
    childLinks,
    siblingGroups,
    width: maxX - minX + 80,
    height: maxY + 40,
    offsetX: -minX + 40,
    minGen,
    maxGen,
  };
}

/* ─── Exported constants for use by FamilyTree.tsx ─── */
export { CARD_W, CARD_H, H_GAP, V_GAP, COUPLE_R, UNIT };
