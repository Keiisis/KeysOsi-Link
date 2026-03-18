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

const GOLD  = '#C9A84C'
const GOLD_L = '#E2C97E'
const DARK  = '#040c18'
const DARK2 = '#071525'
const LIGHT = '#f2f4f7'

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
        return <img src={qrSrc} alt="QR Code Retour Gagnant Bénin" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
    }
    return <QRCode value="https://www.retourgagnantbenin.bj" size={size} fgColor={DARK} bgColor="#ffffff" level="M" />
}

/* ══════════════════════════════════════════════════════════════
   RECTO — Fond clair + section sombre bas (inspiré du modèle)
══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data: _data, scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale
        // Section sombre : hauteur + décalage diagonal
        const dkH = 90, diag = 30

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                background: LIGHT, borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 16px 60px rgba(0,0,0,0.35)',
            }}>
                {/* Barre dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, ${GOLD}80, ${GOLD_L}, ${GOLD}80)`, zIndex: 3 }} />

                {/* Triangle accent coin haut-gauche */}
                <div style={{ position: 'absolute', top: 3 * s, left: 0, width: 0, height: 0, borderTop: `${16*s}px solid ${GOLD}`, borderRight: `${16*s}px solid transparent`, zIndex: 3 }} />
                {/* Triangle accent coin haut-droit */}
                <div style={{ position: 'absolute', top: 3 * s, right: 0, width: 0, height: 0, borderTop: `${16*s}px solid ${GOLD}`, borderLeft: `${16*s}px solid transparent`, zIndex: 3 }} />

                {/* Section sombre bas — bord diagonal */}
                <svg style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 1 }}
                    width={W} height={(dkH + diag) * s}
                    viewBox={`0 0 340 ${dkH + diag}`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="recto-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={DARK} />
                            <stop offset="100%" stopColor={DARK2} />
                        </linearGradient>
                    </defs>
                    <polygon points={`0,${diag} 340,0 340,${dkH+diag} 0,${dkH+diag}`} fill="url(#recto-grad)" />
                    <line x1="0" y1={diag} x2="340" y2="0" stroke={GOLD} strokeWidth="1.5" opacity="0.55" />
                    {/* Bande dorée décorative en parallèle */}
                    <polygon points={`0,${diag+3} 340,3 340,${diag+3+6} 0,${diag+3+6}`} fill={GOLD} opacity="0.07" />
                </svg>

                {/* ── Zone blanche — logo + nom ── */}
                <div style={{ position: 'absolute', top: 14 * s, left: 0, right: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 * s }}>
                    {/* Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 46 * s, height: 46 * s, objectFit: 'contain' }} />

                    {/* Nom agence */}
                    <div style={{ color: DARK, fontSize: 8.5 * s, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center' }}>
                        RETOUR GAGNANT BÉNIN
                    </div>

                    {/* Ornement doré */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, width: 140 * s }}>
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
                        <div style={{ width: 4 * s, height: 4 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(270deg, transparent, ${GOLD})` }} />
                    </div>

                    {/* Accroche */}
                    <div style={{ color: '#8a919e', fontSize: 6 * s, letterSpacing: '0.1em', fontStyle: 'italic', textAlign: 'center' }}>
                        L&apos;Agence du Retour des Afro-descendants
                    </div>
                </div>

                {/* ── Zone sombre — QR + contacts agence ── */}
                {/* QR code — droite */}
                <div style={{ position: 'absolute', bottom: 10 * s, right: 14 * s, zIndex: 4, background: '#ffffff', padding: 5 * s, borderRadius: 5 * s, boxShadow: `0 0 0 1.5px ${GOLD}70, 0 4px 18px rgba(0,0,0,0.45)` }}>
                    <QRCodeDisplay size={Math.round(60 * s)} />
                </div>

                {/* Contacts agence — gauche de la zone sombre */}
                <div style={{ position: 'absolute', bottom: 10 * s, left: 16 * s, zIndex: 4, display: 'flex', flexDirection: 'column', gap: 4 * s }}>
                    <div style={{ color: GOLD, fontSize: 7 * s, fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Cinzel',serif" }}>
                        www.retourgagnantbenin.bj
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5.8 * s }}>
                        +229 01 60 32 21 21
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5.8 * s }}>
                        +229 01 94 35 50 50
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 5.5 * s, marginTop: 1 * s }}>
                        Haie-Vive Cocotiers, Cotonou — BÉNIN
                    </div>
                </div>

                {/* Triangle bas-droit doré */}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderBottom: `${22*s}px solid ${GOLD}60`, borderLeft: `${22*s}px solid transparent`, zIndex: 5 }} />
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ══════════════════════════════════════════════════════════════
   VERSO — Fond blanc + section sombre gauche (flèche)
   Toutes les infos agence + infos agent
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale
        // Section sombre gauche : largeur + pointe de flèche
        const dkW = 112, arrow = 22

        const Row = ({ label, value }: { label: string; value: string }) => (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 * s, marginBottom: 4 * s }}>
                <span style={{ color: GOLD, fontSize: 5.8 * s, fontWeight: 700, fontFamily: "'Cinzel','Georgia',serif", flexShrink: 0, minWidth: 11 * s }}>
                    {label}
                </span>
                <span style={{ color: 'rgba(15,20,40,0.75)', fontSize: 5.6 * s, lineHeight: 1.35, fontFamily: "'Arial',sans-serif", whiteSpace: 'pre-line' }}>
                    {value}
                </span>
            </div>
        )

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                background: '#ffffff', borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 16px 60px rgba(0,0,0,0.35)',
            }}>
                {/* Barre dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, ${GOLD}80, ${GOLD_L}, ${GOLD}80)`, zIndex: 3 }} />

                {/* Section sombre gauche — forme de flèche pointant à droite */}
                <svg style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                    width={(dkW + arrow) * s} height={H}
                    viewBox={`0 0 ${dkW + arrow} 220`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="verso-grad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={DARK} />
                            <stop offset="100%" stopColor={DARK2} />
                        </linearGradient>
                    </defs>
                    {/* Forme flèche */}
                    <polygon points={`0,0 ${dkW},0 ${dkW+arrow},110 ${dkW},220 0,220`} fill="url(#verso-grad)" />
                    {/* Lignes dorées — bords de la flèche */}
                    <line x1={dkW} y1="0" x2={dkW+arrow} y2="110" stroke={GOLD} strokeWidth="1.5" opacity="0.6" />
                    <line x1={dkW} y1="220" x2={dkW+arrow} y2="110" stroke={GOLD} strokeWidth="1.5" opacity="0.6" />
                    {/* Reflet intérieur */}
                    <polygon points={`0,0 ${dkW},0 ${dkW+arrow},110 ${dkW},220 0,220`} fill="url(#verso-grad)" opacity="0" />
                </svg>

                {/* ── Section sombre — logo + nom agence ── */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: dkW * s, height: H, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 * s }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 42 * s, height: 42 * s, objectFit: 'contain' }} />

                    <div style={{ color: GOLD, fontSize: 6.5 * s, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center', lineHeight: 1.6 }}>
                        RETOUR<br />GAGNANT<br />BÉNIN
                    </div>

                    <div style={{ width: 48 * s, height: 1 * s, background: `${GOLD}50` }} />

                    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 4.8 * s, letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.5 }}>
                        Cotonou<br />BÉNIN
                    </div>
                </div>

                {/* ── Section blanche — identité agent + contacts ── */}
                <div style={{ position: 'absolute', top: 12 * s, left: (dkW + arrow + 10) * s, right: 11 * s, bottom: 10 * s, zIndex: 2 }}>

                    {/* Identité agent */}
                    <div style={{ marginBottom: 5 * s }}>
                        <div style={{ color: GOLD, fontSize: 10.5 * s, fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.2 }}>
                            {data.prenom} {data.nom}
                        </div>
                        <div style={{ width: 65 * s, height: 1.5 * s, background: `linear-gradient(90deg, ${GOLD}, transparent)`, marginTop: 4 * s, marginBottom: 3 * s }} />
                        <div style={{ color: 'rgba(15,20,40,0.45)', fontSize: 5.5 * s, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            {data.position}
                        </div>
                    </div>

                    {/* Séparateur */}
                    <div style={{ width: '100%', height: 0.7 * s, background: `linear-gradient(90deg, ${GOLD}35, transparent)`, marginBottom: 7 * s }} />

                    {/* Contacts — agent */}
                    {data.phone && <Row label="T." value={data.phone} />}
                    {data.email && <Row label="E." value={data.email} />}

                    {/* Contacts — agence */}
                    <Row label="T." value="+229 01 60 32 21 21" />
                    <Row label="T." value="+229 01 94 35 50 50" />
                    <Row label="E." value="contact@retourgagnantbenin.bj" />
                    <Row label="W." value="www.retourgagnantbenin.bj" />
                    <Row label="A." value={"Haie-Vive Cocotiers, Carré N°1158\nCotonou — BÉNIN"} />
                </div>

                {/* Triangle accent bas-droit */}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderBottom: `${22*s}px solid ${GOLD}`, borderLeft: `${22*s}px solid transparent`, zIndex: 3 }} />

                {/* Triangle accent bas-gauche (section sombre) */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderBottom: `${18*s}px solid ${GOLD}40`, borderRight: `${18*s}px solid transparent`, zIndex: 3 }} />
            </div>
        )
    }
)
CardVerso.displayName = 'CardVerso'
