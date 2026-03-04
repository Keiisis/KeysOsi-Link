'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft, ArrowRight, CheckCircle2, Loader2,
    Building2, MapPin, Users, Briefcase,
    Mail, Phone, Globe, Instagram, Facebook, Linkedin,
    Sparkles, Heart, Target, Image as ImageIcon,
    ChevronRight, Star, Handshake
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FileUpload from '@/components/ui/FileUpload'

const CATEGORIES = [
    { value: 'Immobilier', label: 'Immobilier', emoji: '🏘️' },
    { value: 'Agro-Business', label: 'Agro-Business', emoji: '🌿' },
    { value: 'Art & Culture', label: 'Art & Culture', emoji: '🎨' },
    { value: 'Services & Tech', label: 'Services & Tech', emoji: '💡' },
    { value: 'Mode & Beauté', label: 'Mode & Beauté', emoji: '✨' },
    { value: 'Tourisme & Hôtellerie', label: 'Tourisme & Hôtellerie', emoji: '🏖️' },
    { value: 'Santé & Bien-être', label: 'Santé & Bien-être', emoji: '🌱' },
    { value: 'Finance & Investissement', label: 'Finance & Investissement', emoji: '📈' },
    { value: 'Éducation & Formation', label: 'Éducation & Formation', emoji: '🎓' },
    { value: 'Commerce & Distribution', label: 'Commerce & Distribution', emoji: '🛒' },
    { value: 'Autre', label: 'Autre', emoji: '🔹' },
]

const YEARS_OPTIONS = ['Moins d\'1 an', '1–3 ans', '3–5 ans', '5–10 ans', 'Plus de 10 ans']
const TEAM_OPTIONS = ['Seul(e)', '2–5 personnes', '6–20 personnes', '21–50 personnes', '+50 personnes']
const REVENUE_OPTIONS = ['Démarrage', 'Moins de 5M FCFA/an', '5–20M FCFA/an', '20–100M FCFA/an', 'Plus de 100M FCFA/an']
const PARTNERSHIP_TYPES = [
    { value: 'produits', label: 'Vente de produits', icon: '📦' },
    { value: 'services', label: 'Offre de services', icon: '🛠️' },
    { value: 'visibilite', label: 'Visibilité & communication', icon: '📢' },
    { value: 'distribution', label: 'Distribution diaspora', icon: '🌍' },
    { value: 'investissement', label: 'Investissement conjoint', icon: '🤝' },
    { value: 'formation', label: 'Formation & expertise', icon: '🎓' },
]

interface FormData {
    // Step 1 – Identité
    company_name: string
    contact_name: string
    category: string
    location: string
    years_in_business: string
    team_size: string
    // Step 2 – Activité
    activity_description: string
    target_audience: string
    what_offer: string
    revenue_range: string
    partnership_types: string[]
    // Step 3 – Coordonnées
    email: string
    phone: string
    whatsapp: string
    website: string
    facebook_url: string
    instagram_url: string
    linkedin_url: string
    // Step 4 – Candidature
    why_partner: string
    logo_url: string
    cover_image_url: string
}

const EMPTY_FORM: FormData = {
    company_name: '', contact_name: '', category: '', location: '',
    years_in_business: '', team_size: '',
    activity_description: '', target_audience: '', what_offer: '',
    revenue_range: '', partnership_types: [],
    email: '', phone: '', whatsapp: '', website: '',
    facebook_url: '', instagram_url: '', linkedin_url: '',
    why_partner: '', logo_url: '', cover_image_url: '',
}

const STEPS = [
    { title: 'Votre Structure', subtitle: 'Identité & localisation', icon: Building2 },
    { title: 'Votre Activité', subtitle: 'Ce que vous faites', icon: Briefcase },
    { title: 'Coordonnées', subtitle: 'Comment vous joindre', icon: Mail },
    { title: 'Votre Candidature', subtitle: 'Pourquoi nous rejoindre', icon: Sparkles },
]

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {label}{required && <span className="text-[#E8112D] ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
        </div>
    )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            title={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600"
        />
    )
}

function TextArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
    return (
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            title={placeholder}
            rows={rows}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600 resize-none"
        />
    )
}

function SelectPills({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        'text-xs font-bold px-4 py-2 rounded-xl transition-all border',
                        value === opt.value
                            ? 'bg-[#008751]/20 text-[#008751] border-[#008751]/40'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}

export default function DevenirPartenairePage() {
    const [step, setStep] = useState(0)
    const [form, setForm] = useState<FormData>(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const set = (key: keyof FormData, value: string | string[]) =>
        setForm(prev => ({ ...prev, [key]: value }))

    const togglePartnershipType = (val: string) => {
        set('partnership_types', form.partnership_types.includes(val)
            ? form.partnership_types.filter(v => v !== val)
            : [...form.partnership_types, val]
        )
    }

    const validateStep = () => {
        if (step === 0) return !!(form.company_name && form.contact_name && form.category && form.location)
        if (step === 1) return !!(form.activity_description && form.partnership_types.length > 0)
        if (step === 2) return !!(form.email)
        if (step === 3) return !!(form.why_partner)
        return true
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')
        try {
            const res = await fetch('/api/admin/partner-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission')
            setSubmitted(true)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#030a15] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-lg w-full text-center space-y-8"
                >
                    <div className="relative inline-flex">
                        <div className="w-24 h-24 rounded-full bg-[#008751]/20 border-2 border-[#008751]/40 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={40} className="text-[#008751]" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#FCD116] rounded-full flex items-center justify-center">
                            <span className="text-xs">🇧🇯</span>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white font-heading mb-3">
                            Candidature envoyée !
                        </h1>
                        <p className="text-gray-400 leading-relaxed">
                            Merci <strong className="text-white">{form.contact_name}</strong> ! Notre équipe examine votre dossier sous 48–72h. Nous vous contacterons à l&apos;adresse <strong className="text-[#FCD116]">{form.email}</strong>.
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Récapitulatif</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-gray-500 text-[10px]">Structure</p><p className="text-white font-bold">{form.company_name}</p></div>
                            <div><p className="text-gray-500 text-[10px]">Catégorie</p><p className="text-white font-bold">{form.category}</p></div>
                            <div><p className="text-gray-500 text-[10px]">Localisation</p><p className="text-white font-bold">{form.location}</p></div>
                            <div><p className="text-gray-500 text-[10px]">Statut</p><p className="text-[#FCD116] font-bold">En examen ⏳</p></div>
                        </div>
                    </div>
                    <Link href="/partenaires" className="inline-flex items-center gap-2 text-[#008751] text-sm font-bold hover:underline">
                        <ArrowLeft size={14} /> Retour aux partenaires
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#030a15]">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#003d22] via-[#0a1628] to-[#030a15] py-16 px-4">
                <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-5" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCD116]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#008751]/10 rounded-full blur-3xl" />
                <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <Link href="/partenaires" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
                        <ArrowLeft size={14} /> Retour aux partenaires
                    </Link>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FCD116]">Réseau Retour Gagnant</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white font-heading tracking-tighter mb-4">
                        Devenir <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD116] to-[#008751]">Partenaire</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Rejoignez notre réseau d&apos;alliés et touchez la diaspora béninoise du monde entier.
                    </p>

                    {/* Avantages */}
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                        {[
                            { icon: '🌍', text: 'Visibilité diaspora' },
                            { icon: '⭐', text: 'Statut Premium possible' },
                            { icon: '🤝', text: 'Réseau privilégié' },
                            { icon: '📈', text: 'Croissance partagée' },
                        ].map(a => (
                            <div key={a.text} className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                                <span>{a.icon}</span> {a.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Stepper */}
                <div className="flex items-center gap-0 mb-10 overflow-x-auto no-scrollbar">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon
                        const isActive = i === step
                        const isDone = i < step
                        return (
                            <div key={i} className="flex items-center flex-1 min-w-0">
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all border',
                                        isDone ? 'bg-[#008751] border-[#008751] text-white'
                                            : isActive ? 'bg-[#FCD116]/20 border-[#FCD116]/50 text-[#FCD116]'
                                                : 'bg-white/5 border-white/10 text-gray-600'
                                    )}>
                                        {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                    </div>
                                    <p className={cn('text-[9px] font-black uppercase tracking-wider hidden sm:block',
                                        isActive ? 'text-[#FCD116]' : isDone ? 'text-[#008751]' : 'text-gray-600'
                                    )}>{s.title}</p>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={cn('h-px flex-1 mx-2 transition-all', isDone ? 'bg-[#008751]' : 'bg-white/10')} />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 space-y-6"
                    >
                        {/* Step header */}
                        <div className="pb-4 border-b border-white/8">
                            <div className="flex items-center gap-3">
                                {(() => { const Icon = STEPS[step].icon; return <Icon size={20} className="text-[#FCD116]" /> })()}
                                <div>
                                    <p className="text-lg font-black text-white">{STEPS[step].title}</p>
                                    <p className="text-xs text-gray-500">{STEPS[step].subtitle}</p>
                                </div>
                                <span className="ml-auto text-xs font-mono text-gray-600">{step + 1} / {STEPS.length}</span>
                            </div>
                        </div>

                        {/* ── STEP 1: Identité ── */}
                        {step === 0 && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Nom de la structure" required>
                                        <TextInput value={form.company_name} onChange={v => set('company_name', v)} placeholder="Ex: Immo Bénin Prestige" />
                                    </Field>
                                    <Field label="Votre nom complet" required>
                                        <TextInput value={form.contact_name} onChange={v => set('contact_name', v)} placeholder="Prénom et nom" />
                                    </Field>
                                </div>

                                <Field label="Secteur d'activité" required hint="Sélectionnez la catégorie qui correspond le mieux">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => set('category', cat.value)}
                                                className={cn(
                                                    'flex items-center gap-2 text-xs font-bold px-3 py-2.5 rounded-xl transition-all border text-left',
                                                    form.category === cat.value
                                                        ? 'bg-[#008751]/20 text-[#008751] border-[#008751]/40'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                                                )}
                                            >
                                                <span className="text-base">{cat.emoji}</span>
                                                <span className="truncate">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </Field>

                                <Field label="Localisation" required hint="Ville et pays où vous opérez">
                                    <TextInput value={form.location} onChange={v => set('location', v)} placeholder="Ex: Cotonou, Bénin" />
                                </Field>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Années d'existence">
                                        <SelectPills
                                            options={YEARS_OPTIONS.map(y => ({ value: y, label: y }))}
                                            value={form.years_in_business}
                                            onChange={v => set('years_in_business', v)}
                                        />
                                    </Field>
                                    <Field label="Taille de l'équipe">
                                        <SelectPills
                                            options={TEAM_OPTIONS.map(t => ({ value: t, label: t }))}
                                            value={form.team_size}
                                            onChange={v => set('team_size', v)}
                                        />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: Activité ── */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <Field label="Décrivez votre activité principale" required hint="Soyez précis : produits, services, zone géographique">
                                    <TextArea value={form.activity_description} onChange={v => set('activity_description', v)} placeholder="Notre entreprise propose... Nous sommes spécialisés dans..." rows={5} />
                                </Field>

                                <Field label="Votre public cible" hint="Qui sont vos clients ou bénéficiaires ?">
                                    <TextInput value={form.target_audience} onChange={v => set('target_audience', v)} placeholder="Ex: Diaspora béninoise, entrepreneurs locaux, familles..." />
                                </Field>

                                <Field label="Ce que vous apportez au réseau" hint="Produits, services, ressources que vous pouvez partager">
                                    <TextArea value={form.what_offer} onChange={v => set('what_offer', v)} placeholder="Je peux apporter..." rows={3} />
                                </Field>

                                <Field label="Chiffre d'affaires annuel estimé">
                                    <SelectPills
                                        options={REVENUE_OPTIONS.map(r => ({ value: r, label: r }))}
                                        value={form.revenue_range}
                                        onChange={v => set('revenue_range', v)}
                                    />
                                </Field>

                                <Field label="Types de partenariat souhaités" required hint="Sélectionnez un ou plusieurs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                        {PARTNERSHIP_TYPES.map(pt => (
                                            <button
                                                key={pt.value}
                                                type="button"
                                                onClick={() => togglePartnershipType(pt.value)}
                                                className={cn(
                                                    'flex items-center gap-3 text-xs font-bold px-4 py-3 rounded-xl transition-all border text-left',
                                                    form.partnership_types.includes(pt.value)
                                                        ? 'bg-[#FCD116]/10 text-[#FCD116] border-[#FCD116]/30'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                                                )}
                                            >
                                                <span className="text-lg flex-shrink-0">{pt.icon}</span>
                                                {pt.label}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                        )}

                        {/* ── STEP 3: Coordonnées ── */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Email professionnel" required>
                                        <div className="relative">
                                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@votre-entreprise.com" title="Email professionnel" className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600" />
                                        </div>
                                    </Field>
                                    <Field label="Téléphone">
                                        <div className="relative">
                                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+229 01 23 45 67" title="Téléphone" className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600" />
                                        </div>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="WhatsApp" hint="Numéro avec indicatif pays">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                                            <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+22901234567" title="WhatsApp" className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600" />
                                        </div>
                                    </Field>
                                    <Field label="Site web">
                                        <div className="relative">
                                            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://votre-site.com" title="Site web" className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600" />
                                        </div>
                                    </Field>
                                </div>

                                <div className="pt-2 border-t border-white/5">
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Heart size={11} /> Réseaux sociaux (optionnel)
                                    </p>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { key: 'facebook_url' as const, icon: Facebook, placeholder: 'https://facebook.com/votre-page', label: 'Facebook' },
                                            { key: 'instagram_url' as const, icon: Instagram, placeholder: 'https://instagram.com/votre-compte', label: 'Instagram' },
                                            { key: 'linkedin_url' as const, icon: Linkedin, placeholder: 'https://linkedin.com/company/...', label: 'LinkedIn' },
                                        ].map(({ key, icon: Icon, placeholder, label }) => (
                                            <div key={key} className="relative">
                                                <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input type="url" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} title={label} className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#008751]/50 transition-colors placeholder-gray-600" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 4: Candidature ── */}
                        {step === 3 && (
                            <div className="space-y-5">
                                <Field label="Pourquoi souhaitez-vous rejoindre notre réseau ?" required hint="Exprimez votre motivation, vos valeurs communes avec Retour Gagnant">
                                    <TextArea value={form.why_partner} onChange={v => set('why_partner', v)} placeholder="Je souhaite rejoindre Retour Gagnant car... Notre vision commune est... Je veux contribuer à la diaspora en..." rows={6} />
                                </Field>

                                <div className="pt-2 border-t border-white/5">
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <ImageIcon size={11} /> Visuels (optionnel)
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex gap-5 items-start">
                                            <FileUpload
                                                type="logo"
                                                label="Logo"
                                                value={form.logo_url}
                                                onChange={v => set('logo_url', v)}
                                                hint="PNG, JPG, WebP — max 5MB"
                                                className="w-[120px] flex-shrink-0"
                                            />
                                            <div className="flex-1 text-xs text-gray-500 leading-relaxed pt-7">
                                                Votre logo apparaîtra sur votre profil partenaire visible par tous les clients de la diaspora. Idéalement carré (500×500px minimum).
                                            </div>
                                        </div>
                                        <FileUpload
                                            type="cover"
                                            label="Photo de couverture"
                                            value={form.cover_image_url}
                                            onChange={v => set('cover_image_url', v)}
                                            hint="Image panoramique de votre établissement, produits ou services — 1200×400px recommandé"
                                        />
                                    </div>
                                </div>

                                {/* Preview résumé */}
                                <div className="bg-[#008751]/10 border border-[#008751]/20 rounded-2xl p-5 space-y-3">
                                    <p className="text-xs font-black text-[#008751] uppercase tracking-wider flex items-center gap-2">
                                        <Star size={11} /> Récapitulatif de votre candidature
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                        {[
                                            ['Structure', form.company_name],
                                            ['Contact', form.contact_name],
                                            ['Catégorie', form.category],
                                            ['Localisation', form.location],
                                            ['Email', form.email],
                                            ['Partenariats', form.partnership_types.join(', ')],
                                        ].map(([label, value]) => value ? (
                                            <div key={label}>
                                                <span className="text-gray-500">{label} : </span>
                                                <span className="text-white font-bold">{value}</span>
                                            </div>
                                        ) : null)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setStep(s => s - 1)}
                                disabled={step === 0}
                                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft size={16} /> Précédent
                            </button>

                            {step < STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => { if (validateStep()) setStep(s => s + 1) }}
                                    disabled={!validateStep()}
                                    className="flex items-center gap-2 bg-[#008751] hover:bg-[#009960] text-white font-black text-sm px-6 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#008751]/20"
                                >
                                    Continuer <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || !validateStep()}
                                    className="flex items-center gap-2 bg-gradient-to-r from-[#008751] to-[#FCD116] text-white font-black text-sm px-8 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                                    Soumettre ma candidature
                                    <ChevronRight size={14} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                'rounded-full transition-all',
                                i === step ? 'w-6 h-2 bg-[#FCD116]' : i < step ? 'w-2 h-2 bg-[#008751]' : 'w-2 h-2 bg-white/15'
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom CTA stats */}
            <div className="border-t border-white/5 bg-white/[0.02] py-10 mt-8">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            { value: '200+', label: 'Membres diaspora' },
                            { value: '4', label: 'Pays couverts' },
                            { value: '100%', label: 'Réseau de confiance' },
                        ].map(stat => (
                            <div key={stat.label}>
                                <p className="text-2xl font-black text-[#FCD116]">{stat.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
