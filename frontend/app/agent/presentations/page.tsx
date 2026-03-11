'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Plus, FileText, Calendar, Wallet, Globe, ArrowRight, Loader2, Play, Wand2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Proposal {
    id: string
    secret_key: string
    client_name: string
    destination: string
    status: string
    total_amount: number
    created_at: string
}

export default function AgentPresentationsPage() {
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [loading, setLoading] = useState(true)
    const [newModalOpen, setNewModalOpen] = useState(false)
    const router = useRouter()

    // Form state
    const [formData, setFormData] = useState({
        client_name: '',
        client_email: '',
        client_phone: '',
        destination: '',
        start_date: '',
        end_date: '',
        budget: '',
        activities: '',
        notes: ''
    })
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        fetchProposals()
    }, [])

    const fetchProposals = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('ai_client_proposals')
            .select('id, secret_key, client_name, destination, status, total_amount, created_at')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setProposals(data)
        }
        setLoading(false)
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.client_name || !formData.destination) return

        setIsGenerating(true)
        try {
            const res = await fetch('/api/ai/generate-proposal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const json = await res.json()
            if (json.success && json.proposalId) {
                // Redirect to the editor
                router.push(`/agent/presentations/${json.proposalId}`)
            } else {
                alert(json.error || 'Erreur lors de la génération.')
            }
        } catch (err) {
            console.error(err)
            alert('Erreur serveur.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Smart Slides VIP</h1>
                    <p className="text-slate-400">Générez et gérez des propositions de services premium propulsées par l'IA.</p>
                </div>
                <button
                    onClick={() => setNewModalOpen(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-medium transition-all shadow-xl shadow-amber-900/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nouvelle Proposition</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {proposals.map((prop) => (
                        <div key={prop.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${prop.status === 'draft' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {prop.status === 'draft' ? 'Brouillon' : 'Envoyé'}
                                </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-1">{prop.client_name}</h3>
                            <p className="text-amber-400 font-medium mb-4 flex items-center gap-2">
                                <Globe className="w-4 h-4" /> {prop.destination}
                            </p>
                            
                            <div className="space-y-2 mb-6 text-sm text-slate-400">
                                <div className="flex justify-between">
                                    <span>Date de création:</span>
                                    <span className="text-slate-300">{new Date(prop.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Montant total:</span>
                                    <span className="text-white font-bold">{prop.total_amount?.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ID Secret:</span>
                                    <span className="text-slate-500 font-mono">{prop.secret_key}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => router.push(`/agent/presentations/${prop.id}`)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2 text-sm"
                                >
                                    Modifier <ArrowRight className="w-4 h-4" />
                                </button>
                                <a 
                                    href={`/p/${prop.secret_key}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 py-2 rounded-lg font-bold transition-colors flex justify-center items-center gap-2"
                                    title="Voir la Slide Client"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                </a>
                            </div>
                        </div>
                    ))}
                    {proposals.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Aucune proposition pour le moment.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Création */}
            <AnimatePresence>
                {newModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-amber-500" />
                                        Générer un Devis IA
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-1">L'IA va créer une proposition complète en recherchant sur le terrain.</p>
                                </div>
                                <button onClick={() => setNewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors" title="Fermer">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form id="generate-form" onSubmit={handleGenerate} className="space-y-6">
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Nom du Client *</label>
                                            <input required type="text" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Ex: Jean Dupont" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Email du Client</label>
                                            <input type="email" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Ex: jean@email.com" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Destination exacte (Ville) *</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <input required type="text" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Ex: Ouidah, Abomey..." />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Date de début</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                                <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">Date de fin</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                                <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Budget du client (Indicatif)</label>
                                        <div className="relative">
                                            <Wallet className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <input type="text" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Ex: Confortable, VIP, Économique..." />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Activités souhaitées / Préférences</label>
                                        <textarea rows={2} value={formData.activities} onChange={e => setFormData({...formData, activities: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Ex: Histoire de l'esclavage, Détente à la plage, Gastronomie locale..." />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Notes pour l'IA</label>
                                        <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" placeholder="Toute autre instruction pour générer ce devis..." />
                                    </div>

                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 z-10">
                                <button type="button" onClick={() => setNewModalOpen(false)} className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    form="generate-form"
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Génération en cours... (15-20s)
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-5 h-5" />
                                            Lancer la magie IA
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
