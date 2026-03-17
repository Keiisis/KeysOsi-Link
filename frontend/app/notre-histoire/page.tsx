'use client'

import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { T } from '@/lib/translation'

/* ═══════════════════════════════════════════════════════════════
   IMAGES
   ═══════════════════════════════════════════════════════════════ */

const IMG = {
    trio: '/images/histoire/trio.jpeg',
    martinique: '/images/histoire/rencontre-martinique.jpeg',
    nathalie: '/images/histoire/nathalie-new.jpg',
    georges: '/images/histoire/georges-1.jpeg',
    talon: '/images/histoire/talon.jpeg',
    georgesPresident: '/images/histoire/georges-president.jpeg',
    logo: '/images/histoire/logo.jpeg',
    integreCauses: '/images/histoire/integre-causes.jpeg',
    attestationDebut: '/images/histoire/attestation-debut.jpeg',
    attestation1: '/images/histoire/attestation-1.jpeg',
    attestation2: '/images/histoire/attestation-2.jpeg',
    attestation3: '/images/histoire/attestation-3.jpeg',
    attestation4: '/images/histoire/attestation-4.jpeg',
    attestation5: '/images/histoire/attestation-5.jpeg',
    benin: '/images/histoire/rencontre-benin.jpeg',
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT — LIGNE DE VIE DORÉE (entre les sections)
   ═══════════════════════════════════════════════════════════════ */

function GoldenDivider() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-50px' })

    return (
        <div ref={ref} className="flex justify-center py-12">
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={isInView ? { height: 80, opacity: 1 } : {}}
                transition={{ duration: 1.2, ease: 'easeOut' as const }}
                className="w-[1px] bg-gradient-to-b from-transparent via-[#D4A017] to-transparent"
            />
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT — TYPEWRITER EFFECT
   ═══════════════════════════════════════════════════════════════ */

function TypewriterText({ text, className, delay = 0 }: { text: string, className?: string, delay?: number }) {
    const [displayed, setDisplayed] = useState('')
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true })

    useEffect(() => {
        if (!isInView) return
        let i = 0
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayed(text.slice(0, i + 1))
                    i++
                } else {
                    clearInterval(interval)
                }
            }, 35)
            return () => clearInterval(interval)
        }, delay)
        return () => clearTimeout(timer)
    }, [isInView, text, delay])

    return (
        <span ref={ref} className={className}>
            {displayed}
            {displayed.length < text.length && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="inline-block w-[2px] h-[1em] bg-[#D4A017] ml-1 align-middle"
                />
            )}
        </span>
    )
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT — COMPTEUR ANIMÉ
   ═══════════════════════════════════════════════════════════════ */

function AnimatedCounter({ target, suffix = '', label }: { target: number, suffix?: string, label: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true })

    useEffect(() => {
        if (!isInView) return
        let current = 0
        const step = target / 60
        const timer = setInterval(() => {
            current += step
            if (current >= target) {
                setCount(target)
                clearInterval(timer)
            } else {
                setCount(Math.floor(current))
            }
        }, 25)
        return () => clearInterval(timer)
    }, [isInView, target])

    return (
        <div ref={ref} className="text-center">
            <div className="text-3xl md:text-4xl font-black text-[#D4A017] font-heading">
                {count}{suffix}
            </div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{label}</div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT — TILT 3D CARD (pour attestations)
   ═══════════════════════════════════════════════════════════════ */

function TiltCard({ src, children }: { src: string, children?: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 })
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 })

    const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        x.set((e.clientX - rect.left) / rect.width - 0.5)
        y.set((e.clientY - rect.top) / rect.height - 0.5)
    }, [x, y])

    const handleLeave = useCallback(() => {
        x.set(0)
        y.set(0)
    }, [x, y])

    return (
        <motion.div
            ref={ref}
            style={{ rotateX, rotateY, transformPerspective: 800 }}
            onMouseMove={handleMouse}
            onMouseLeave={handleLeave}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-gray-200/40 bg-white border border-gray-100 cursor-pointer group"
        >
            <Image src={src} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            {children}
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — HERO CINÉMATIQUE (Reveal + Typewriter + Compteurs)
   ═══════════════════════════════════════════════════════════════ */

function HeroSection() {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start']
    })
    const yImage = useTransform(scrollYProgress, [0, 1], [0, 150])
    const opacityContent = useTransform(scrollYProgress, [0, 0.6], [1, 0])

    const [curtainLifted, setCurtainLifted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setCurtainLifted(true), 300)
        return () => clearTimeout(timer)
    }, [])

    return (
        <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
            {/* Rideau blanc qui se lève */}
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: curtainLifted ? 0 : 1 }}
                transition={{ duration: 1.8, ease: 'easeOut' as const }}
                className="absolute inset-0 bg-white z-30 pointer-events-none"
            />

            {/* Image en Parallax derrière */}
            <motion.div
                style={{ y: yImage }}
                className="absolute inset-0 z-0"
            >
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 2.5, ease: 'easeOut' as const }}
                >
                    <Image
                        src={IMG.trio}
                        alt="Nathalie Riffert Germany, Georges-Emmanuel Germany et S.E.M. Patrice Talon"
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white" />
            </motion.div>

            {/* Contenu Central */}
            <motion.div
                style={{ opacity: opacityContent }}
                className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-32"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 1.5 }}
                >
                    <span className="inline-flex items-center justify-center px-5 py-2 rounded-full border border-gray-200 bg-white/50 backdrop-blur-sm text-gray-500 font-bold text-xs uppercase tracking-[0.3em] mb-8">
                        Notre Histoire
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 2 }}
                    className="text-4xl sm:text-5xl md:text-7xl font-black font-heading tracking-tight leading-[1.05] text-gray-900 mb-8"
                >
                    <TypewriterText
                        text="Là où l'histoire s'est interrompue,"
                        delay={2200}
                    />
                    <br />
                    <span className="text-[#008751]">
                        <TypewriterText
                            text="nous réécrivons l'avenir."
                            delay={3800}
                        />
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 5.5 }}
                    className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-light mb-12"
                >
                    Retour GAGNANT B&eacute;nin n&apos;est pas qu&apos;une agence. C&apos;est le pont d&apos;or jet&eacute; entre un pass&eacute; retrouv&eacute; et un avenir &agrave; construire.
                </motion.p>

                {/* Compteurs animés */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 6 }}
                    className="flex items-center justify-center gap-12 md:gap-20 mb-16"
                >
                    <AnimatedCounter target={2023} label="Depuis" />
                    <div className="w-[1px] h-12 bg-gray-200" />
                    <AnimatedCounter target={500} suffix="+" label="Familles" />
                    <div className="w-[1px] h-12 bg-gray-200" />
                    <AnimatedCounter target={12} label="Pays" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 6.5 }}
                >
                    <motion.a
                        href="#chapitre-1"
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
                        className="inline-flex flex-col items-center gap-2 text-gray-400 hover:text-[#008751] transition-colors"
                    >
                        <span className="text-xs uppercase tracking-widest font-black">D&eacute;couvrir</span>
                        <ChevronDown className="w-5 h-5" />
                    </motion.a>
                </motion.div>
            </motion.div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — LA RENCONTRE (Sticky Scroll + Timeline dor&eacute;e)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreRencontre() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start end', 'end start']
    })
    const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

    return (
        <section id="chapitre-1" className="relative bg-[#FAFBFC] overflow-hidden">
            <div ref={containerRef} className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[200vh] relative">

                    {/* Image Sticky */}
                    <div className="hidden lg:block relative">
                        <div className="sticky top-0 h-screen flex items-center justify-center p-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, ease: 'easeOut' as const }}
                                className="relative w-full h-[80vh] overflow-hidden shadow-2xl shadow-gray-300/40 border border-gray-100"
                            >
                                <Image
                                    src={IMG.martinique}
                                    alt="Premi&egrave;re rencontre en Martinique"
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-gray-900/90 to-transparent">
                                    <p className="text-white text-sm font-black uppercase tracking-widest">Martinique &bull; D&eacute;cembre 2023</p>
                                    <p className="text-white/70 text-xs mt-1">L&agrave; o&ugrave; tout a commenc&eacute;</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Texte qui d&eacute;file + Timeline dor&eacute;e */}
                    <div className="relative py-32 lg:py-48 flex flex-col gap-24">

                        {/* Ligne dor&eacute;e anim&eacute;e */}
                        <div className="absolute left-0 lg:left-8 top-0 bottom-0 w-[1px] bg-gray-200 overflow-hidden">
                            <motion.div
                                style={{ height: lineHeight }}
                                className="w-full bg-[#D4A017]"
                            />
                        </div>

                        {/* Image mobile seulement */}
                        <div className="block lg:hidden relative h-72 overflow-hidden shadow-xl border border-gray-100 ml-8">
                            <Image src={IMG.martinique} alt="Martinique" fill className="object-cover" />
                        </div>

                        {/* Bloc texte 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8, ease: 'easeOut' as const }}
                            className="ml-8 lg:ml-16 p-8 md:p-12 bg-white border border-gray-100 shadow-xl shadow-gray-200/30"
                        >
                            <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre I</span>
                            <h2 className="text-3xl md:text-5xl font-black font-heading text-gray-900 leading-tight mt-4 mb-8">
                                Une rencontre,<br />une vision,<br />
                                <span className="text-[#008751]">une loi historique.</span>
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Tout commence par une d&eacute;termination in&eacute;branlable. <strong className="text-gray-900">Mme NATHALIE RIFFERT GERMANY</strong>, femme engag&eacute;e et passionn&eacute;e, a port&eacute; en elle le r&ecirc;ve d&apos;un retour au pays apr&egrave;s 400 ans d&apos;absence. Ce r&ecirc;ve est devenu r&eacute;alit&eacute; gr&acirc;ce &agrave; une rencontre d&eacute;cisive.
                            </p>
                        </motion.div>

                        {/* Bloc texte 2 — L&#39;encart dor&eacute; */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8, ease: 'easeOut' as const }}
                            className="ml-8 lg:ml-16 p-8 md:p-12 bg-gray-50 border-l-[3px] border-[#D4A017] shadow-xl shadow-gray-200/30"
                        >
                            <p className="text-xl text-gray-800 leading-relaxed font-serif italic">
                                Le 13 d&eacute;cembre 2023, en Martinique — un dialogue historique s&apos;est nou&eacute; entre trois acteurs majeurs : Mr GEORGES GERMANY, Mme NATHALIE RIFFERT GERMANY et le Chef de l&apos;&Eacute;tat b&eacute;ninois, <strong className="not-italic text-gray-900">S.E.M. PATRICE TALON</strong>.
                            </p>
                        </motion.div>

                        {/* Bloc texte 3 */}
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.8, ease: 'easeOut' as const }}
                            className="ml-8 lg:ml-16 p-8 md:p-12 bg-white border border-gray-100 shadow-xl shadow-gray-200/30"
                        >
                            <p className="text-lg text-gray-600 leading-relaxed mb-6">
                                C&apos;est lors de cet &eacute;change que l&apos;id&eacute;e de rendre &agrave; tous les afro-descendants leur identit&eacute; originelle a pris corps. &Agrave; la demande de Nathalie, cette vision s&apos;est &eacute;largie &agrave; l&apos;ensemble des Cara&iuml;bes.
                            </p>
                            <p className="text-xl text-gray-900 font-semibold leading-snug">
                                Aujourd&apos;hui, le Pr&eacute;sident Patrice Talon entre dans l&apos;histoire de l&apos;humanit&eacute; en ouvrant les bras &agrave; des milliers de fr&egrave;res et s&oelig;urs. Une nouvelle page s&apos;&eacute;crit — avec lui, avec nous, et avec vous.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — MOT DE LA FONDATRICE (Ken Burns + Typewriter)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreFondatrice() {
    return (
        <section className="relative bg-white border-y border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">

                {/* Photo Nathalie — Ken Burns Effect */}
                <div className="relative h-[60vh] lg:h-auto w-full lg:sticky lg:top-0 overflow-hidden border-r border-gray-100">
                    <motion.div
                        animate={{ scale: [1, 1.08, 1.04] }}
                        transition={{ duration: 24, repeat: Infinity, ease: 'linear' as const }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={IMG.nathalie}
                            alt="Mme NATHALIE RIFFERT GERMANY, Fondatrice"
                            fill
                            className="object-cover object-center"
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-gray-900/60 to-transparent" />

                    {/* Badge */}
                    <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12">
                        <div className="text-white">
                            <p className="font-black text-2xl font-heading mb-1">Mme NATHALIE RIFFERT GERMANY</p>
                            <p className="text-[#D4A017] text-xs font-bold uppercase tracking-widest">Fondatrice</p>
                        </div>
                    </div>
                </div>

                {/* Citation */}
                <div className="flex items-center justify-center p-10 py-24 lg:p-20 xl:p-32 bg-white">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 1, ease: 'easeOut' as const }}
                        className="max-w-lg"
                    >
                        <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs mb-6 block">Chapitre II</span>
                        <h3 className="text-4xl md:text-5xl font-black font-heading text-gray-900 mb-12 leading-tight">
                            Le Mot de la<br />Fondatrice
                        </h3>

                        <div className="relative">
                            <blockquote className="text-2xl text-gray-800 leading-relaxed font-serif italic border-l-[3px] border-gray-300 pl-8">
                                Mon souhait le plus cher est que ce retour soit une empreinte ind&eacute;l&eacute;bile de r&eacute;ussite. Je me suis pleinement investie pour que chaque afro-descendant retrouve non seulement sa terre, mais aussi <strong className="text-gray-900 not-italic">sa place et sa dignit&eacute;</strong>, dans le respect du vivre ensemble.
                            </blockquote>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' as const }}
                            className="mt-12 text-2xl font-black text-[#008751] font-heading"
                        >
                            Bonne arriv&eacute;e &agrave; tous !
                        </motion.p>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4 — LES ARCHITECTES (3 portraits "Magazine de Luxe")
   ═══════════════════════════════════════════════════════════════ */

function ChapitreArchitectes() {
    const portraits = [
        {
            src: IMG.talon,
            name: 'S.E.M. PATRICE TALON',
            title: 'Pr&eacute;sident de la R&eacute;publique du B&eacute;nin',
            phrase: 'Le visionnaire de l&apos;accueil',
        },
        {
            src: IMG.georges,
            name: 'Mr GEORGES GERMANY',
            title: 'Cofondateur',
            phrase: 'Le b&acirc;tisseur de ponts',
        },
        {
            src: IMG.nathalie,
            name: 'Mme NATHALIE RIFFERT GERMANY',
            title: 'Fondatrice',
            phrase: 'La flamme qui a tout allum&eacute;',
        },
    ]

    return (
        <section className="relative bg-[#FAFBFC] py-32 overflow-hidden">
            <div className="container mx-auto px-6 max-w-[1400px]">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' as const }}
                    className="text-center mb-20"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Les Visages</span>
                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 mt-4">
                        Les architectes du <span className="text-[#008751]">changement</span>
                    </h2>
                </motion.div>

                {/* 3 Portraits Pleine Hauteur avec hover reveals */}
                <div className="flex flex-col lg:flex-row gap-[1px] lg:h-[85vh] bg-gray-200 border border-gray-200">
                    {portraits.map((p, i) => (
                        <motion.div
                            key={p.name}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.2, ease: 'easeOut' as const }}
                            className="relative flex-1 h-[60vh] lg:h-full overflow-hidden group cursor-pointer bg-white"
                        >
                            {/* Photo avec parallax individuel au hover */}
                            <Image
                                src={p.src}
                                alt={p.name}
                                fill
                                className="object-cover object-top filter contrast-[1.05] group-hover:scale-105 transition-all duration-[1500ms] ease-out"
                            />

                            {/* Overlay qui slide depuis le bas au hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {/* Info qui glisse de bas en haut */}
                            <div className="absolute bottom-0 left-0 right-0 p-10 translate-y-[20%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 ease-out z-20">
                                <p className="text-[#D4A017] text-xs font-bold uppercase tracking-[0.2em] mb-3" dangerouslySetInnerHTML={{ __html: p.phrase }} />
                                <p className="text-white text-3xl font-black font-heading leading-tight mb-1">{p.name}</p>
                                <p className="text-white/80 text-sm font-medium" dangerouslySetInnerHTML={{ __html: p.title }} />
                            </div>

                            {/* Nom visible par d&eacute;faut en bas */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70 to-transparent group-hover:opacity-0 transition-opacity duration-300 z-10 flex flex-col justify-end">
                                <p className="text-white font-black text-xl drop-shadow-lg font-heading">{p.name}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 5 — LE LOGO (Logo massivement grand sans bordures)
   ═══════════════════════════════════════════════════════════════ */

function ChapitreLogo() {
    const symbols = [
        {
            title: 'La Porte Sculpt&eacute;e',
            text: "L&apos;acc&egrave;s s&eacute;curis&eacute; et facilit&eacute; au B&eacute;nin d&apos;aujourd&apos;hui. Elle symbolise l&apos;Accueil, la Protection et l&apos;Authenticit&eacute; — des lignes rappelant l&apos;artisanat local, signe de respect pour nos traditions s&eacute;culaires.",
        },
        {
            title: "L&apos;Arbre de Vie",
            text: "La transformation de &laquo;l&apos;Arbre de l&apos;Oubli&raquo; en un Arbre de Vie. Il incarne la Solidit&eacute;, la Prosp&eacute;rit&eacute; et la Renaissance — la reconnexion spirituelle et physique avec la terre nourricière.",
        },
        {
            title: 'Notre Signature',
            text: "L&apos;harmonie de ces symboles forme une image puissante : celle de la maison retrouv&eacute;e. Choisir Retour GAGNANT, c&apos;est choisir la stabilit&eacute;, la r&eacute;ussite et la fiert&eacute; de b&acirc;tir le B&eacute;nin moderne.",
        },
    ]

    return (
        <section className="relative bg-white py-32 overflow-hidden border-y border-gray-100">
            <div className="container mx-auto px-6 max-w-7xl">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' as const }}
                    className="text-center mb-24"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre III</span>
                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 mt-4 leading-tight">
                        L&apos;&Eacute;nigme du <span className="text-[#008751]">Symbole</span>
                    </h2>
                </motion.div>

                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">

                    {/* Logo Grand Format sans bordure */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: 'easeOut' as const }}
                        className="w-full lg:w-1/2 flex justify-center relative min-h-[400px]"
                    >
                        <Image
                            src={IMG.logo}
                            alt="Logo Retour Gagnant B&eacute;nin"
                            fill
                            className="object-contain"
                        />
                    </motion.div>

                    {/* Explications Textes Épurés */}
                    <div className="w-full lg:w-1/2 space-y-12">
                        {symbols.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 40 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ duration: 0.8, delay: i * 0.2, ease: 'easeOut' as const }}
                                className="pl-6 border-l-[3px] border-gray-200 hover:border-[#D4A017] transition-colors duration-500"
                            >
                                <h3 className="text-2xl font-black text-gray-900 mb-3 font-heading" dangerouslySetInnerHTML={{ __html: s.title }} />
                                <p className="text-gray-600 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: s.text }} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 6 — CONFIANCE (Carrousel Tilt 3D, pas de texte "Attestation")
   ═══════════════════════════════════════════════════════════════ */

function ChapitreConfiance() {
    const scrollRef = useRef<HTMLDivElement>(null)

    return (
        <section className="relative bg-[#FAFBFC] py-32 overflow-hidden">
            <div className="container mx-auto px-6 max-w-7xl">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' as const }}
                    className="text-center mb-20"
                >
                    <span className="text-[#D4A017] font-black uppercase tracking-[0.3em] text-xs">Chapitre IV</span>
                    <h2 className="text-4xl md:text-5xl font-black font-heading text-gray-900 mt-4">
                        L&apos;appui des <span className="text-[#008751]">institutions</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto mt-6 text-lg leading-relaxed">
                        Une mission reconnue et soutenue. Chaque document est une pierre pos&eacute;e dans l&apos;&eacute;difice de la confiance.
                    </p>
                </motion.div>

                {/* Grande Photo Engagement */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' as const }}
                    className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden mb-16"
                >
                    <Image src={IMG.integreCauses} alt="Int&eacute;gr&eacute; dans les causes du pays" fill className="object-cover object-center" />
                </motion.div>

                {/* Carrousel horizontal avec Tilt 3D */}
                <div
                    ref={scrollRef}
                    className="flex gap-8 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide items-center justify-start xl:justify-center"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {[
                        IMG.attestationDebut,
                        IMG.attestation1,
                        IMG.attestation2,
                        IMG.attestation3,
                        IMG.attestation4,
                        IMG.attestation5,
                    ].map((src, i) => (
                        <motion.div
                            key={src}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const }}
                            className="flex-shrink-0 w-64 md:w-80 snap-center"
                        >
                            <TiltCard src={src} />
                        </motion.div>
                    ))}
                </div>

                <p className="text-center text-gray-400 text-sm mt-10 font-bold tracking-widest uppercase">
                    Glissez pour d&eacute;couvrir les documents officiels
                </p>
            </div>
        </section>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CTA FINAL
   ═══════════════════════════════════════════════════════════════ */

function CTAFinal() {
    return (
        <section className="relative bg-white py-32 overflow-hidden border-t border-gray-100">
            <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' as const }}
                >
                    <h2 className="text-4xl md:text-6xl font-black font-heading text-gray-900 leading-tight mb-8">
                        Une page s&apos;&eacute;crit<br />
                        <span className="text-[#008751]">avec vous.</span>
                    </h2>

                    <p className="text-gray-500 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-16">
                        Choisir Retour Gagnant, c&apos;est choisir la maison retrouv&eacute;e. Rejoignez les centaines de familles qui ont fait le voyage du retour en toute s&eacute;curit&eacute;.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/rendez-vous">
                            <Button className="h-16 px-10 text-lg font-black rounded-none bg-[#008751] text-white hover:bg-[#006B41] transition-all">
                                <T>Je demande un Rendez-vous</T>
                                <ArrowRight className="ml-3 w-6 h-6" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="outline" className="h-16 px-10 text-lg font-black rounded-none border-gray-900 text-gray-900 hover:bg-gray-100 transition-all">
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
        <main className="bg-[#FAFBFC] text-gray-900 min-h-screen relative font-sans">
            <HeroSection />
            <GoldenDivider />
            <ChapitreRencontre />
            <GoldenDivider />
            <ChapitreFondatrice />
            <GoldenDivider />
            <ChapitreArchitectes />
            <GoldenDivider />
            <ChapitreLogo />
            <GoldenDivider />
            <ChapitreConfiance />
            <CTAFinal />
        </main>
    )
}
