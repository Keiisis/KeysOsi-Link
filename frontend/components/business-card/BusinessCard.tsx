'use client'

import React, { forwardRef, useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */

export interface CardData {
    prenom: string
    nom: string
    position: string
    phone: string
    email: string
}

/* ══════════════════════════════════════════════════════════════
   PALETTE
══════════════════════════════════════════════════════════════ */

const GOLD   = '#C9A84C'
const GOLD_L = '#E2C97E'
const DARK   = '#061838'
const DARK2  = '#0d2d60'

/* ══════════════════════════════════════════════════════════════
   ICÔNES SVG PREMIUM — rendu inline (compatible html-to-image)
══════════════════════════════════════════════════════════════ */

const IcoPhone = ({ sz, col }: { sz: number; col: string }) => (
    <svg width={sz} height={sz} viewBox="0 0 20 20" fill={col} style={{ display: 'block', flexShrink: 0 }}>
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
)

const IcoMail = ({ sz, col }: { sz: number; col: string }) => (
    <svg width={sz} height={sz} viewBox="0 0 20 20" fill={col} style={{ display: 'block', flexShrink: 0 }}>
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
)

const IcoGlobe = ({ sz, col }: { sz: number; col: string }) => (
    <svg width={sz} height={sz} viewBox="0 0 20 20" fill={col} style={{ display: 'block', flexShrink: 0 }}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
)

const IcoPin = ({ sz, col }: { sz: number; col: string }) => (
    <svg width={sz} height={sz} viewBox="0 0 20 20" fill={col} style={{ display: 'block', flexShrink: 0 }}>
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
)

/* ══════════════════════════════════════════════════════════════
   QR CODE — canvas data URL pour html-to-image
══════════════════════════════════════════════════════════════ */

function QRCodeDisplay({ size }: { size: number }) {
    const [qrSrc, setQrSrc] = useState<string | null>(null)

    useEffect(() => {
        const img = new window.Image()
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                const ctx = canvas.getContext('2d')
                if (!ctx) { setQrSrc(null); return }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                setQrSrc(canvas.toDataURL('image/png'))
            } catch { setQrSrc(null) }
        }
        img.onerror = () => setQrSrc(null)
        img.src = '/images/qr-code.png'
    }, [])

    if (qrSrc) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={qrSrc} alt="QR Code" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
    }
    return <QRCode value="https://www.retourgagnantbenin.bj" size={size} fgColor={DARK} bgColor="#ffffff" level="M" />
}

/* ══════════════════════════════════════════════════════════════
   RECTO — Identité pure : LOGO seulement, design premium
══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data: _data, scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                background: `linear-gradient(148deg, ${DARK} 0%, ${DARK2} 52%, ${DARK} 100%)`,
                borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 20px 70px rgba(0,0,0,0.55)',
            }}>
                {/* Lueur radiale centrale — bleutée */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 280 * s, height: 200 * s, background: `radial-gradient(ellipse, rgba(30,80,180,0.18) 0%, transparent 65%)`, pointerEvents: 'none' }} />

                {/* Lueur coin haut-droit — verte (couleur logo) */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 130 * s, height: 100 * s, background: `radial-gradient(circle at 100% 0%, rgba(0,135,81,0.12) 0%, transparent 65%)`, pointerEvents: 'none' }} />

                {/* Barre dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, transparent, ${GOLD_L}, ${GOLD}, ${GOLD_L}, transparent)` }} />

                {/* Barre dorée bas */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, transparent, ${GOLD}70, transparent)` }} />

                {/* Coin haut-gauche — équerres */}
                <svg style={{ position: 'absolute', top: 3 * s, left: 0 }} width={20 * s} height={20 * s} viewBox="0 0 20 20" fill="none">
                    <path d="M1 19V1H19" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
                </svg>
                {/* Coin haut-droit */}
                <svg style={{ position: 'absolute', top: 3 * s, right: 0 }} width={20 * s} height={20 * s} viewBox="0 0 20 20" fill="none">
                    <path d="M19 19V1H1" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
                </svg>
                {/* Coin bas-gauche */}
                <svg style={{ position: 'absolute', bottom: 3 * s, left: 0 }} width={20 * s} height={20 * s} viewBox="0 0 20 20" fill="none">
                    <path d="M1 1V19H19" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
                </svg>
                {/* Coin bas-droit */}
                <svg style={{ position: 'absolute', bottom: 3 * s, right: 0 }} width={20 * s} height={20 * s} viewBox="0 0 20 20" fill="none">
                    <path d="M19 1V19H1" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
                </svg>

                {/* Filigrane diagonal RGH (très subtil) */}
                <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%,-50%) rotate(-12deg)', color: `${GOLD}06`, fontSize: 130 * s, fontWeight: 900, fontFamily: "'Cinzel','Georgia',serif", pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    RGB
                </div>

                {/* ── CONTENU PRINCIPAL ── */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 * s }}>

                    {/* Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 58 * s, height: 58 * s, objectFit: 'contain' }} />

                    {/* Ornement doré */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 * s, width: 160 * s }}>
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(90deg, transparent, ${GOLD}80)` }} />
                        <div style={{ width: 4 * s, height: 4 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(270deg, transparent, ${GOLD}80)` }} />
                    </div>

                    {/* Nom agence */}
                    <div style={{ color: GOLD, fontSize: 9 * s, fontWeight: 800, letterSpacing: '0.26em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center', lineHeight: 1.3 }}>
                        RETOUR GAGNANT BÉNIN
                    </div>

                    {/* Tagline */}
                    <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 5.5 * s, letterSpacing: '0.12em', textAlign: 'center', fontStyle: 'italic' }}>
                        L&apos;Agence du Retour des Afro-descendants
                    </div>
                </div>

                {/* URL bas discret */}
                <div style={{ position: 'absolute', bottom: 8 * s, left: 0, right: 0, textAlign: 'center', color: `${GOLD}55`, fontSize: 5 * s, letterSpacing: '0.14em' }}>
                    www.retourgagnantbenin.bj
                </div>
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ══════════════════════════════════════════════════════════════
   VERSO — Agent + QR code + tous contacts agence (icônes SVG)
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale

        const ico = Math.round(7.5 * s)
        const ContactRow = ({ Icon, value, dim = false }: {
            Icon: (p: { sz: number; col: string }) => React.ReactElement;
            value: string;
            dim?: boolean
        }) => (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 * s, marginBottom: 4.5 * s }}>
                <div style={{ marginTop: 0.5 * s }}>
                    <Icon sz={ico} col={dim ? `${GOLD}70` : GOLD} />
                </div>
                <span style={{ color: dim ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.75)', fontSize: 5.8 * s, lineHeight: 1.4, fontFamily: "'Arial',sans-serif", letterSpacing: '0.01em' }}>
                    {value}
                </span>
            </div>
        )

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                background: `linear-gradient(148deg, ${DARK} 0%, ${DARK2} 52%, ${DARK} 100%)`,
                borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 20px 70px rgba(0,0,0,0.55)',
            }}>
                {/* Lueur radiale */}
                <div style={{ position: 'absolute', top: '40%', left: '30%', width: 200 * s, height: 160 * s, background: `radial-gradient(ellipse, rgba(30,80,180,0.14) 0%, transparent 65%)`, pointerEvents: 'none' }} />

                {/* Barre dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, transparent, ${GOLD_L}, ${GOLD}, ${GOLD_L}, transparent)` }} />

                {/* Barre dorée bas */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, transparent, ${GOLD}70, transparent)` }} />

                {/* Barre accent gauche verticale */}
                <div style={{ position: 'absolute', top: 3 * s, left: 0, width: 2.5 * s, bottom: 3 * s, background: `linear-gradient(180deg, ${GOLD_L}90, ${GOLD}60, transparent)` }} />

                {/* ── ZONE AGENT — haut ── */}
                <div style={{ position: 'absolute', top: 12 * s, left: 14 * s, right: 14 * s }}>
                    <div style={{ color: GOLD_L, fontSize: 13.5 * s, fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.1 }}>
                        {data.prenom} {data.nom}
                    </div>
                    <div style={{ width: 90 * s, height: 1.5 * s, background: `linear-gradient(90deg, ${GOLD}, transparent)`, marginTop: 4 * s, marginBottom: 3.5 * s }} />
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 5.8 * s, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        {data.position}
                    </div>
                </div>

                {/* Séparateur horizontal */}
                <div style={{ position: 'absolute', top: 58 * s, left: 14 * s, right: 14 * s, height: 0.7 * s, background: `linear-gradient(90deg, ${GOLD}50, transparent)` }} />

                {/* ── ZONE CONTACTS — gauche ── */}
                <div style={{ position: 'absolute', top: 66 * s, left: 14 * s, right: 110 * s, bottom: 10 * s }}>

                    {/* Contacts agent (si renseignés) */}
                    {data.phone && <ContactRow Icon={IcoPhone} value={data.phone} />}
                    {data.email && <ContactRow Icon={IcoMail} value={data.email} />}

                    {/* Séparateur entre agent et agence */}
                    {(data.phone || data.email) && (
                        <div style={{ width: '80%', height: 0.5 * s, background: `${GOLD}25`, marginBottom: 4.5 * s }} />
                    )}

                    {/* Contacts agence */}
                    <ContactRow Icon={IcoPhone} value="+229 01 60 32 21 21" dim />
                    <ContactRow Icon={IcoPhone} value="+229 01 94 35 50 50" dim />
                    <ContactRow Icon={IcoMail} value="contact@retourgagnantbenin.bj" dim />
                    <ContactRow Icon={IcoGlobe} value="www.retourgagnantbenin.bj" dim />
                    <ContactRow Icon={IcoPin} value={"Haie-Vive Cocotiers, Carré N°1158\nCotonou — BÉNIN"} dim />
                </div>

                {/* ── ZONE QR — droite ── */}
                <div style={{ position: 'absolute', top: 64 * s, right: 12 * s, width: 94 * s, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 * s }}>
                    {/* Encadré QR */}
                    <div style={{ background: '#ffffff', padding: 5 * s, borderRadius: 6 * s, boxShadow: `0 0 0 1.5px ${GOLD}60, 0 4px 20px rgba(0,0,0,0.5)` }}>
                        <QRCodeDisplay size={Math.round(68 * s)} />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 5 * s, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center' }}>
                        Scannez-nous
                    </div>

                    {/* Logo petit */}
                    <div style={{ marginTop: 2 * s, display: 'flex', alignItems: 'center', gap: 4 * s }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 14 * s, height: 14 * s, objectFit: 'contain', opacity: 0.55 }} />
                        <span style={{ color: `${GOLD}70`, fontSize: 4.5 * s, fontFamily: "'Cinzel',serif", letterSpacing: '0.15em', fontWeight: 700 }}>RGB</span>
                    </div>
                </div>
            </div>
        )
    }
)
CardVerso.displayName = 'CardVerso'
