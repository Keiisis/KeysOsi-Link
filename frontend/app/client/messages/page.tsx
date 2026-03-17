'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface Message {
    id: string
    sujet: string
    message: string
    type: string
    lu: boolean
    created_at: string
    reponse?: string
    reponse_at?: string
}

export default function ClientMessagesPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ sujet: '', message: '' })
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [clientInfo, setClientInfo] = useState({ nom: '', prenom: '', email: '', phone: '' })
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            const email = session.user.email || ''

            const { data: profile } = await supabase
                .from('client_profiles')
                .select('nom, prenom, phone')
                .eq('id', session.user.id)
                .single()

            setClientInfo({ email, nom: profile?.nom || '', prenom: profile?.prenom || '', phone: profile?.phone || '' })

            const { data } = await supabase
                .from('messages')
                .select('id, sujet, message, type, lu, created_at, reponse, reponse_at')
                .eq('email', email)
                .order('created_at', { ascending: false })

            setMessages(data as Message[] || [])
            setLoading(false)
        }
        load()
    }, [])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.sujet.trim() || !form.message.trim()) return
        setSending(true)
        setError('')

        try {
            const { error: insertErr } = await supabase
                .from('messages')
                .insert({
                    nom: clientInfo.nom || clientInfo.email.split('@')[0],
                    prenom: clientInfo.prenom || '',
                    email: clientInfo.email,
                    telephone: clientInfo.phone,
                    sujet: form.sujet,
                    message: form.message,
                    type: 'support',
                    lu: false,
                })

            if (insertErr) throw new Error(insertErr.message)

            // Reload messages
            const { data } = await supabase
                .from('messages')
                .select('id, sujet, message, type, lu, created_at, reponse, reponse_at')
                .eq('email', clientInfo.email)
                .order('created_at', { ascending: false })

            setMessages(data as Message[] || [])
            setForm({ sujet: '', message: '' })
            setSent(true)
            setTimeout(() => setSent(false), 3000)
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi.')
        }
        setSending(false)
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.3em]">Messagerie</span>
                </div>
                <h1 className="text-2xl font-black text-white">Messages</h1>
                <p className="text-gray-500 text-sm mt-1">Envoyez un message à votre agent. Réponse sous 24h.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* New message form */}
                <div className="bg-[#0a1221] border border-white/[0.06] rounded-2xl p-5">
                    <h2 className="font-black text-white text-sm mb-4 flex items-center gap-2">
                        <Send size={15} className="text-emerald-400" /> Nouveau message
                    </h2>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/15">
                                    <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-400 text-[12px]">{error}</p>
                                </div>
                            </motion.div>
                        )}
                        {sent && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <p className="text-emerald-400 text-[12px] font-bold">Message envoyé avec succès !</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Sujet</label>
                            <input type="text" required value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
                                placeholder="Ex: Question sur mon dossier de nationalité"
                                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/40 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none text-sm transition-colors" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] block mb-1.5">Message</label>
                            <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Décrivez votre demande ou question..."
                                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/40 rounded-xl py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none text-sm resize-none transition-colors" />
                        </div>
                        <motion.button type="submit" disabled={sending} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                            {sending ? <Loader2 className="animate-spin" size={16} /> : <><Send size={14} /> Envoyer le message</>}
                        </motion.button>
                    </form>
                </div>

                {/* History */}
                <div className="bg-[#0a1221] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-white/[0.06]">
                        <h2 className="font-black text-white text-sm flex items-center gap-2">
                            <Clock size={15} className="text-blue-400" /> Historique ({messages.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[480px]">
                        {loading ? (
                            <div className="flex items-center justify-center p-10">
                                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="p-10 text-center">
                                <MessageSquare size={28} className="text-gray-700 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Aucun message pour le moment.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {messages.map(msg => (
                                    <div key={msg.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="text-sm font-bold text-white">{msg.sujet}</p>
                                            {!msg.lu && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                                        </div>
                                        <p className="text-[12px] text-gray-400 line-clamp-2 mb-2">{msg.message}</p>
                                        <p className="text-[10px] text-gray-600">{new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        {msg.reponse && (
                                            <div className="mt-2 p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                                                <p className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Réponse de l'agent
                                                </p>
                                                <p className="text-[12px] text-gray-300">{msg.reponse}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
