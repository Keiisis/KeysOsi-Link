'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2, Eye, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react'

interface ProposalItem {
    id: string
    proposal_id: string
    type: string
    title: string
    description: string | null
    location: string | null
    image_url: string | null
    original_price: number
    selling_price: number
    order_index: number
}

interface Proposal {
    id: string
    secret_key: string
    client_name: string
    client_email: string | null
    destination: string
    status: string
    total_amount: number
    markup_percentage: number
}

export default function AgentPresentationEditor({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [proposal, setProposal] = useState<Proposal | null>(null)
    const [items, setItems] = useState<ProposalItem[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [{ data: pData, error: pError }, { data: iData, error: iError }] = await Promise.all([
            supabase.from('ai_client_proposals').select('*').eq('id', id).single(),
            supabase.from('ai_proposal_items').select('*').eq('proposal_id', id).order('order_index', { ascending: true })
        ])

        if (pError || !pData) {
            console.error('Erreur:', pError)
            alert('Proposition introuvable.')
            router.push('/agent/presentations')
            return
        }

        if (iError) console.error('Erreur items:', iError)

        setProposal(pData)
        setItems(iData || [])
        setLoading(false)
    }, [id, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const updateItem = (index: number, field: keyof ProposalItem, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === items.length - 1) return

        const newItems = [...items]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
        setItems(newItems)
    }

    const addItem = () => {
        const newItem: ProposalItem = {
            id: 'temp-' + Date.now(),
            proposal_id: proposal!.id,
            type: 'activity',
            title: 'Nouvelle Slide',
            description: '',
            location: proposal!.destination,
            image_url: '',
            original_price: 0,
            selling_price: 0,
            order_index: items.length
        }
        setItems([...items, newItem])
    }

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (Number(item.selling_price) || 0), 0)
    }

    const saveChanges = async () => {
        if (!proposal) return
        setSaving(true)
        
        const newTotal = calculateTotal()

        try {
            // 1. Update proposal global
            await supabase.from('ai_client_proposals').update({
                total_amount: newTotal,
                status: 'ready'
            }).eq('id', proposal.id)

            // 2. Handle items (Delete old, insert new)
            // Simplified approach for MVP: Delete all items for this proposal, re-insert them with updated values
            await supabase.from('ai_proposal_items').delete().eq('proposal_id', proposal.id)
            
            const itemsToInsert = items.map((item, idx) => {
                const { id, ...rest } = item
                void id; // suppress unused var warning
                return {
                    ...rest,
                    order_index: idx
                }
            })
            
            await supabase.from('ai_proposal_items').insert(itemsToInsert)
            
            // Refresh data
            await fetchData()
            alert('Modifications sauvegardées avec succès ! Le lien client est prêt.')

        } catch (error) {
            console.error(error)
            alert('Erreur lors de la sauvegarde.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
    }

    if (!proposal) return null

    const publicUrl = `/p/${proposal.secret_key}`

    return (
        <div className="p-8 max-w-5xl mx-auto mb-20">
            <div className="flex items-center gap-4 mb-8">
                <button title="Retour" onClick={() => router.push('/agent/presentations')} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">Éditeur de Proposition</h1>
                    <p className="text-slate-400">Client : {proposal.client_name} • {proposal.destination}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors">
                        <Eye className="w-5 h-5" />
                        Aperçu Client
                    </a>
                    <button 
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Sauvegarder
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-lg">
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Total Facturé au Client</p>
                    <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                        {calculateTotal().toLocaleString()} FCFA
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-400 mb-1">Lien Secret à envoyer</p>
                    <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-emerald-400 font-mono text-sm max-w-xs truncate select-all">
                        {process.env.NEXT_PUBLIC_SITE_URL || ''}{publicUrl}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {items.map((item, index) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={item.id} 
                        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                    >
                        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-4">
                            <span className="bg-amber-500 text-slate-900 font-bold px-3 py-1 rounded-lg text-sm">
                                Slide {index + 1}
                            </span>
                            <select 
                                title="Modifier le type"
                                value={item.type}
                                onChange={(e) => updateItem(index, 'type', e.target.value)}
                                className="bg-transparent text-white font-medium focus:outline-none border-none"
                            >
                                <option value="hero">Accueil (Hero)</option>
                                <option value="hotel">Hébergement</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="activity">Activité / Visite</option>
                                <option value="transport">Transport</option>
                                <option value="pricing">Facture / Pricing</option>
                            </select>

                            <div className="ml-auto flex items-center gap-2">
                                <button title="Monter d'un cran" onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-2 text-slate-400 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                <button title="Descendre d'un cran" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="p-2 text-slate-400 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                <button title="Supprimer cette slide" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-12 gap-6">
                            <div className="col-span-12 md:col-span-8 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Titre</label>
                                    <input 
                                        type="text" 
                                        title="Titre de la slide"
                                        placeholder="Le nom de ce lieu ou de cette étape"
                                        value={item.title} 
                                        onChange={e => updateItem(index, 'title', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-medium focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Description</label>
                                    <textarea 
                                        rows={3}
                                        title="Description de la slide"
                                        placeholder="Décrivez l'endroit avec des mots chaleureux..."
                                        value={item.description || ''} 
                                        onChange={e => updateItem(index, 'description', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 focus:border-amber-500 focus:outline-none leading-relaxed"
                                    />
                                </div>
                            </div>
                            
                            <div className="col-span-12 md:col-span-4 space-y-4">
                                {item.type !== 'hero' && item.type !== 'pricing' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Prix Agent (Indicatif)</label>
                                            <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 font-mono">
                                                {item.original_price} FCFA
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-1 block">Prix Client Facturé *</label>
                                            <input 
                                                type="number" 
                                                title="Prix Client"
                                                placeholder="0"
                                                value={item.selling_price} 
                                                onChange={e => updateItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-500 font-bold focus:border-amber-500 focus:outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Image URL</label>
                                    <input 
                                        type="text" 
                                        value={item.image_url || ''} 
                                        onChange={e => updateItem(index, 'image_url', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-400 text-sm focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}

                <button 
                    onClick={addItem}
                    className="w-full py-6 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl text-slate-400 hover:text-amber-500 font-medium flex flex-col items-center justify-center gap-2 transition-all group"
                >
                    <div className="p-3 bg-slate-900 group-hover:bg-amber-500/10 rounded-full transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    Ajouter une Slide
                </button>
            </div>
            
            {/* Fixed bottom bar for saving if scrolled */}
            <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex justify-end px-8 z-40">
                <div className="flex items-center gap-6">
                    <span className="text-slate-400 font-medium">
                        Total Facture : <strong className="text-white text-xl ml-2">{calculateTotal().toLocaleString()} FCFA</strong>
                    </span>
                    <button 
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Sauvegarder et Valider
                    </button>
                </div>
            </div>
        </div>
    )
}
