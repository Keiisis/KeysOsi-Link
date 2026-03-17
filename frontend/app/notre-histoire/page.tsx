'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Heart, Shield, Anchor, Leaf, Key, MapPin, CheckCircle, Handshake, ArrowRight, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation, T } from '@/lib/translation'

// ——————————————————————————————————————————————————————————————————————————
// COMPOSANTS SCROLLYTELLING & PARALLAX
// ——————————————————————————————————————————————————————————————————————————

function CinematicHero() {
    const ref = useRef(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start']
    })
    
    const yText = useTransform(scrollYProgress, [0, 1], [0, 300])
    const opacityText = useTransform(scrollYProgress, [0, 0.8], [1, 0])
    const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.1])
    
    return (
        <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
            {/* Image de fond en parallaxe */}
            <motion.div 
                style={{ scale: scaleBg }}
                className="absolute inset-0 z-0"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
                <Image 
                    src="/images/histoire/trio.jpeg" 
                    alt="Fond Histoire Retour Gagnant" 
                    fill 
                    className="object-cover object-top opacity-50"
                    priority
                />
            </motion.div>
            
            {/* Contenu principal */}
            <motion.div 
                style={{ y: yText, opacity: opacityText }}
                className="relative z-20 container mx-auto px-6 text-center pt-20"
            >
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <span className="w-12 md:w-24 h-[1px] bg-gradient-to-r from-transparent to-[#FCD116]" />
                        <span className="text-[#FCD116] font-black tracking-[0.5em] uppercase text-xs md:text-sm">
                            <T>Qui sommes-nous ?</T>
                        </span>
                        <span className="w-12 md:w-24 h-[1px] bg-gradient-to-l from-transparent to-[#FCD116]" />
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-heading tracking-tighter leading-[1.1] mb-8 text-white">
                        <T>L'Histoire de Retour GAGNANT :</T><br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]">
                            <T>La Réussite de Tous</T>
                        </span>
                    </h1>
                    
                    <p className="text-gray-300 max-w-3xl mx-auto text-lg md:text-2xl leading-relaxed font-light mb-12 drop-shadow-lg">
                        <T>Retour GAGNANT Bénin n'est pas qu'une simple agence d'accompagnement ; c'est le pont d'or jeté entre un passé retrouvé et un avenir à construire.</T>
                    </p>
                    
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-3 text-white/50"
                    >
                        <span className="text-xs uppercase tracking-widest font-black"><T>Découvrir notre épopée</T></span>
                        <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
                    </motion.div>
                </motion.div>
            </motion.div>
        </section>
    )
}

function HistoricalMeeting() {
    return (
        <section className="relative bg-[#05080a] py-32 overflow-hidden">
            {/* Glow décoratif */}
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#008751]/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#E8112D]/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                    
                    {/* Bloc Texte */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="space-y-10"
                    >
                        <div>
                            <span className="text-[#008751] font-black uppercase tracking-[0.3em] text-xs mb-4 block">Chapitre I</span>
                            <h2 className="text-4xl md:text-5xl font-black font-heading text-white leading-tight">
                                <T>Une Rencontre,</T><br/>
                                <T>Une Vision,</T><br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD116] to-[#E8112D]">
                                    <T>Une Loi Historique</T>
                                </span>
                            </h2>
                        </div>
                        
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed font-light">
                            <p>
                                <T>Tout commence par une détermination inébranlable. Nathalie RIFFERT GERMANY, femme engagée et passionnée, a porté en elle le rêve d'un retour au pays après 400 ans d'absence. Ce rêve est devenu réalité grâce à une rencontre décisive.</T>
                            </p>
                            
                            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#008751] via-[#FCD116] to-[#E8112D]" />
                                <p className="text-white">
                                    <strong className="text-[#FCD116] font-black tracking-wide">Le 13 décembre 2023, en Martinique</strong><br/><br/>
                                    <T>Un dialogue historique s'est noué entre trois acteurs majeurs : Georges-Emmanuel GERMANY, Nathalie RIFFERT GERMANY et le Chef de l'État béninois, S.E.M. Patrice TALON.</T>
                                </p>
                            </div>
                            
                            <p>
                                <T>C'est lors de cet échange que l'idée de rendre à tous les afro-descendants leur identité originelle a pris corps. À la demande de Nathalie, cette vision s'est élargie à l'ensemble des Caraïbes. Aujourd'hui, le Président Patrice Talon entre dans l'histoire de l'humanité en ouvrant les bras à des milliers de frères et sœurs. Une nouvelle page s'écrit avec lui, avec nous, et avec vous.</T>
                            </p>
                        </div>
                    </motion.div>
                    
                    {/* Colonne Images avec Parallax Soft */}
                    <div className="relative h-[600px] md:h-[800px] w-full">
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="absolute top-0 right-0 w-[80%] h-[60%] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                        >
                            <Image 
                                src="/images/histoire/rencontre-martinique.jpeg" 
                                alt="Rencontre en Martinique"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#05080a]/80 to-transparent" />
                            <p className="absolute bottom-4 left-6 text-white/70 text-sm font-bold tracking-widest uppercase">Martinique, 2023</p>
                        </motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="absolute bottom-10 left-0 w-[70%] h-[50%] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
                        >
                            <Image 
                                src="/images/histoire/trio.jpeg" 
                                alt="Georges, Nathalie et le Président Talon"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#05080a]/90 via-[#05080a]/20 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <p className="text-[#FCD116] text-xs font-black tracking-widest uppercase mb-1">Acteurs Majeurs</p>
                                <p className="text-white text-sm font-medium leading-snug">S.E.M Patrice Talon, Nathalie Riffert Germany & Georges-Emmanuel Germany</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function FounderWord() {
    return (
        <section className="relative bg-black py-0">
            {/* Effet Cinémascope (Image Fixe, texte scroll par-dessus) */}
            <div className="grid grid-cols-1 lg:grid-cols-2">
                
                <div className="relative h-[50vh] lg:h-screen w-full lg:sticky lg:top-0">
                    <Image 
                        src="/images/histoire/nathalie-social.jpeg" 
                        alt="Nathalie RIFFERT GERMANY"
                        fill
                        className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black via-black/50 to-transparent" />
                    
                    <div className="absolute bottom-10 left-10 hidden lg:block">
                        <p className="text-white font-black text-4xl mb-2">Nathalie RIFFERT GERMANY</p>
                        <p className="text-[#FCD116] font-bold uppercase tracking-widest text-sm">Fondatrice</p>
                    </div>
                </div>
                
                <div className="flex items-center justify-center p-10 py-32 lg:p-32 bg-black relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1 }}
                        className="max-w-xl"
                    >
                        <span className="text-[#E8112D] font-black uppercase tracking-[0.3em] text-xs mb-8 block">Chapitre II</span>
                        <h3 className="text-4xl md:text-5xl font-black font-heading text-white mb-12">Le Mot de la Fondatrice</h3>
                        
                        <div className="relative">
                            <span className="absolute -top-16 -left-12 text-[#333] text-[150px] font-serif leading-none select-none">"</span>
                            <p className="text-2xl md:text-3xl font-serif text-gray-200 leading-snug italic relative z-10">
                                Mon souhait le plus cher est que ce retour soit une empreinte indélébile de réussite. Je me suis pleinement investie pour que chaque afro-descendant retrouve non seulement sa terre, mais aussi sa place et sa dignité, dans le respect du 'vivre ensemble'.<br/><br/>
                                <strong className="text-[#FCD116] not-italic">Bonne arrivée à tous !</strong>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

function LogoSymbolism() {
    return (
        <section className="relative bg-[#0a0f18] py-32 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCD116]/5 rounded-full blur-[200px] pointer-events-none" />
            
            <div className="container mx-auto px-6 max-w-7xl relative z-10 text-center mb-20">
                <span className="text-[#FCD116] font-black uppercase tracking-[0.3em] text-xs mb-4 block">Chapitre III</span>
                <h2 className="text-4xl md:text-6xl font-black font-heading text-white mb-6">
                    <T>Identité & Symbolisme</T>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Le logo de Retour GAGNANT Bénin est bien plus qu'une image ; c'est un emblème de confiance et d'ancrage profond. Inspiré par la ville historique de Ouidah, il raconte une force puisée dans les racines du Bénin.
                </p>
            </div>

            <div className="container mx-auto px-6 max-w-6xl relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    
                    {/* Le Logo en Grand au centre/gauche */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="w-full lg:w-1/2 flex justify-center"
                    >
                        <div className="relative w-64 h-64 md:w-96 md:h-96 rounded-full overflow-hidden shadow-[0_0_100px_rgba(252,209,22,0.15)] border-4 border-[#FCD116]/20 bg-white">
                            <Image 
                                src="/images/histoire/logo.jpeg" 
                                alt="Logo Retour Gagnant"
                                fill
                                className="object-contain p-8"
                            />
                        </div>
                    </motion.div>
                    
                    {/* Explications qui défilent */}
                    <div className="w-full lg:w-1/2 space-y-12">
                        
                        <motion.div 
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-[#E8112D]/10 flex items-center justify-center">
                                    <Key className="text-[#E8112D] w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white font-heading">1. La Porte Sculptée</h3>
                            </div>
                            <p className="text-gray-400 leading-relaxed">
                                Contrairement à la porte du passé, celle-ci représente l’accès sécurisé et facilité au Bénin d'aujourd'hui. Elle symbolise <strong>L’Accueil</strong>, <strong>La Protection</strong>, et <strong>L’Authenticité</strong> de notre artisanat local, signe de respect pour nos traditions séculaires.
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center">
                                    <Leaf className="text-[#008751] w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white font-heading">2. L’Arbre de Vie</h3>
                            </div>
                            <p className="text-gray-400 leading-relaxed">
                                Près de la porte se dresse un arbre majestueux, symbole de la transformation de "l'Arbre de l'Oubli" en un Arbre de Vie. Il incarne <strong>La Solidité</strong>, <strong>La Prospérité</strong> et <strong>La Renaissance</strong> physique et spirituelle.
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-[#FCD116]/10 flex items-center justify-center">
                                    <Stamp className="text-[#FCD116] w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white font-heading">3. Notre Signature</h3>
                            </div>
                            <p className="text-gray-400 leading-relaxed">
                                L'harmonie de ces symboles forme une image puissante : celle de la maison retrouvée. Choisir Retour GAGNANT, c'est choisir la stabilité, la réussite et la fierté de participer à la construction du Bénin moderne.
                            </p>
                        </motion.div>

                    </div>
                </div>
            </div>
        </section>
    )
}

function Stamp({ className }: { className?: string }) {
    return <CheckCircle className={className} />
}

function TrustGallery() {
    return (
        <section className="relative bg-black py-32 overflow-hidden border-t border-white/5">
            <div className="container mx-auto px-6 max-w-7xl text-center mb-16 relative z-10">
                <span className="text-white/50 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Chapitre IV</span>
                <h2 className="text-4xl md:text-5xl font-black font-heading text-white mb-6">
                    L'Appui des <span className="text-[#008751]">Institutions</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-16">
                    Une intégration profondément validée et reconnue par l'État pour garantir votre sécurité.
                </p>

                {/* Grille Mosaïque de Confiance */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-max">
                    <motion.div initial={{opacity:0, scale:0.9}} whileInView={{opacity:1, scale:1}} viewport={{once:true}} transition={{duration:0.5}} className="col-span-2 row-span-2 relative h-64 md:h-96 rounded-3xl overflow-hidden group">
                        <Image src="/images/histoire/integre-causes.jpeg" alt="Intégré dans les causes" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                    </motion.div>
                    <motion.div initial={{opacity:0, scale:0.9}} whileInView={{opacity:1, scale:1}} viewport={{once:true}} transition={{duration:0.5, delay:0.1}} className="relative h-32 md:h-48 rounded-3xl overflow-hidden">
                        <Image src="/images/histoire/attestation-debut.jpeg" alt="Attestation" fill className="object-cover" />
                    </motion.div>
                    <motion.div initial={{opacity:0, scale:0.9}} whileInView={{opacity:1, scale:1}} viewport={{once:true}} transition={{duration:0.5, delay:0.2}} className="relative h-32 md:h-48 rounded-3xl overflow-hidden">
                        <Image src="/images/histoire/attestation-1.jpeg" alt="Attestation" fill className="object-cover" />
                    </motion.div>
                    <motion.div initial={{opacity:0, scale:0.9}} whileInView={{opacity:1, scale:1}} viewport={{once:true}} transition={{duration:0.5, delay:0.3}} className="relative h-32 md:h-48 rounded-3xl overflow-hidden">
                        <Image src="/images/histoire/georges-1.jpeg" alt="Georges-Emmanuel" fill className="object-cover object-top" />
                    </motion.div>
                    <motion.div initial={{opacity:0, scale:0.9}} whileInView={{opacity:1, scale:1}} viewport={{once:true}} transition={{duration:0.5, delay:0.4}} className="relative h-32 md:h-48 rounded-3xl overflow-hidden">
                        <Image src="/images/histoire/rencontre-benin.jpeg" alt="Rencontre au Bénin" fill className="object-cover" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

// ——————————————————————————————————————————————————————————————————————————
// MAIN PAGE EXPORT
// ——————————————————————————————————————————————————————————————————————————

export default function NotreHistoirePage() {
    return (
        <main className="bg-black text-white min-h-screen">
            <CinematicHero />
            <HistoricalMeeting />
            <FounderWord />
            <LogoSymbolism />
            <TrustGallery />
            
            {/* CTA Final */}
            <section className="py-32 relative overflow-hidden bg-gradient-to-b from-black to-[#05080a]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                    <div className="w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-[#FCD116]/30 to-transparent" />
                </div>
                
                <div className="container mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="max-w-3xl mx-auto"
                    >
                        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter mb-8 leading-tight">
                            Une page s'écrit avec nous...<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]">
                                et avec vous.
                            </span>
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
                            <Link href="/rendez-vous">
                                <Button className="h-16 px-10 text-lg font-black rounded-full bg-[#FCD116] text-[#0f141e] hover:bg-white transition-all shadow-xl shadow-[#FCD116]/20 hover:scale-105">
                                    <T>Je demande un Rendez-vous</T> <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </main>
    )
}
