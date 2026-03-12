"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/translation";

export default function AboutUsSection() {
    const { t } = useTranslation();
    const [content, setContent] = useState({
        video: "/videos/logo animé.mp4",
        title: "L'Excellence au Service de vos Racines",
        text: "Depuis la création de Retour Gagnant Bénin, notre mission a toujours été limpide : être le pont de confiance exclusif entre la diaspora et la terre de ses racines.\n\nNous comprenons intimement les défis, les doutes et les frustrations qui accompagnent la volonté de s'investir, de construire ou de revenir au pays. C'est pourquoi nous avons forgé un écosystème de services sur-mesure, alliant la rigueur des standards internationaux à une maîtrise parfaite des réalités locales.\n\nQu'il s'agisse d'acquérir de l'immobilier en toute sécurité, d'initier une fondation économique, de raviver votre patrimoine, ou d'établir des connexions administratives solides, notre équipe d'experts s'engage à faire de vos ambitions, une réalité tangible et sereine."
    });

    useEffect(() => {
        const fetchContent = async () => {
            const { data, error } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['about_us_video', 'about_us_title', 'about_us_text']);

            if (data && !error) {
                setContent(prev => {
                    const next = { ...prev };
                    data.forEach(item => {
                        if (item.key === 'about_us_video' && item.value) next.video = item.value;
                        if (item.key === 'about_us_title' && item.value) next.title = item.value;
                        if (item.key === 'about_us_text' && item.value) next.text = item.value;
                    });
                    return next;
                });
            }
        };

        fetchContent();

        const channel = supabase
            .channel('about_us_settings')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, fetchContent)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Split text into paragraphs
    const paragraphs = content.text.split('\n').filter(p => p.trim() !== '');

    return (
        <section className="relative py-24 md:py-32 bg-[#0a1628] overflow-hidden" id="qui-sommes-nous">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[#008751]/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[#FCD116]/10 rounded-full blur-[120px]" />
            </div>

            <div className="container relative z-10 mx-auto px-4">
                <div className="max-w-5xl mx-auto flex flex-col items-center">
                    
                    {/* Header Label */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-bold tracking-[0.2em] uppercase mb-12 shadow-xl"
                    >
                        {t("Qui sommes-nous")}
                    </motion.div>

                    {/* Video Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                        className="w-full max-w-4xl aspect-video relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 mb-10 group bg-black"
                    >
                        {/* Glow effect behind video */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#008751]/20 via-[#FCD116]/20 to-[#E8112D]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0" />
                        
                        <video 
                            src={content.video} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover relative z-10 opacity-90 group-hover:opacity-100 transition-opacity duration-700" 
                        />
                        
                        {/* Internal vignette */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-20" />
                    </motion.div>

                    {/* Logo Title (RETOUR GAGNANT BENIN) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black font-heading tracking-tight sm:tracking-tighter flex flex-wrap justify-center gap-x-4 gap-y-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008751] to-[#00b06a] drop-shadow-[0_0_20px_rgba(0,135,81,0.3)]">
                                RETOUR
                            </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD116] to-[#ffdb4d] drop-shadow-[0_0_20px_rgba(252,209,22,0.3)]">
                                GAGNANT
                            </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8112D] to-[#ff3b56] drop-shadow-[0_0_20px_rgba(232,17,45,0.3)]">
                                BÉNIN
                            </span>
                        </h2>
                    </motion.div>

                    {/* Story / Copywriting */}
                    <div className="w-full max-w-3xl mx-auto bg-white/[0.03] border border-white/10 p-8 md:p-14 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative">
                        {/* Quote icon overlay */}
                        <div className="absolute -top-6 -left-6 text-[120px] font-serif text-white/5 leading-none select-none pointer-events-none">
                            &quot;
                        </div>

                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-2xl md:text-3xl font-bold font-heading text-white mb-8 text-center md:text-left leading-snug"
                        >
                            {t(content.title)}
                        </motion.h3>

                        <div className="space-y-6 text-base md:text-lg text-gray-300 leading-relaxed font-medium">
                            {paragraphs.map((para, idx) => (
                                <motion.p 
                                    key={idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.2 + (idx * 0.1) }}
                                >
                                    {t(para)}
                                </motion.p>
                            ))}
                        </div>

                        {/* Divider Line */}
                        <motion.div 
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.8 }}
                            className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-12 mb-8"
                        />

                        {/* Signature or closing mark */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 1 }}
                            className="text-center flex justify-center items-center gap-4"
                        >
                            <div className="w-2 h-2 rounded-full bg-[#008751]" />
                            <div className="w-2 h-2 rounded-full bg-[#FCD116]" />
                            <div className="w-2 h-2 rounded-full bg-[#E8112D]" />
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
}
