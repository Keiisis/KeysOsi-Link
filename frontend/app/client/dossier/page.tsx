'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FolderOpen, CheckCircle2, Clock, AlertCircle, ChevronRight, Calendar } from 'lucide-react'

interface Dossier {
    id: string
    num_dossier: string
    service_type: string
    statut: string
    progression: number
    etapes: { label?: string; status: string; date?: string }[]
    documents_manquants: string[]
    notes: string
    created_at: string
    updated_at: string
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    reception: { label: 'Réception', color: 'text-blue-400', bg: 'bg-blue-500/15' },
    verification: { label: 'Vérification', color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
    traitement: { label: 'Traitement', color: 'text-amber-400', bg: 'bg-amber-500/15' },
    validation: { label: 'Validation', color: 'text-purple-400', bg: 'bg-purple-500/15' },
    finalisation: { label: 'Finalisation', color: 'text-teal-400', bg: 'bg-teal-500/15' },
    termine: { label: 'Terminé', color: 'text-green-400', bg: 'bg-green-500/15' },
    annule: { label: 'Annulé', color: 'text-gray-400', bg: 'bg-gray-500/15' },
}

const ETAPES_LABELS = ['Réception du dossier', 'Vérification des documents', 'Traitement administratif', 'Validation des autorités', 'Finalisation', 'Dossier clôturé']

export default function ClientDossierPage() {
    const [dossiers, setDossiers] = useState<Dossier[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            const email = session.user.email || ''

            const { data } = await supabase
                .from('dossier_tracking')
                .select('*')
                .or(`client_id.eq.${session.user.id},client_email.eq.${email}`)
                .order('created_at', { ascending: false })

            setDossiers(data as Dossier[] || [])
            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <FolderOpen size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">Suivi Dossier</span>
                </div>
                <h1 className="text-2xl font-black text-white">Mon Dossier</h1>
                <p className="text-gray-500 text-sm mt-1">Suivez l'avancement de votre dossier en temps réel.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : dossiers.length === 0 ? (
                <div className="bg-[#0a1221] border border-white/[0.06] rounded-2xl p-12 text-center">
                    <FolderOpen size={40} className="text-gray-700 mx-auto mb-4" />
                    <h2 className="text-white font-bold mb-2">Aucun dossier actif</h2>
                    <p className="text-gray-500 text-sm">Votre dossier apparaîtra ici une fois créé par votre agent.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {dossiers.map(dossier => {
                        const s = STATUT_CONFIG[dossier.statut] || { label: dossier.statut, color: 'text-gray-400', bg: 'bg-gray-500/15' }
                        const etapes = Array.isArray(dossier.etapes) ? dossier.etapes : []
                        const prog = dossier.progression || 0

                        return (
                            <motion.div key={dossier.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-[#0a1221] border border-white/[0.06] rounded-2xl overflow-hidden">
                                {/* Header */}
                                <div className="p-5 border-b border-white/[0.06]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Dossier N°</p>
                                            <h2 className="text-lg font-black text-white">{dossier.num_dossier}</h2>
                                            <p className="text-sm text-gray-400 mt-0.5">{dossier.service_type}</p>
                                        </div>
                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] text-gray-500 font-bold">Progression</span>
                                            <span className={`text-[12px] font-black ${s.color}`}>{prog}%</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${prog}%` }}
                                                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Etapes */}
                                <div className="p-5">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Étapes du traitement</p>
                                    <div className="space-y-3">
                                        {ETAPES_LABELS.map((label, i) => {
                                            const etape = etapes[i]
                                            const status = etape?.status || 'pending'
                                            const done = status === 'completed'
                                            const inProgress = status === 'in_progress'

                                            return (
                                                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${done ? 'bg-emerald-500/8' : inProgress ? 'bg-indigo-500/8 border border-indigo-500/20' : 'bg-white/[0.02]'}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black ${done ? 'bg-emerald-500 text-white' : inProgress ? 'bg-indigo-500/30 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-gray-600'}`}>
                                                        {done ? <CheckCircle2 size={14} /> : inProgress ? <Clock size={13} className="animate-pulse" /> : i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-bold ${done ? 'text-emerald-400' : inProgress ? 'text-white' : 'text-gray-500'}`}>{label}</p>
                                                        {etape?.date && <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5"><Calendar size={9} />{new Date(etape.date).toLocaleDateString('fr-FR')}</p>}
                                                    </div>
                                                    {inProgress && <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">EN COURS</span>}
                                                    {done && <ChevronRight size={13} className="text-emerald-400/50" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Documents manquants */}
                                {dossier.documents_manquants?.length > 0 && (
                                    <div className="mx-5 mb-5 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                                        <p className="text-xs font-black text-amber-400 flex items-center gap-2 mb-3">
                                            <AlertCircle size={13} /> Documents requis
                                        </p>
                                        <ul className="space-y-1.5">
                                            {dossier.documents_manquants.map((doc, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                                    {doc}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-[11px] text-gray-500 mt-3">Contactez votre agent pour fournir ces documents.</p>
                                    </div>
                                )}

                                {/* Notes */}
                                {dossier.notes && (
                                    <div className="mx-5 mb-5 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5">Note de l'agent</p>
                                        <p className="text-sm text-gray-300 leading-relaxed">{dossier.notes}</p>
                                    </div>
                                )}

                                <div className="px-5 pb-4 flex items-center justify-between text-[11px] text-gray-600">
                                    <span>Créé le {new Date(dossier.created_at).toLocaleDateString('fr-FR')}</span>
                                    {dossier.updated_at && <span>Mis à jour le {new Date(dossier.updated_at).toLocaleDateString('fr-FR')}</span>}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
