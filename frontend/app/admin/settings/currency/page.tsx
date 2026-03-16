'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, RefreshCw, Save, DollarSign, Euro, Coins, Info } from 'lucide-react'
import Link from 'next/link'

interface Currency {
    code: string
    name: string
    symbol: string
    exchange_rate_to_base: number
    is_base: boolean
    updated_at: string
}

export default function CurrencySettingsPage() {
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchCurrencies()
    }, [])

    const fetchCurrencies = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('currencies')
            .select('*')
            .order('is_base', { ascending: false }) // La base (XOF) en premier
        
        if (data && !error) {
            setCurrencies(data)
        }
        setLoading(false)
    }

    const handleRateChange = (code: string, newRate: string) => {
        setCurrencies(prev => prev.map(c => 
            c.code === code ? { ...c, exchange_rate_to_base: Number(newRate) } : c
        ))
    }

    const saveChanges = async () => {
        setSaving(true)
        setMessage('')
        
        try {
            // Seuls les taux non-base peuvent être modifiés
            const updatableCurrencies = currencies.filter(c => !c.is_base)
            
            for (const c of updatableCurrencies) {
                await supabase
                    .from('currencies')
                    .update({ exchange_rate_to_base: c.exchange_rate_to_base, updated_at: new Date().toISOString() })
                    .eq('code', c.code)
            }
            
            setMessage('Taux de change mis à jour avec succès.')
            setTimeout(() => setMessage(''), 3000)
            
            await fetchCurrencies() // Refresh
        } catch (error) {
            console.error('Erreur SQL:', error)
            setMessage('Une erreur est survenue.')
        } finally {
            setSaving(false)
        }
    }

    const getIcon = (code: string) => {
        if (code === 'EUR') return <Euro size={20} className="text-blue-400" />
        if (code === 'USD') return <DollarSign size={20} className="text-green-400" />
        return <Coins size={20} className="text-yellow-400" /> // XOF
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-[#0c1420] p-4 rounded-2xl border border-white/5 sticky top-4 z-40 backdrop-blur-xl shadow-xl">
                <div className="flex items-center gap-4">
                    <Link href="/admin/settings" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-white">Devises & Taux de Change</h1>
                        <p className="text-emerald-400 text-xs font-medium tracking-wide">MOTEUR MONÉTAIRE ERP</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={fetchCurrencies} 
                        disabled={loading}
                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={saveChanges}
                        disabled={saving || loading}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Sauvegarde...' : 'Enregistrer les taux'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${message.includes('succès') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <Info size={18} />
                    {message}
                </div>
            )}

            <div className="bg-[#0c1420] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                    <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                        <p className="font-bold mb-1">Comment fonctionnent les devises ?</p>
                        <p className="opacity-80 leading-relaxed">Le système utilise le <strong>Franc CFA (XOF)</strong> comme devise de référence absolue (base = 1.0). Les autres devises sont converties depuis et vers le FCFA. Modifier un taux ici s'appliquera instantanément à tous les nouveaux paiements et nouveaux devis.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="h-40 flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currencies.map((currency) => (
                            <div key={currency.code} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border ${currency.is_base ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'} gap-4`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                        {getIcon(currency.code)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white">{currency.code}</h3>
                                            <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-mono">{currency.symbol}</span>
                                            {currency.is_base && (
                                                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">Devise de Base</span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-sm mt-0.5">{currency.name}</p>
                                        <p className="text-[10px] text-gray-600 mt-1">Dernière maj: {new Date(currency.updated_at).toLocaleString('fr-FR')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-400 font-mono">1 {currency.code} = </div>
                                    <div className="relative w-32">
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={currency.exchange_rate_to_base}
                                            onChange={(e) => handleRateChange(currency.code, e.target.value)}
                                            disabled={currency.is_base}
                                            className={`w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-right focus:outline-none focus:border-emerald-500 ${currency.is_base ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs font-bold">
                                            XOF
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
