'use client'

import { useTranslation, T } from '@/lib/translation';
import { useState, useEffect } from 'react'
import {
    CurrencyCode, detectUserCurrency,
    formatPrice, convertCurrency, refreshRates
} from '@/lib/currency'

interface PriceProps {
    amount: number
    currency?: CurrencyCode
    className?: string
    showOriginal?: boolean
    showSelector?: boolean
    /** Si true, affiche toujours dans la devise passée sans auto-conversion (utile pour le checkout) */
    noConvert?: boolean
}

export function Price({
    amount,
    currency = 'XOF',
    className = '',
    showOriginal = false,
    showSelector = false,
    noConvert = false,
}: PriceProps) {
    const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(currency)
    const { t } = useTranslation();
    const [ready, setReady] = useState(noConvert)

    useEffect(() => {
        if (noConvert) return
        const init = async () => {
            await refreshRates()
            const detected = detectUserCurrency()
            setDisplayCurrency(detected)
            setReady(true)
        }
        init()
    }, [noConvert])

    if (!ready) return <span className={className}>{formatPrice(amount, currency)}</span>

    const converted = convertCurrency(amount, currency, displayCurrency)
    const display = formatPrice(converted, displayCurrency)
    const original = currency !== displayCurrency ? formatPrice(amount, currency) : null

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span>{display}</span>
            {showOriginal && original && (
                <span className="text-gray-500 text-[0.75em]">({original})</span>
            )}
            {showSelector && (
                <select
                    value={displayCurrency}
                    onChange={e => setDisplayCurrency(e.target.value as CurrencyCode)}
                    className="bg-[#0a0f14] border border-white/10 rounded-lg px-2 py-1 text-[0.7em] text-gray-300 cursor-pointer ml-1 hover:border-[#FCD116]/30 focus:border-[#FCD116]/50 focus:outline-none transition-colors"
                    aria-label={t("Devise")}
                >
                    <option value="XOF"><T>🇧🇯 FCFA</T></option>
                    <option value="EUR"><T>🇪🇺 EUR €</T></option>
                    <option value="USD"><T>🇺🇸 USD $</T></option>
                </select>
            )}
        </span>
    )
}

/**
 * Hook pour utiliser la devise détectée dans n'importe quel composant
 */
export function useCurrency() {
    const [currency, setCurrency] = useState<CurrencyCode>('XOF')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const init = async () => {
            await refreshRates()
            setCurrency(detectUserCurrency())
            setReady(true)
        }
        init()
    }, [])

    return {
        currency,
        setCurrency,
        ready,
        format: (amount: number, from: CurrencyCode = 'XOF') =>
            formatPrice(convertCurrency(amount, from, currency), currency),
        convert: (amount: number, from: CurrencyCode = 'XOF') =>
            convertCurrency(amount, from, currency),
    }
}
