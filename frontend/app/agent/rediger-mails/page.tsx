'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
    Mail, Send, X, Search, User,
    Trash2, Eye, Edit3, Clock, CheckCircle2, AlertCircle,
    Bold, Italic, Underline, Link2, List, ListOrdered,
    AlignLeft, AlignCenter, Image, Sparkles,
    FileText, RefreshCw, Inbox, Star
} from 'lucide-react'

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface Contact {
    id: string
    email: string
    nom: string
    prenom: string
    phone?: string
    type: 'client' | 'lead' | 'partenaire'
}

interface EmailLog {
    id: string
    to_email: string
    subject: string
    body_html: string
    context: string
    status: 'sent' | 'failed'
    created_at: string
}

type Tab = 'compose' | 'sent' | 'templates'

// ═══════════════════════════════════════════
// Modèles de mails prédéfinis
// ═══════════════════════════════════════════
const EMAIL_TEMPLATES = [
    {
        id: 'bienvenue',
        name: 'Bienvenue Client',
        subject: 'Bienvenue chez Retour Gagnant Bénin',
        color: '#008751',
        body: `<p>Cher(e) <strong>[NOM DU CLIENT]</strong>,</p>
<p>Nous sommes ravis de vous accueillir au sein de la famille <strong>Retour Gagnant Bénin</strong>.</p>
<p>Notre équipe est à votre entière disposition pour vous accompagner dans toutes vos démarches :</p>
<ul>
<li>Passeport et documents officiels</li>
<li>Nationalité béninoise</li>
<li>Investissement immobilier</li>
<li>Création d'entreprise</li>
</ul>
<p>N'hésitez pas à nous contacter à tout moment. Votre satisfaction est notre priorité absolue.</p>
<p>Cordialement,<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
    {
        id: 'suivi-dossier',
        name: 'Suivi de Dossier',
        subject: 'Mise à jour de votre dossier — Retour Gagnant',
        color: '#1B2A4A',
        body: `<p>Bonjour <strong>[NOM DU CLIENT]</strong>,</p>
<p>Nous souhaitons vous informer de l'avancement de votre dossier :</p>
<p><strong>Dossier :</strong> [REFERENCE]<br/>
<strong>Service :</strong> [SERVICE]<br/>
<strong>Statut :</strong> En cours de traitement</p>
<p>Notre équipe travaille activement sur votre dossier. Nous vous tiendrons informé(e) de chaque étape importante.</p>
<p>Si vous avez des documents supplémentaires à nous transmettre, n'hésitez pas à répondre à cet email.</p>
<p>Cordialement,<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
    {
        id: 'relance',
        name: 'Relance Paiement',
        subject: 'Rappel — Facture en attente de règlement',
        color: '#C9A84C',
        body: `<p>Bonjour <strong>[NOM DU CLIENT]</strong>,</p>
<p>Nous nous permettons de vous rappeler que la facture <strong>[N° FACTURE]</strong> d'un montant de <strong>[MONTANT] FCFA</strong> est en attente de règlement.</p>
<p>Vous pouvez effectuer votre paiement par :</p>
<ul>
<li>Virement bancaire</li>
<li>Mobile Money (MTN / Moov)</li>
<li>Paiement en ligne sur notre plateforme</li>
</ul>
<p>Si le paiement a déjà été effectué, veuillez ignorer ce message.</p>
<p>Cordialement,<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
    {
        id: 'rdv',
        name: 'Confirmation RDV',
        subject: 'Confirmation de votre rendez-vous — Retour Gagnant',
        color: '#008751',
        body: `<p>Bonjour <strong>[NOM DU CLIENT]</strong>,</p>
<p>Votre rendez-vous a bien été confirmé :</p>
<p><strong>Date :</strong> [DATE]<br/>
<strong>Heure :</strong> [HEURE]<br/>
<strong>Lieu :</strong> Haie-Vive Cocotiers, Cotonou, Bénin<br/>
<strong>Objet :</strong> [SERVICE]</p>
<p>Merci de vous munir des documents suivants :</p>
<ul>
<li>Pièce d'identité en cours de validité</li>
<li>Tout document relatif à votre dossier</li>
</ul>
<p>En cas d'empêchement, veuillez nous prévenir au moins 24h à l'avance.</p>
<p>À très bientôt !<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
    {
        id: 'remerciement',
        name: 'Remerciement',
        subject: 'Merci pour votre confiance — Retour Gagnant',
        color: '#E8112D',
        body: `<p>Cher(e) <strong>[NOM DU CLIENT]</strong>,</p>
<p>Nous tenions à vous remercier sincèrement pour la confiance que vous nous accordez.</p>
<p>Votre satisfaction est le moteur de notre engagement quotidien. Nous restons à votre disposition pour tout besoin futur.</p>
<p>N'hésitez pas à nous recommander auprès de votre entourage. Chaque membre de la diaspora mérite un accompagnement d'excellence.</p>
<p>Avec nos meilleures salutations,<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
]

// ═══════════════════════════════════════════
// Composant principal — Design clair institutionnel
// ═══════════════════════════════════════════
export default function AgentRedigerMailsPage() {
    const [tab, setTab] = useState<Tab>('compose')
    const [contacts, setContacts] = useState<Contact[]>([])
    const [sentEmails, setSentEmails] = useState<EmailLog[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

    // Compose state
    const [toEmail, setToEmail] = useState('')
    const [toName, setToName] = useState('')
    const [subject, setSubject] = useState('')
    const [bodyHtml, setBodyHtml] = useState('')
    const [showContactPicker, setShowContactPicker] = useState(false)
    const [contactSearch, setContactSearch] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)

    const editorRef = useRef<HTMLDivElement>(null)
    const contactPickerRef = useRef<HTMLDivElement>(null)

    // Charger les contacts et emails envoyés
    useEffect(() => {
        const init = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            const [messagesRes, clientsRes, leadsRes] = await Promise.all([
                supabase.from('messages').select('nom, prenom, email').not('email', 'is', null),
                supabase.from('client_profiles').select('id, first_name, last_name, email, phone'),
                supabase.from('leads').select('id, full_name, email, phone'),
            ])

            const contactMap = new Map<string, Contact>()

            ;(clientsRes.data || []).forEach(c => {
                if (c.email) {
                    contactMap.set(c.email.toLowerCase(), {
                        id: c.id, email: c.email, nom: c.last_name || '', prenom: c.first_name || '',
                        phone: c.phone || undefined, type: 'client',
                    })
                }
            })

            ;(leadsRes.data || []).forEach(l => {
                if (l.email && !contactMap.has(l.email.toLowerCase())) {
                    const parts = (l.full_name || '').split(' ')
                    contactMap.set(l.email.toLowerCase(), {
                        id: l.id, email: l.email, nom: parts.slice(1).join(' ') || '', prenom: parts[0] || '',
                        phone: l.phone || undefined, type: 'lead',
                    })
                }
            })

            ;(messagesRes.data || []).forEach(m => {
                if (m.email && !contactMap.has(m.email.toLowerCase())) {
                    contactMap.set(m.email.toLowerCase(), {
                        id: m.email, email: m.email, nom: m.nom || '', prenom: m.prenom || '', type: 'client',
                    })
                }
            })

            setContacts(Array.from(contactMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)))

            const { data: logs } = await supabase
                .from('email_logs')
                .select('*')
                .eq('context', 'agent_compose')
                .order('created_at', { ascending: false })
                .limit(50)

            if (logs) setSentEmails(logs)
            setLoading(false)
        }
        init()
    }, [])

    // Fermer le contact picker si clic extérieur
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
                setShowContactPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const filteredContacts = useMemo(() => {
        if (!contactSearch) return contacts.slice(0, 10)
        const q = contactSearch.toLowerCase()
        return contacts.filter(c =>
            c.email.toLowerCase().includes(q) ||
            c.nom.toLowerCase().includes(q) ||
            c.prenom.toLowerCase().includes(q)
        ).slice(0, 10)
    }, [contacts, contactSearch])

    const syncEditorContent = () => {
        if (editorRef.current) setBodyHtml(editorRef.current.innerHTML)
    }

    const execCmd = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value)
        editorRef.current?.focus()
        syncEditorContent()
    }

    const insertLink = () => {
        const url = prompt('URL du lien :')
        if (url) execCmd('createLink', url)
    }

    const applyTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
        setSubject(tpl.subject)
        if (editorRef.current) {
            editorRef.current.innerHTML = tpl.body
            setBodyHtml(tpl.body)
        }
        setShowTemplates(false)
    }

    const selectContact = (c: Contact) => {
        setToEmail(c.email)
        setToName(`${c.prenom} ${c.nom}`.trim())
        setContactSearch('')
        setShowContactPicker(false)
    }

    const handleSend = async () => {
        if (!toEmail || !subject) return
        syncEditorContent()
        const html = editorRef.current?.innerHTML || bodyHtml
        if (!html.trim()) return

        setSending(true)
        setSendResult(null)

        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: toEmail,
                    subject,
                    message: html,
                    clientName: toName || toEmail.split('@')[0],
                    context: 'agent_compose',
                    language: 'fr',
                }),
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setSendResult({ ok: true, msg: 'Email envoyé avec succès !' })
                setSentEmails(prev => [{
                    id: Date.now().toString(),
                    to_email: toEmail,
                    subject,
                    body_html: html,
                    context: 'agent_compose',
                    status: 'sent',
                    created_at: new Date().toISOString(),
                }, ...prev])
                setToEmail(''); setToName(''); setSubject('')
                if (editorRef.current) editorRef.current.innerHTML = ''
                setBodyHtml('')
            } else {
                setSendResult({ ok: false, msg: data.error || 'Erreur lors de l\'envoi.' })
            }
        } catch {
            setSendResult({ ok: false, msg: 'Erreur réseau. Vérifiez votre connexion.' })
        }
        setSending(false)
        setTimeout(() => setSendResult(null), 5000)
    }

    const handleClear = () => {
        setToEmail(''); setToName(''); setSubject('')
        if (editorRef.current) editorRef.current.innerHTML = ''
        setBodyHtml(''); setSendResult(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#008751]/30 border-t-[#008751] rounded-full animate-spin" />
                    <p className="text-xs text-[#1B2A4A]/50 font-semibold uppercase tracking-widest">Chargement messagerie...</p>
                </div>
            </div>
        )
    }

    return (
        /* ══════════ CONTENEUR PRINCIPAL — fond clair ivoire ══════════ */
        <div className="min-h-screen -m-6 lg:-m-8" style={{ background: 'linear-gradient(180deg, #F7F4EE 0%, #FEFCF9 50%, #F5F0E8 100%)' }}>
            {/* ── Bandeau tricolore supérieur ── */}
            <div className="h-1 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" />

            {/* ── Header institutionnel ── */}
            <div className="border-b border-[#1B2A4A]/10 bg-white/70 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-[#1B2A4A] flex items-center justify-center shadow-md">
                            <Mail size={20} className="text-[#C9A84C]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[#1B2A4A] tracking-tight">Messagerie Email</h1>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                                <span className="text-[#008751] font-semibold">Retour Gagnant Bénin</span> — Espace Agent
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-[#1B2A4A]/5 rounded-xl">
                        {([
                            { key: 'compose' as Tab, label: 'Nouveau', icon: Edit3 },
                            { key: 'sent' as Tab, label: `Envoyés (${sentEmails.length})`, icon: Send },
                            { key: 'templates' as Tab, label: 'Modèles', icon: FileText },
                        ]).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                    tab === t.key
                                        ? 'bg-white text-[#1B2A4A] shadow-sm border border-[#1B2A4A]/10'
                                        : 'text-[#6B7280] hover:text-[#1B2A4A] hover:bg-white/50'
                                }`}
                            >
                                <t.icon size={14} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

                {/* ── Success / Error banner ── */}
                <AnimatePresence>
                    {sendResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
                                sendResult.ok
                                    ? 'bg-[#008751]/5 border-[#008751]/20 text-[#008751]'
                                    : 'bg-[#E8112D]/5 border-[#E8112D]/20 text-[#E8112D]'
                            }`}
                        >
                            {sendResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span className="text-sm font-semibold">{sendResult.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════ */}
                {/* TAB: COMPOSE                       */}
                {/* ═══════════════════════════════════ */}
                {tab === 'compose' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-[#1B2A4A]/10 shadow-sm overflow-hidden"
                    >
                        {/* ── Toolbar ── */}
                        <div className="px-6 py-4 border-b border-[#1B2A4A]/8 flex items-center justify-between bg-[#FAFAF7]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-[#008751]" />
                                <span className="text-sm font-semibold text-[#1B2A4A]">Nouveau message</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                                        showTemplates
                                            ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                                            : 'bg-white border-[#1B2A4A]/10 text-[#6B7280] hover:text-[#1B2A4A] hover:border-[#1B2A4A]/20'
                                    }`}
                                >
                                    <Sparkles size={13} />
                                    Modèles
                                </button>
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                                        showPreview
                                            ? 'bg-[#1B2A4A]/5 border-[#1B2A4A]/20 text-[#1B2A4A]'
                                            : 'bg-white border-[#1B2A4A]/10 text-[#6B7280] hover:text-[#1B2A4A] hover:border-[#1B2A4A]/20'
                                    }`}
                                >
                                    <Eye size={13} />
                                    Aperçu
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="p-2 rounded-lg bg-white border border-[#1B2A4A]/10 text-[#6B7280] hover:text-[#E8112D] hover:border-[#E8112D]/20 transition-all"
                                    title="Tout effacer"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        {/* ── Quick Templates dropdown ── */}
                        <AnimatePresence>
                            {showTemplates && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b border-[#1B2A4A]/8"
                                >
                                    <div className="p-5 bg-[#FEFCF9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {EMAIL_TEMPLATES.map(tpl => (
                                            <button
                                                key={tpl.id}
                                                onClick={() => applyTemplate(tpl)}
                                                className="text-left p-4 rounded-xl bg-white border border-[#1B2A4A]/8 hover:border-[#008751]/30 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5 mb-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tpl.color }} />
                                                    <span className="text-xs font-semibold text-[#1B2A4A]">{tpl.name}</span>
                                                </div>
                                                <p className="text-[10px] text-[#6B7280] line-clamp-2 leading-relaxed">{tpl.subject}</p>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="divide-y divide-[#1B2A4A]/6">
                            {/* ── Destinataire ── */}
                            <div className="relative px-6 py-3 flex items-center gap-3" ref={contactPickerRef}>
                                <label className="text-xs font-semibold text-[#6B7280] w-10 flex-shrink-0">À :</label>
                                <div className="flex-1 relative">
                                    <div className="flex items-center gap-2">
                                        {toName && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#008751]/8 text-[#008751] text-xs font-semibold border border-[#008751]/15">
                                                <User size={11} />
                                                {toName}
                                                <button onClick={() => { setToEmail(''); setToName('') }} className="ml-1 hover:text-[#E8112D] transition-colors">
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        )}
                                        <input
                                            type="text"
                                            value={toName ? '' : toEmail}
                                            onChange={e => {
                                                setToEmail(e.target.value)
                                                setContactSearch(e.target.value)
                                                setShowContactPicker(true)
                                                if (toName) setToName('')
                                            }}
                                            onFocus={() => { if (!toName) setShowContactPicker(true) }}
                                            placeholder={toName ? '' : 'Saisir un email ou rechercher un contact...'}
                                            className="flex-1 bg-transparent text-[#1B2A4A] text-sm focus:outline-none placeholder:text-[#1B2A4A]/25"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowContactPicker(!showContactPicker)}
                                    className="p-2 rounded-lg text-[#6B7280] hover:text-[#008751] hover:bg-[#008751]/5 transition-all"
                                    title="Carnet de contacts"
                                >
                                    <Search size={15} />
                                </button>

                                {/* Contact picker dropdown */}
                                <AnimatePresence>
                                    {showContactPicker && filteredContacts.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                            className="absolute z-50 top-full left-12 right-12 mt-1 bg-white border border-[#1B2A4A]/12 rounded-xl shadow-xl overflow-hidden max-h-[260px] overflow-y-auto"
                                        >
                                            <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-[#1B2A4A]/6">
                                                <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Contacts</p>
                                            </div>
                                            {filteredContacts.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => selectContact(c)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#008751]/3 transition-colors text-left border-b border-[#1B2A4A]/4 last:border-b-0"
                                                >
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.type === 'client' ? '#008751' + '12' : c.type === 'lead' ? '#C9A84C' + '15' : '#1B2A4A' + '10' }}>
                                                        <span className="text-xs font-bold" style={{ color: c.type === 'client' ? '#008751' : c.type === 'lead' ? '#C9A84C' : '#1B2A4A' }}>
                                                            {(c.prenom[0] || c.nom[0] || '?').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#1B2A4A] truncate">{c.prenom} {c.nom}</p>
                                                        <p className="text-[10px] text-[#6B7280] truncate">{c.email}</p>
                                                    </div>
                                                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                        c.type === 'client' ? 'bg-[#008751]/8 text-[#008751]' :
                                                        c.type === 'lead' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' :
                                                        'bg-[#1B2A4A]/8 text-[#1B2A4A]'
                                                    }`}>
                                                        {c.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* ── Objet ── */}
                            <div className="px-6 py-3 flex items-center gap-3">
                                <label className="text-xs font-semibold text-[#6B7280] w-10 flex-shrink-0">Objet :</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Objet de votre email..."
                                    className="flex-1 bg-transparent text-[#1B2A4A] text-sm font-medium focus:outline-none placeholder:text-[#1B2A4A]/25"
                                />
                            </div>

                            {/* ── Barre d'outils éditeur ── */}
                            <div className="px-4 py-2 flex flex-wrap items-center gap-0.5 bg-[#FAFAF7]">
                                {[
                                    { icon: Bold, cmd: 'bold', tip: 'Gras' },
                                    { icon: Italic, cmd: 'italic', tip: 'Italique' },
                                    { icon: Underline, cmd: 'underline', tip: 'Souligné' },
                                ].map(btn => (
                                    <button
                                        key={btn.cmd}
                                        onClick={() => execCmd(btn.cmd)}
                                        title={btn.tip}
                                        className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all"
                                    >
                                        <btn.icon size={15} />
                                    </button>
                                ))}
                                <div className="w-px h-5 bg-[#1B2A4A]/8 mx-1" />
                                {[
                                    { icon: List, cmd: 'insertUnorderedList', tip: 'Liste à puces' },
                                    { icon: ListOrdered, cmd: 'insertOrderedList', tip: 'Liste numérotée' },
                                ].map(btn => (
                                    <button
                                        key={btn.cmd}
                                        onClick={() => execCmd(btn.cmd)}
                                        title={btn.tip}
                                        className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all"
                                    >
                                        <btn.icon size={15} />
                                    </button>
                                ))}
                                <div className="w-px h-5 bg-[#1B2A4A]/8 mx-1" />
                                <button onClick={() => execCmd('justifyLeft')} title="Aligner à gauche" className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all">
                                    <AlignLeft size={15} />
                                </button>
                                <button onClick={() => execCmd('justifyCenter')} title="Centrer" className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all">
                                    <AlignCenter size={15} />
                                </button>
                                <div className="w-px h-5 bg-[#1B2A4A]/8 mx-1" />
                                <button onClick={insertLink} title="Insérer un lien" className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all">
                                    <Link2 size={15} />
                                </button>
                                <button
                                    onClick={() => { const url = prompt('URL de l\'image :'); if (url) execCmd('insertImage', url) }}
                                    title="Insérer une image"
                                    className="p-2 rounded-md text-[#6B7280] hover:text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-all"
                                >
                                    <Image size={15} />
                                </button>
                                <div className="flex-1" />
                                <span className="text-[10px] text-[#6B7280]/60 font-mono pr-1">
                                    {(editorRef.current?.innerText || '').length} car.
                                </span>
                            </div>
                        </div>

                        {/* ── Zone de rédaction ── */}
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={syncEditorContent}
                            onBlur={syncEditorContent}
                            data-placeholder="Rédigez votre message ici..."
                            className="min-h-[320px] max-h-[520px] overflow-y-auto px-6 py-5 text-[#1B2A4A] text-sm leading-[1.8] focus:outline-none
                                [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-[#1B2A4A]/20 [&:empty]:before:pointer-events-none
                                [&_a]:text-[#008751] [&_a]:underline [&_a]:font-medium
                                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                                [&_li]:my-1
                                [&_p]:my-2
                                [&_strong]:font-bold
                                [&_em]:italic
                                [&_u]:underline
                                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#1B2A4A] [&_h2]:my-3
                                [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#1B2A4A] [&_h3]:my-2
                                [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
                            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
                            suppressContentEditableWarning
                        />

                        {/* ── Signature automatique ── */}
                        <div className="px-6 py-3 border-t border-[#1B2A4A]/5 bg-[#FEFCF9]">
                            <div className="flex items-start gap-3">
                                <div className="w-px h-10 bg-[#008751]/30 mt-1" />
                                <div className="text-[11px] text-[#6B7280] leading-relaxed">
                                    <p className="font-semibold text-[#1B2A4A]">Retour Gagnant Bénin</p>
                                    <p>Haie-Vive Cocotiers, Cotonou, Bénin</p>
                                    <p>+229 01 60 32 21 21 · contact@retourgagnantbenin.bj</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Aperçu live ── */}
                        <AnimatePresence>
                            {showPreview && bodyHtml && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-[#1B2A4A]/8"
                                >
                                    <div className="px-6 py-3 bg-[#1B2A4A]/[0.03] border-b border-[#1B2A4A]/6 flex items-center gap-2">
                                        <Eye size={13} className="text-[#1B2A4A]" />
                                        <span className="text-[10px] font-semibold text-[#1B2A4A] uppercase tracking-wider">Aperçu — Tel que reçu par le destinataire</span>
                                    </div>
                                    <div className="p-8 flex justify-center" style={{ background: '#F5EEE0' }}>
                                        <div className="w-full max-w-[600px] bg-white rounded-2xl overflow-hidden shadow-xl border border-[#C9A84C]/15">
                                            {/* Bande tricolore */}
                                            <div className="h-[5px]" style={{ background: 'linear-gradient(90deg, #008751 33%, #FCD116 33%, #FCD116 66%, #E8112D 66%)' }} />
                                            {/* Header navy */}
                                            <div className="px-10 pt-7 pb-6 text-center" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #243557 100%)' }}>
                                                <div className="inline-flex items-center gap-3.5">
                                                    <div className="w-14 h-14 rounded-xl border-2 border-[#C9A84C]/40 flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))' }}>
                                                        <span className="text-[#C9A84C] font-black text-base tracking-wider">RG</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[18px] font-black leading-tight">
                                                            <span className="text-white">RETOUR</span>{' '}
                                                            <span className="text-[#C9A84C]">GAGNANT</span>
                                                        </p>
                                                        <p className="text-[9px] text-[#C9A84C] tracking-[3px] uppercase font-bold mt-0.5">BÉNIN</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Ligne déco or */}
                                            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C 20%, #C9A84C 80%, transparent)' }} />
                                            {/* Corps */}
                                            <div
                                                className="px-10 py-8 text-[#2D3A55] text-[14px] leading-[1.8] bg-white
                                                    [&_a]:text-[#008751] [&_a]:font-semibold [&_a]:underline
                                                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                                                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                                                    [&_strong]:font-bold [&_strong]:text-[#1B2A4A]
                                                    [&_p]:my-2"
                                                style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
                                                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                                            />
                                            {/* Footer ivoire */}
                                            <div className="px-10 pt-6 pb-6 text-center" style={{ background: '#FAF6EC' }}>
                                                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent)' }} />
                                                <p className="text-[11px] text-[#5A6680] font-semibold">Cet email vous a été envoyé par un conseiller de Retour Gagnant Bénin.</p>
                                                <p className="text-[11px] text-[#5A6680] mt-1.5">
                                                    Pour répondre : <a href="mailto:contact@retourgagnantbenin.bj" className="text-[#008751] font-bold no-underline">contact@retourgagnantbenin.bj</a>
                                                </p>
                                                <div className="h-px my-3 mx-auto max-w-[200px]" style={{ background: 'rgba(27,42,74,0.08)' }} />
                                                <p className="text-[10px] text-[#8B94A6] font-semibold tracking-wide">&copy; {new Date().getFullYear()} Retour Gagnant Bénin — Tradition, Modernité, Excellence</p>
                                            </div>
                                            {/* Bande basse */}
                                            <div className="h-[4px]" style={{ background: 'linear-gradient(90deg, #008751 33%, #FCD116 33%, #FCD116 66%, #E8112D 66%)' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Boutons d'action ── */}
                        <div className="px-6 py-4 border-t border-[#1B2A4A]/6 bg-[#FAFAF7] flex items-center justify-between">
                            <p className="text-[10px] text-[#6B7280]/50">L&apos;email sera envoyé avec le template officiel Retour Gagnant Bénin</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#1B2A4A]/10 text-[#6B7280] hover:text-[#E8112D] hover:border-[#E8112D]/20 transition-all text-xs font-semibold"
                                >
                                    <Trash2 size={13} />
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !toEmail || !subject}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-bold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg"
                                    style={{
                                        background: sending ? '#6B7280' : 'linear-gradient(135deg, #008751, #006B3F)',
                                        boxShadow: sending ? 'none' : '0 4px 14px rgba(0,135,81,0.25)',
                                    }}
                                >
                                    {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                                    {sending ? 'Envoi...' : 'Envoyer'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════ */}
                {/* TAB: SENT EMAILS                   */}
                {/* ═══════════════════════════════════ */}
                {tab === 'sent' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#1B2A4A]/10 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#1B2A4A]/8 bg-[#FAFAF7] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Inbox size={15} className="text-[#1B2A4A]" />
                                <span className="text-sm font-semibold text-[#1B2A4A]">Emails envoyés</span>
                            </div>
                            <span className="text-[10px] text-[#6B7280] font-semibold bg-[#1B2A4A]/5 px-2.5 py-1 rounded-md">{sentEmails.length}</span>
                        </div>
                        {sentEmails.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[#1B2A4A]/5 flex items-center justify-center mx-auto mb-4">
                                    <Send size={24} className="text-[#1B2A4A]/20" />
                                </div>
                                <p className="text-sm text-[#1B2A4A]/60 font-semibold">Aucun email envoyé</p>
                                <p className="text-xs text-[#6B7280]/60 mt-1">Vos emails envoyés apparaîtront ici.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1B2A4A]/5">
                                {sentEmails.map(email => (
                                    <div key={email.id} className="px-6 py-4 hover:bg-[#008751]/[0.015] transition-colors cursor-default">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                email.status === 'sent' ? 'bg-[#008751]/8' : 'bg-[#E8112D]/8'
                                            }`}>
                                                {email.status === 'sent'
                                                    ? <CheckCircle2 size={15} className="text-[#008751]" />
                                                    : <AlertCircle size={15} className="text-[#E8112D]" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-[#1B2A4A] truncate">{email.to_email}</p>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${
                                                            email.status === 'sent'
                                                                ? 'bg-[#008751]/8 text-[#008751]'
                                                                : 'bg-[#E8112D]/8 text-[#E8112D]'
                                                        }`}>
                                                            {email.status === 'sent' ? 'Envoyé' : 'Erreur'}
                                                        </span>
                                                        <span className="text-[10px] text-[#6B7280]/60 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(email.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[#6B7280] mt-1">{email.subject}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══════════════════════════════════ */}
                {/* TAB: TEMPLATES                     */}
                {/* ═══════════════════════════════════ */}
                {tab === 'templates' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {EMAIL_TEMPLATES.map(tpl => (
                                <div key={tpl.id} className="bg-white rounded-2xl border border-[#1B2A4A]/10 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                    <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${tpl.color}, ${tpl.color}60)` }} />
                                    <div className="p-5 border-b border-[#1B2A4A]/6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tpl.color + '10' }}>
                                                    <Star size={16} style={{ color: tpl.color }} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[#1B2A4A]">{tpl.name}</h3>
                                                    <p className="text-[10px] text-[#6B7280] mt-0.5">{tpl.subject}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { applyTemplate(tpl); setTab('compose') }}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all border"
                                                style={{ color: tpl.color, borderColor: tpl.color + '25', backgroundColor: tpl.color + '08' }}
                                            >
                                                <Edit3 size={12} />
                                                Utiliser
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5 relative">
                                        <div className="rounded-lg border border-[#1B2A4A]/5 overflow-hidden">
                                            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, #008751 33%, #FCD116 33%, #FCD116 66%, #E8112D 66%)` }} />
                                            <div
                                                className="p-4 bg-[#FEFCF9] text-[#1B2A4A] text-[10px] leading-relaxed max-h-[130px] overflow-hidden
                                                    [&_ul]:list-disc [&_ul]:pl-4
                                                    [&_ol]:list-decimal [&_ol]:pl-4
                                                    [&_strong]:font-bold
                                                    [&_p]:my-1"
                                                dangerouslySetInnerHTML={{ __html: tpl.body }}
                                            />
                                        </div>
                                        {/* Fade overlay */}
                                        <div className="absolute bottom-5 left-5 right-5 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="text-center py-6 border-t border-[#1B2A4A]/5 bg-white/50 mt-8">
                <p className="text-[9px] text-[#6B7280]/50 uppercase tracking-[0.2em] font-semibold">
                    Retour Gagnant Bénin &middot; Messagerie Agent &middot; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    )
}
