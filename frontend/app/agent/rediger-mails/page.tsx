'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
    Mail, Send, Paperclip, X, Search, User, ChevronDown,
    Trash2, Eye, Edit3, Clock, CheckCircle2, AlertCircle,
    Bold, Italic, Underline, Link2, List, ListOrdered,
    AlignLeft, AlignCenter, Image, Type, Sparkles,
    FileText, RefreshCw, Inbox, Star, Archive
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
        body: `<p>Cher(e) <strong>[NOM DU CLIENT]</strong>,</p>
<p>Nous tenions à vous remercier sincèrement pour la confiance que vous nous accordez.</p>
<p>Votre satisfaction est le moteur de notre engagement quotidien. Nous restons à votre disposition pour tout besoin futur.</p>
<p>N'hésitez pas à nous recommander auprès de votre entourage. Chaque membre de la diaspora mérite un accompagnement d'excellence.</p>
<p>Avec nos meilleures salutations,<br/><strong>L'équipe Retour Gagnant Bénin</strong></p>`,
    },
]

// ═══════════════════════════════════════════
// Composant principal
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

            // Contacts depuis les messages reçus + client_profiles + leads
            const [messagesRes, clientsRes, leadsRes] = await Promise.all([
                supabase.from('messages').select('nom, prenom, email').not('email', 'is', null),
                supabase.from('client_profiles').select('id, first_name, last_name, email, phone'),
                supabase.from('leads').select('id, full_name, email, phone'),
            ])

            const contactMap = new Map<string, Contact>()

            // Clients
            ;(clientsRes.data || []).forEach(c => {
                if (c.email) {
                    contactMap.set(c.email.toLowerCase(), {
                        id: c.id,
                        email: c.email,
                        nom: c.last_name || '',
                        prenom: c.first_name || '',
                        phone: c.phone || undefined,
                        type: 'client',
                    })
                }
            })

            // Leads
            ;(leadsRes.data || []).forEach(l => {
                if (l.email && !contactMap.has(l.email.toLowerCase())) {
                    const parts = (l.full_name || '').split(' ')
                    contactMap.set(l.email.toLowerCase(), {
                        id: l.id,
                        email: l.email,
                        nom: parts.slice(1).join(' ') || '',
                        prenom: parts[0] || '',
                        phone: l.phone || undefined,
                        type: 'lead',
                    })
                }
            })

            // Messages (contacts inconnus)
            ;(messagesRes.data || []).forEach(m => {
                if (m.email && !contactMap.has(m.email.toLowerCase())) {
                    contactMap.set(m.email.toLowerCase(), {
                        id: m.email,
                        email: m.email,
                        nom: m.nom || '',
                        prenom: m.prenom || '',
                        type: 'client',
                    })
                }
            })

            setContacts(Array.from(contactMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)))

            // Emails envoyés
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

    // Sync editor content
    const syncEditorContent = () => {
        if (editorRef.current) {
            setBodyHtml(editorRef.current.innerHTML)
        }
    }

    // Commandes d'éditeur
    const execCmd = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value)
        editorRef.current?.focus()
        syncEditorContent()
    }

    const insertLink = () => {
        const url = prompt('URL du lien :')
        if (url) execCmd('createLink', url)
    }

    // Appliquer un template
    const applyTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
        setSubject(tpl.subject)
        if (editorRef.current) {
            editorRef.current.innerHTML = tpl.body
            setBodyHtml(tpl.body)
        }
        setShowTemplates(false)
    }

    // Sélectionner un contact
    const selectContact = (c: Contact) => {
        setToEmail(c.email)
        setToName(`${c.prenom} ${c.nom}`.trim())
        setContactSearch('')
        setShowContactPicker(false)
    }

    // Envoyer le mail
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
                // Ajouter aux emails envoyés localement
                setSentEmails(prev => [{
                    id: Date.now().toString(),
                    to_email: toEmail,
                    subject,
                    body_html: html,
                    context: 'agent_compose',
                    status: 'sent',
                    created_at: new Date().toISOString(),
                }, ...prev])
                // Reset
                setToEmail('')
                setToName('')
                setSubject('')
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

    // Réinitialiser le formulaire
    const handleClear = () => {
        setToEmail('')
        setToName('')
        setSubject('')
        if (editorRef.current) editorRef.current.innerHTML = ''
        setBodyHtml('')
        setSendResult(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#060a10]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Chargement messagerie...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
                        <Mail size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Messagerie Email</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Rédiger un <span className="text-emerald-400">Mail</span></h1>
                    <p className="text-nexus-text-muted text-sm mt-1">Envoyez des emails professionnels aux clients depuis votre espace agent.</p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
                {[
                    { key: 'compose' as Tab, label: 'Nouveau Mail', icon: Edit3 },
                    { key: 'sent' as Tab, label: `Envoyés (${sentEmails.length})`, icon: Send },
                    { key: 'templates' as Tab, label: 'Modèles', icon: FileText },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                            tab === t.key
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Success / Error banner ── */}
            <AnimatePresence>
                {sendResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex items-center gap-3 p-4 rounded-xl border ${
                            sendResult.ok
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                    >
                        {sendResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-bold">{sendResult.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════ */}
            {/* TAB: COMPOSE */}
            {/* ═══════════════════════════════════ */}
            {tab === 'compose' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-nexus-card overflow-hidden">
                    {/* ── Toolbar supérieur ── */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                            <Edit3 size={16} className="text-emerald-400" />
                            Nouveau Message
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                            >
                                <Sparkles size={14} />
                                Modèles
                            </button>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                    showPreview
                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                                <Eye size={14} />
                                Aperçu
                            </button>
                            <button
                                onClick={handleClear}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                                title="Tout effacer"
                            >
                                <Trash2 size={14} />
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
                                className="overflow-hidden border-b border-white/5"
                            >
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {EMAIL_TEMPLATES.map(tpl => (
                                        <button
                                            key={tpl.id}
                                            onClick={() => applyTemplate(tpl)}
                                            className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText size={14} className="text-emerald-400" />
                                                <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{tpl.name}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 line-clamp-2">{tpl.subject}</p>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="p-6 space-y-4">
                        {/* ── Destinataire ── */}
                        <div className="relative" ref={contactPickerRef}>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                <User size={12} /> Destinataire
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={toEmail}
                                        onChange={e => {
                                            setToEmail(e.target.value)
                                            setContactSearch(e.target.value)
                                            setShowContactPicker(true)
                                        }}
                                        onFocus={() => setShowContactPicker(true)}
                                        placeholder="email@exemple.com ou rechercher un contact..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm placeholder:text-gray-600"
                                    />
                                    {toName && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{toName}</span>
                                            <button onClick={() => { setToEmail(''); setToName('') }} className="text-gray-600 hover:text-red-400">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowContactPicker(!showContactPicker)}
                                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                                    title="Carnet de contacts"
                                >
                                    <Search size={16} />
                                </button>
                            </div>

                            {/* Contact picker dropdown */}
                            <AnimatePresence>
                                {showContactPicker && filteredContacts.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="absolute z-50 top-full left-0 right-12 mt-1 bg-[#0c1420] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[280px] overflow-y-auto"
                                    >
                                        {filteredContacts.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => selectContact(c)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/5 last:border-b-0"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-emerald-400">
                                                        {(c.prenom[0] || c.nom[0] || '?').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{c.prenom} {c.nom}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{c.email}</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                    c.type === 'client' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    c.type === 'lead' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-blue-500/10 text-blue-400'
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
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                <Mail size={12} /> Objet
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Objet de votre email..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none text-sm placeholder:text-gray-600"
                            />
                        </div>

                        {/* ── Barre d'outils éditeur ── */}
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                <Type size={12} /> Message
                            </label>
                            <div className="flex flex-wrap items-center gap-1 p-2 bg-white/[0.02] border border-white/10 rounded-t-xl border-b-0">
                                {[
                                    { icon: Bold, cmd: 'bold', tip: 'Gras' },
                                    { icon: Italic, cmd: 'italic', tip: 'Italique' },
                                    { icon: Underline, cmd: 'underline', tip: 'Souligné' },
                                ].map(btn => (
                                    <button
                                        key={btn.cmd}
                                        onClick={() => execCmd(btn.cmd)}
                                        title={btn.tip}
                                        className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all"
                                    >
                                        <btn.icon size={14} />
                                    </button>
                                ))}

                                <div className="w-px h-5 bg-white/10 mx-1" />

                                {[
                                    { icon: List, cmd: 'insertUnorderedList', tip: 'Liste' },
                                    { icon: ListOrdered, cmd: 'insertOrderedList', tip: 'Liste numérotée' },
                                ].map(btn => (
                                    <button
                                        key={btn.cmd}
                                        onClick={() => execCmd(btn.cmd)}
                                        title={btn.tip}
                                        className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all"
                                    >
                                        <btn.icon size={14} />
                                    </button>
                                ))}

                                <div className="w-px h-5 bg-white/10 mx-1" />

                                <button onClick={() => execCmd('justifyLeft')} title="Aligner à gauche" className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all">
                                    <AlignLeft size={14} />
                                </button>
                                <button onClick={() => execCmd('justifyCenter')} title="Centrer" className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all">
                                    <AlignCenter size={14} />
                                </button>

                                <div className="w-px h-5 bg-white/10 mx-1" />

                                <button onClick={insertLink} title="Insérer un lien" className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all">
                                    <Link2 size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        const url = prompt('URL de l\'image :')
                                        if (url) execCmd('insertImage', url)
                                    }}
                                    title="Insérer une image"
                                    className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all"
                                >
                                    <Image size={14} />
                                </button>

                                <div className="flex-1" />

                                <div className="text-[9px] text-gray-600 font-mono pr-2">
                                    {(editorRef.current?.innerText || '').length} car.
                                </div>
                            </div>

                            {/* ── Éditeur WYSIWYG ── */}
                            <div
                                ref={editorRef}
                                contentEditable
                                onInput={syncEditorContent}
                                onBlur={syncEditorContent}
                                data-placeholder="Rédigez votre message ici..."
                                className="min-h-[300px] max-h-[500px] overflow-y-auto bg-white/[0.03] border border-white/10 rounded-b-xl px-5 py-4 text-white text-sm leading-relaxed focus:border-emerald-500/30 outline-none
                                    [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-600 [&:empty]:before:pointer-events-none
                                    [&_a]:text-emerald-400 [&_a]:underline
                                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
                                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
                                    [&_li]:my-1
                                    [&_p]:my-2
                                    [&_strong]:font-bold
                                    [&_em]:italic
                                    [&_u]:underline
                                    [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-3
                                    [&_h3]:text-base [&_h3]:font-bold [&_h3]:my-2
                                    [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
                                suppressContentEditableWarning
                            />
                        </div>

                        {/* ── Aperçu HTML live ── */}
                        <AnimatePresence>
                            {showPreview && bodyHtml && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-xl border border-emerald-500/20 overflow-hidden">
                                        <div className="p-3 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center gap-2">
                                            <Eye size={14} className="text-emerald-400" />
                                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Aperçu du mail (tel que reçu par le client)</span>
                                        </div>
                                        {/* Simulation du rendu email RGB */}
                                        <div className="bg-[#FAF8F4]">
                                            {/* Bande tricolore */}
                                            <div className="h-1.5 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" />
                                            {/* Header */}
                                            <div className="bg-gradient-to-b from-[#1B2A4A] to-[#0f1729] p-6 text-center">
                                                <div className="inline-flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#008751]/20 border border-[#008751]/30 flex items-center justify-center">
                                                        <span className="text-[#008751] font-black text-sm">RG</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <h2 className="text-base font-black">
                                                            <span className="text-[#008751]">RETOUR</span>{' '}
                                                            <span className="text-[#E8112D]">GAGNANT</span>
                                                        </h2>
                                                        <p className="text-[8px] text-[#FCD116]/80 tracking-[3px] uppercase font-bold">BÉNIN</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Ligne décorative */}
                                            <div className="h-px bg-gradient-to-r from-transparent via-[#008751]/30 to-transparent" />
                                            {/* Contenu */}
                                            <div
                                                className="p-6 text-[#1A1A1A] text-sm leading-relaxed
                                                    [&_a]:text-[#008751] [&_a]:font-semibold
                                                    [&_ul]:list-disc [&_ul]:pl-6
                                                    [&_ol]:list-decimal [&_ol]:pl-6
                                                    [&_strong]:font-bold
                                                    [&_p]:my-2"
                                                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                                            />
                                            {/* Footer */}
                                            <div className="h-px bg-gradient-to-r from-transparent via-[#1B2A4A]/10 to-transparent mx-6" />
                                            <div className="p-5 text-center text-xs text-[#6B7280] space-y-1">
                                                <p className="font-semibold">Cet email vous a été envoyé par un conseiller de Retour Gagnant Bénin.</p>
                                                <p>Pour toute réponse : <span className="text-[#008751] font-semibold">contact@retourgagnantbenin.bj</span></p>
                                                <div className="h-px bg-[#1B2A4A]/5 my-2" />
                                                <p className="text-[10px] text-[#9CA3AF]">&copy; {new Date().getFullYear()} Retour Gagnant Bénin — Tradition, Modernité, Excellence</p>
                                            </div>
                                            {/* Bande tricolore bas */}
                                            <div className="h-1 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Boutons d'action ── */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <Paperclip size={12} />
                                <span>Les pièces jointes seront disponibles prochainement</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-all text-xs font-bold"
                                >
                                    <Trash2 size={14} />
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !toEmail || !subject}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                                    {sending ? 'Envoi en cours...' : 'Envoyer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* TAB: SENT EMAILS */}
            {/* ═══════════════════════════════════ */}
            {tab === 'sent' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-nexus-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center gap-2 bg-white/[0.01]">
                        <Inbox size={16} className="text-emerald-400" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Emails Envoyés</span>
                        <span className="ml-auto text-[10px] text-gray-500 font-bold">{sentEmails.length} emails</span>
                    </div>
                    {sentEmails.length === 0 ? (
                        <div className="p-16 text-center">
                            <Send size={32} className="mx-auto text-gray-700 mb-3" />
                            <p className="text-sm text-gray-500 font-bold">Aucun email envoyé pour le moment</p>
                            <p className="text-xs text-gray-600 mt-1">Vos emails envoyés apparaîtront ici.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {sentEmails.map(email => (
                                <div key={email.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {email.status === 'sent' ? (
                                                <CheckCircle2 size={16} className="text-emerald-400" />
                                            ) : (
                                                <AlertCircle size={16} className="text-red-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-bold text-white truncate">{email.to_email}</p>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                        email.status === 'sent'
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {email.status === 'sent' ? 'Envoyé' : 'Erreur'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(email.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 font-semibold">{email.subject}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══════════════════════════════════ */}
            {/* TAB: TEMPLATES */}
            {/* ═══════════════════════════════════ */}
            {tab === 'templates' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {EMAIL_TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="glass-nexus-card overflow-hidden group hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all">
                                <div className="p-5 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <Star size={18} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{tpl.subject}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { applyTemplate(tpl); setTab('compose') }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                        >
                                            <Edit3 size={12} />
                                            Utiliser
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    {/* Prévisualisation mini du template */}
                                    <div className="rounded-lg border border-white/5 overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" />
                                        <div
                                            className="p-4 bg-[#FAF8F4] text-[#1A1A1A] text-[10px] leading-relaxed max-h-[150px] overflow-hidden relative
                                                [&_ul]:list-disc [&_ul]:pl-4
                                                [&_ol]:list-decimal [&_ol]:pl-4
                                                [&_strong]:font-bold
                                                [&_p]:my-1"
                                            dangerouslySetInnerHTML={{ __html: tpl.body }}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FAF8F4] to-transparent pointer-events-none" style={{ position: 'relative', marginTop: '-32px' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Signature de pied ── */}
            <div className="text-center py-4">
                <p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">
                    Retour Gagnant Bénin — Messagerie Agent
                </p>
            </div>
        </div>
    )
}
