'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
    Download, PieChart, Activity, CheckCircle2,
    BarChart3, Landmark, Receipt, ArrowRight, FileText
} from 'lucide-react'
import { useTranslation } from '@/lib/translation'
import Link from 'next/link'

interface FinanceStat {
    total_encaisse: number
    total_facture: number
    total_en_attente: number
    commissions_estimees: number
}

interface Transaction {
    id: string
    numero: string
    client: string
    montant: number
    date: string
    status: 'paye' | 'envoye' | 'accepte' | 'refuse' | 'annule'
}

export default function AgentComptabilitePage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<FinanceStat>({
        total_encaisse: 0,
        total_facture: 0,
        total_en_attente: 0,
        commissions_estimees: 0
    })
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedPeriod, setSelectedPeriod] = useState('ce_mois')

    useEffect(() => {
        const fetchFinanceData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // On récupère tous les documents financiers de l'agent
            const { data: docs } = await supabase
                .from('documents_financiers')
                .select('*')
                .eq('agent_id', user.id)
                .order('created_at', { ascending: false })

            if (docs) {
                const invoices = docs.filter(d => d.type === 'facture')
                const paye = invoices.filter(d => d.status === 'paye').reduce((acc, d) => acc + d.total, 0)
                const totalFacture = invoices.reduce((acc, d) => acc + d.total, 0)
                const enAttente = invoices.filter(d => d.status === 'envoye' || d.status === 'accepte').reduce((acc, d) => acc + d.total, 0)

                setStats({
                    total_encaisse: paye,
                    total_facture: totalFacture,
                    total_en_attente: enAttente,
                    commissions_estimees: Math.round(paye * 0.1) // 10% par défaut
                })

                setTransactions(docs.slice(0, 10).map(d => ({
                    id: d.id,
                    numero: d.numero,
                    client: `${d.client_nom} ${d.client_prenom}`,
                    montant: d.total,
                    date: d.created_at,
                    status: d.status as 'paye' | 'envoye' | 'accepte' | 'refuse' | 'annule'
                })))
            }
            setLoading(false)
        }

        fetchFinanceData()
    }, [])

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('fr-BJ', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val)
    }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
    }

    return (
        <div className="space-y-8">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
                        <Landmark size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Trésorerie & Comptabilité</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Espace <span className="text-emerald-400">Financier</span></h1>
                    <p className="text-nexus-text-muted text-sm mt-1">Suivi de vos encaissements et performances de vente.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        {['ce_mois', '3_mois', 'tous'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedPeriod === p ? 'bg-emerald-500/20 text-emerald-400 shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                {p === 'ce_mois' ? 'Ce mois' : p === '3_mois' ? '3 mois' : 'Global'}
                            </button>
                        ))}
                    </div>
                    <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all" title="Exporter les données">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* ═══ Stats Grid ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Encaissé', value: stats.total_encaisse, icon: Wallet, color: 'emerald', trend: '+12.5%' },
                    { label: 'Facturé Total', value: stats.total_facture, icon: Receipt, color: 'blue', trend: '+5.2%' },
                    { label: 'En Attente', value: stats.total_en_attente, icon: Activity, color: 'amber', trend: '-2.1%' },
                    { label: 'Commissions (Est.)', value: stats.total_encaisse * 0.1, icon: TrendingUp, color: 'purple', trend: '+8.4%', isCommission: true },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-nexus-card p-6 group hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/10 flex items-center justify-center`}>
                                <s.icon size={20} className={`text-${s.color}-400`} />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${s.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {s.trend.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {s.trend}
                            </div>
                        </div>
                        <p className="text-2xl font-black text-white mb-1 font-mono">{formatCurrency(s.value)}</p>
                        <p className="text-[10px] text-nexus-text-muted font-bold uppercase tracking-wider">{s.label}</p>
                        {s.isCommission && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] text-emerald-500 font-bold uppercase">Base : 10% Payés</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* ═══ Main Journal ═══ */}
                <div className="xl:col-span-2 glass-nexus-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-emerald-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Journal des Documents Financiers</h2>
                        </div>
                        <Link href="/agent/devis" className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 uppercase tracking-widest">
                            Gérer tout <ArrowRight size={12} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Document</th>
                                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Client</th>
                                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Montant</th>
                                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-gray-550 italic text-sm">Aucun mouvement financier enregistré.</td>
                                    </tr>
                                ) : transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText size={14} className="text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{tx.numero}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5">
                                            <p className="text-sm text-gray-300">{tx.client}</p>
                                        </td>
                                        <td className="py-4 px-5 text-right font-mono">
                                            <p className="text-sm font-bold text-white">{formatCurrency(tx.montant)}</p>
                                        </td>
                                        <td className="py-4 px-5 text-center">
                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                                tx.status === 'paye' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                tx.status === 'envoye' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ═══ Insights Sidebar ═══ */}
                <div className="space-y-6">
                    {/* Commuication / Payment Methods */}
                    <div className="glass-nexus-card p-6">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PieChart size={14} className="text-purple-400" /> Répartition par Statut
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Payé & Encaissé', pct: (stats.total_encaisse / (stats.total_facture || 1)) * 100, color: 'bg-emerald-400' },
                                { label: 'En attente signature', pct: (stats.total_en_attente / (stats.total_facture || 1)) * 100, color: 'bg-amber-400' },
                                { label: 'Non convertis', pct: 10, color: 'bg-gray-600' },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold uppercase tracking-wider">
                                        <span className="text-gray-400">{item.label}</span>
                                        <span className="text-white">{Math.round(item.pct)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.pct}%` }}
                                            className={`h-full ${item.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Proactive Tip */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-6 shadow-nexus-elevated">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                            <CheckCircle2 size={24} className="text-white" />
                        </div>
                        <h4 className="text-lg font-black text-white leading-tight mb-2">Conseil de Trésorerie</h4>
                        <p className="text-white/80 text-xs leading-relaxed">
                            Vous avez <span className="font-bold text-white">{formatCurrency(stats.total_en_attente)}</span> en attente de validation. 
                            Envoyez un petit message WhatsApp à vos clients pour accélérer la signature !
                        </p>
                        <button className="mt-5 w-full py-2.5 bg-white text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                            Voir les relances <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
