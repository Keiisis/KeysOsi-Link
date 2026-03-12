'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Car, HeartPulse, GraduationCap, FileCheck, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { T, useTranslation } from '@/lib/translation';

interface AutreService {
    icon: string;
    title: string;
    description: string;
}

const FALLBACK_AUTRES_SERVICES: AutreService[] = [
    {
        icon: "Car",
        title: "Transport & Logistique",
        description: "Transfert aéroport, location de véhicule avec chauffeur, organisation de déplacements interurbains.",
    },
    {
        icon: "HeartPulse",
        title: "Santé",
        description: "Mise en relation avec des cliniques et médecins partenaires, accompagnement pour les soins et hospitalisations.",
    },
    {
        icon: "GraduationCap",
        title: "Scolarité & Éducation",
        description: "Orientation et inscription dans des établissements scolaires francophones et internationaux au Bénin.",
    },
    {
        icon: "FileCheck",
        title: "Démarches Administratives",
        description: "Assistance pour les demandes de visa, titres de séjour, regroupement familial et autres démarches officielles.",
    },
];

const ICON_MAP: Record<string, LucideIcon> = {
    Car,
    HeartPulse,
    GraduationCap,
    FileCheck,
};

export default function AutresServicesPage() {
    const { t } = useTranslation();
    const [services, setServices] = useState<AutreService[]>(FALLBACK_AUTRES_SERVICES);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'autres_services_json')
                    .single();
                if (data?.value) {
                    const parsed = JSON.parse(data.value) as AutreService[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setServices(parsed);
                    }
                }
            } catch {
                // setting absent ou JSON invalide — utiliser le fallback
            }
        };
        fetchServices();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Banner */}
            <section className="relative py-20 bg-gradient-to-br from-[#0f141e] via-[#1a2a3a] to-[#0f141e] text-white overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-20 w-64 h-64 rounded-full blur-[100px] bg-white" />
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-white/50 mb-8 flex-wrap">
                        <Link href="/" className="hover:text-white/80 transition-colors"><T>Accueil</T></Link>
                        <ChevronRight size={14} />
                        <Link href="/services" className="hover:text-white/80 transition-colors"><T>Services</T></Link>
                        <ChevronRight size={14} />
                        <span className="text-white/80"><T>Autres Services</T></span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
                            <T>Autres Services</T>
                        </h1>
                        <p className="text-xl text-white/70">
                            <T>Transport, santé, éducation, démarches administratives — Découvrez tous nos services complémentaires pour faciliter votre installation au Bénin.</T>
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {services.map((service, i) => {
                            const IconComponent = ICON_MAP[service.icon] || FileCheck;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.07 }}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#008751]/30 hover:shadow-md transition-all duration-300 group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 w-12 h-12 rounded-xl bg-[#008751]/10 flex items-center justify-center group-hover:bg-[#008751]/20 transition-colors">
                                            <IconComponent className="text-[#008751]" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1a2332] mb-2 group-hover:text-[#008751] transition-colors">
                                                {t(service.title)}
                                            </h3>
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                {t(service.description)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-12 text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
                    >
                        <h2 className="text-2xl font-bold text-[#1a2332] mb-3">
                            <T>Un besoin spécifique ?</T>
                        </h2>
                        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                            <T>Contactez-nous pour discuter de votre situation. Nous évaluons chaque demande individuellement et vous orientons vers la meilleure solution.</T>
                        </p>
                        <Link href="/rendez-vous">
                            <button className="px-8 py-3 bg-[#008751] text-white font-bold rounded-full hover:bg-[#006e42] transition-colors shadow-md hover:shadow-lg">
                                <T>Prendre rendez-vous</T>
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
