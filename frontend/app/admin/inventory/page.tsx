'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
    PackageSearch, Plus, Search, Filter, AlertTriangle, 
    ArrowUpRight, ArrowDownRight, Edit2, Trash2, Box, Euro
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrencySync } from '@/lib/currency'

interface InventoryItem {
    id: string
    sku: string | null
    type: 'physical' | 'service' | 'digital'
    title: string
    category: string | null
    base_price: number
    cost_price: number
    tax_rate: number
    track_inventory: boolean
    current_stock: number
    low_stock_threshold: number
    is_published: boolean
}

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    useEffect(() => {
        fetchInventory()
    }, [])

    const fetchInventory = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .order('created_at', { ascending: false })

        if (data && !error) setItems(data)
        setLoading(false)
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesType = typeFilter === 'all' || item.type === typeFilter
        return matchesSearch && matchesType
    })

    const totalStockValue = items.reduce((sum, item) => item.track_inventory ? sum + (item.current_stock * item.cost_price) : sum, 0)
    const lowStockItemsCount = items.filter(i => i.track_inventory && i.current_stock <= i.low_stock_threshold).length

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Box className="text-emerald-400" /> Gestion des Stocks & Catalogue
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Catalogue unifié connecté à l'ERP (Devis/Factures) et à la Boutique.</p>
                </div>
                <button className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2">
                    <Plus size={16} /> Ajouter un Article
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0c1420] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <PackageSearch size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Articles en Catalogue</p>
                            <h3 className="text-2xl font-black text-white">{items.length}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0c1420] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <AlertTriangle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock Faible / Alerte</p>
                            <h3 className="text-2xl font-black text-red-400">{lowStockItemsCount} articles</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0c1420] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Euro size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valeur du Stock (Achat)</p>
                            <h3 className="text-xl font-black text-blue-400">{formatCurrencySync(totalStockValue, 'XOF')}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-[#0c1420] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                {/* Tools */}
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Chercher par nom ou SKU..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-gray-500" size={16} />
                        <select 
                            title="Filtrer"
                            value={typeFilter} 
                            onChange={(e) => setTypeFilter(e.target.value)} 
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none font-bold w-full sm:w-auto"
                        >
                            <option value="all">Tous les types</option>
                            <option value="physical">Produits Physiques</option>
                            <option value="service">Services Exclusifs</option>
                            <option value="digital">Biens Numériques</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/5 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                                <th className="p-4 rounded-tl-xl whitespace-nowrap">Article & SKU</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4">Prix de Vente</th>
                                <th className="p-4">Statut</th>
                                <th className="p-4 text-right rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Chargement de l'inventaire...</td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Aucun article trouvé.</td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{item.title}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{item.sku || 'Sans SKU'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                                ${item.type === 'physical' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                  item.type === 'service' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                                                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                                                {item.type === 'physical' ? 'Physique' : item.type === 'service' ? 'Service' : 'Digital'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {item.track_inventory ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-mono font-bold ${item.current_stock <= item.low_stock_threshold ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {item.current_stock}
                                                    </span>
                                                    {item.current_stock <= item.low_stock_threshold && (
                                                        <AlertTriangle size={14} className="text-red-400 animate-pulse" />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs italic">Non suivi / Infini</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-mono text-sm font-bold text-white">
                                                {formatCurrencySync(item.base_price, 'XOF')}
                                            </div>
                                            {(item.cost_price > 0 && item.base_price > 0) && (
                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                    Marge: {Math.round(((item.base_price - item.cost_price) / item.cost_price) * 100)}%
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex w-2.5 h-2.5 rounded-full ${item.is_published ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`}></span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="Modifier" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                {item.track_inventory && (
                                                    <button title="Ajuster Stock (+/-)" className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors">
                                                        <ArrowUpRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
