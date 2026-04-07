'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Trash2, Copy, CheckCheck, Sparkles, RefreshCw } from 'lucide-react'

const GOLD = '#D4AF37'; const YELLOW = '#FCD116'; const GREEN = '#008751'
const GREEN_L = '#00A86B'; const BG = '#0B1F0D'; const TEXT = '#F0EBD8'
const PANEL = '#0D2615'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    ts: Date
}

const SUGGESTIONS = [
    'Analyse les performances de ce mois et donne-moi 3 actions prioritaires',
    'Rédige un rapport exécutif hebdomadaire pour les actionnaires',
    'Quelles stratégies pour augmenter le revenu de 20% ce trimestre ?',
    'Comment optimiser le tunnel de conversion pour les demandes de nationalité ?',
    'Rédige un email de relance professionnel pour les clients inactifs',
    'Analyse les risques sécurité actuels et recommande des mesures',
]

function parseThinking(raw: string): { thinking: string; content: string } {
    const match = raw.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/)
    if (match) return { thinking: match[1].trim(), content: match[2].trim() }
    return { thinking: '', content: raw }
}

function MarkdownText({ text }: { text: string }) {
    const lines = text.split('\n')
    return (
        <div className="space-y-1.5 text-sm leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('### ')) return <h3 key={i} className="font-black text-sm mt-3 mb-1" style={{ color: GOLD }}>{line.slice(4)}</h3>
                if (line.startsWith('## ')) return <h2 key={i} className="font-black text-base mt-4 mb-1" style={{ color: GOLD }}>{line.slice(3)}</h2>
                if (line.startsWith('# ')) return <h1 key={i} className="font-black text-lg mt-4 mb-2" style={{ color: GOLD }}>{line.slice(2)}</h1>
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold" style={{ color: TEXT }}>{line.slice(2, -2)}</p>
                if (line.startsWith('- ') || line.startsWith('• ')) return (
                    <div key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
                        <span style={{ color: `${TEXT}CC` }}>{line.slice(2)}</span>
                    </div>
                )
                if (/^\d+\.\s/.test(line)) {
                    const num = line.match(/^(\d+)\.\s(.*)/)
                    return num ? (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className="font-black text-xs shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${GOLD}25`, color: GOLD }}>{num[1]}</span>
                            <span style={{ color: `${TEXT}CC` }}>{num[2]}</span>
                        </div>
                    ) : <p key={i} style={{ color: `${TEXT}CC` }}>{line}</p>
                }
                if (line === '') return <div key={i} className="h-1" />
                return <p key={i} style={{ color: `${TEXT}CC` }}>{line}</p>
            })}
        </div>
    )
}

export default function CeoAssistant() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const send = useCallback(async (text?: string) => {
        const content = (text || input).trim()
        if (!content || loading) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content, ts: new Date() }
        const assistantId = (Date.now() + 1).toString()

        setMessages(prev => [...prev, userMsg, {
            id: assistantId, role: 'assistant', content: '', ts: new Date(),
        }])
        setInput('')
        setLoading(true)

        try {
            const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
            const res = await fetch('/api/ai/gemma', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            })

            if (!res.ok) throw new Error(`Erreur ${res.status}`)

            // Lecture du flux SSE token par token
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed === 'data: [DONE]') continue
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const { t } = JSON.parse(trimmed.slice(6))
                            if (t) {
                                accumulated += t
                                const { thinking, content: answer } = parseThinking(accumulated)
                                setMessages(prev => prev.map(m =>
                                    m.id === assistantId
                                        ? { ...m, content: answer || accumulated, thinking: thinking || undefined }
                                        : m
                                ))
                            }
                        } catch { /* chunk incomplet */ }
                    }
                }
            }
        } catch (e) {
            setMessages(prev => prev.map(m =>
                m.id === (Date.now() + 1).toString()
                    ? { ...m, content: `Erreur : ${e instanceof Error ? e.message : 'inconnue'}` }
                    : m
            ).map(m => m.content === '' && m.role === 'assistant'
                ? { ...m, content: `Erreur de connexion à Gemma 4. ${e instanceof Error ? e.message : ''}` }
                : m
            ))
        }
        setLoading(false)
        inputRef.current?.focus()
    }, [input, loading, messages])

    const copy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
    }

    const fmtTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="flex flex-col h-full" style={{ background: BG, color: TEXT }}>

            {/* Header */}
            <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: `${GOLD}15`, background: PANEL }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                        style={{ background: `linear-gradient(135deg, ${GOLD}, #9A7A00, ${YELLOW})` }}>
                        <Sparkles size={18} style={{ color: BG }} />
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse"
                            style={{ background: GREEN_L, borderColor: BG }} />
                    </div>
                    <div>
                        <p className="font-black text-sm tracking-wider" style={{ color: GOLD }}>GEMMA 4</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${GREEN_L}80` }}>
                            31B · NVIDIA NIM · Thinking Mode
                        </p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button onClick={() => setMessages([])} title="Effacer la conversation"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                        style={{ background: `${GOLD}12`, color: `${TEXT}50` }}>
                        <Trash2 size={12} /> Effacer
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Accueil */}
                {messages.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center min-h-[300px] text-center px-6">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, #9A7A00, ${YELLOW})` }}>
                            <Sparkles size={36} style={{ color: BG }} />
                        </div>
                        <h2 className="text-2xl font-black mb-2" style={{
                            background: `linear-gradient(135deg, ${GOLD}, ${YELLOW})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>Gemma 4 31B</h2>
                        <p className="text-sm opacity-50 mb-1">Propulsé par NVIDIA NIM · Thinking Mode activé</p>
                        <p className="text-xs opacity-30 mb-8">Votre assistant IA exécutif — stratégie, analyses, rédaction</p>

                        {/* Suggestions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                            {SUGGESTIONS.map((s, i) => (
                                <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    onClick={() => send(s)}
                                    className="text-left px-4 py-3 rounded-xl text-xs transition-all hover:opacity-80"
                                    style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}15`, color: `${TEXT}70` }}>
                                    {s}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Historique */}
                <AnimatePresence initial={false}>
                    {messages.map(msg => (
                        <motion.div key={msg.id}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                                style={{
                                    background: msg.role === 'user'
                                        ? `${GOLD}25`
                                        : `linear-gradient(135deg, ${GOLD}, #9A7A00)`,
                                }}>
                                {msg.role === 'user'
                                    ? <User size={14} style={{ color: GOLD }} />
                                    : <Bot size={14} style={{ color: BG }} />}
                            </div>

                            <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

                                {/* Thinking block */}
                                {msg.thinking && (
                                    <details className="w-full">
                                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg w-fit"
                                            style={{ color: `${GREEN_L}60`, background: `${GREEN}10` }}>
                                            <RefreshCw size={9} className="inline mr-1" />Processus de réflexion
                                        </summary>
                                        <div className="mt-1 px-3 py-2 rounded-xl text-xs italic opacity-40 border"
                                            style={{ borderColor: `${GREEN}20`, background: `${GREEN}08`, color: TEXT }}>
                                            {msg.thinking}
                                        </div>
                                    </details>
                                )}

                                {/* Bulle */}
                                <div className="relative group rounded-2xl px-4 py-3"
                                    style={{
                                        background: msg.role === 'user'
                                            ? `linear-gradient(135deg, ${GOLD}25, ${GOLD}15)`
                                            : PANEL,
                                        border: `1px solid ${msg.role === 'user' ? `${GOLD}25` : `${GOLD}10`}`,
                                    }}>
                                    {msg.role === 'assistant'
                                        ? <MarkdownText text={msg.content} />
                                        : <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{msg.content}</p>
                                    }

                                    {/* Copy button */}
                                    <button onClick={() => copy(msg.content, msg.id)}
                                        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-70 transition-opacity"
                                        style={{ background: `${GOLD}15` }} title="Copier">
                                        {copied === msg.id
                                            ? <CheckCheck size={11} style={{ color: GREEN_L }} />
                                            : <Copy size={11} style={{ color: GOLD }} />}
                                    </button>
                                </div>

                                <span className="text-[10px] opacity-25 px-1">{fmtTime(msg.ts)}</span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Indicateur de chargement */}
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${GOLD}, #9A7A00)` }}>
                            <Bot size={14} style={{ color: BG }} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl" style={{ background: PANEL, border: `1px solid ${GOLD}10` }}>
                            <div className="flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" style={{ color: GOLD }} />
                                <span className="text-xs" style={{ color: `${TEXT}50` }}>Gemma 4 réfléchit…</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-4 border-t" style={{ borderColor: `${GOLD}15`, background: PANEL }}>
                <div className="flex gap-3 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                        }}
                        placeholder="Posez une question à Gemma 4… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
                        rows={2}
                        className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-all"
                        style={{
                            background: `${BG}`,
                            border: `1px solid ${input ? `${GOLD}40` : `${GOLD}15`}`,
                            color: TEXT,
                            maxHeight: 160,
                        }}
                    />
                    <button
                        onClick={() => send()}
                        disabled={!input.trim() || loading}
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                        style={{
                            background: input.trim() && !loading
                                ? `linear-gradient(135deg, ${GOLD}, #9A7A00)`
                                : `${GOLD}20`,
                        }}>
                        {loading
                            ? <Loader2 size={17} className="animate-spin" style={{ color: GOLD }} />
                            : <Send size={17} style={{ color: input.trim() ? BG : GOLD }} />}
                    </button>
                </div>
                <p className="text-[10px] text-center mt-2 opacity-20">
                    Gemma 4 31B · NVIDIA NIM · Thinking Mode · max 16 384 tokens
                </p>
            </div>
        </div>
    )
}
