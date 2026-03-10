'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight, Phone, Mail, MapPin, Globe } from 'lucide-react'

// --- 🌐 Interaction Card (Light Glassmorphism) ---------------------------
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`
                group relative flex w-full max-w-sm mx-auto items-center justify-between p-4 rounded-3xl transition-all duration-300 overflow-hidden
                ${isPrimary
                    ? 'bg-gradient-to-r from-[#008751] to-[#00a664] text-white shadow-lg shadow-[#008751]/30 border border-[#008751]'
                    : 'bg-white/60 backdrop-blur-2xl text-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 hover:bg-white/80 hover:shadow-[0_15px_40px_rgb(0,0,0,0.1)]'
                }
            `}
        >
            {/* Shimmer effect for light theme */}
            <div className={`absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent ${isPrimary ? 'via-white/20' : 'via-white/60'} to-transparent pointer-events-none`} />

            <div className="flex items-center gap-4 relative z-10 w-full">
                {children}
            </div>
            <div className={`
                p-3 rounded-2xl transition-all duration-300 relative z-10 shadow-sm
                ${isPrimary ? 'bg-white/20 text-white' : 'bg-white border border-gray-100 text-[#008751] group-hover:bg-[#008751] group-hover:text-white'}
            `}>
                <ArrowUpRight className="w-5 h-5 transition-colors" />
            </div>
        </motion.a>
    )
}

// --- 🎥 Composant Principal -----------------------------------------
export default function PortfolioImmersivePage() {
    const [isLoaded, setIsLoaded] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    // Léger effet Parallax sur les éléments de fond
    const blob1Y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
    const blob2Y = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"])

    useEffect(() => {
        setIsLoaded(true)
    }, [])

    const services = [
        { id: '01', title: "Nationalité Béninoise", desc: "Dossiers Afro-descendants", color: "from-[#008751] to-[#00a664]", text: "text-white" },
        { id: '02', title: "Citoyenneté & Démarches", desc: "Identité, Passeport, Visas", color: "from-white to-gray-50", text: "text-[#008751]" },
        { id: '03', title: "Investissement Immobilier", desc: "Terrains, Maisons, Projets", color: "from-[#FCD116] to-[#fde047]", text: "text-[#050505]" },
        { id: '04', title: "Création d'Entreprise", desc: "Accompagnement Affaires", color: "from-white to-gray-50", text: "text-[#008751]" },
        { id: '05', title: "Conseil Juridique", desc: "Succession, Notariat", color: "from-[#E8112D] to-[#f43f5e]", text: "text-white" },
        { id: '06', title: "Logistique du Retour", desc: "Déménagement International", color: "from-white to-gray-50", text: "text-[#008751]" },
    ]

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-[#008751] selection:text-white overflow-x-hidden pt-10 pb-24">

            <style jsx global>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    33% { transform: translate(30px, -50px) rotate(10deg) scale(1.1); }
                    66% { transform: translate(-20px, 20px) rotate(-5deg) scale(0.9); }
                }
                @keyframes float-medium {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    50% { transform: translate(-40px, 40px) rotate(15deg) scale(1.1); }
                }
                .mesh-gradient-light {
                    background: radial-gradient(circle at 50% -20%, rgba(0, 135, 81, 0.05) 0%, transparent 50%),
                                radial-gradient(circle at 120% 50%, rgba(252, 209, 22, 0.08) 0%, transparent 40%),
                                radial-gradient(circle at -20% 80%, rgba(232, 17, 45, 0.05) 0%, transparent 40%);
                }
            `}</style>

            {/* --- Arrière-plan Organique & Animé --------------------------- */}
            <div className="fixed inset-0 z-0 pointer-events-none w-full h-full mesh-gradient-light" />

            {/* Formes flottantes abstraites (Blobs) */}
            <motion.div
                style={{ y: blob1Y }}
                className="fixed top-0 right-0 w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-[#008751]/10 blur-[60px] pointer-events-none"
                animate={{
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                style={{ y: blob2Y }}
                className="fixed bottom-10 left-[-10vw] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-[#FCD116]/15 blur-[80px] pointer-events-none"
                animate={{
                    x: [0, -30, 0],
                    y: [0, 40, 0],
                    scale: [1, 1.05, 1],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
            <motion.div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] rounded-full bg-[#E8112D]/5 blur-[70px] pointer-events-none"
                animate={{
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 max-w-md mx-auto w-full px-5 flex flex-col justify-center">

                {/* --- Logo & Splash --------------------------------------- */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                    className="flex flex-col items-center mb-8 pt-6"
                >
                    <div className="relative w-28 h-28 mb-6 group">
                        {/* Halo solaire derrière le logo */}
                        <div className="absolute -inset-4 bg-gradient-to-tr from-[#008751] via-[#FCD116] to-white rounded-full blur-xl opacity-40 group-hover:opacity-80 transition-opacity duration-700 animate-[spin_10s_linear_infinite]" />

                        <div className="absolute inset-0 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 transform group-hover:scale-110 transition-transform duration-500 ring-1 ring-gray-100 z-10">
                            <Image
                                src="/logo.jpg"
                                alt="Logo RGB"
                                fill
                                className="object-cover rounded-[1.2rem]"
                                priority
                            />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black tracking-tighter text-gray-900 leading-tight text-center uppercase">
                        Retour Gagnant
                    </h1>
                    <div className="flex items-center gap-3 mt-1 cursor-default">
                        <div className="h-[2px] w-6 bg-gradient-to-r from-transparent to-[#E8112D]" />
                        <span className="text-sm font-black tracking-[0.3em] text-[#008751] uppercase">
                            Bénin
                        </span>
                        <div className="h-[2px] w-6 bg-gradient-to-l from-transparent to-[#FCD116]" />
                    </div>
                </motion.div>

                {/* --- Slogan Cinematic ---------------------------------------- */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="text-center mb-10 relative bg-white/40 backdrop-blur-md rounded-3xl p-6 border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                >
                    <h2 className="text-sm md:text-base font-bold text-gray-800 leading-relaxed max-w-[320px] mx-auto">
                        L&apos;Agence d&apos;Accompagnement à la Nationalité <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] to-[#E8112D]">
                            et au Retour des Afro-descendants
                        </span>
                    </h2>
                </motion.div>

                {/* --- Liens d'Action Rapide (Links) ------------------------- */}
                <div className="flex flex-col gap-4 mb-14 w-full px-1">
                    {/* Site Web */}
                    <InteractionCard href="/" isPrimary delay={0.3}>
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-[1.2rem] shadow-inner">
                            <Globe className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-lg text-white tracking-wide">Accéder au site</span>
                            <span className="text-white/80 text-sm font-medium">Explorer notre plateforme</span>
                        </div>
                    </InteractionCard>

                    {/* WhatsApp 1 */}
                    <InteractionCard href="https://wa.me/2290160322121" delay={0.4}>
                        <div className="p-3 bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] border border-white rounded-[1.2rem] shadow-sm">
                            <Phone className="w-7 h-7 text-[#008751]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-gray-900 text-lg tracking-wide">Contactez-nous</span>
                            <span className="text-gray-500 text-sm font-semibold">+229 01 60 32 21 21</span>
                        </div>
                    </InteractionCard>

                    {/* WhatsApp 2 */}
                    <InteractionCard href="https://wa.me/2290194355050" delay={0.5}>
                        <div className="p-3 bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] border border-white rounded-[1.2rem] shadow-sm">
                            <Phone className="w-7 h-7 text-[#008751]" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-gray-900 text-lg tracking-wide">Assistance Rapide</span>
                            <span className="text-gray-500 text-sm font-semibold">+229 01 94 35 50 50</span>
                        </div>
                    </InteractionCard>

                    {/* Email */}
                    <InteractionCard href="mailto:contact@retourgagnantbenin.bj" delay={0.6}>
                        <div className="p-3 bg-gradient-to-br from-[#FFF9E6] to-[#FFE082] border border-white rounded-[1.2rem] shadow-sm">
                            <Mail className="w-7 h-7 text-[#F5B041]" />
                        </div>
                        <div className="flex flex-col text-left w-full overflow-hidden">
                            <span className="font-bold text-gray-900 text-lg tracking-wide">E-mail Officiel</span>
                            <span className="text-gray-500 text-sm font-semibold truncate w-full">contact@retourgagnantbenin.bj</span>
                        </div>
                    </InteractionCard>
                </div>

                {/* --- Services (Mobile-first List) ---------------------------- */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                    className="w-full px-1"
                >
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#008751]" />
                        <h3 className="text-xs font-black text-[#008751] uppercase tracking-[0.2em]">
                            Nos Prestations
                        </h3>
                        <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#008751]" />
                    </div>

                    <div className="space-y-3">
                        {services.map((service, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.02, x: 5 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-4 p-4 rounded-3xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_4px_15px_rgb(0,0,0,0.03)] hover:bg-white transition-all cursor-default group"
                            >
                                <div className={`w-12 h-12 flex-shrink-0 rounded-[1.1rem] bg-gradient-to-br ${service.color} ${service.text} flex items-center justify-center font-black text-sm shadow-inner ring-2 ring-white`}>
                                    {service.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-base truncate flex items-center gap-2">
                                        {service.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium truncate">{service.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* --- Addresse / Footer Mobile -------------------------------- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.9 }}
                    className="mt-16 text-center"
                >
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="inline-flex items-center justify-center gap-3 py-3 px-6 rounded-full bg-white/80 border border-white shadow-[0_4px_20px_rgb(0,0,0,0.05)] backdrop-blur-md cursor-default"
                    >
                        <MapPin className="w-5 h-5 text-[#E8112D]" />
                        <span className="font-bold text-sm text-gray-700">Haie Vive, Cotonou, Bénin</span>
                    </motion.div>

                    <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                        © {new Date().getFullYear()} Retour Gagnant Bénin
                    </p>
                </motion.div>

            </div>
        </div>
    )
}
