'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calculator, RefreshCw, Loader2, TrendingUp, TrendingDown, DollarSign, FileText, Download, Users, Banknote, AlertTriangle } from 'lucide-react'
import { exportToExcelMultiSheet } from '@/lib/exportExcel'

const GOLD = '#C9A84C'; const YELLOW = '#FCD116'; const GREEN_L = '#008751'
const RED = '#E8112D'; const BG = '#FAF8F4'; const TEXT = '#1B2A4A'
const PANEL = '#FFFFFF'

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
    client_email?: string; total: number; status: string; created_at: string; agent_id?: string; currency?: string
}
interface Order {
    id: string; customer_name?: string; customer_email?: string; product_title?: string
    amount: number; currency?: string; payment_status?: string; payment_method?: string; created_at: string
}
interface Depense {
    id: string; titre?: string; categorie?: string; montant: number; date_depense: string; agent_id?: string; notes?: string
}
interface Paiement {
    id: string; document_id: string; type: string; montant: number; date_paiement: string
    reference?: string | null; notes?: string | null; agent_id?: string
}
interface Agent {
    id: string; full_name?: string | null; role?: string | null
}

interface ApiResponse {
    docs: FinancialDoc[]
    orders: Order[]
    depenses: Depense[]
    paiements: Paiement[]
    agents: Agent[]
    commissionRate: number
}

const DOC_TYPES: Record<string, string> = {
    devis: 'Devis', facture: 'Facture', bon_commande: 'Bon de commande', avoir: 'Avoir'
}
const PAYMENT_LABELS: Record<string, string> = {
    virement: 'Virement', especes: 'Espèces', cheque: 'Chèque',
    mobile_money: 'Mobile Money', carte: 'Carte', autre: 'Autre'
}
const STATUS_LABELS: Record<string, string> = {
    brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté',
    refuse: 'Refusé', paye: 'Payé', en_retard: 'En retard', annule: 'Annulé'
}
const PAID_STATUSES = ['paye', 'paid', 'completed']

export default function CeoComptabilite() {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'factures' | 'commandes' | 'depenses' | 'paiements'>('overview')
    const [agentFilter, setAgentFilter] = useState<string>('all')
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

    const agents = data?.agents || []
    const agentMap = useMemo(() => {
        const m = new Map<string, string>()
        agents.forEach(a => m.set(a.id, a.full_name || '—'))
        return m
    }, [agents])

    const allDocs = data?.docs || []
    const allOrders = data?.orders || []
    const allDepenses = data?.depenses || []
    const allPaiements = data?.paiements || []

    const docs = agentFilter === 'all' ? allDocs : allDocs.filter(d => d.agent_id === agentFilter)
    const depenses = agentFilter === 'all' ? allDepenses : allDepenses.filter(d => d.agent_id === agentFilter)
    const paiements = agentFilter === 'all' ? allPaiements : allPaiements.filter(p => p.agent_id === agentFilter)
    const orders = allOrders // commandes boutique = transverses

    const totalFacture = docs.filter(d => d.type === 'facture').reduce((a, d) => a + (d.total || 0), 0)
    const totalManuellement = paiements.reduce((a, p) => a + Number(p.montant || 0), 0)
    const totalOrders = orders.filter(o => PAID_STATUSES.includes((o.payment_status || '').toLowerCase())).reduce((a, o) => a + (o.amount || 0), 0)
    const totalEncaisseDocs = docs.filter(d => d.type === 'facture' && PAID_STATUSES.includes(d.status?.toLowerCase())).reduce((a, d) => a + (d.total || 0), 0)
    const totalRevenue = totalEncaisseDocs + totalOrders + totalManuellement
    const totalDepenses = depenses.reduce((a, d) => a + (d.montant || 0), 0)
    const profit = totalRevenue - totalDepenses

    const pendingDocs = docs.filter(d => d.type === 'facture' && !PAID_STATUSES.includes(d.status?.toLowerCase()) && d.status !== 'annule' && d.status !== 'refuse' && d.status !== 'brouillon')
    const pendingTotal = pendingDocs.reduce((a, d) => a + d.total, 0)

    // Agrégation par agent
    const perAgent = useMemo(() => {
        const rows = new Map<string, { agent_id: string; name: string; facture: number; encaisse: number; paiementsManuels: number; depenses: number; nbDocs: number; nbPaiements: number }>()
        const ensure = (id: string | undefined) => {
            const key = id || 'unknown'
            if (!rows.has(key)) {
                rows.set(key, {
                    agent_id: key,
                    name: id ? (agentMap.get(id) || `Agent ${id.slice(0, 6)}`) : 'Non assigné',
                    facture: 0, encaisse: 0, paiementsManuels: 0, depenses: 0, nbDocs: 0, nbPaiements: 0,
                })
            }
            return rows.get(key)!
        }
        allDocs.forEach(d => {
            const r = ensure(d.agent_id)
            if (d.type === 'facture') {
                r.facture += d.total || 0
                r.nbDocs += 1
                if (PAID_STATUSES.includes(d.status?.toLowerCase())) r.encaisse += d.total || 0
            }
        })
        allPaiements.forEach(p => {
            const r = ensure(p.agent_id)
            r.paiementsManuels += Number(p.montant || 0)
            r.nbPaiements += 1
        })
        allDepenses.forEach(d => {
            const r = ensure(d.agent_id)
            r.depenses += Number(d.montant || 0)
        })
        return Array.from(rows.values()).sort((a, b) => (b.encaisse + b.paiementsManuels) - (a.encaisse + a.paiementsManuels))
    }, [allDocs, allPaiements, allDepenses, agentMap])

    const docsById = useMemo(() => new Map(allDocs.map(d => [d.id, d])), [allDocs])

    const handleExport = async () => {
        const scopeLabel = agentFilter === 'all' ? 'Toutes_Agents' : (agentMap.get(agentFilter) || 'Agent').replace(/\s+/g, '_')
        const subtitle = `Vue ${agentFilter === 'all' ? 'globale CEO' : agentMap.get(agentFilter) || agentFilter} — Généré le ${new Date().toLocaleDateString('fr-FR')} — Confidentiel`

        const resume = {
            sheetName: 'Résumé',
            title: 'SYNTHÈSE FINANCIÈRE CEO — RETOUR GAGNANT BÉNIN',
            subtitle,
            columns: [
                { header: 'Indicateur', key: 'label', width: 38 },
                { header: 'Valeur (XOF)', key: 'value', width: 22, type: 'currency' as const },
            ],
            data: [
                { label: 'Chiffre d\'affaires facturé', value: totalFacture },
                { label: 'Encaissé sur factures (statut payé)', value: totalEncaisseDocs },
                { label: 'Encaissé par paiements manuels', value: totalManuellement },
                { label: 'Revenus commandes boutique', value: totalOrders },
                { label: 'Revenu total', value: totalRevenue },
                { label: 'Dépenses', value: totalDepenses },
                { label: 'Bénéfice net', value: profit },
                { label: 'Factures en attente d\'encaissement', value: pendingTotal },
            ],
        }

        const perAgentSheet = {
            sheetName: 'Par Agent',
            title: 'PERFORMANCES PAR AGENT',
            subtitle,
            columns: [
                { header: 'Agent', key: 'name', width: 28 },
                { header: 'Nb factures', key: 'nbDocs', width: 14 },
                { header: 'Facturé', key: 'facture', width: 18, type: 'currency' as const },
                { header: 'Encaissé docs', key: 'encaisse', width: 18, type: 'currency' as const },
                { header: 'Paiements manuels', key: 'paiementsManuels', width: 20, type: 'currency' as const },
                { header: 'Dépenses', key: 'depenses', width: 18, type: 'currency' as const },
                { header: 'Net', key: 'net', width: 18, type: 'currency' as const },
            ],
            data: perAgent.map(a => ({
                name: a.name,
                nbDocs: a.nbDocs,
                facture: a.facture,
                encaisse: a.encaisse,
                paiementsManuels: a.paiementsManuels,
                depenses: a.depenses,
                net: a.encaisse + a.paiementsManuels - a.depenses,
            })),
        }

        const docsSheet = {
            sheetName: 'Documents',
            title: 'DOCUMENTS FINANCIERS',
            subtitle,
            columns: [
                { header: 'N°', key: 'numero', width: 22 },
                { header: 'Type', key: 'type', width: 12, type: 'status' as const },
                { header: 'Agent', key: 'agent', width: 24 },
                { header: 'Client', key: 'client', width: 28 },
                { header: 'Total (XOF)', key: 'total', width: 18, type: 'currency' as const },
                { header: 'Statut', key: 'status', width: 16, type: 'status' as const },
                { header: 'Date', key: 'date', width: 14, type: 'date' as const },
            ],
            data: docs.map(d => ({
                numero: d.numero || '—',
                type: DOC_TYPES[d.type] || d.type,
                agent: d.agent_id ? (agentMap.get(d.agent_id) || '—') : '—',
                client: `${d.client_nom || ''} ${d.client_prenom || ''}`.trim() || '—',
                total: d.total,
                status: STATUS_LABELS[d.status] || d.status,
                date: new Date(d.created_at),
            })),
        }

        const paiementsSheet = {
            sheetName: 'Paiements',
            title: 'PAIEMENTS MANUELS',
            subtitle,
            columns: [
                { header: 'Date', key: 'date', width: 14, type: 'date' as const },
                { header: 'Agent', key: 'agent', width: 24 },
                { header: 'N° Document', key: 'numero', width: 22 },
                { header: 'Mode', key: 'type', width: 16, type: 'status' as const },
                { header: 'Montant (XOF)', key: 'montant', width: 18, type: 'currency' as const },
                { header: 'Référence', key: 'reference', width: 22 },
                { header: 'Notes', key: 'notes', width: 30 },
            ],
            data: paiements.map(p => {
                const d = docsById.get(p.document_id)
                return {
                    date: new Date(p.date_paiement),
                    agent: p.agent_id ? (agentMap.get(p.agent_id) || '—') : '—',
                    numero: d?.numero || '—',
                    type: PAYMENT_LABELS[p.type] || p.type,
                    montant: Number(p.montant),
                    reference: p.reference || '',
                    notes: p.notes || '',
                }
            }),
        }

        const depensesSheet = {
            sheetName: 'Dépenses',
            title: 'DÉPENSES',
            subtitle,
            columns: [
                { header: 'Date', key: 'date', width: 14, type: 'date' as const },
                { header: 'Agent', key: 'agent', width: 24 },
                { header: 'Titre', key: 'titre', width: 32 },
                { header: 'Catégorie', key: 'categorie', width: 18, type: 'status' as const },
                { header: 'Montant (XOF)', key: 'montant', width: 18, type: 'currency' as const },
            ],
            data: depenses.map(e => ({
                date: new Date(e.date_depense),
                agent: e.agent_id ? (agentMap.get(e.agent_id) || '—') : '—',
                titre: e.titre || '—',
                categorie: e.categorie || '—',
                montant: Number(e.montant),
            })),
        }

        await exportToExcelMultiSheet({
            filename: `RGB_CEO_Compta_${scopeLabel}_${new Date().toISOString().split('T')[0]}`,
            sheets: [resume, perAgentSheet, docsSheet, paiementsSheet, depensesSheet],
        })
    }

    return (
        <div className="min-h-screen p-6 lg:p-8" style={{ background: BG, color: TEXT }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}20` }}>
                            <Calculator size={18} style={{ color: GOLD }} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Comptabilité ERP — Vue CEO</h1>
                    </div>
                    <p className="text-sm opacity-50">Consolidation complète RGB — tous agents, factures, paiements et dépenses</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select
                        title="Filtrer par agent"
                        value={agentFilter}
                        onChange={e => setAgentFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border"
                        style={{ borderColor: `${GOLD}30`, color: TEXT }}
                    >
                        <option value="all">🌍 Tous les agents</option>
                        {agents.filter(a => a.role === 'agent').map(a => (
                            <option key={a.id} value={a.id}>{a.full_name || a.id.slice(0, 8)}</option>
                        ))}
                    </select>
                    <button onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                        style={{ background: `${GOLD}25`, color: GOLD }}>
                        <Download size={14} /> Exporter
                    </button>
                    <button onClick={() => setRefresh(r => r + 1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                        style={{ background: `${GREEN_L}25`, color: GREEN_L }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
                    </button>
                </div>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin opacity-40" /></div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        {[
                            { label: 'Revenus totaux', value: fmt(totalRevenue), color: GREEN_L, icon: TrendingUp },
                            { label: 'Encaissé manuel', value: fmt(totalManuellement), color: GOLD, icon: Banknote },
                            { label: 'Commandes', value: fmt(totalOrders), color: GOLD, icon: DollarSign },
                            { label: 'Dépenses', value: fmt(totalDepenses), color: RED, icon: TrendingDown },
                            { label: 'Bénéfice net', value: fmt(profit), color: profit >= 0 ? GREEN_L : RED, icon: Calculator },
                        ].map((s, i) => (
                            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                                className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${s.color}25` }}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs opacity-40 uppercase tracking-wider">{s.label}</span>
                                    <s.icon size={16} style={{ color: s.color, opacity: 0.7 }} />
                                </div>
                                <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Alerte impayés */}
                    {pendingDocs.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                            style={{ background: `${YELLOW}12`, border: `1px solid ${YELLOW}30` }}>
                            <AlertTriangle size={18} style={{ color: YELLOW }} />
                            <div>
                                <p className="text-sm font-bold" style={{ color: YELLOW }}>
                                    {pendingDocs.length} facture{pendingDocs.length > 1 ? 's' : ''} en attente d&apos;encaissement
                                </p>
                                <p className="text-xs opacity-60">Montant total en attente : {fmt(pendingTotal)}</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {[
                            { key: 'overview', label: 'Vue d\'ensemble' },
                            { key: 'agents', label: `Agents (${perAgent.length})` },
                            { key: 'factures', label: `Documents (${docs.length})` },
                            { key: 'paiements', label: `Paiements (${paiements.length})` },
                            { key: 'commandes', label: `Commandes (${orders.length})` },
                            { key: 'depenses', label: `Dépenses (${depenses.length})` },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                type="button"
                                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                style={{ background: activeTab === tab.key ? GOLD : `${GOLD}18`, color: activeTab === tab.key ? '#FFFFFF' : GOLD }}>
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
                                            <div className="text-xs opacity-40">{fmtDate(d.created_at)} · {d.agent_id ? agentMap.get(d.agent_id) || '—' : '—'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-xs" style={{ color: GREEN_L }}>{fmt(d.total)}</div>
                                            <div className="text-[10px] opacity-50">{STATUS_LABELS[d.status] || d.status}</div>
                                        </div>
                                    </div>
                                ))}
                                {docs.filter(d => d.type === 'facture').length === 0 && (
                                    <p className="text-xs opacity-40 py-4 text-center">Aucune facture</p>
                                )}
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                                className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                                <h3 className="font-bold text-sm mb-4" style={{ color: GOLD }}>Derniers paiements manuels</h3>
                                {paiements.slice(0, 8).map(p => {
                                    const d = docsById.get(p.document_id)
                                    return (
                                        <div key={p.id} className="flex items-center justify-between py-2 border-b text-sm"
                                            style={{ borderColor: `${GOLD}10` }}>
                                            <div>
                                                <div className="font-semibold text-xs">{d?.numero || '—'} · {PAYMENT_LABELS[p.type] || p.type}</div>
                                                <div className="text-xs opacity-40">{fmtDate(p.date_paiement)} · {p.agent_id ? agentMap.get(p.agent_id) || '—' : '—'}</div>
                                            </div>
                                            <div className="font-black text-xs" style={{ color: GREEN_L }}>{fmt(Number(p.montant))}</div>
                                        </div>
                                    )
                                })}
                                {paiements.length === 0 && (
                                    <p className="text-xs opacity-40 py-4 text-center">Aucun paiement manuel</p>
                                )}
                            </motion.div>
                        </div>
                    )}

                    {/* Par Agent */}
                    {activeTab === 'agents' && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs opacity-40 uppercase tracking-wider border-b" style={{ borderColor: `${GOLD}10` }}>
                                            <th className="text-left px-5 py-3"><Users size={12} className="inline mr-1" /> Agent</th>
                                            <th className="text-right px-5 py-3">Nb fact.</th>
                                            <th className="text-right px-5 py-3">Facturé</th>
                                            <th className="text-right px-5 py-3">Encaissé docs</th>
                                            <th className="text-right px-5 py-3">Paiements manuels</th>
                                            <th className="text-right px-5 py-3">Dépenses</th>
                                            <th className="text-right px-5 py-3">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {perAgent.map(a => {
                                            const net = a.encaisse + a.paiementsManuels - a.depenses
                                            return (
                                                <tr key={a.agent_id} className="border-b hover:bg-black/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                    <td className="px-5 py-3 text-xs font-semibold">{a.name}</td>
                                                    <td className="px-5 py-3 text-right text-xs opacity-60">{a.nbDocs}</td>
                                                    <td className="px-5 py-3 text-right text-xs">{fmt(a.facture)}</td>
                                                    <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GREEN_L }}>{fmt(a.encaisse)}</td>
                                                    <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GOLD }}>{fmt(a.paiementsManuels)}</td>
                                                    <td className="px-5 py-3 text-right text-xs" style={{ color: RED }}>{fmt(a.depenses)}</td>
                                                    <td className="px-5 py-3 text-right font-black text-xs" style={{ color: net >= 0 ? GREEN_L : RED }}>{fmt(net)}</td>
                                                </tr>
                                            )
                                        })}
                                        {perAgent.length === 0 && (
                                            <tr><td colSpan={7} className="text-center py-8 text-xs opacity-40">Aucune donnée</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
                                            <th className="text-left px-5 py-3">Agent</th>
                                            <th className="text-left px-5 py-3">Client</th>
                                            <th className="text-left px-5 py-3">Date</th>
                                            <th className="text-left px-5 py-3">Statut</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {docs.map(d => (
                                            <tr key={d.id} className="border-b hover:bg-black/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3">
                                                    <span className="text-[10px] font-black px-2 py-1 rounded-full"
                                                        style={{ background: `${GOLD}15`, color: GOLD }}>
                                                        {DOC_TYPES[d.type] || d.type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs opacity-60">{d.agent_id ? agentMap.get(d.agent_id) || '—' : '—'}</td>
                                                <td className="px-5 py-3 text-xs">{d.client_nom} {d.client_prenom}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{fmtDate(d.created_at)}</td>
                                                <td className="px-5 py-3 text-xs opacity-60">{STATUS_LABELS[d.status] || d.status}</td>
                                                <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GREEN_L }}>{fmt(d.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Paiements */}
                    {activeTab === 'paiements' && (
                        <div className="rounded-2xl overflow-hidden" style={{ background: PANEL, border: `1px solid ${GOLD}15` }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs opacity-40 uppercase tracking-wider border-b" style={{ borderColor: `${GOLD}10` }}>
                                            <th className="text-left px-5 py-3">Date</th>
                                            <th className="text-left px-5 py-3">Agent</th>
                                            <th className="text-left px-5 py-3">Document</th>
                                            <th className="text-left px-5 py-3">Mode</th>
                                            <th className="text-left px-5 py-3">Référence</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paiements.map(p => {
                                            const d = docsById.get(p.document_id)
                                            return (
                                                <tr key={p.id} className="border-b hover:bg-black/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                    <td className="px-5 py-3 text-xs opacity-50">{fmtDate(p.date_paiement)}</td>
                                                    <td className="px-5 py-3 text-xs opacity-60">{p.agent_id ? agentMap.get(p.agent_id) || '—' : '—'}</td>
                                                    <td className="px-5 py-3 text-xs">{d?.numero || '—'} <span className="opacity-50">· {d?.client_nom || ''}</span></td>
                                                    <td className="px-5 py-3">
                                                        <span className="text-[10px] font-black px-2 py-1 rounded-full"
                                                            style={{ background: `${GREEN_L}15`, color: GREEN_L }}>
                                                            {PAYMENT_LABELS[p.type] || p.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs opacity-50">{p.reference || '—'}</td>
                                                    <td className="px-5 py-3 text-right font-black text-xs" style={{ color: GREEN_L }}>{fmt(Number(p.montant))}</td>
                                                </tr>
                                            )
                                        })}
                                        {paiements.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-8 text-xs opacity-40">Aucun paiement</td></tr>
                                        )}
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
                                            <tr key={o.id} className="border-b hover:bg-black/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3">
                                                    <div className="text-xs font-semibold">{o.customer_name || '—'}</div>
                                                    <div className="text-xs opacity-40">{o.customer_email}</div>
                                                </td>
                                                <td className="px-5 py-3 text-xs opacity-60">{o.product_title || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{o.payment_method || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <span className="text-[10px] font-bold"
                                                        style={{ color: PAID_STATUSES.includes((o.payment_status || '').toLowerCase()) ? GREEN_L : YELLOW }}>
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
                                            <th className="text-left px-5 py-3">Agent</th>
                                            <th className="text-left px-5 py-3">Catégorie</th>
                                            <th className="text-left px-5 py-3">Date</th>
                                            <th className="text-right px-5 py-3">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {depenses.map(d => (
                                            <tr key={d.id} className="border-b hover:bg-black/[0.02]" style={{ borderColor: `${GOLD}08` }}>
                                                <td className="px-5 py-3 text-xs font-semibold">{d.titre || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-60">{d.agent_id ? agentMap.get(d.agent_id) || '—' : '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-60">{d.categorie || '—'}</td>
                                                <td className="px-5 py-3 text-xs opacity-50">{fmtDate(d.date_depense)}</td>
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
