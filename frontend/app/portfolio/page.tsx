'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight, Phone, Mail, MapPin, Globe, ChevronRight } from 'lucide-react'

// --- 🌐 Interaction Card (Glassmorphism & 3D Tilt) ---------------------------
interface InteractionCardProps {
    children: React.ReactNode;
    href: string;
    isPrimary?: boolean;
    delay?: number;
}

const InteractionCard = ({ children, href, isPrimary = false, delay = 0 }: InteractionCardProps) => {
    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
                group relative flex w-full max-w-sm mx-auto items-center justify-between p-4 rounded-3xl transition-all duration-500 overflow-hidden
                ${isPrimary
                    ? 'bg-gradient-to-r from-[#008751] to-[#006b40] text-white shadow-[0_0_40px_rgba(0,135,81,0.4)] border border-white/20'
                    : 'bg-white/5 backdrop-blur-xl text-white shadow-2xl border border-white/10 hover:border-white/20 hover:bg-white/10'
                }
            `}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 w-full">
                {children}
            </div>
            <div className={`
                p-3 rounded-2xl transition-all duration-300 relative z-10
                ${isPrimary ? 'bg-white/20 group-hover:bg-white/30' : 'bg-white/5 group-hover:bg-[#008751] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(0,135,81,0.5)]'}
            `}>
                <ArrowUpRight className={`w-5 h-5 ${isPrimary ? 'text-white' : 'text-gray-400 group-hover:text-white'} transition-colors`} />
            </div>
        </motion.a>
    )
}

// --- 🎥 Composant Principal -----------------------------------------
export default function PortfolioImmersivePage() {
    const [isLoaded, setIsLoaded] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    // Parallax background map
    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
    const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0.15, 0.05])

    useEffect(() => {
        setIsLoaded(true)
    }, [])

    const services = [
        { id: '01', title: "Nationalité Béninoise", desc: "Dossiers Afro-descendants", color: "from-[#008751] to-[#00a664]" },
        { id: '02', title: "Citoyenneté & Démarches", desc: "Identité, Passeport, Visas", color: "from-white/10 to-white/5" },
        { id: '03', title: "Investissement Immobilier", desc: "Terrains, Maisons, Projets", color: "from-[#FCD116] to-[#fde047]" },
        { id: '04', title: "Création d'Entreprise", desc: "Accompagnement Affaires", color: "from-white/10 to-white/5" },
        { id: '05', title: "Conseil Juridique", desc: "Succession, Notariat", color: "from-[#E8112D] to-[#f43f5e]" },
        { id: '06', title: "Logistique du Retour", desc: "Déménagement International", color: "from-white/10 to-white/5" },
    ]

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FCD116] selection:text-black overflow-x-hidden pt-10 pb-24">

            <style jsx global>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .mesh-gradient {
                    background-image: 
                        radial-gradient(at 0% 0%, rgba(0, 135, 81, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(252, 209, 22, 0.08) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(232, 17, 45, 0.08) 0px, transparent 50%);
                }
            `}</style>

            {/* --- Arrière-plan Cinématique -------------------------------- */}
            <motion.div
                style={{ y: bgY, opacity: bgOpacity }}
                className="fixed inset-0 z-0 pointer-events-none w-full h-full"
            >
                {/* Une carte topographique ou pattern subtil en SVG peut être ajouté ici. Pour l'instant on utilise le mesh global */}
                <div className="absolute inset-0 mesh-gradient" />
            </motion.div>

            {/* Grille de fond texturée */}
            <div className="fixed inset-0 z-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

            <div className="relative z-10 max-w-md mx-auto w-full px-5 flex flex-col justify-center">

                {/* --- Logo & Splash --------------------------------------- */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, filter: "blur(20px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center mb-10 pt-8"
                >
                    <div className="relative w-32 h-32 mb-6 group">
                        {/* Halos lumineux derrière le logo */}
                        <div className="absolute -inset-4 bg-gradient-to-tr from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 animate-pulse" />

                        <div className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl p-1.5 transform group-hover:scale-105 transition-transform duration-500 ring-1 ring-white/20">
                            <Image
                                src="/logo.jpg"
                                alt="Logo RGB"
                                fill
                                className="object-cover rounded-[1.6rem]"
                                priority
                            />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white leading-tight text-center uppercase drop-shadow-2xl">
                        Retour Gagnant
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#008751]" />
                        <span className="text-sm font-black tracking-[0.4em] text-[#008751] uppercase drop-shadow-[0_0_10px_rgba(0,135,81,0.5)]">
                            Bénin
                        </span>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#008751]" />
                    </div>
                </motion.div>

                {/* --- Slogan Cinematic ---------------------------------------- */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    className="text-center mb-10 relative"
                >
                    <h2 className="text-lg md:text-xl font-medium text-white/90 leading-relaxed max-w-[320px] mx-auto">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">L&apos;Agence d&apos;Accompagnement à la Nationalité</span><br />
                        <span className="text-[#FCD116] drop-shadow-[0_0_20px_rgba(252,209,22,0.3)]">et au Retour des Afro-descendants</span>
                    </h2>

                    {/* Séparateur design */}
                    <div className="mt-8 flex justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#008751]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FCD116]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E8112D]" />
                    </div>
                </motion.div>

                {/* --- Liens d'Action Rapide (Links) ------------------------- */}
                <div className="flex flex-col gap-4 mb-14 w-full px-2">
                    {/* Site Web */}
                    <InteractionCard href="/" isPrimary delay={0.4}>
                        <div className="p-3.5 bg-black/20 rounded-xl backdrop-blur-md">
                            <Globe className="w-6 h-6 text-[#FCD116]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-lg text-white tracking-wide">Accéder au site</span>
                            <span className="text-white/70 text-sm font-medium">Explorer notre plateforme</span>
                        </div>
                    </InteractionCard>

                    {/* WhatsApp 1 */}
                    <InteractionCard href="https://wa.me/2290160322121" delay={0.5}>
                        <div className="p-3.5 bg-[#008751]/10 border border-[#008751]/20 rounded-xl">
                            <Phone className="w-6 h-6 text-[#008751]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-white text-lg tracking-wide">Contactez-nous</span>
                            <span className="text-gray-400 text-sm font-medium">+229 01 60 32 21 21</span>
                        </div>
                    </InteractionCard>

                    {/* WhatsApp 2 */}
                    <InteractionCard href="https://wa.me/2290194355050" delay={0.6}>
                        <div className="p-3.5 bg-[#008751]/10 border border-[#008751]/20 rounded-xl">
                            <Phone className="w-6 h-6 text-[#00a664]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-white text-lg tracking-wide">Assistance Rapide</span>
                            <span className="text-gray-400 text-sm font-medium">+229 01 94 35 50 50</span>
                        </div>
                    </InteractionCard>

                    {/* Email */}
                    <InteractionCard href="mailto:contact@retourgagnantbenin.bj" delay={0.7}>
                        <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl">
                            <Mail className="w-6 h-6 text-white/80" />
                        </div>
                        <div className="flex flex-col text-left w-full overflow-hidden">
                            <span className="font-bold text-white text-lg tracking-wide">E-mail Officiel</span>
                            <span className="text-gray-400 text-sm font-medium truncate w-full">contact@retourgagnantbenin.bj</span>
                        </div>
                    </InteractionCard>
                </div>

                {/* --- Services (Mobile-first List) ---------------------------- */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                    className="w-full px-2"
                >
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                        <span className="flex-1 h-[1px] bg-white/10"></span>
                        Nos Prestations
                        <span className="flex-1 h-[1px] bg-white/10"></span>
                    </h3>

                    <div className="space-y-3">
                        {services.map((service, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-default"
                            >
                                <div className={`w-12 h-12 flex-shrink-0 rounded-[1rem] bg-gradient-to-br ${service.color} flex items-center justify-center font-black text-sm text-[#050505] shadow-lg`}>
                                    {service.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-base truncate">{service.title}</h4>
                                    <p className="text-xs text-gray-400 font-medium truncate">{service.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* --- Addresse / Footer Mobile -------------------------------- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="mt-16 text-center"
                >
                    <div className="inline-flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <MapPin className="w-4 h-4 text-[#E8112D]" />
                        <span className="font-medium text-sm text-gray-300">Haie Vive, Cotonou, Bénin</span>
                    </div>

                    <p className="mt-8 text-[10px] text-gray-500 uppercase tracking-widest font-black">
                        © {new Date().getFullYear()} Retour Gagnant
                    </p>
                </motion.div>

            </div>
        </div>
    )
}
