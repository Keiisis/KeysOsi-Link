'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Megaphone, Eye, Palette, Zap, Star, StarOff, Copy, Check,
    Plus, Trash2, Search, ExternalLink, Save,
    Globe, Loader2, ChevronRight,
    TrendingUp, MessageCircle, ThumbsUp, Share2, BookOpen,
    AlertTriangle, Sparkles, Target, ArrowRight
} from 'lucide-react'
// Toutes les opérations DB passent par les API routes (service role, bypass RLS)

// ── Types ────────────────────────────────────────────────
interface SocialProfile {
    id: string
    platform: string
    username: string
    display_name?: string
    profile_url: string
    notes?: string
    last_analyzed_at?: string
    created_at: string
}

interface ScrapedPost {
    text: string
    likes: number
    comments: number
    shares: number
    date: string
    url: string
}

interface SearchPost {
    title: string
    url: string
    snippet: string
    date: string
    platform: string
    engagement_estimate: string
}

interface ContentItem {
    id: string
    platform: string
    text: string
    hashtags: string[]
    style_inspiration?: string
    viral_score: number
    is_favorite: boolean
    created_at: string
}

interface StyleAnalysis {
    tone: string
    vocabulary_level: string
    typical_structure: string
    hooks: string[]
    hashtag_strategy: string
    emoji_usage: string
    avg_post_length: string
    engagement_triggers: string[]
    writing_patterns: string[]
    improvement_tips: string[]
    viral_formula: string
    best_content_types: string[]
    call_to_action_style: string
}

interface GeneratedVariant {
    id: number
    text: string
    hashtags: string[]
    best_time: string
    viral_tips: string[]
    emoji_suggestions: string[]
    style_label: string
    estimated_engagement: string
}

// ── Helpers ───────────────────────────────────────────────
const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    facebook: { label: 'Facebook', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: '📘' },
    instagram: { label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', icon: '📸' },
    tiktok: { label: 'TikTok', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: '🎵' },
    linkedin: { label: 'LinkedIn', color: 'text-blue-300', bg: 'bg-blue-400/10 border-blue-400/20', icon: '💼' },
}

const ENGAGEMENT_COLOR: Record<string, string> = {
    viral: 'text-yellow-400 bg-yellow-500/10',
    élevé: 'text-emerald-400 bg-emerald-500/10',
    moyen: 'text-orange-400 bg-orange-500/10',
    faible: 'text-gray-400 bg-gray-500/10',
    inconnu: 'text-gray-500 bg-gray-500/5',
}

function PlatformBadge({ platform }: { platform: string }) {
    const cfg = PLATFORM_CONFIG[platform] || { label: platform, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', icon: '🌐' }
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    )
}

// ── Tabs ─────────────────────────────────────────────────
const TABS = [
    { id: 'veille', label: 'Veille', icon: Eye },
    { id: 'style', label: 'Analyse Style', icon: Palette },
    { id: 'viral', label: 'Posts Viraux', icon: TrendingUp },
    { id: 'generation', label: 'Génération', icon: Zap },
]

// ═════════════════════════════════════════════════════════
export default function CommunityManagerPage() {
    const [activeTab, setActiveTab] = useState('veille')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* ── Header ── */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
                    <Megaphone size={22} className="text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">Mon Community Manager Pro</h1>
                    <p className="text-purple-400 text-xs font-bold tracking-widest uppercase">Machine à Contenus Viraux • Intelligence Marketing IA</p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                isActive
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <Icon size={14} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'veille' && <VeilleTab />}
                    {activeTab === 'style' && <StyleTab copyToClipboard={copyToClipboard} copiedId={copiedId} />}
                    {activeTab === 'viral' && <ViralTab copyToClipboard={copyToClipboard} copiedId={copiedId} setActiveTab={setActiveTab} />}
                    {activeTab === 'generation' && <GenerationTab copyToClipboard={copyToClipboard} copiedId={copiedId} />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

// ═════════════════════════════════════════════════════════
// TAB 1 — VEILLE CONCURRENTIELLE
// ═════════════════════════════════════════════════════════
function VeilleTab() {
    const [profiles, setProfiles] = useState<SocialProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [scraping, setScraping] = useState<string | null>(null)
    const [scrapedData, setScrapedData] = useState<{ profileId: string; posts: ScrapedPost[]; method: string } | null>(null)

    const [form, setForm] = useState({ platform: 'facebook', profile_url: '', username: '', notes: '' })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => { fetchProfiles() }, [])

    const fetchProfiles = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/community-manager/profiles')
            const data = await res.json()
            setProfiles(Array.isArray(data) ? data : [])
        } catch {
            setProfiles([])
        }
        setLoading(false)
    }

    const addProfile = async () => {
        if (!form.profile_url.trim() || !form.username.trim()) {
            setError('URL du profil et nom d\'utilisateur sont obligatoires.')
            return
        }
        setAdding(true)
        setError(null)
        try {
            const res = await fetch('/api/community-manager/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setForm({ platform: 'facebook', profile_url: '', username: '', notes: '' })
            await fetchProfiles()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout')
        }
        setAdding(false)
    }

    const analyzeProfile = async (profile: SocialProfile) => {
        setScraping(profile.id)
        setScrapedData(null)
        try {
            const res = await fetch('/api/community-manager/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_url: profile.profile_url, platform: profile.platform }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            // Mettre à jour last_analyzed_at via API route (service role)
            await fetch('/api/community-manager/profiles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: profile.id, last_analyzed_at: new Date().toISOString() }),
            })

            setScrapedData({ profileId: profile.id, posts: data.posts, method: data.method })
            await fetchProfiles()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
        }
        setScraping(null)
    }

    const deleteProfile = async (id: string) => {
        await fetch(`/api/community-manager/profiles?id=${id}`, { method: 'DELETE' })
        await fetchProfiles()
        if (scrapedData?.profileId === id) setScrapedData(null)
    }

    return (
        <div className="space-y-6">
            {/* Formulaire ajout */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Plus size={16} className="text-purple-400" /> Ajouter un profil à surveiller</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Plateforme</label>
                        <select
                            value={form.platform}
                            onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                        >
                            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Nom d&apos;utilisateur</label>
                        <input
                            type="text"
                            placeholder="ex: retourgagnantbenin"
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">URL du profil</label>
                        <input
                            type="url"
                            placeholder="https://www.facebook.com/retourgagnantbenin"
                            value={form.profile_url}
                            onChange={e => setForm(f => ({ ...f, profile_url: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Notes (optionnel)</label>
                        <input
                            type="text"
                            placeholder="Concurrent local en trading, Bénin"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                </div>
                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button
                    type="button"
                    onClick={addProfile}
                    disabled={adding}
                    className="mt-4 bg-purple-500 hover:bg-purple-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Ajouter le profil
                </button>
            </div>

            {/* Liste des profils */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Eye size={16} className="text-purple-400" /> Profils surveillés ({profiles.length})</h2>
                {loading ? (
                    <div className="h-24 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
                ) : profiles.length === 0 ? (
                    <div className="h-24 flex flex-col items-center justify-center gap-2 text-gray-600">
                        <Globe size={24} />
                        <p className="text-sm">Aucun profil ajouté. Commencez par ajouter un concurrent.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {profiles.map(profile => (
                            <div key={profile.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <PlatformBadge platform={profile.platform} />
                                        <span className="text-white font-bold text-sm">@{profile.username}</span>
                                    </div>
                                    {profile.notes && <p className="text-gray-500 text-xs">{profile.notes}</p>}
                                    {profile.last_analyzed_at && (
                                        <p className="text-gray-600 text-[10px] mt-1">
                                            Dernière analyse : {new Date(profile.last_analyzed_at).toLocaleString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <a href={profile.profile_url} target="_blank" rel="noopener noreferrer" title="Voir le profil" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                        <ExternalLink size={14} />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => analyzeProfile(profile)}
                                        disabled={scraping === profile.id}
                                        title="Analyser ce profil"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {scraping === profile.id ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                        {scraping === profile.id ? 'Analyse...' : 'Analyser'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteProfile(profile.id)}
                                        title="Supprimer"
                                        className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Résultats du scraping */}
            {scrapedData && scrapedData.posts.length > 0 && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white font-bold flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-400" />
                            Publications récupérées ({scrapedData.posts.length})
                        </h2>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                            via {scrapedData.method === 'apify' ? '🤖 Apify' : '🔍 Serper'}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {scrapedData.posts.map((post, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{post.text || post.url}</p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                                    {post.likes > 0 && <span className="flex items-center gap-1"><ThumbsUp size={10} /> {post.likes.toLocaleString()}</span>}
                                    {post.comments > 0 && <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.comments.toLocaleString()}</span>}
                                    {post.shares > 0 && <span className="flex items-center gap-1"><Share2 size={10} /> {post.shares.toLocaleString()}</span>}
                                    {post.date && <span>{new Date(post.date).toLocaleDateString('fr-FR')}</span>}
                                    {post.url && (
                                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
                                            <ExternalLink size={10} /> Voir
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notice Apify */}
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-xs text-yellow-400/70 flex items-start gap-2">
                <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-yellow-400">Conseil :</span> Pour des données d&apos;engagement précises (likes, commentaires), configurez une clé Apify dans <code className="bg-white/5 px-1 rounded">Supabase → settings → apify_api_key</code>. Sans clé, le système utilise Google Search (données textuelles seulement).
                </div>
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════
// TAB 2 — ANALYSE DE STYLE
// ═════════════════════════════════════════════════════════
function StyleTab({ copyToClipboard, copiedId }: { copyToClipboard: (t: string, id: string) => void; copiedId: string | null }) {
    const [samples, setSamples] = useState('')
    const [platform, setPlatform] = useState('facebook')
    const [profileUrl, setProfileUrl] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [styleInspiration, setStyleInspiration] = useState<string | null>(null)

    const analyze = async () => {
        if (samples.trim().length < 50) {
            setError('Veuillez coller au moins 50 caractères de publications à analyser.')
            return
        }
        setAnalyzing(true)
        setError(null)
        setAnalysis(null)
        try {
            const res = await fetch('/api/community-manager/analyze-style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ samples, platform, profile_url: profileUrl }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setAnalysis(data.analysis)
            setStyleInspiration(data.analysis?.viral_formula || null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
        }
        setAnalyzing(false)
    }

    const saveStyleInspiration = () => {
        if (styleInspiration) {
            sessionStorage.setItem('cm_style_inspiration', styleInspiration)
            alert('Style sauvegardé ! Disponible dans l\'onglet Génération.')
        }
    }

    return (
        <div className="space-y-6">
            {/* Formulaire */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Palette size={16} className="text-purple-400" /> Analyser un style d&apos;écriture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Plateforme</label>
                        <select
                            value={platform}
                            onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                        >
                            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">URL du profil (optionnel)</label>
                        <input
                            type="url"
                            placeholder="https://www.facebook.com/..."
                            value={profileUrl}
                            onChange={e => setProfileUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-bold mb-1.5 block">Publications à analyser (copiez-collez 5 à 10 posts)</label>
                    <textarea
                        value={samples}
                        onChange={e => setSamples(e.target.value)}
                        rows={8}
                        placeholder="Collez ici plusieurs publications du profil que vous souhaitez analyser...&#10;&#10;Exemple :&#10;---&#10;Publication 1&#10;---&#10;Publication 2&#10;---"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600 resize-none"
                    />
                    <p className="text-gray-600 text-xs mt-1">{samples.length} caractères — {samples.length < 50 ? `encore ${50 - samples.length} min` : '✓ prêt à analyser'}</p>
                </div>
                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button
                    type="button"
                    onClick={analyze}
                    disabled={analyzing || samples.trim().length < 50}
                    className="mt-4 bg-purple-500 hover:bg-purple-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {analyzing ? 'Analyse IA en cours...' : 'Analyser le Style IA'}
                </button>
            </div>

            {/* Résultat analyse */}
            {analysis && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Formule virale */}
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">Formule Virale</p>
                                <p className="text-white font-bold text-lg leading-relaxed">{analysis.viral_formula}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(analysis.viral_formula, 'formula')}
                                    title="Copier la formule"
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                >
                                    {copiedId === 'formula' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={saveStyleInspiration}
                                    title="Utiliser ce style dans la génération"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all"
                                >
                                    <ArrowRight size={12} /> Utiliser pour générer
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Métriques */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Ton', value: analysis.tone, color: 'text-pink-400' },
                            { label: 'Vocabulaire', value: analysis.vocabulary_level, color: 'text-blue-400' },
                            { label: 'Longueur', value: analysis.avg_post_length, color: 'text-yellow-400' },
                            { label: 'CTA Style', value: analysis.call_to_action_style, color: 'text-emerald-400' },
                        ].map(metric => (
                            <div key={metric.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider mb-1">{metric.label}</p>
                                <p className={`font-bold text-sm ${metric.color}`}>{metric.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Hooks et patterns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnalysisCard title="Accroches récurrentes" items={analysis.hooks} color="text-yellow-400" icon="🎣" />
                        <AnalysisCard title="Déclencheurs d'engagement" items={analysis.engagement_triggers} color="text-orange-400" icon="⚡" />
                        <AnalysisCard title="Types de contenu gagnants" items={analysis.best_content_types} color="text-cyan-400" icon="🏆" />
                        <AnalysisCard title="Tips pour améliorer" items={analysis.improvement_tips} color="text-emerald-400" icon="💡" />
                    </div>

                    {/* Structure et stratégies */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                            <p className="text-gray-500 text-xs font-bold mb-2">📐 Structure type</p>
                            <p className="text-gray-300 text-sm">{analysis.typical_structure}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                            <p className="text-gray-500 text-xs font-bold mb-2"># Stratégie hashtags</p>
                            <p className="text-gray-300 text-sm">{analysis.hashtag_strategy}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}

function AnalysisCard({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: string }) {
    return (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <p className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${color}`}>
                <span>{icon}</span> {title}
            </p>
            <ul className="space-y-1.5">
                {(items || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <ChevronRight size={12} className={`flex-shrink-0 mt-0.5 ${color}`} />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
}

// ═════════════════════════════════════════════════════════
// TAB 3 — PUBLICATIONS VIRALES
// ═════════════════════════════════════════════════════════
function ViralTab({
    copyToClipboard, copiedId, setActiveTab
}: {
    copyToClipboard: (t: string, id: string) => void
    copiedId: string | null
    setActiveTab: (t: string) => void
}) {
    const [keywords, setKeywords] = useState('')
    const [platform, setPlatform] = useState('all')
    const [profileUrl, setProfileUrl] = useState('')
    const [searching, setSearching] = useState(false)
    const [posts, setPosts] = useState<SearchPost[]>([])
    const [error, setError] = useState<string | null>(null)
    const [profiles, setProfiles] = useState<SocialProfile[]>([])

    useEffect(() => {
        fetch('/api/community-manager/profiles').then(r => r.json()).then(data => setProfiles(Array.isArray(data) ? data : []))
    }, [])

    const searchPosts = async () => {
        if (!keywords.trim() && !profileUrl.trim()) {
            setError('Entrez des mots-clés ou sélectionnez un profil.')
            return
        }
        setSearching(true)
        setError(null)
        setPosts([])
        try {
            const res = await fetch('/api/community-manager/search-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords, platform, profile_url: profileUrl, num: 15 }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setPosts(data.posts || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de recherche')
        }
        setSearching(false)
    }

    const reproduceFormat = (post: SearchPost) => {
        sessionStorage.setItem('cm_reproduce_topic', post.title || post.snippet)
        sessionStorage.setItem('cm_reproduce_platform', post.platform)
        setActiveTab('generation')
    }

    return (
        <div className="space-y-6">
            {/* Formulaire */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-purple-400" /> Rechercher des publications virales</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Plateforme</label>
                        <select
                            value={platform}
                            onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                        >
                            <option value="all">🌐 Toutes</option>
                            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Profil surveillé (optionnel)</label>
                        <select
                            value={profileUrl}
                            onChange={e => setProfileUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                        >
                            <option value="">— Aucun profil —</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.profile_url}>@{p.username} ({p.platform})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Mots-clés</label>
                        <input
                            type="text"
                            placeholder="trading Bénin investissement..."
                            value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchPosts()}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-gray-600"
                        />
                    </div>
                </div>
                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button
                    type="button"
                    onClick={searchPosts}
                    disabled={searching}
                    className="mt-4 bg-purple-500 hover:bg-purple-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                    {searching ? 'Recherche en cours...' : 'Rechercher les top posts'}
                </button>
            </div>

            {/* Résultats */}
            {posts.length > 0 && (
                <div className="space-y-3">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{posts.length} publications trouvées</p>
                    {posts.map((post, idx) => (
                        <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <PlatformBadge platform={post.platform} />
                                        {post.engagement_estimate !== 'inconnu' && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ENGAGEMENT_COLOR[post.engagement_estimate] || ''}`}>
                                                {post.engagement_estimate === 'viral' ? '🔥' : post.engagement_estimate === 'élevé' ? '📈' : '📊'} {post.engagement_estimate}
                                            </span>
                                        )}
                                        {post.date && <span className="text-[10px] text-gray-600">{post.date}</span>}
                                    </div>
                                    {post.title && <p className="text-white font-bold text-sm mb-1 line-clamp-1">{post.title}</p>}
                                    <p className="text-gray-400 text-sm line-clamp-2">{post.snippet}</p>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" title="Voir la publication" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                        <ExternalLink size={14} />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(post.snippet, `post-${idx}`)}
                                        title="Copier"
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                    >
                                        {copiedId === `post-${idx}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => reproduceFormat(post)}
                                        title="Reproduire ce format"
                                        className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"
                                    >
                                        <Zap size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!searching && posts.length === 0 && keywords.trim().length > 0 && (
                <div className="h-24 flex flex-col items-center justify-center gap-2 text-gray-600">
                    <Search size={24} />
                    <p className="text-sm">Aucun résultat. Essayez d&apos;autres mots-clés.</p>
                </div>
            )}
        </div>
    )
}

// ═════════════════════════════════════════════════════════
// TAB 4 — GÉNÉRATION VIRALE
// ═════════════════════════════════════════════════════════
function GenerationTab({ copyToClipboard, copiedId }: { copyToClipboard: (t: string, id: string) => void; copiedId: string | null }) {
    const [form, setForm] = useState({
        topic: '',
        platform: 'facebook',
        tone: 'inspirant',
        target_audience: 'investisseurs et entrepreneurs béninois',
        style_inspiration: '',
        language: 'fr',
    })
    const [generating, setGenerating] = useState(false)
    const [variants, setVariants] = useState<GeneratedVariant[]>([])
    const [error, setError] = useState<string | null>(null)
    const [library, setLibrary] = useState<ContentItem[]>([])
    const [savingId, setSavingId] = useState<number | null>(null)

    // Charger style depuis session storage (si venu de l'onglet Style)
    useEffect(() => {
        const savedStyle = sessionStorage.getItem('cm_style_inspiration')
        const savedTopic = sessionStorage.getItem('cm_reproduce_topic')
        const savedPlatform = sessionStorage.getItem('cm_reproduce_platform')
        if (savedStyle) setForm(f => ({ ...f, style_inspiration: savedStyle }))
        if (savedTopic) setForm(f => ({ ...f, topic: savedTopic }))
        if (savedPlatform && PLATFORM_CONFIG[savedPlatform]) setForm(f => ({ ...f, platform: savedPlatform }))
        loadLibrary()
    }, [])

    const loadLibrary = async () => {
        try {
            const res = await fetch('/api/community-manager/library')
            const data = await res.json()
            setLibrary(Array.isArray(data) ? data : [])
        } catch {
            setLibrary([])
        }
    }

    const generate = async () => {
        if (!form.topic.trim()) {
            setError('Le sujet est obligatoire.')
            return
        }
        setGenerating(true)
        setError(null)
        setVariants([])
        try {
            const res = await fetch('/api/community-manager/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setVariants(data.variants || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la génération')
        }
        setGenerating(false)
    }

    const saveToLibrary = async (variant: GeneratedVariant) => {
        setSavingId(variant.id)
        await fetch('/api/community-manager/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: form.platform,
                content_type: 'post',
                text: variant.text,
                hashtags: variant.hashtags,
                style_inspiration: form.style_inspiration || null,
                viral_score: variant.estimated_engagement === 'viral' ? 5 : variant.estimated_engagement === 'élevé' ? 4 : 3,
            }),
        })
        await loadLibrary()
        setSavingId(null)
    }

    const toggleFavorite = async (item: ContentItem) => {
        await fetch('/api/community-manager/library', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, is_favorite: !item.is_favorite }),
        })
        await loadLibrary()
    }

    const deleteFromLibrary = async (id: string) => {
        await fetch(`/api/community-manager/library?id=${id}`, { method: 'DELETE' })
        await loadLibrary()
    }

    const ENGAGEMENT_ICON: Record<string, string> = {
        viral: '🔥 Viral',
        élevé: '📈 Élevé',
        moyen: '📊 Moyen',
        faible: '📉 Faible',
    }

    return (
        <div className="space-y-6">
            {/* Formulaire */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Zap size={16} className="text-yellow-400" /> Générer du contenu viral</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Sujet / Topic *</label>
                        <input
                            type="text"
                            placeholder="ex: Comment multiplier son capital en 6 mois avec le trading"
                            value={form.topic}
                            onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Plateforme</label>
                        <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50">
                            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Ton</label>
                        <select value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50">
                            <option value="inspirant">💫 Inspirant</option>
                            <option value="informatif">📚 Informatif</option>
                            <option value="urgent">⚡ Urgent / Offre limitée</option>
                            <option value="humoristique">😄 Humoristique</option>
                            <option value="autoritaire">💎 Autoritaire / Expert</option>
                            <option value="storytelling">📖 Storytelling</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Langue</label>
                        <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50">
                            <option value="fr">🇫🇷 Français</option>
                            <option value="fon">🇧🇯 Fon (béninois)</option>
                            <option value="en">🇬🇧 Anglais</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Audience cible</label>
                        <input type="text" placeholder="ex: entrepreneurs béninois 25-40 ans"
                            value={form.target_audience}
                            onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 placeholder:text-gray-600"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-500 font-bold mb-1.5 block">Inspiration de style (optionnel — ou depuis l&apos;onglet Analyse)</label>
                        <textarea
                            placeholder="ex: Ton autoritaire avec des chiffres concrets, emojis rares, CTA fort en fin de post..."
                            value={form.style_inspiration}
                            onChange={e => setForm(f => ({ ...f, style_inspiration: e.target.value }))}
                            rows={2}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 placeholder:text-gray-600 resize-none"
                        />
                    </div>
                </div>
                {error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button
                    type="button"
                    onClick={generate}
                    disabled={generating || !form.topic.trim()}
                    className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {generating ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                    {generating ? 'Génération IA en cours...' : 'Générer 3 Variantes Virales'}
                </button>
            </div>

            {/* Variantes générées */}
            {variants.length > 0 && (
                <div className="space-y-4">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">3 variantes générées</p>
                    {variants.map((variant, idx) => (
                        <motion.div
                            key={variant.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all"
                        >
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">Variante {variant.id}</span>
                                    <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{variant.style_label}</span>
                                    {variant.estimated_engagement && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ENGAGEMENT_COLOR[variant.estimated_engagement] || ''}`}>
                                            {ENGAGEMENT_ICON[variant.estimated_engagement] || variant.estimated_engagement}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(variant.text + '\n\n' + variant.hashtags.join(' '), `variant-${variant.id}`)}
                                        title="Copier le texte + hashtags"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-all"
                                    >
                                        {copiedId === `variant-${variant.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        Copier
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => saveToLibrary(variant)}
                                        disabled={savingId === variant.id}
                                        title="Sauvegarder en bibliothèque"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {savingId === variant.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        Sauvegarder
                                    </button>
                                </div>
                            </div>

                            {/* Texte du post */}
                            <div className="bg-black/30 rounded-xl p-4 mb-4 font-mono text-sm text-gray-200 whitespace-pre-wrap leading-relaxed border border-white/5">
                                {variant.text}
                            </div>

                            {/* Hashtags */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {variant.hashtags.map((tag, i) => (
                                    <span key={i} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/10">
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))}
                            </div>

                            {/* Tips et infos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-white/[0.02] rounded-lg p-3">
                                    <p className="text-gray-600 text-[10px] font-bold mb-1.5">🕐 Meilleur moment de publication</p>
                                    <p className="text-gray-300 text-xs">{variant.best_time}</p>
                                </div>
                                <div className="bg-white/[0.02] rounded-lg p-3">
                                    <p className="text-gray-600 text-[10px] font-bold mb-1.5">😀 Emojis recommandés</p>
                                    <p className="text-2xl">{variant.emoji_suggestions?.join(' ')}</p>
                                </div>
                                {variant.viral_tips?.map((tip, i) => (
                                    <div key={i} className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 flex items-start gap-2">
                                        <Target size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-yellow-200/70 text-xs">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Bibliothèque de contenu */}
            {library.length > 0 && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                        <BookOpen size={16} className="text-purple-400" /> Bibliothèque ({library.length})
                    </h2>
                    <div className="space-y-3">
                        {library.map(item => (
                            <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <PlatformBadge platform={item.platform} />
                                        <span className="text-[10px] text-gray-600">{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm line-clamp-2">{item.text}</p>
                                    {item.hashtags?.length > 0 && (
                                        <p className="text-purple-400/60 text-xs mt-1 truncate">{item.hashtags.slice(0, 5).join(' ')}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleFavorite(item)}
                                        title={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                        className={`p-1.5 rounded-lg transition-all ${item.is_favorite ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-400'}`}
                                    >
                                        {item.is_favorite ? <Star size={13} /> : <StarOff size={13} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(item.text + '\n\n' + (item.hashtags || []).join(' '), `lib-${item.id}`)}
                                        title="Copier"
                                        className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-all"
                                    >
                                        {copiedId === `lib-${item.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteFromLibrary(item.id)}
                                        title="Supprimer"
                                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
