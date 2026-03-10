'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight, Phone, Mail, MapPin, Globe } from 'lucide-react'

// --- 🪄 Interaction Button -----------------------------------------------
interface InteractionButtonProps {
    children: React.ReactNode;
    href: string;
    isPrimary?: boolean;
}

const InteractionButton = ({ children, href, isPrimary = false }: InteractionButtonProps) => {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`
                group relative flex w-full max-w-sm mx-auto items-center justify-between p-4 rounded-2xl transition-all duration-300
                ${isPrimary
                    ? 'bg-[#008751] hover:bg-[#006b40] text-white shadow-xl shadow-[#008751]/20 hover:shadow-[#008751]/40'
                    : 'bg-white hover:bg-gray-50 text-gray-800 shadow-md hover:shadow-lg border border-gray-100'
                }
            `}
        >
            {children}
            <div className={`
                p-2 rounded-xl transition-colors
                ${isPrimary ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'}
            `}>
                <ArrowRight className={`w-5 h-5 ${isPrimary ? 'text-white' : 'text-gray-600'}`} />
            </div>
        </a>
    )
}

// --- 🌐 Composant Principal Carte Interactive -----------------------------------------
export default function PortfolioPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] text-gray-800 font-sans selection:bg-[#008751] selection:text-white flex flex-col pt-8 pb-16">

            <div className="max-w-md mx-auto w-full px-4 flex flex-col justify-center min-h-[calc(100vh-6rem)]">

                {/* --- En-tête / Logo --------------------------------------- */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center mb-8"
                >
                    <div className="relative w-28 h-28 mb-4 rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-2 border border-gray-100">
                        <Image
                            src="/logo.jpg"
                            alt="Logo RGB"
                            fill
                            className="object-contain rounded-xl"
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#1a1a1a] leading-tight text-center uppercase">
                        Retour Gagnant
                    </h1>
                    <span className="text-sm font-bold tracking-[0.3em] text-[#008751] uppercase mt-1">
                        Bénin
                    </span>
                </motion.div>

                {/* --- Slogan & Présentation (Style Carte de Visite Chic) ------ */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8 relative overflow-hidden"
                >
                    {/* Décoration subtile */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#008751]/5 to-[#FCD116]/5 rounded-bl-[100px] pointer-events-none" />

                    <h2 className="text-[#008751] font-bold text-center text-sm md:text-base mb-6 leading-relaxed relative z-10">
                        L&apos;Agence d&apos;Accompagnement à la Nationalité<br />et au Retour des Afro-descendants
                    </h2>

                    <div className="w-12 h-1 bg-[#FCD116] mx-auto mb-6 rounded-full" />

                    <p className="text-gray-600 text-sm md:text-base leading-loose text-center font-medium relative z-10">
                        <strong className="text-gray-900 border-b-2 border-[#E8112D]/20">Retour Gagnant Bénin (RGB)</strong> est l&apos;agence de référence dédiée à l&apos;accompagnement stratégique de la diaspora historique. <br /><br />
                        Nous transformons votre désir de retour en une réalité sereine et sécurisée. De l&apos;obtention de la nationalité béninoise à votre installation, nous garantissons un ancrage digne sur la terre de vos ancêtres.
                    </p>
                </motion.div>

                {/* --- Liens d'Action Rapide ----------------------------------- */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="flex flex-col gap-4 mb-10"
                >
                    {/* Site Web */}
                    <InteractionButton href="/" isPrimary>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Globe className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-lg">Visiter le Site Web</span>
                                <span className="text-white/80 text-sm">Découvrez tous nos services</span>
                            </div>
                        </div>
                    </InteractionButton>

                    {/* WhatsApp 1 */}
                    <InteractionButton href="https://wa.me/2290160322121">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#E8F5E9] rounded-xl text-[#008751]">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-gray-900 text-lg">Ligne Directe 1</span>
                                <span className="text-gray-500 text-sm">+229 01 60 32 21 21</span>
                            </div>
                        </div>
                    </InteractionButton>

                    {/* WhatsApp 2 */}
                    <InteractionButton href="https://wa.me/2290194355050">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#E8F5E9] rounded-xl text-[#008751]">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-gray-900 text-lg">Ligne Directe 2</span>
                                <span className="text-gray-500 text-sm">+229 01 94 35 50 50</span>
                            </div>
                        </div>
                    </InteractionButton>

                    {/* Email */}
                    <InteractionButton href="mailto:contact@retourgagnant.bj">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#FFF9E6] rounded-xl text-[#FCD116]">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-gray-900 text-lg">Écrivez-nous</span>
                                <span className="text-gray-500 text-sm">contact@retourgagnant.bj</span>
                            </div>
                        </div>
                    </InteractionButton>
                </motion.div>

                {/* --- Tableau / Liste Chic des Services ------------------------ */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-1 rounded-full bg-[#008751]" />
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Nos Prestations</h3>
                    </div>

                    <ul className="space-y-4">
                        {[
                            { title: "Nationalité Béninoise", desc: "Dossiers Afro-descendants", color: "text-[#008751]", bg: "bg-[#008751]/10" },
                            { title: "Citoyenneté & Démarches", desc: "Identité, Passeport", color: "text-gray-700", bg: "bg-gray-100" },
                            { title: "Investissement Immobilier", desc: "Terrains, Maisons, Projets", color: "text-[#FCD116]", bg: "bg-[#FCD116]/10" },
                            { title: "Création d'Entreprise", desc: "Accompagnement Affaires", color: "text-gray-700", bg: "bg-gray-100" },
                            { title: "Conseil Juridique", desc: "Succession, Notariat", color: "text-[#E8112D]", bg: "bg-[#E8112D]/10" },
                            { title: "Logistique du Retour", desc: "Déménagement International", color: "text-gray-700", bg: "bg-gray-100" },
                            { title: "Production Médias", desc: "Reportages, Documentaires", color: "text-gray-700", bg: "bg-gray-100" },
                            { title: "Cérémonies & Événements", desc: "Accueil, Culture, Fêtes", color: "text-gray-700", bg: "bg-gray-100" },
                        ].map((service, index) => (
                            <li key={index} className="flex items-center gap-4 group">
                                <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${service.bg} ${service.color}`}>
                                    {index + 1}
                                </span>
                                <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#008751] transition-colors">{service.title}</h4>
                                    <p className="text-xs text-gray-500 font-medium">{service.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* --- Addresse / Footer --------------------------------------- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="text-center pt-8 border-t border-gray-200"
                >
                    <div className="flex justify-center items-center gap-2 text-gray-500 mb-2">
                        <MapPin className="w-4 h-4 text-[#E8112D]" />
                        <span className="font-medium text-sm">Haie Vive, Cotonou, Rép. du Bénin</span>
                    </div>
                </motion.div>

            </div>
        </div>
    )
}
