'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    ArrowRight, Quote, Sparkles, TreePine, DoorOpen, Stamp, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { T } from '@/lib/translation'

/* ═══════════════════════════════════════════════════════════════
   IMAGE DATA — toutes les photos, toutes visibles
   ═══════════════════════════════════════════════════════════════ */

const IMAGES = {
    trio: '/images/histoire/trio.jpeg',
    martinique: '/images/histoire/rencontre-martinique.jpeg',
    nathalie: '/images/histoire/nathalie-social.jpeg',
    georges1: '/images/histoire/georges-1.jpeg',
    georges2: '/images/histoire/georges-2.jpeg',
    georgesPresident: '/images/histoire/georges-president.jpeg',
    presentation: '/images/histoire/presentation.jpeg',
    benin: '/images/histoire/rencontre-benin.jpeg',
    beninPresident: '/images/histoire/rencontre-benin-president.jpeg',
    talon: '/images/histoire/talon.jpeg',
    integreCauses: '/images/histoire/integre-causes.jpeg',
    logo: '/images/histoire/logo.jpeg',
    attestationDebut: '/images/histoire/attestation-debut.jpeg',
    attestation1: '/images/histoire/attestation-1.jpeg',
    attestation2: '/images/histoire/attestation-2.jpeg',
    attestation3: '/images/histoire/attestation-3.jpeg',
    attestation4: '/images/histoire/attestation-4.jpeg',
    attestation5: '/images/histoire/attestation-5.jpeg',
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════════════ */

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.9, ease: 'easeOut' as const }
    }
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1, ease: 'easeOut' as const }
    }
}

/* ═══════════════════════════════════════════════════════════════
   HERO — PARALLAX "APPLE STYLE" (fond blanc + photo plein cadre)
   ═══════════════════════════════════════════════════════════════ */

function HeroSection() {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start']
    })
    const yImage = useTransform(scrollYProgress, [0, 1], [0, 150])
    const opacityContent = useTransform(scrollYProgress, [0, 0.6], [1, 0])

    return (
        <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
            {/* Image en Parallax derrière */}
            <motion.div
                style={{ y: yImage }}
                className="absolute inset-0 z-0"
            >
                <Image
                    src={IMAGES.trio}
                    alt="Nathalie Riffert Germany, Georges-Emmanuel Germany et S.E.M. Patrice Talon"
                    fill
                    className="object-cover object-top"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white" />
            </motion.div>

            {/* Texte Central */}
            <motion.div
                style={{ opacity: opacityContent }}
                className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-32"
            >
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                >
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#008751]/10 text-[#008751] font-black text-xs uppercase tracking-[0.3em] mb-8">
                        <Sparkles className="w-4 h-4" /> Notre Histoire
                    </span>
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0.2}
                    className="text-4xl sm:text-5xl md:text-7xl font-black font-heading tracking-tight leading-[1.05] text-gray-900 mb-8"
                >
                    Là où l&#39;histoire s&#39;est<br />
                    interrompue, nous<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] via-[#D4A017] to-[#E8112D]">
                        réécrivons l&#39;avenir.
                    </span>
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0.4}
                    className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-light mb-12"
                >
                    Retour GAGNANT Bénin n'est pas qu'une agence. C'est le pont d'or jeté entre un passé retrouvé et un avenir à construire. Notre mission : transformer chaque retour en un succès éclatant.
                </motion.p>

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0.6}
                    className="flex flex-col items-center gap-3"
                >
                    <a href="#chapitre-1" className="group flex items-center gap-2 text-[#008751] font-bold text-sm uppercase tracking-widest hover:gap-4 transition-all">
                        <T>Découvrir notre épopée</T>
                        <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                    </a>
                </motion.div>
            </motion.div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CHAPITRE 1 — LA RENCONTRE HISTORIQUE
   ═══════════════════════════════════════════════════════════════ */

function ChapitreRencontre() {
    const imgRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: imgRef,
        offset: ['start end', 'end start']
    })
    const yParallax = useTransform(scrollYProgress, [0, 1], [-40, 40])

    return (
        <section id="chapitre-1" className="relative bg-[#FAFBFC] py-24 md:py-40 overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">

                {/* En-tête du chapitre */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    className="mb-20"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre I</span>
                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 leading-tight mt-4">
                        Une rencontre,<br />
                        une vision,<br />
                        <span className="text-[#008751]">une loi historique.</span>
                    </h2>
                </motion.div>

                {/* Grille Texte + Image */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

                    {/* Bloc texte */}
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        custom={0.2}
                        className="space-y-8"
                    >
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Tout commence par une détermination inébranlable. <strong className="text-gray-900">Nathalie RIFFERT GERMANY</strong>, femme engagée et passionnée, a porté en elle le rêve d'un retour au pays <em>après 400 ans d'absence</em>. Ce rêve est devenu réalité grâce à une rencontre décisive.
                        </p>

                        {/* Encart Doré */}
                        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-[#008751]/5 to-[#D4A017]/5 border border-[#D4A017]/15">
                            <div className="absolute top-0 left-8 w-12 h-1 bg-gradient-to-r from-[#008751] to-[#D4A017] rounded-full" />
                            <p className="text-gray-800 text-lg leading-relaxed mt-2">
                                <strong className="text-[#008751]">Le 13 décembre 2023, en Martinique</strong> — un dialogue historique s'est noué entre trois acteurs majeurs : Georges-Emmanuel GERMANY, Nathalie RIFFERT GERMANY et le Chef de l'État béninois, <strong>S.E.M. Patrice TALON</strong>.
                            </p>
                        </div>

                        <p className="text-lg text-gray-600 leading-relaxed">
                            C'est lors de cet échange que l'idée de rendre à tous les afro-descendants leur identité originelle a pris corps. À la demande de Nathalie, cette vision s'est élargie à l'ensemble des Caraïbes.
                        </p>

                        <p className="text-xl text-gray-900 font-semibold leading-snug">
                            Aujourd'hui, le Président Patrice Talon entre dans l'histoire de l'humanité en ouvrant les bras à des milliers de frères et sœurs. Une nouvelle page s'écrit — avec lui, avec nous, et avec vous.
                        </p>
                    </motion.div>

                    {/* Bloc images empilées avec parallax */}
                    <div ref={imgRef} className="relative">
                        <motion.div
                            style={{ y: yParallax }}
                            className="space-y-6"
                        >
                            {/* Photo 1 : la rencontre en Martinique */}
                            <motion.div
                                variants={scaleIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                custom={0.1}
                                className="relative h-72 md:h-96 rounded-3xl overflow-hidden shadow-xl shadow-gray-200/60"
                            >
                                <Image
                                    src={IMAGES.martinique}
                                    alt="Première rencontre en Martinique"
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 to-transparent">
                                    <p className="text-gray-900 text-sm font-black uppercase tracking-widest">Martinique, décembre 2023</p>
                                    <p className="text-gray-500 text-xs mt-1">Là où tout a commencé</p>
                                </div>
                            </motion.div>

                            {/* Photo 2 : le trio */}
                            <motion.div
                                variants={scaleIn}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                custom={0.3}
                                className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl shadow-gray-200/60"
                            >
                                <Image
                                    src={IMAGES.georgesPresident}
                                    alt="Georges-Emmanuel et le Président Talon"
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 to-transparent">
                                    <p className="text-gray-900 text-sm font-black uppercase tracking-widest">L'Alliance du Retour</p>
                                    <p className="text-gray-500 text-xs mt-1">Georges-Emmanuel Germany & S.E.M. Patrice Talon</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CHAPITRE 2 — LE MOT DE LA FONDATRICE (Split-Screen lumineux)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreFondatrice() {
    return (
        <section className="relative bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">

                {/* Photo Nathalie — pleine hauteur, lumineuse */}
                <div className="relative h-[60vh] lg:h-auto w-full lg:sticky lg:top-0 overflow-hidden">
                    <Image
                        src={IMAGES.nathalie}
                        alt="Nathalie RIFFERT GERMANY, Fondatrice"
                        fill
                        className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-white/40 to-transparent" />

                    {/* Badge sur la photo */}
                    <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-xl shadow-lg border border-white/50">
                            <div className="w-3 h-3 rounded-full bg-[#008751]" />
                            <div>
                                <p className="text-gray-900 font-black text-sm">Nathalie RIFFERT GERMANY</p>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Fondatrice</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Texte — Le Mot de la Fondatrice */}
                <div className="flex items-center justify-center p-10 py-24 lg:p-20 xl:p-32 bg-white">
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-100px' }}
                        className="max-w-lg"
                    >
                        <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs mb-6 block">Chapitre II</span>
                        <h3 className="text-4xl md:text-5xl font-black font-heading text-gray-900 mb-10 leading-tight">
                            Le Mot de la<br />Fondatrice
                        </h3>

                        {/* Citation Prestige */}
                        <div className="relative">
                            <Quote className="absolute -top-4 -left-4 w-12 h-12 text-[#D4A017]/20" />
                            <blockquote className="text-xl md:text-2xl text-gray-700 leading-relaxed font-serif italic pl-6 border-l-4 border-[#D4A017]/30">
                                Mon souhait le plus cher est que ce retour soit une empreinte indélébile de réussite. Je me suis pleinement investie pour que chaque afro-descendant retrouve non seulement sa terre, mais aussi <strong className="text-gray-900 not-italic">sa place et sa dignité</strong>, dans le respect du &#39;vivre ensemble&#39;.
                            </blockquote>
                        </div>

                        <p className="mt-10 text-2xl font-black text-[#008751]">
                            Bonne arrivée à tous !
                        </p>

                        <div className="mt-8 flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-gray-200" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">—  Nathalie R.G.</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CHAPITRE 3 — LES VISAGES (Georges-Emmanuel + Président)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreVisages() {
    return (
        <section className="relative bg-[#FAFBFC] py-24 md:py-40 overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    className="text-center mb-20"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Les Visages</span>
                    <h2 className="text-4xl md:text-5xl font-black font-heading text-gray-900 mt-4">
                        Les architectes du <span className="text-[#008751]">changement</span>
                    </h2>
                    <p className="text-gray-500 max-w-xl mx-auto mt-6 leading-relaxed">
                        Derrière chaque grande aventure, il y a des visionnaires. Ceux qui ont transformé un rêve en projet, et un projet en réalité.
                    </p>
                </motion.div>

                {/* Grille de photos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                        { src: IMAGES.georges1, alt: 'Georges-Emmanuel GERMANY', label: 'Georges-Emmanuel GERMANY' },
                        { src: IMAGES.georges2, alt: 'Georges-Emmanuel GERMANY', label: 'Cofondateur' },
                        { src: IMAGES.presentation, alt: 'Présentation officielle', label: 'Présentation Officielle' },
                        { src: IMAGES.talon, alt: 'S.E.M. Président Patrice Talon', label: 'S.E.M. Patrice Talon' },
                    ].map((photo, i) => (
                        <motion.div
                            key={photo.alt + i}
                            variants={scaleIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            custom={i * 0.1}
                            className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 group"
                        >
                            <Image src={photo.src} alt={photo.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/95 to-transparent">
                                <p className="text-gray-900 text-xs font-black uppercase tracking-wider">{photo.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Images supplémentaires sur 2 colonnes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="relative h-72 md:h-96 rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50"
                    >
                        <Image src={IMAGES.beninPresident} alt="Rencontre au Bénin avec le Président" fill className="object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/95 to-transparent">
                            <p className="text-gray-900 text-sm font-black uppercase tracking-widest">Première visite au Bénin</p>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        custom={0.2}
                        className="relative h-72 md:h-96 rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50"
                    >
                        <Image src={IMAGES.benin} alt="Rencontre au Bénin" fill className="object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/95 to-transparent">
                            <p className="text-gray-900 text-sm font-black uppercase tracking-widest">Un ancrage profond</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CHAPITRE 4 — LE SYMBOLISME DU LOGO (fond blanc pur)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreLogo() {
    return (
        <section className="relative bg-white py-24 md:py-40 overflow-hidden">
            <div className="container mx-auto px-6 max-w-6xl">

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    className="text-center mb-24"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre III</span>
                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 mt-4 leading-tight">
                        L'Énigme du <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] to-[#D4A017]">Symbole</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg mt-6">
                        Notre logo est bien plus qu'une image. Inspiré par la ville historique de Ouidah, il raconte une histoire personnelle et collective.
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                    {/* Logo Grand Format */}
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="w-full lg:w-2/5 flex justify-center"
                    >
                        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[3rem] overflow-hidden shadow-2xl shadow-[#D4A017]/10 border border-gray-100 bg-white p-6">
                            <Image
                                src={IMAGES.logo}
                                alt="Logo Retour Gagnant Bénin"
                                fill
                                className="object-contain p-4"
                            />
                        </div>
                    </motion.div>

                    {/* Explications */}
                    <div className="w-full lg:w-3/5 space-y-8">

                        {/* 1. La Porte */}
                        <motion.div
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-50px' }}
                            custom={0.1}
                            className="flex gap-6 p-8 rounded-3xl bg-[#FAFBFC] border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#E8112D]/8 flex items-center justify-center flex-shrink-0">
                                <DoorOpen className="text-[#E8112D] w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">La Porte Sculptée</h3>
                                <p className="text-gray-500 leading-relaxed">
                                    L'accès sécurisé et facilité au Bénin d'aujourd'hui. Elle symbolise <strong className="text-gray-700">l'Accueil</strong>, <strong className="text-gray-700">la Protection</strong> et <strong className="text-gray-700">l'Authenticité</strong> — des lignes rappelant l'artisanat local, signe de respect pour nos traditions séculaires.
                                </p>
                            </div>
                        </motion.div>

                        {/* 2. L'Arbre */}
                        <motion.div
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-50px' }}
                            custom={0.3}
                            className="flex gap-6 p-8 rounded-3xl bg-[#FAFBFC] border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#008751]/8 flex items-center justify-center flex-shrink-0">
                                <TreePine className="text-[#008751] w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">L'Arbre de Vie</h3>
                                <p className="text-gray-500 leading-relaxed">
                                    La transformation de "l'Arbre de l'Oubli" en un Arbre de Vie. Il incarne <strong className="text-gray-700">la Solidité</strong>, <strong className="text-gray-700">la Prospérité</strong> et <strong className="text-gray-700">la Renaissance</strong> — la reconnexion spirituelle et physique avec la terre nourricière.
                                </p>
                            </div>
                        </motion.div>

                        {/* 3. La Signature */}
                        <motion.div
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-50px' }}
                            custom={0.5}
                            className="flex gap-6 p-8 rounded-3xl bg-[#FAFBFC] border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#D4A017]/10 flex items-center justify-center flex-shrink-0">
                                <Stamp className="text-[#D4A017] w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Notre Signature</h3>
                                <p className="text-gray-500 leading-relaxed">
                                    L'harmonie de ces symboles forme une image puissante : <strong className="text-gray-700">celle de la maison retrouvée</strong>. Choisir Retour GAGNANT, c'est choisir la stabilité, la réussite et la fierté de bâtir le Bénin moderne.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CHAPITRE 5 — GALERIE DE CONFIANCE (Attestations + Engagement)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreConfiance() {
    return (
        <section className="relative bg-[#FAFBFC] py-24 md:py-40 overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    className="text-center mb-20"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre IV</span>
                    <h2 className="text-4xl md:text-5xl font-black font-heading text-gray-900 mt-4">
                        L'appui des <span className="text-[#008751]">institutions</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto mt-6 leading-relaxed">
                        Retour Gagnant est une mission reconnue et soutenue. Chaque attestation est une pierre posée dans l'édifice de la confiance.
                    </p>
                </motion.div>

                {/* Photo d'intégration grand format */}
                <motion.div
                    variants={scaleIn}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="relative h-80 md:h-[500px] rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50 mb-10"
                >
                    <Image src={IMAGES.integreCauses} alt="Intégré dans les causes du pays" fill className="object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white/95 to-transparent">
                        <p className="text-gray-900 font-black text-lg uppercase tracking-wider">Intégré dans les causes du pays</p>
                        <p className="text-gray-500 text-sm mt-1">Un engagement validé au plus haut niveau de l'État</p>
                    </div>
                </motion.div>

                {/* Grille des Attestations */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        IMAGES.attestationDebut,
                        IMAGES.attestation1,
                        IMAGES.attestation2,
                        IMAGES.attestation3,
                        IMAGES.attestation4,
                        IMAGES.attestation5,
                    ].map((src, i) => (
                        <motion.div
                            key={src}
                            variants={scaleIn}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            custom={i * 0.08}
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md shadow-gray-200/40 bg-white border border-gray-100 hover:shadow-xl hover:scale-[1.03] transition-all duration-500 cursor-pointer"
                        >
                            <Image src={src} alt={`Attestation ${i + 1}`} fill className="object-cover" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CTA FINAL — L'APPEL AU RETOUR
   ═══════════════════════════════════════════════════════════════ */

function CTAFinal() {
    return (
        <section className="relative bg-white py-32 overflow-hidden">
            {/* Ligne horizontale décorative */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4A017]/30 to-transparent" />

            <div className="container mx-auto px-6 text-center max-w-3xl relative z-10">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <Sparkles className="w-10 h-10 text-[#D4A017] mx-auto mb-8" />

                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 leading-tight mb-8">
                        Une page s'écrit<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] via-[#D4A017] to-[#E8112D]">
                            avec vous.
                        </span>
                    </h2>

                    <p className="text-gray-500 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-12">
                        Choisir Retour Gagnant, c'est choisir la maison retrouvée. Rejoignez les centaines de familles qui ont fait le voyage du retour.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/rendez-vous">
                            <Button className="h-16 px-10 text-lg font-black rounded-full bg-[#008751] text-white hover:bg-[#006B41] transition-all shadow-xl shadow-[#008751]/20 hover:shadow-[#008751]/30 hover:scale-105">
                                <T>Je demande un Rendez-vous</T>
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="outline" className="h-16 px-10 text-lg font-bold rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
                                <T>Nous contacter</T>
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
   ═══════════════════════════════════════════════════════════════ */

export default function NotreHistoirePage() {
    return (
        <main className="bg-white text-gray-900 min-h-screen">
            <HeroSection />
            <ChapitreRencontre />
            <ChapitreFondatrice />
            <ChapitreVisages />
            <ChapitreLogo />
            <ChapitreConfiance />
            <CTAFinal />
        </main>
    )
}
