import { DocType, DossierType, RelationRole } from './types';

export interface RequirementDef {
  key: string;
  label: string;
  docType: DocType;
  targetRole: RelationRole | 'self';
  validityCheck?: boolean;   // doit dater de moins de 3 mois
  optional?: boolean;        // "tout autre document" = renforcement
}

// ---------- DOSSIER 1 : AFRO-DESCENDANCE ----------
export const AFRO_DESCENDANCE: RequirementDef[] = [
  { key: 'afro_proof',     label: "Preuve d'afro-descendance",        docType: 'afro_descent_proof', targetRole: 'self', validityCheck: true },
  { key: 'profession',     label: 'Preuve de profession',             docType: 'profession_proof',   targetRole: 'self', validityCheck: true },
  { key: 'address',        label: 'Justificatif de domicile',         docType: 'address_proof',      targetRole: 'self', validityCheck: true },
  { key: 'identity',       label: "Pièce d'identité valide",          docType: 'identity',           targetRole: 'self', validityCheck: true },
  { key: 'birth_self',     label: 'Votre extrait de naissance',       docType: 'birth_certificate',  targetRole: 'self', validityCheck: true },
  { key: 'criminal',       label: 'Casier judiciaire',                docType: 'criminal_record',    targetRole: 'self', validityCheck: true },
  { key: 'birth_father',   label: 'Extrait de naissance du père',     docType: 'birth_certificate',  targetRole: 'father' },
  { key: 'birth_mother',   label: 'Extrait de naissance de la mère',  docType: 'birth_certificate',  targetRole: 'mother' },
  { key: 'familybook_parents', label: 'Livret de famille des parents', docType: 'family_book',       targetRole: 'father' },
  // arrière-grands-parents (4)
  { key: 'birth_pggf1', label: 'Extrait naissance arrière-grand-père paternel', docType: 'birth_certificate', targetRole: 'paternal_ggf_1' },
  { key: 'birth_pggm1', label: 'Extrait naissance arrière-grand-mère paternelle', docType: 'birth_certificate', targetRole: 'paternal_ggm_1' },
  { key: 'birth_mggf1', label: 'Extrait naissance arrière-grand-père maternel', docType: 'birth_certificate', targetRole: 'maternal_ggf_1' },
  { key: 'birth_mggm1', label: 'Extrait naissance arrière-grand-mère maternelle', docType: 'birth_certificate', targetRole: 'maternal_ggm_1' },
  // documents de renforcement (facultatifs mais valorisés)
  { key: 'extra_gp_marriage', label: 'Acte de mariage grands-parents', docType: 'marriage_certificate', targetRole: 'paternal_grandfather', optional: true },
  { key: 'extra_gp_death',    label: 'Acte de décès grands-parents',   docType: 'death_certificate',    targetRole: 'paternal_grandfather', optional: true },
];

// ---------- DOSSIER 2 : ANCÊTRE RÉDUIT EN ESCLAVAGE ----------
export const ANCETRE_ESCLAVAGE: RequirementDef[] = [
  { key: 'birth_father', label: 'Extrait de naissance du père', docType: 'birth_certificate', targetRole: 'father' },
  { key: 'birth_mother', label: 'Extrait de naissance de la mère', docType: 'birth_certificate', targetRole: 'mother' },
  // grands-parents : naissance OU décès accepté (géré dans le moteur)
  { key: 'gp_pgf', label: 'Naissance/décès grand-père paternel', docType: 'birth_certificate', targetRole: 'paternal_grandfather' },
  { key: 'gp_pgm', label: 'Naissance/décès grand-mère paternelle', docType: 'birth_certificate', targetRole: 'paternal_grandmother' },
  { key: 'gp_mgf', label: 'Naissance/décès grand-père maternel', docType: 'birth_certificate', targetRole: 'maternal_grandfather' },
  { key: 'gp_mgm', label: 'Naissance/décès grand-mère maternelle', docType: 'birth_certificate', targetRole: 'maternal_grandmother' },
  // tout autre acte
  { key: 'extra_acts', label: 'Acte (mariage/notarial/militaire/décès) grands & arrière-grands-parents', docType: 'marriage_certificate', targetRole: 'paternal_grandfather', optional: true },
];

export const DOSSIER_DEFS: Record<DossierType, RequirementDef[]> = {
  afro_descendance: AFRO_DESCENDANCE,
  ancetre_esclavage: ANCETRE_ESCLAVAGE,
};

export const DOSSIER_LABELS: Record<DossierType, string> = {
  afro_descendance: 'Dossier Afro-descendance',
  ancetre_esclavage: "Dossier Ancêtre réduit en esclavage",
};

// Documents acceptés "naissance OU décès" pour les grands-parents (dossier 2)
export const BIRTH_OR_DEATH_KEYS = ['gp_pgf', 'gp_pgm', 'gp_mgf', 'gp_mgm'];

export const ROLE_LABELS: Record<string, string> = {
  self: 'Vous',
  father: 'Père',
  mother: 'Mère',
  paternal_grandfather: 'Grand-père paternel',
  paternal_grandmother: 'Grand-mère paternelle',
  maternal_grandfather: 'Grand-père maternel',
  maternal_grandmother: 'Grand-mère maternelle',
  paternal_ggf_1: 'Arrière-grand-père paternel',
  paternal_ggm_1: 'Arrière-grand-mère paternelle',
  maternal_ggf_1: 'Arrière-grand-père maternel',
  maternal_ggm_1: 'Arrière-grand-mère maternelle',
  brother: 'Frère',
  sister: 'Sœur',
  paternal_uncle: 'Oncle paternel',
  paternal_aunt: 'Tante paternelle',
  maternal_uncle: 'Oncle maternel',
  maternal_aunt: 'Tante maternelle',
  sibling: 'Collatéral (Fratrie)',
  child: 'Enfant',
  other: 'Autre membre',
};
