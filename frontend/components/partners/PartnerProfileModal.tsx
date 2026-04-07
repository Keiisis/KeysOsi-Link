'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
    X, MapPin, Mail, MessageCircle, Globe, Star,
    Facebook, Instagram, Linkedin, Store, Phone, ExternalLink,
} from 'lucide-react'
import Image from 'next/image'
import type { Partner } from './PartnerCard'
import { CATEGORY_COLORS, DEFAULT_COLOR } from './PartnerCard'

interface PartnerProfileModalProps {
    partner: Partner | null
    onClose: () => void
}

export default function PartnerProfileModal({ partner, onClose }: PartnerProfileModalProps) {
    if (!partner) return null

    const colors   = CATEGORY_COLORS[partner.category] || DEFAULT_COLOR
    const hasLogo  = !!partner.logo
    const hasCover = !!partner.coverImage
    const initials = partner.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    const waNum    = (partner.whatsapp || partner.phone || '').replace(/\D/g, '')

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="bd"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Card */}
            <motion.div
                key="card"
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 24 }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
            >
                <div
                    className="relative w-full max-w-[480px] bg-white rounded-[28px] overflow-hidden shadow-2xl pointer-events-auto overflow-y-auto"
                    style={{ maxHeight: '90vh' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close */}
                    <button
                        type="button"
                        title="Fermer"
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all"
                    >
                        <X size={16} />
                    </button>

                    {/* Cover */}
                    <div className="relative h-52 overflow-hidden flex-shrink-0">
                        {hasCover ? (
                            <Image src={partner.coverImage} alt={partner.name} fill className="object-cover" unoptimized />
                        ) : (
                            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                                <svg className="absolute inset-0 w-full h-full opacity-[0.10]" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <pattern id="mp" width="28" height="28" patternUnits="userSpaceOnUse">
                                            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.7"/>
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#mp)"/>
                                </svg>
                                <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full opacity-25"
                                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)' }}/>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                        {partner.isPremium && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FCD116] text-[#1a2332] shadow-sm">
                                <Star size={10} fill="currentColor" strokeWidth={0}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Partenaire Premium</span>
                            </div>
                        )}
                    </div>

                    {/* Identity */}
                    <div className="relative px-6 -mt-11 flex items-end gap-4">
                        <div className="relative flex-shrink-0 z-10">
                            <div
                                className="w-[72px] h-[72px] rounded-[18px] border-[4px] border-white shadow-xl overflow-hidden flex items-center justify-center text-white font-black text-2xl"
                                style={hasLogo ? {} : { background: `linear-gradient(145deg, ${colors.from}, ${colors.to})` }}
                            >
                                {hasLogo
                                    ? <Image src={partner.logo} alt={partner.name} fill className="object-cover" unoptimized/>
                                    : <span style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{initials}</span>
                                }
                            </div>
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center"
                                style={{ background: colors.from }}
                            >
                                <svg viewBox="0 0 10 8" className="w-[8px] h-[8px]">
                                    <polyline points="1,4 3.5,6.5 9,1.5" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <div className="pb-2 flex-1 min-w-0">
                            <h2 className="text-xl font-black text-[#1a2332] leading-tight">{partner.name}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: `${colors.badge}cc`, color: colors.badgeText }}>
                                    {partner.category}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <MapPin size={9}/>{partner.location}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 pt-4 pb-6 space-y-5">
                        <p className="text-[14px] text-gray-600 leading-relaxed">{partner.description}</p>

                        {/* Contact CTAs */}
                        <div className={`grid gap-3 ${partner.email && waNum ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {partner.email && (
                                <a href={`mailto:${partner.email}`}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all font-semibold text-[13px]">
                                    <Mail size={16}/> Envoyer un email
                                </a>
                            )}
                            {waNum && (
                                <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-green-100 bg-green-50 text-green-700 hover:bg-green-100 transition-all font-semibold text-[13px]">
                                    <MessageCircle size={16}/> WhatsApp
                                </a>
                            )}
                            {partner.phone && !waNum && (
                                <a href={`tel:${partner.phone}`}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all font-semibold text-[13px]">
                                    <Phone size={16}/> {partner.phone}
                                </a>
                            )}
                        </div>

                        {/* Links */}
                        {(partner.website || partner.facebook || partner.instagram || partner.linkedin) && (
                            <div className="flex flex-wrap gap-2">
                                {partner.website && (
                                    <a href={partner.website} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-[12px] text-gray-500">
                                        <Globe size={13}/> Site web <ExternalLink size={10} className="opacity-40"/>
                                    </a>
                                )}
                                {partner.facebook && (
                                    <a href={partner.facebook} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-all text-[12px] text-gray-500">
                                        <Facebook size={13}/> Facebook
                                    </a>
                                )}
                                {partner.instagram && (
                                    <a href={partner.instagram} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:bg-pink-50 hover:text-pink-600 transition-all text-[12px] text-gray-500">
                                        <Instagram size={13}/> Instagram
                                    </a>
                                )}
                                {partner.linkedin && (
                                    <a href={partner.linkedin} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all text-[12px] text-gray-500">
                                        <Linkedin size={13}/> LinkedIn
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Products */}
                        {partner.products.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Store size={12} className="text-gray-300"/>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Vitrine</span>
                                    <div className="flex-1 h-px bg-gray-100"/>
                                    <span className="text-[10px] text-gray-300">{partner.products.length} article{partner.products.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {partner.products.map(p => (
                                        <div key={p.id} className="relative aspect-square rounded-[12px] overflow-hidden bg-gray-50">
                                            {p.image
                                                ? <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized/>
                                                : <div className="absolute inset-0 flex items-center justify-center p-1">
                                                    <span className="text-[8px] text-gray-400 text-center leading-tight">{p.name}</span>
                                                </div>
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
