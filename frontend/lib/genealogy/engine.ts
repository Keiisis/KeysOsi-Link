import {
  Person, DocumentItem, DossierType,
  RequirementResult, DossierReport, Alert, RelationRole,
} from './types';
import {
  DOSSIER_DEFS, RequirementDef, BIRTH_OR_DEATH_KEYS, ROLE_LABELS,
} from './requirements';

const THREE_MONTHS_MS = 1000 * 60 * 60 * 24 * 92; // ~3 mois

/** Un document est-il périmé selon la règle des 3 mois ? */
function isExpired(doc: DocumentItem): boolean {
  if (!doc.issued_date) return false;
  const issued = new Date(doc.issued_date).getTime();
  return Date.now() - issued > THREE_MONTHS_MS;
}

/** Trouve la personne correspondant à un rôle généalogique. */
function findPersonByRole(persons: Person[], role: RelationRole | 'self'): Person | undefined {
  return persons.find(p => (role === 'self' ? p.is_self : p.relation_role === role));
}

/** Documents rattachés à une personne et d'un type donné. */
function docsFor(documents: DocumentItem[], personId: string | undefined, docTypes: string[]): DocumentItem[] {
  if (!personId) return [];
  return documents.filter(d => d.person_id === personId && docTypes.includes(d.doc_type));
}

/**
 * Évalue UNE exigence.
 */
function evaluateRequirement(
  def: RequirementDef,
  persons: Person[],
  documents: DocumentItem[],
): RequirementResult {
  const person = findPersonByRole(persons, def.targetRole);
  const missingPerson = def.targetRole !== 'self' && !person && !def.optional;

  // Dossier 2 : naissance OU décès accepté pour grands-parents
  const acceptedTypes = BIRTH_OR_DEATH_KEYS.includes(def.key)
    ? ['birth_certificate', 'death_certificate']
    : [def.docType];

  const docs = docsFor(documents, person?.id, acceptedTypes);
  const validDocs = docs.filter(d => !(def.validityCheck && isExpired(d)));
  const expiredOnly = docs.length > 0 && validDocs.length === 0 && !!def.validityCheck;

  const fulfilled = validDocs.length > 0;

  let message: string | undefined;
  if (missingPerson) {
    message = `Ajoutez d'abord ${ROLE_LABELS[def.targetRole] ?? 'cette personne'} dans l'arbre.`;
  } else if (expiredOnly) {
    message = `Document périmé (doit dater de moins de 3 mois). À renouveler.`;
  } else if (!fulfilled && !def.optional) {
    const who = def.targetRole === 'self' ? 'vous' : ROLE_LABELS[def.targetRole];
    message = `Manquant : ${def.label} (${who}).`;
  }

  return {
    key: def.key,
    label: def.label,
    docType: def.docType,
    targetRole: def.targetRole,
    required: !def.optional,
    fulfilled,
    expired: expiredOnly,
    missingPerson,
    message,
  };
}

/**
 * Génère le rapport complet d'un dossier.
 */
export function buildDossierReport(
  dossierType: DossierType,
  persons: Person[],
  documents: DocumentItem[],
): DossierReport {
  const defs = DOSSIER_DEFS[dossierType];
  const items = defs.map(def => evaluateRequirement(def, persons, documents));

  const required = items.filter(i => i.required);
  const totalRequired = required.length;
  const totalFulfilled = required.filter(i => i.fulfilled).length;
  const progress = totalRequired === 0 ? 100 : Math.round((totalFulfilled / totalRequired) * 100);

  // Génération des alertes priorisées
  const alerts: Alert[] = [];

  items.filter(i => i.expired).forEach(i => {
    alerts.push({ level: 'warning', message: `⏰ ${i.label} : document périmé, à renouveler.`, relatedRole: i.targetRole });
  });

  items.filter(i => i.missingPerson).forEach(i => {
    alerts.push({ level: 'error', message: `👤 ${ROLE_LABELS[i.targetRole] ?? i.label} absent de l'arbre — ajoutez-le pour avancer.`, relatedRole: i.targetRole });
  });

  items.filter(i => i.required && !i.fulfilled && !i.missingPerson && !i.expired).forEach(i => {
    alerts.push({ level: 'error', message: `🔴 ${i.message}`, relatedRole: i.targetRole });
  });

  if (progress === 100) {
    alerts.unshift({ level: 'success', message: '✅ Dossier complet ! Vous pouvez générer le PDF final.' });
  }

  return { dossierType, progress, totalRequired, totalFulfilled, items, alerts };
}

/**
 * Construit les 2 rapports d'un coup.
 */
export function buildAllReports(persons: Person[], documents: DocumentItem[]) {
  return {
    afro_descendance: buildDossierReport('afro_descendance', persons, documents),
    ancetre_esclavage: buildDossierReport('ancetre_esclavage', persons, documents),
  };
}

/**
 * Détection d'incohérences dans l'arbre.
 */
export function detectInconsistencies(persons: Person[]): Alert[] {
  const alerts: Alert[] = [];
  for (const p of persons) {
    if (p.birth_date && p.death_date && new Date(p.death_date) < new Date(p.birth_date)) {
      alerts.push({ level: 'warning', message: `⚠️ ${p.first_name ?? 'Personne'} : date de décès antérieure à la naissance.` });
    }
    const father = persons.find(x => x.id === p.father_id);
    if (father && father.birth_date && p.birth_date &&
        new Date(p.birth_date) <= new Date(father.birth_date)) {
      alerts.push({ level: 'warning', message: `⚠️ ${p.first_name ?? 'Personne'} serait né(e) avant ou en même temps que son père.` });
    }
  }
  return alerts;
}

/**
 * Suggestions de recherche selon la profondeur atteinte.
 */
export function buildResearchHints(persons: Person[]): Alert[] {
  const hints: Alert[] = [];
  const oldest = persons
    .filter(p => p.birth_date)
    .sort((a, b) => new Date(a.birth_date!).getTime() - new Date(b.birth_date!).getTime())[0];

  if (oldest?.birth_date) {
    const year = new Date(oldest.birth_date).getFullYear();
    if (year > 1848) {
      hints.push({ level: 'info', message: `🔍 Votre ancêtre le plus ancien est né en ${year}. Pour franchir 1848, consultez les registres des "nouveaux libres" (ANOM).` });
    } else {
      hints.push({ level: 'info', message: `🔍 Vous avez atteint la période de l'abolition (${year}). Explorez les registres d'individualité et les actes notariés d'habitation.` });
    }
  } else {
    hints.push({ level: 'info', message: `🔍 Commencez par renseigner les dates de naissance pour activer les pistes d'archives.` });
  }
  return hints;
}
