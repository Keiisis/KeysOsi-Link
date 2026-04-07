'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calculator, RefreshCw, Loader2, TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react'

const GOLD = '#D4AF37'; const YELLOW = '#FCD116'; const GREEN = '#008751'
const GREEN_L = '#00A86B'; const RED = '#E8112D'; const BG = '#0B1F0D'; const TEXT = '#F0EBD8'
const PANEL = '#0D2615'

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M FCFA`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K FCFA`
    return `${n.toLocaleString('fr-FR')} FCFA`
}
function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface FinancialDoc {
    id: string; type: string; numero?: string; client_nom?: string; client_prenom?: string
    client_email?: string; total: number; status: string; created_at: string; currency?: string
}

interface Order {
    id: string; customer_name?: string; customer_email?: string; product_title?: string
    amount: number; currency?: string; payment_status?: string; payment_method?: string; created_at: string
}

interface Depense {
    id: string; titre?: string; categorie?: string; montant: number; date_depense: string; notes?: string
}

interface ComptaData {
    documents: FinancialDoc[]
    orders: Order[]
    depenses: Depense[]
    summary?: {
        total_revenue: number
        total_paid_orders: number
        total_depenses: number
        net_profit: number
        pending_invoices: number
    }
}

const DOC_TYPES: Record<string, string> = {
    devis: 'Devis', facture: 'Facture', bon_commande: 'Bon de commande', avoir: 'Avoir'
}

export default function CeoComptabilite() {
    const [data, setData] = useState<ComptaData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'factures' | 'commandes' | 'depenses'>('overview')
    const [refresh, setRefresh] = useState(0)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/comptabilite', { cache: 'no-store' })
        if (res.ok) {
            const json = await res.json()
            setData(json)
        }
        setLoading(false)
    }, [refresh])

    useEffect(() => { load() }, [load])

    const docs = data?.documents || []
    const orders = data?.orders || []
    const depenses = data?.depenses || []

    const totalRevDocs = docs.filter(d => d.type === 'facture' && d.status === 'paid')
        .reduce((a, d) => a + (d.total || 0), 0)
    const totalOrders = orders.filter(o => ['paid', 'completed'].includes(o.payment_status || ''))
        .reduce((a, o) => a + (o.amount || 0), 0)
    const totalDepenses = depenses.reduce((a, d) => a + (d.montant || 0), 0)
    const totalRevenue = totalRevDocs + totalOrders
    const profit = totalRevenue - totalDepenses

    const pendingDocs = docs.filter(d => d.status === 'pending' || d.status === 'sent')

    return (
        <div className="min-h-screen p-6 lg:p-8" style={{ background: BG, color: TEXT }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
                            <Calculator size={18} style={{ color: GOLD }} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Comptabilité ERP</h1>
                    </div>
                    <p className="text-sm opacity-50">Vue financière complète de RGB</p>
                </div>
                <button onClick={() => setRefresh(r => r + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                    style={{ background: `${GREEN}25`, color: GREEN_L }}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
                </button>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin opacity-40" /></div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Revenus totaux', value: fmt(totalRevenue), color: GREEN_L, icon: TrendingUp },
                            { label: 'Commandes payées', value: fmt(totalOrders), color: GOLD, icon: DollarSign },
                            { label: 'Dépenses', value: fmt(totalDepenses), color: RED, icon: TrendingDown },
                            { label: 'Bénéfice net', value: fmt(profit), color: profit >= 0 ? GREEN_L : RED, icon: Calculator },
                        ].map((s, i) => (
                            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                                className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${s.color}25` }}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs opacity-40 uppercase tracking-wider">{s.label}</span>
                                    <s.icon size={16} style={{ color: s.color, opacity: 0.7 }} />
                                </div>
                                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Alertes */}
                    {pendingDocs.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                            style={{ background: `${YELLOW}12`, border: `1px solid ${YELLOW}30` }}>
                            <FileText size={18} style={{ color: YELLOW }} />
                            <div>
                                <p className="text-sm font-bold" style={{ color: YELLOW }}>
                                    {pendingDocs.length} facture{pendingDocs.length > 1 ? 's' : ''} en attente de paiement
                                </p>
                                <p className="text-xs opacity-60">Montant total en attente : {fmt(pendingDocs.reduce((a, d) => a + d.total, 0))}</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {[
                            { key: 'overview', label: 'Vue d\'ensemble' },
                            { key: 'factures', label: `Documents (${docs.length})` },
                            { key: 'commandes', label: `Commandes (${orders.length})` },
                            { key: 'depenses', label: `Dépenses (${depenses.length})` },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                style={{ background: activeTab === tab.key ? GOLD : `${GOLD}15`, color: activeTab === tab.key ? BG : GOLD }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Overview */}
                    {activeTab === 'overview' && (
                        <div className="grid lg:grid-cols-2 gap-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                                <h3 className="font-bold text-sm mb-4" style={{ color: GOLD }}>Dernières factures</h3>
                                {docs.filter(d => d.type === 'facture').slice(0, 8).map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-2 border-b text-sm"
                                        style={{ borderColor: `${GOLD}10` }}>
                                        <div>
                                            <div className="font-semibold text-xs">{d.client_nom} {d.client_prenom}</div>
                                            <div className="text-xs opacity-40">{fmtDate(d.created_at)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-xs" style={{ color: GREEN_L }}>{fmt(d.total)}</div>
                                            <div className="text-[10px] opacity-50">{d.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                                className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                                <h3 className="font-bold text-sm mb-4" style={{ color: GOLD }}>Dernières dépenses</h3>
                                {depenses.slice(0, 8).map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-2 border-b text-sm"
                                        style={{ borderColor: `${GOLD}10` }}>
                                        <div>
                                            <div className="font-semibold text-xs">{d.titre || d.categorie || '—'}</div>
                                            <div className="text-xs opacity-40">{fmtDate(d.date_depense)}</div>
                                        </div>
                                        <div className="font-black text-xs" style={{ color: RED }}>{fmt(d.montant)}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    )}

                    {/* Documents */}
                    {activeTab === 'factures' && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs opacity-40 uppercase tracking-wider border-b" style={{ borderColor: `${GOLD}10` }}>
                                            <th className="text-left px-5 py-3">Type</th>
                                            <th className="text-left px-5 py-3">Client</th>
                                            <th className="text-left px-5 py-3">Date</th>
                                            <th className="text-left px-5 py-3">Statut</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {docs.map(d => (
                                            <tr key={d.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3">
                                                    <span className="text-[10px] font-black px-2 py-1 rounded-full"
                                                        style={{ background: `${GOLD}15`, color: GOLD }}>
                                                        {DOC_TYPES[d.type] || d.type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs">{d.client_nom} {d.client_prenom}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{fmtDate(d.created_at)}</td>
                                                <td className="px-5 py-3 text-xs opacity-60">{d.status}</td>
                                                <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GREEN_L }}>{fmt(d.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Orders */}
                    {activeTab === 'commandes' && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs opacity-40 uppercase tracking-wider border-b" style={{ borderColor: `${GOLD}10` }}>
                                            <th className="text-left px-5 py-3">Client</th>
                                            <th className="text-left px-5 py-3">Produit</th>
                                            <th className="text-left px-5 py-3">Méthode</th>
                                            <th className="text-left px-5 py-3">Statut</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => (
                                            <tr key={o.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3">
                                                    <div className="text-xs font-semibold">{o.customer_name || '—'}</div>
                                                    <div className="text-xs opacity-40">{o.customer_email}</div>
                                                </td>
                                                <td className="px-5 py-3 text-xs opacity-60">{o.product_title || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{o.payment_method || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <span className="text-[10px] font-bold"
                                                        style={{ color: ['paid', 'completed'].includes(o.payment_status || '') ? GREEN_L : YELLOW }}>
                                                        {o.payment_status || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GREEN_L }}>{fmt(o.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Depenses */}
                    {activeTab === 'depenses' && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs opacity-40 uppercase tracking-wider border-b" style={{ borderColor: `${GOLD}10` }}>
                                            <th className="text-left px-5 py-3">Titre</th>
                                            <th className="text-left px-5 py-3">Catégorie</th>
                                            <th className="text-left px-5 py-3">Date</th>
                                            <th className="text-left px-5 py-3">Notes</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {depenses.map(d => (
                                            <tr key={d.id} className="border-b hover:bg-white/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3 text-xs font-semibold">{d.titre || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-60">{d.categorie || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{fmtDate(d.date_depense)}</td>
                                                <td className="px-5 py-3 text-xs opacity-40">{d.notes || '—'}</td>
                                                <td className="px-5 py-3 text-right font-black text-xs" style={{ color: RED }}>{fmt(d.montant)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
