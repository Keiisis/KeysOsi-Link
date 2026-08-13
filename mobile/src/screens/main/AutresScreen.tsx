/* Autres Services — contenu (contact-first, sans paiement). Gabarit partagé.
   Contenu fidèle au web (DEFAULT_AUTRES). */
import React from 'react'
import {
    Sparkles, Car, Stethoscope, GraduationCap, FileText, Plane, HeartPulse,
    Handshake, Clock,
} from 'lucide-react-native'
import ServiceRdvLanding, { type RdvLandingContent } from '../../components/ServiceRdvLanding'

const CONTENT: RdvLandingContent = {
    serviceLabel: 'Autres Services',
    shareMessage: 'Transport, santé, scolarité, démarches : le quotidien facilité au Bénin avec Retour Gagnant : https://www.retourgagnantbenin.bj/services/autres',
    heroIcon: Sparkles,
    badge: 'Services du quotidien',
    title: 'Transport, santé, scolarité : le quotidien facilité au Bénin',
    subtitle: "Parce que réussir son retour, c'est aussi s'assurer une vie quotidienne sereine pour soi et sa famille dès le premier jour.",
    chips: [
        { icon: Car, label: 'Transport & aéroport' },
        { icon: Stethoscope, label: 'Santé & cliniques' },
        { icon: GraduationCap, label: 'Scolarité' },
        { icon: FileText, label: 'Démarches' },
    ],
    trust: ['Accompagnement réactif', 'Réseau de confiance', 'Installation sereine'],
    piliers: [
        { icon: Plane, title: 'Arrivée sereine', desc: "Prise en charge dès la sortie de l'avion." },
        { icon: HeartPulse, title: 'Accès aux soins', desc: 'Médecins et cliniques partenaires.' },
        { icon: GraduationCap, title: 'Scolarité', desc: 'Inscription et suivi pédagogique.' },
        { icon: FileText, title: 'Démarches', desc: 'Administratif du quotidien.' },
    ],
    missionEyebrow: 'Notre métier',
    missionTitle: 'Votre quotidien au Bénin, simplifié.',
    missionText: "Au-delà des grandes démarches, l'installation au Bénin se joue aussi dans le quotidien. Nous vous proposons des solutions complémentaires pour faciliter chaque aspect de votre vie sur place, sereinement, dès l'arrivée.",
    etapesEyebrow: 'Comment ça marche',
    etapes: [
        { num: '01', title: 'Votre besoin', desc: 'Vous nous indiquez ce dont vous avez besoin (transport, santé, école, démarche).' },
        { num: '02', title: 'Mise en relation', desc: 'Nous mobilisons nos partenaires de confiance et organisons la prestation.' },
        { num: '03', title: 'Suivi', desc: 'Nous restons disponibles pour ajuster et vous accompagner dans la durée.' },
    ],
    contrastEyebrow: 'La différence',
    contrastPre: "S'installer au Bénin,",
    contrastAccent: "c'est mille petits détails à régler.",
    contrastSub: 'Transport, soins, école, papiers : seul et à distance, chaque détail devient un obstacle. Nous vous simplifions le quotidien.',
    soloTitle: 'En solo, à distance',
    solo: [
        'Trouver des prestataires fiables à distance',
        "Organiser l'arrivée et les déplacements",
        'Accéder à des soins de confiance',
        "S'y retrouver dans les démarches locales",
    ],
    avecTitle: 'Avec Retour Gagnant',
    avec: [
        'Transfert aéroport et véhicule avec chauffeur',
        'Médecins et cliniques partenaires',
        'Inscription scolaire et suivi pédagogique',
        'Accompagnement des démarches administratives',
    ],
    prestaEyebrow: 'Ce que nous proposons',
    prestaTitle: 'Nos services',
    presta: [
        'Transfert aéroport et location de véhicule avec chauffeur',
        'Mise en relation avec médecins et cliniques partenaires',
        'Inscription scolaire et suivi pédagogique',
        'Accompagnement démarches administratives locales',
    ],
    prestaNote: 'Besoin particulier ? Contactez-nous : nous étudions chaque demande.',
    reassurance: [
        { icon: Handshake, title: 'Partenaires de confiance', desc: 'Un réseau local sélectionné.' },
        { icon: Sparkles, title: 'Sur mesure', desc: 'Nous étudions chaque demande.' },
        { icon: Clock, title: 'Disponibles', desc: 'Un suivi dans la durée.' },
    ],
    faqEyebrow: 'Questions fréquentes',
    faq: [
        { q: "Proposez-vous le transfert depuis l'aéroport ?", r: 'Oui, transfert aéroport et location de véhicule avec chauffeur font partie de nos services.' },
        { q: 'Pouvez-vous m\'aider pour la scolarité de mes enfants ?', r: 'Oui : inscription scolaire et suivi pédagogique auprès d\'établissements adaptés.' },
        { q: "Et pour un besoin qui n'est pas listé ?", r: 'Contactez-nous : nous étudions chaque demande particulière et mobilisons le bon partenaire.' },
    ],
    finalTitle: 'Votre quotidien au Bénin, simplifié.',
    finalText: "De l'aéroport à l'école, en passant par les soins et les papiers : dites-nous ce dont vous avez besoin.",
    finalNote: 'Réponse rapide • Partenaires de confiance',
    primaryCtaLabel: 'Nous contacter',
    primaryContact: true,
    stickyLabel: 'Un besoin ?',
    stickyValue: 'Réponse rapide',
    stickyBtnLabel: 'Nous contacter',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AutresScreen({ navigation }: { navigation: any }) {
    return <ServiceRdvLanding navigation={navigation} content={CONTENT} />
}
