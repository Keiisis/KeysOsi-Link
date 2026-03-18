'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import {
    CreditCard, Download, FileImage, User, Plus, Trash2,
    CheckCircle, AlertCircle, Loader2, Eye, UserCheck, RefreshCw,
    ChevronDown, Search, ExternalLink
} from 'lucide-react'
import { CardRecto, CardVerso, type CardData } from '@/components/business-card/BusinessCard'

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Agent {
    id: string
    prenom: string
    nom: string
    email: string
    role: string
}

interface SavedCard {
    id: string
    employee_prenom: string
    employee_nom: string
    position: string
    phone: string
    email: string
    agent_id: string | null
    created_at: string
    is_active: boolean
    agent?: { prenom: string; nom: string; email: string } | null
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

async function captureCard(ref: React.RefObject<HTMLDivElement | null>, pixelRatio = 3): Promise<string> {
    if (!ref.current) throw new Error('Élément non trouvé')
    return toPng(ref.current, {
        pixelRatio,
        cacheBust: true,
        skipFonts: false,
        style: { borderRadius: '0' }
    })
}

async function downloadPNG(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
    const dataUrl = await captureCard(ref)
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
}

async function downloadPDF(
    rectoRef: React.RefObject<HTMLDivElement | null>,
    versoRef: React.RefObject<HTMLDivElement | null>,
    name: string
) {
    // Capture both faces at high resolution
    const [rectoUrl, versoUrl] = await Promise.all([
        captureCard(rectoRef, 4),
        captureCard(versoRef, 4),
    ])

    // 85mm × 55mm landscape PDF
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 55] })

    // Page 1 — Recto
    pdf.addImage(rectoUrl, 'PNG', 0, 0, 85, 55)

    // Page 2 — Verso
    pdf.addPage([85, 55], 'landscape')
    pdf.addImage(versoUrl, 'PNG', 0, 0, 85, 55)

    pdf.save(`carte-visite-${name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
   ═══════════════════════════════════════════════════════════════ */

export default function AdminDesignPage() {
    // Form state
    const [form, setForm] = useState<CardData>({ prenom: '', nom: '', position: '', phone: '', email: '' })
    const [activeView, setActiveView] = useState<'recto' | 'verso'>('recto')

    // Agents
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState<string>('')
    const [agentSearch, setAgentSearch] = useState('')

    // Saved cards
    const [savedCards, setSavedCards] = useState<SavedCard[]>([])
    const [loadingCards, setLoadingCards] = useState(true)

    // Status
    const [saving, setSaving] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    // Card refs for download
    const rectoRef = useRef<HTMLDivElement>(null)
    const versoRef = useRef<HTMLDivElement>(null)

    // Is form valid for preview
    const isValid = form.prenom.trim() && form.nom.trim() && form.position.trim()

    const set = (k: keyof CardData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

    /* Load agents + saved cards */
    const load = useCallback(async () => {
        setLoadingCards(true)
        try {
            const [{ data: agentsData }, { data: cardsData }] = await Promise.all([
                supabase.from('users').select('id, prenom, nom, email, role').in('role', ['agent', 'admin']).order('nom'),
                supabase.from('business_cards').select('*, agent:users(prenom, nom, email)').order('created_at', { ascending: false }),
            ])
            if (agentsData) setAgents(agentsData)
            if (cardsData) setSavedCards(cardsData as SavedCard[])
        } catch {
            // Table might not exist yet — handled gracefully
        } finally {
            setLoadingCards(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    /* Save card to Supabase */
    const save = async () => {
        if (!isValid) return
        setSaving(true)
        setStatus(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const { error } = await supabase.from('business_cards').insert({
                employee_prenom: form.prenom.trim(),
                employee_nom: form.nom.trim(),
                position: form.position.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                agent_id: selectedAgent || null,
                created_by: session?.user?.id || null,
                is_active: true,
            })
            if (error) throw error
            setStatus({ type: 'success', msg: 'Carte sauvegardée avec succès !' })
            await load()
            setTimeout(() => setStatus(null), 4000)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur inconnue'
            if (msg.includes('does not exist')) {
                setStatus({ type: 'error', msg: 'La table business_cards n\'existe pas encore. Créez-la dans Supabase (voir SQL ci-dessous).' })
            } else {
                setStatus({ type: 'error', msg })
            }
        } finally {
            setSaving(false)
        }
    }

    /* Delete card */
    const deleteCard = async (id: string) => {
        if (!confirm('Supprimer cette carte ?')) return
        await supabase.from('business_cards').delete().eq('id', id)
        await load()
    }

    /* Assign card to agent */
    const assignCard = async (cardId: string, agentId: string) => {
        await supabase.from('business_cards').update({ agent_id: agentId }).eq('id', cardId)
        await load()
    }

    /* Download from saved card */
    const downloadSaved = async (card: SavedCard, type: 'recto-png' | 'verso-png' | 'pdf') => {
        setDownloading(card.id + type)
        const cardData: CardData = {
            prenom: card.employee_prenom,
            nom: card.employee_nom,
            position: card.position,
            phone: card.phone,
            email: card.email,
        }
        // Populate form temporarily to render hidden cards
        setForm(cardData)
        await new Promise(r => setTimeout(r, 200)) // wait for render
        try {
            const fullName = `${card.employee_prenom}-${card.employee_nom}`
            if (type === 'recto-png') await downloadPNG(rectoRef, `recto-${fullName}.png`)
            else if (type === 'verso-png') await downloadPNG(versoRef, `verso-${fullName}.png`)
            else await downloadPDF(rectoRef, versoRef, fullName)
        } finally {
            setDownloading(null)
        }
    }

    const filteredAgents = agents.filter(a =>
        `${a.prenom} ${a.nom} ${a.email}`.toLowerCase().includes(agentSearch.toLowerCase())
    )

    /* ═══ RENDER ═══ */
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C9A84C]/15 via-[#0f141e] to-[#071525]/80 border border-white/10 p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-[80px]" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center">
                            <CreditCard size={22} className="text-[#C9A84C]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Cartes de Visite</h1>
                            <p className="text-gray-400 text-sm">Génération automatique — format 85×55mm, recto/verso</p>
                        </div>
                    </div>
                    <button type="button" onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all">
                        <RefreshCw size={14} /> Actualiser
                    </button>
                </div>
            </div>

            {/* SQL Notice */}
            <details className="bg-[#C9A84C]/5 border border-[#C9A84C]/15 rounded-xl p-4 text-xs text-gray-500">
                <summary className="text-[#C9A84C] font-bold cursor-pointer text-sm">
                    ℹ️ Prérequis Supabase — Créer la table business_cards
                </summary>
                <pre className="mt-3 bg-black/30 rounded-lg p-3 text-gray-400 overflow-x-auto">{`CREATE TABLE business_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_prenom TEXT NOT NULL,
  employee_nom TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  agent_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON business_cards FOR ALL USING (true);`}
                </pre>
            </details>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* ═══ FORMULAIRE ═══ */}
                <div className="space-y-5">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                        <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                            <User size={16} className="text-[#C9A84C]" /> Informations de l&apos;employé
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Prénom *</label>
                                    <input value={form.prenom} onChange={set('prenom')} placeholder="Nathalie"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 transition-colors" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Nom *</label>
                                    <input value={form.nom} onChange={set('nom')} placeholder="Germany"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Poste / Fonction *</label>
                                <input value={form.position} onChange={set('position')} placeholder="Fondatrice & Directrice Générale"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Téléphone</label>
                                <input value={form.phone} onChange={set('phone')} placeholder="+229 01 XX XX XX XX"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
                                <input value={form.email} onChange={set('email')} type="email" placeholder="n.germany@retourgagnantbenin.bj"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Attribuer à un agent */}
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <UserCheck size={16} className="text-[#008751]" /> Attribuer à un agent (optionnel)
                        </h2>
                        <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={agentSearch}
                                onChange={e => setAgentSearch(e.target.value)}
                                placeholder="Chercher un agent..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#008751]/50 transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            <button type="button"
                                onClick={() => setSelectedAgent('')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedAgent ? 'bg-[#008751]/15 border border-[#008751]/30 text-[#008751]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}
                            >
                                Aucun agent (carte générique)
                            </button>
                            {filteredAgents.map(a => (
                                <button type="button" key={a.id}
                                    onClick={() => setSelectedAgent(a.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedAgent === a.id ? 'bg-[#008751]/15 border border-[#008751]/30 text-[#008751]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}
                                >
                                    {a.prenom} {a.nom} <span className="opacity-50 text-xs">— {a.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={save} disabled={!isValid || saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] rounded-xl text-sm font-bold hover:bg-[#C9A84C]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                            Sauvegarder la carte
                        </button>
                        <button type="button" onClick={async () => { setDownloading('recto-png'); await downloadPNG(rectoRef, `recto-${form.prenom}-${form.nom}.png`); setDownloading(null) }}
                            disabled={!isValid || downloading !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/10 text-gray-400 rounded-xl text-sm font-medium hover:text-white hover:border-white/20 transition-all disabled:opacity-40">
                            {downloading === 'recto-png' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                            PNG Recto
                        </button>
                        <button type="button" onClick={async () => { setDownloading('verso-png'); await downloadPNG(versoRef, `verso-${form.prenom}-${form.nom}.png`); setDownloading(null) }}
                            disabled={!isValid || downloading !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/10 text-gray-400 rounded-xl text-sm font-medium hover:text-white hover:border-white/20 transition-all disabled:opacity-40">
                            {downloading === 'verso-png' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                            PNG Verso
                        </button>
                        <button type="button" onClick={async () => { setDownloading('pdf'); await downloadPDF(rectoRef, versoRef, `${form.prenom}-${form.nom}`); setDownloading(null) }}
                            disabled={!isValid || downloading !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#008751]/10 border border-[#008751]/30 text-[#008751] rounded-xl text-sm font-bold hover:bg-[#008751]/20 transition-all disabled:opacity-40">
                            {downloading === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            PDF Recto+Verso
                        </button>
                    </div>

                    {/* Status */}
                    <AnimatePresence>
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className={`flex items-start gap-2 p-3 rounded-xl text-sm ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
                            >
                                {status.type === 'success' ? <CheckCircle size={15} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
                                {status.msg}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══ APERÇU CARTE ═══ */}
                <div className="space-y-5">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Eye size={16} className="text-[#C9A84C]" /> Aperçu
                            </h2>
                            <div className="flex rounded-lg overflow-hidden border border-white/10">
                                <button type="button" onClick={() => setActiveView('recto')}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${activeView === 'recto' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-gray-500 hover:text-gray-300'}`}>
                                    RECTO
                                </button>
                                <button type="button" onClick={() => setActiveView('verso')}
                                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${activeView === 'verso' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'text-gray-500 hover:text-gray-300'}`}>
                                    VERSO
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                                <AnimatePresence mode="wait">
                                    {activeView === 'recto' ? (
                                        <motion.div key="recto" initial={{ opacity: 0, rotateY: -15 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 15 }} transition={{ duration: 0.3 }}>
                                            <CardRecto ref={rectoRef} data={isValid ? form : { prenom: 'Prénom', nom: 'Nom', position: 'Poste', phone: '', email: '' }} />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="verso" initial={{ opacity: 0, rotateY: 15 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -15 }} transition={{ duration: 0.3 }}>
                                            <CardVerso ref={versoRef} data={isValid ? form : { prenom: 'Prénom', nom: 'Nom', position: 'Poste', phone: '', email: '' }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <p className="text-center text-gray-600 text-xs mt-3">
                            Format réel : 85 × 55 mm — 300 DPI à l&apos;export
                        </p>
                    </div>

                    {/* Hidden refs pour download (toujours dans le DOM) */}
                    <div className="hidden" aria-hidden>
                        <CardRecto ref={rectoRef} data={form} scale={1} />
                        <CardVerso ref={versoRef} data={form} scale={1} />
                    </div>
                </div>
            </div>

            {/* ═══ CARTES SAUVEGARDÉES ═══ */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <CreditCard size={16} className="text-[#C9A84C]" />
                        Cartes générées ({savedCards.length})
                    </h2>
                </div>

                {loadingCards ? (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                        <Loader2 size={20} className="animate-spin mr-2" /> Chargement…
                    </div>
                ) : savedCards.length === 0 ? (
                    <div className="text-center py-12 text-gray-600">
                        <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucune carte générée pour le moment</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {savedCards.map(card => (
                            <div key={card.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                                {/* Miniature */}
                                <div style={{ transform: 'scale(0.28)', transformOrigin: 'top left', width: 340 * 0.28, height: 220 * 0.28, flexShrink: 0, pointerEvents: 'none' }}>
                                    <CardRecto data={{ prenom: card.employee_prenom, nom: card.employee_nom, position: card.position, phone: card.phone, email: card.email }} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm">{card.employee_prenom} {card.employee_nom}</p>
                                    <p className="text-gray-400 text-xs">{card.position}</p>
                                    {card.agent && (
                                        <p className="text-[#008751] text-xs mt-0.5 flex items-center gap-1">
                                            <UserCheck size={10} /> Attribuée à {card.agent.prenom} {card.agent.nom}
                                        </p>
                                    )}
                                    <p className="text-gray-600 text-xs mt-0.5">{new Date(card.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {!card.agent_id && agents.length > 0 && (
                                        <select
                                            onChange={e => e.target.value && assignCard(card.id, e.target.value)}
                                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-[#008751]/50"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Attribuer…</option>
                                            {agents.map(a => (
                                                <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                                            ))}
                                        </select>
                                    )}
                                    <button type="button" onClick={() => downloadSaved(card, 'recto-png')} disabled={downloading !== null}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40" title="PNG Recto">
                                        <FileImage size={12} /> R
                                    </button>
                                    <button type="button" onClick={() => downloadSaved(card, 'verso-png')} disabled={downloading !== null}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40" title="PNG Verso">
                                        <FileImage size={12} /> V
                                    </button>
                                    <button type="button" onClick={() => downloadSaved(card, 'pdf')} disabled={downloading !== null}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-[#008751]/10 border border-[#008751]/20 rounded-lg text-xs text-[#008751] hover:bg-[#008751]/20 transition-colors disabled:opacity-40" title="PDF Recto+Verso">
                                        <Download size={12} /> PDF
                                    </button>
                                    <button type="button" onClick={() => deleteCard(card.id)}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-colors" title="Supprimer">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
