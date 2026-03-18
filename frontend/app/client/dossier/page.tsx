'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FolderOpen, CheckCircle2, Clock, AlertCircle, ChevronRight, Calendar, Upload, FileUp, Trash2, Paperclip, Loader2 } from 'lucide-react'

interface ClientDoc {
    id: string
    nom_fichier: string
    type_fichier: string
    taille: number
    url: string
    storage_path: string
    created_at: string
}

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

const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif'
const MAX_SIZE_MB = 50

export default function ClientDossierPage() {
    const [dossiers, setDossiers] = useState<Dossier[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState('')
    const [uploadingDossier, setUploadingDossier] = useState<string | null>(null)
    const [docsByDossier, setDocsByDossier] = useState<Record<string, ClientDoc[]>>({})
    const [expandedDossier, setExpandedDossier] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const activeDossierRef = useRef<string | null>(null)

    const fetchDocs = async (dossierId: string) => {
        const { data } = await supabase
            .from('client_documents')
            .select('id, nom_fichier, type_fichier, taille, url, storage_path, created_at')
            .eq('dossier_id', dossierId)
            .order('created_at', { ascending: false })
        setDocsByDossier(prev => ({ ...prev, [dossierId]: data as ClientDoc[] || [] }))
    }

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            const email = session.user.email || ''
            setUserId(session.user.id)

            const { data } = await supabase
                .from('dossier_tracking')
                .select('*')
                .or(`client_id.eq.${session.user.id},client_email.eq.${email}`)
                .order('created_at', { ascending: false })

            const dossierList = data as Dossier[] || []
            setDossiers(dossierList)

            // Fetch uploaded docs for each dossier
            await Promise.all(dossierList.map(d => fetchDocs(d.id)))

            setLoading(false)
        }
        load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleUploadClick = (dossierId: string) => {
        activeDossierRef.current = dossierId
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const dossierId = activeDossierRef.current
        if (!file || !dossierId || !userId) return

        // Reset input so same file can be selected again
        e.target.value = ''

        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            alert(`Fichier trop volumineux (max ${MAX_SIZE_MB} MB)`)
            return
        }

        setUploadingDossier(dossierId)

        try {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
            const path = `${userId}/${dossierId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('client-documents')
                .upload(path, file, { cacheControl: '3600', upsert: false })

            if (uploadError) throw new Error(uploadError.message)

            // Get signed URL (bucket is private)
            const { data: signedData } = await supabase.storage
                .from('client-documents')
                .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days

            await supabase.from('client_documents').insert({
                client_id: userId,
                dossier_id: dossierId,
                nom_fichier: file.name,
                type_fichier: file.type,
                taille: file.size,
                url: signedData?.signedUrl || '',
                storage_path: path,
            })

            await fetchDocs(dossierId)
            setExpandedDossier(dossierId)
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
        } finally {
            setUploadingDossier(null)
        }
    }

    const handleDeleteDoc = async (docId: string, storagePath: string, dossierId: string) => {
        if (!confirm('Supprimer ce fichier ?')) return
        try {
            await supabase.storage.from('client-documents').remove([storagePath])
            await supabase.from('client_documents').delete().eq('id', docId)
            await fetchDocs(dossierId)
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
        }
    }

    const refreshSignedUrl = async (storagePath: string) => {
        const { data } = await supabase.storage
            .from('client-documents')
            .createSignedUrl(storagePath, 60 * 60)
        return data?.signedUrl || ''
    }

    return (
        <div className="space-y-6">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                title="Sélectionner un fichier à uploader"
                className="hidden"
                onChange={handleFileChange}
            />

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

                                {/* Section upload documents */}
                                <div className="border-t border-white/[0.06] mx-5 mb-5 mt-1 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedDossier(expandedDossier === dossier.id ? null : dossier.id)}
                                            className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Paperclip size={12} />
                                            Mes fichiers ({docsByDossier[dossier.id]?.length || 0})
                                            <ChevronRight size={11} className={`transition-transform ${expandedDossier === dossier.id ? 'rotate-90' : ''}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUploadClick(dossier.id)}
                                            disabled={uploadingDossier === dossier.id}
                                            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 transition-all disabled:opacity-50"
                                        >
                                            {uploadingDossier === dossier.id
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <Upload size={11} />
                                            }
                                            {uploadingDossier === dossier.id ? 'Upload...' : 'Ajouter'}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {expandedDossier === dossier.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                {(docsByDossier[dossier.id] || []).length === 0 ? (
                                                    <div className="py-4 text-center">
                                                        <FileUp size={20} className="text-gray-700 mx-auto mb-2" />
                                                        <p className="text-[11px] text-gray-600">Aucun fichier uploadé pour ce dossier.</p>
                                                        <p className="text-[10px] text-gray-700 mt-0.5">PDF, Word, JPEG, PNG — max {MAX_SIZE_MB} MB</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {(docsByDossier[dossier.id] || []).map(clientDoc => (
                                                            <div key={clientDoc.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] group">
                                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 flex-shrink-0">
                                                                    <Paperclip size={12} className="text-indigo-400" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">{clientDoc.nom_fichier}</p>
                                                                    <p className="text-[10px] text-gray-600">
                                                                        {fmtSize(clientDoc.taille)} · {new Date(clientDoc.created_at).toLocaleDateString('fr-FR')}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            const url = await refreshSignedUrl(clientDoc.storage_path)
                                                                            window.open(url, '_blank')
                                                                        }}
                                                                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-indigo-400 transition-colors"
                                                                        title="Télécharger"
                                                                    >
                                                                        <FileUp size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteDoc(clientDoc.id, clientDoc.storage_path, dossier.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

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
