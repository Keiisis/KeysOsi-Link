'use client'

import React, { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, Mail, MapPin, ArrowUpRight, Globe } from 'lucide-react'

// --- 🪄 Effet Bouton Magnétique -----------------------------------------------
interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    href?: string;
    onClick?: () => void;
    asLink?: boolean;
}

const MagneticButton = ({ children, className, href, onClick, asLink = false }: MagneticButtonProps) => {
    const ref = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    const handleMouse = (e: React.MouseEvent) => {
        const { clientX, clientY } = e
        const { height, width, left, top } = ref.current!.getBoundingClientRect()
        const middleX = clientX - (left + width / 2)
        const middleY = clientY - (top + height / 2)
        setPosition({ x: middleX * 0.2, y: middleY * 0.2 })
    }

    const reset = () => {
        setPosition({ x: 0, y: 0 })
    }

    const { x, y } = position

    const content = (
        <motion.div
            style={{ position: 'relative' }}
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x, y }}
            transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
            className={`cursor-pointer ${className}`}
            onClick={onClick}
        >
            {children}
        </motion.div>
    )

    if (asLink && href) {
        return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>
    }

    return href && !asLink ? <Link href={href}>{content}</Link> : content
}

// --- 🃏 Carte Service 3D (Hover Tilt) -----------------------------------------
const ServiceCard = ({ index, title, subtitle }: { index: number, title: string, subtitle: string }) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [rotateX, setRotateX] = useState(0)
    const [rotateY, setRotateY] = useState(0)

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return
        const card = cardRef.current
        const box = card.getBoundingClientRect()
        const x = e.clientX - box.left
        const y = e.clientY - box.top
        const centerX = box.width / 2
        const centerY = box.height / 2
        const rotateXPitched = ((y - centerY) / centerY) * -10
        const rotateYPitched = ((x - centerX) / centerX) * 10

        setRotateX(rotateXPitched)
        setRotateY(rotateYPitched)
    }

    const handleMouseLeave = () => {
        setRotateX(0)
        setRotateY(0)
    }

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ rotateX, rotateY }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            className="relative h-full w-full rounded-3xl"
        >
            <div
                style={{ transform: 'translateZ(30px)' }}
                className="absolute inset-0 bg-white/[0.03] rounded-3xl border border-white/10 backdrop-blur-md transition-colors group-hover:bg-white/[0.05]"
            />
            <div className="relative p-8 md:p-10 h-full flex flex-col justify-end min-h-[300px]" style={{ transform: 'translateZ(60px)' }}>
                <span className="text-[#008751] font-mono font-bold text-lg mb-4 opacity-80">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-tight">
                    {title}
                </h3>
                <p className="text-gray-400 mt-2 font-medium">
                    {subtitle}
                </p>

                <div className="mt-8 overflow-hidden">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        whileHover={{ x: 0, opacity: 1 }}
                        className="flex items-center text-[#FCD116] gap-2 font-semibold"
                    >
                        Explorer <ArrowRight className="w-5 h-5" />
                    </motion.div>
                </div>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100 rounded-3xl shadow-[0_0_80px_rgba(0,135,81,0.15)] pointer-events-none" />
        </motion.div>
    )
}

// --- 🌐 Composant Principal Portfolio -----------------------------------------
export default function PortfolioPage() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    // Parallax values
    const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
    const heroY = useTransform(springScroll, [0, 1], ["0%", "50%"])
    const heroOpacity = useTransform(springScroll, [0, 0.2], [1, 0])

    const introY = useTransform(springScroll, [0.1, 0.3], ["20%", "0%"])
    const introOpacity = useTransform(springScroll, [0.1, 0.25], [0, 1])

    const services = [
        { title: "NATIONALITÉ BÉNINOISE", subtitle: "Dossiers Afro-descendants" },
        { title: "CITOYENNETÉ & DÉMARCHES", subtitle: "Identité, Passeport" },
        { title: "INVESTISSEMENT IMMOBILIER", subtitle: "Terrains, Maisons, Projets" },
        { title: "CRÉATION D’ENTREPRISE", subtitle: "Affaires & Implantation" },
        { title: "CONSEIL JURIDIQUE", subtitle: "Succession, Notariat" },
        { title: "LOGISTIQUE DU RETOUR", subtitle: "Déménagement international" },
        { title: "PRODUCTION MÉDIAS", subtitle: "Reportages, Documentaires" },
        { title: "CÉRÉMONIES & ÉVÉNEMENTS", subtitle: "Accueil, Culture, Fêtes" },
    ]

    return (
        <div ref={containerRef} className="relative bg-[#050505] min-h-screen text-white selection:bg-[#008751] selection:text-white overflow-hidden">

            {/* --- Navigation / Header --------------------------------------- */}
            <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 md:py-8 backdrop-blur-xl bg-black/20 border-b border-white/5"
            >
                <div className="flex items-center gap-4">
                    <Image
                        src="/logo.jpg"
                        alt="Logo RGB"
                        width={48}
                        height={48}
                        className="rounded-xl ring-2 ring-white/10"
                    />
                    <div className="flex flex-col">
                        <span className="text-lg font-bold tracking-tight text-white leading-tight">
                            Retour Gagnant
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[#008751] uppercase">
                            Bénin
                        </span>
                    </div>
                </div>

                <MagneticButton href="/">
                    <div className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-colors text-sm font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#FCD116]" />
                        <span className="hidden sm:inline">Aller sur le site</span>
                    </div>
                </MagneticButton>
            </motion.header>

            {/* --- Orbes Lumineuses Décoratives ------------------------------ */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#008751] blur-[150px] opacity-20 pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#FCD116] blur-[150px] opacity-10 pointer-events-none" />
            <div className="fixed top-[40%] right-[-20%] w-[30%] h-[50%] rounded-[100%] bg-[#E8112D] blur-[180px] opacity-[0.08] pointer-events-none" />

            {/* --- Hero Section ---------------------------------------------- */}
            <motion.section
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative h-screen flex flex-col items-center justify-center px-6 pt-20"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, filter: 'blur(20px)' }}
                    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl mx-auto text-center"
                >
                    <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#008751] to-[#FCD116]">
                            L&apos;Expertise à votre service
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                        L’Agence d’Accompagnement<br />
                        <span className="text-[#008751] drop-shadow-[0_0_30px_rgba(0,135,81,0.3)]">
                            à la Nationalité
                        </span><br />
                        <span className="text-white">
                            et au Retour des<br />
                            Afro-descendants.
                        </span>
                    </h1>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-12 flex flex-col items-center gap-4 text-white/40"
                >
                    <span className="text-xs font-semibold tracking-widest uppercase">Découvrir</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
                </motion.div>
            </motion.section>

            {/* --- Présentation / About Section ------------------------------ */}
            <section className="relative z-10 py-32 md:py-48 px-6">
                <motion.div
                    style={{ y: introY, opacity: introOpacity }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium leading-tight md:leading-tight text-white/90">
                        Retour Gagnant Bénin (RGB) est l&apos;agence de référence dédiée à l&apos;accompagnement stratégique de la <span className="text-[#FCD116]">diaspora historique</span>.
                    </h2>
                    <p className="mt-10 text-xl md:text-2xl text-white/50 leading-relaxed font-light">
                        Nous transformons votre désir de retour en une réalité sereine et sécurisée.
                        De l&apos;obtention de la nationalité béninoise à votre installation immobilière et entrepreneuriale,
                        nous garantissons un <span className="text-white font-medium border-b border-[#008751] pb-1">ancrage digne</span> sur la terre de vos ancêtres.
                    </p>
                </motion.div>
            </section>

            {/* --- Services / Expertises ------------------------------------- */}
            <section className="relative z-10 py-24 md:py-32 px-6 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">Nos Services</h2>
                            <p className="text-lg text-white/50 mt-4 max-w-xl">L&apos;excellence opérationnelle pour faciliter chaque étape de votre retour sur le continent.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {services.map((service, idx) => (
                            <ServiceCard key={idx} index={idx} title={service.title} subtitle={service.subtitle} />
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Call to Action & Contacts --------------------------------- */}
            <section className="relative z-10 py-32 md:py-48 px-6">
                <div className="max-w-6xl mx-auto flex flex-col items-center text-center">

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-12">
                        Prêt à<br />sauter le pas ?
                    </h1>

                    <MagneticButton href="/">
                        <div className="group relative px-10 py-6 rounded-full bg-white text-black font-bold text-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                            <span className="relative z-10 flex items-center gap-3">
                                Accéder à notre plateforme <ArrowUpRight className="w-6 h-6 group-hover:rotate-45 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#008751] to-[#FCD116] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <span className="absolute inset-0 z-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
                                Accéder à notre plateforme <ArrowUpRight className="w-6 h-6 group-hover:rotate-45 transition-transform" />
                            </span>
                        </div>
                    </MagneticButton>

                    <div className="mt-32 w-full grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-white/10 text-left">

                        {/* Whatsapp Contacts */}
                        <div className="flex flex-col gap-6">
                            <span className="text-white/40 text-sm font-bold tracking-widest uppercase">Assistance WhatsApp</span>

                            <MagneticButton asLink href="https://wa.me/2290160322121">
                                <div className="group flex items-center gap-4 text-2xl md:text-3xl font-light text-white hover:text-[#008751] transition-colors">
                                    <Phone className="w-6 h-6 text-[#008751]" />
                                    <span>+229 01 60 32 21 21</span>
                                </div>
                            </MagneticButton>

                            <MagneticButton asLink href="https://wa.me/2290194355050">
                                <div className="group flex items-center gap-4 text-2xl md:text-3xl font-light text-white w-fit hover:text-[#008751] transition-colors">
                                    <Phone className="w-6 h-6 text-[#008751]" />
                                    <span>+229 01 94 35 50 50</span>
                                </div>
                            </MagneticButton>
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-6">
                            <span className="text-white/40 text-sm font-bold tracking-widest uppercase">Contact Email</span>

                            <MagneticButton asLink href="mailto:contact@retourgagnant.bj">
                                <div className="group flex items-center gap-4 text-2xl md:text-3xl font-light text-white w-fit hover:text-[#FCD116] transition-colors">
                                    <Mail className="w-6 h-6 text-[#FCD116]" />
                                    <span className="truncate">contact@retourgagnant.bj</span>
                                </div>
                            </MagneticButton>
                        </div>

                        {/* Adresse */}
                        <div className="flex flex-col gap-6">
                            <span className="text-white/40 text-sm font-bold tracking-widest uppercase">Siège de l&apos;Agence</span>

                            <div className="flex items-start gap-4 text-xl md:text-2xl font-light text-white/80 leading-snug">
                                <MapPin className="w-6 h-6 text-[#E8112D] flex-shrink-0 mt-1" />
                                <span>
                                    Haie Vive, Cotonou,<br />
                                    République du Bénin
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- Footer Minimal -------------------------------------------- */}
            <footer className="py-8 text-center text-white/30 text-sm border-t border-white/5">
                <p>&copy; {new Date().getFullYear()} Retour Gagnant Bénin. Tous droits réservés.</p>
            </footer>

        </div>
    )
}
