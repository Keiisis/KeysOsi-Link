'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { type CurrencyCode, convertWithMargin, formatPrice } from '@/lib/currency'

const CURRENCY_OPTIONS: { code: CurrencyCode; flag: string; label: string }[] = [
    { code: 'XOF', flag: '🇧🇯', label: 'FCFA' },
    { code: 'EUR', flag: '🇪🇺', label: 'EUR €' },
    { code: 'USD', flag: '🇺🇸', label: 'USD $' },
    { code: 'GBP', flag: '🇬🇧', label: 'GBP £' },
]

interface CurrencySelectorProps {
    value: CurrencyCode
    onChange: (currency: CurrencyCode) => void
    baseAmountXOF?: number
    className?: string
}

export default function CurrencySelector({ value, onChange, baseAmountXOF, className = '' }: CurrencySelectorProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const current = CURRENCY_OPTIONS.find(o => o.code === value) || CURRENCY_OPTIONS[0]

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-300 transition-all"
            >
                <span>{current.flag}</span>
                <span>{current.label}</span>
                <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full right-0 mt-1 bg-[#0d1520] border border-white/10 rounded-xl shadow-2xl z-50 min-w-[160px] overflow-hidden">
                    {CURRENCY_OPTIONS.map(opt => {
                        const converted = baseAmountXOF ? convertWithMargin(baseAmountXOF, opt.code) : null
                        const isSelected = opt.code === value
                        return (
                            <button
                                key={opt.code}
                                type="button"
                                onClick={() => { onChange(opt.code); setOpen(false) }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-white/5 transition-all ${isSelected ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-300'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <span>{opt.flag}</span>
                                    <span className="font-bold">{opt.label}</span>
                                </span>
                                {converted !== null && (
                                    <span className={`text-[10px] ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`}>
                                        {formatPrice(converted, opt.code)}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                    <div className="px-3 py-2 border-t border-white/5">
                        <p className="text-[9px] text-gray-600 text-center">Taux incluant 3% frais</p>
                    </div>
                </div>
            )}
        </div>
    )
}
