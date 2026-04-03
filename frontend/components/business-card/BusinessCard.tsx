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
   PALETTE LUXE
══════════════════════════════════════════════════════════════ */

const GOLD   = '#C9A84C'
const GOLD_L = '#E2C97E'
const DARK   = '#030A18'
const DARK2  = '#0A1C3A'

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
   FOND & FILIGRANE
══════════════════════════════════════════════════════════════ */

const CardBackground = ({ s }: { s: number }) => (
    <>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${DARK2} 0%, ${DARK} 100%)`, zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 200 * s, height: 200 * s, background: `radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 200 * s, height: 200 * s, background: `radial-gradient(circle, rgba(0,135,81,0.03) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 5 * s, bottom: 5 * s, left: 5 * s, right: 5 * s, border: `0.5px solid ${GOLD}25`, borderRadius: 6 * s, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-15deg)',
            color: '#ffffff', opacity: 0.025, fontSize: 130 * s, fontWeight: 900,
            fontFamily: "'Cinzel','Georgia',serif", pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap', zIndex: 1
        }}>
            RGB
        </div>
    </>
)

/* ══════════════════════════════════════════════════════════════
   RECTO — Le Prestige de la Marque
══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 20px 70px rgba(0,0,0,0.55)',
            }}>
                <CardBackground s={s} />

                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>

                    {/* Glow derrière le logo */}
                    <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)', width: 160 * s, height: 160 * s, background: `radial-gradient(circle, ${GOLD}20 0%, transparent 60%)`, pointerEvents: 'none' }} />

                    {/* Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 86 * s, height: 86 * s, objectFit: 'contain', marginBottom: 8 * s, filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.4))' }} />

                    {/* Ornement */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, marginBottom: 10 * s }}>
                        <div style={{ width: 56 * s, height: 1 * s, background: `linear-gradient(90deg, transparent, ${GOLD}70)` }} />
                        <div style={{ width: 5 * s, height: 5 * s, background: GOLD_L, transform: 'rotate(45deg)', boxShadow: `0 0 12px ${GOLD}80` }} />
                        <div style={{ width: 56 * s, height: 1 * s, background: `linear-gradient(270deg, transparent, ${GOLD}70)` }} />
                    </div>

                    {/* Nom Agence — AGRANDI pour impression */}
                    <div style={{
                        color: GOLD_L, fontSize: 14 * s, fontWeight: 700,
                        letterSpacing: '0.28em', textTransform: 'uppercase',
                        fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center',
                        marginLeft: `${0.28 * 14 * s}px`,
                    }}>
                        Retour Gagnant
                    </div>
                    <div style={{
                        color: GOLD_L, fontSize: 14 * s, fontWeight: 700,
                        letterSpacing: '0.28em', textTransform: 'uppercase',
                        fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center',
                        marginTop: 5 * s, marginLeft: `${0.28 * 14 * s}px`,
                    }}>
                        Bénin
                    </div>

                    {/* Tagline — AGRANDIE pour impression */}
                    <div style={{
                        color: `${GOLD_L}85`, fontSize: 8 * s,
                        letterSpacing: '0.15em', textAlign: 'center',
                        fontStyle: 'italic', marginTop: 10 * s, fontWeight: 300,
                    }}>
                        L&apos;Agence du Retour des Afro-descendants
                    </div>
                </div>
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ══════════════════════════════════════════════════════════════
   VERSO — Ultra Premium, Aéré, Waouh
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale, H = 220 * scale, s = scale
        const qrSize = Math.round(62 * s)
        const bracket = 10 * s  // taille des coins dorés du cadre QR

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                borderRadius: 10 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 20px 70px rgba(0,0,0,0.55)',
            }}>
                <CardBackground s={s} />

                {/* ── Liseré supérieur doré pleine largeur ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 2.5 * s,
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD}90 30%, ${GOLD} 50%, ${GOLD}90 70%, transparent 100%)`,
                    zIndex: 3,
                }} />

                {/* ── Barre verticale accent gauche ── */}
                <div style={{
                    position: 'absolute', top: 16 * s, bottom: 16 * s, left: 0,
                    width: 2.5 * s,
                    background: `linear-gradient(180deg, transparent, ${GOLD}60 25%, ${GOLD}80 50%, ${GOLD}60 75%, transparent)`,
                    zIndex: 3,
                }} />

                <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>

                    {/* ══════════════════════════════════════════
                        COLONNE GAUCHE — Identité + Contacts
                    ══════════════════════════════════════════ */}
                    <div style={{ position: 'absolute', top: 18 * s, left: 18 * s, right: 108 * s }}>

                        {/* Petit ornement pré-nom */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, marginBottom: 10 * s }}>
                            <div style={{ width: 22 * s, height: 1 * s, background: `linear-gradient(90deg, ${GOLD}90, transparent)` }} />
                            <div style={{ width: 4 * s, height: 4 * s, background: GOLD_L, transform: 'rotate(45deg)', flexShrink: 0 }} />
                            <div style={{ width: 10 * s, height: 1 * s, background: `linear-gradient(90deg, ${GOLD}50, transparent)` }} />
                        </div>

                        {/* Prénom — blanc, sobre */}
                        <div style={{
                            color: 'rgba(255,255,255,0.88)',
                            fontSize: 15 * s, fontWeight: 400,
                            letterSpacing: '0.10em',
                            fontFamily: "'Cinzel','Georgia',serif",
                            lineHeight: 1.1, marginBottom: 3 * s,
                            textTransform: 'uppercase',
                        }}>
                            {data.prenom}
                        </div>

                        {/* NOM — or, dominant */}
                        <div style={{
                            color: GOLD_L,
                            fontSize: 20 * s, fontWeight: 700,
                            letterSpacing: '0.06em',
                            fontFamily: "'Cinzel','Georgia',serif",
                            lineHeight: 1.1, marginBottom: 10 * s,
                            textTransform: 'uppercase',
                            textShadow: `0 0 25px ${GOLD}40`,
                        }}>
                            {data.nom}
                        </div>

                        {/* Ligne or gradient */}
                        <div style={{
                            height: 1.5 * s, marginBottom: 10 * s,
                            background: `linear-gradient(90deg, ${GOLD}, ${GOLD}40 60%, transparent)`,
                            width: 90 * s,
                        }} />

                        {/* Poste */}
                        <div style={{
                            color: GOLD,
                            fontSize: 8.5 * s, fontWeight: 600,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontFamily: "'Inter','Arial',sans-serif",
                            marginBottom: 18 * s,
                            overflow: 'hidden',
                        }}>
                            {data.position || 'CONSULTANT(E)'}
                        </div>

                        {/* Téléphone agent */}
                        {data.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s, marginBottom: 8 * s }}>
                                <IcoPhone sz={Math.round(9 * s)} col={GOLD_L} />
                                <span style={{
                                    color: '#ffffff', fontSize: 9.5 * s,
                                    fontWeight: 500, letterSpacing: '0.03em',
                                    fontFamily: "'Inter','Arial',sans-serif",
                                }}>
                                    {data.phone}
                                </span>
                            </div>
                        )}

                        {/* Email agent */}
                        {data.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s }}>
                                <IcoMail sz={Math.round(9 * s)} col={GOLD_L} />
                                <span style={{
                                    color: '#ffffff', fontSize: 9.5 * s,
                                    fontWeight: 500, letterSpacing: '0.01em',
                                    fontFamily: "'Inter','Arial',sans-serif",
                                    overflow: 'hidden',
                                }}>
                                    {data.email}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ══════════════════════════════════════════
                        COLONNE DROITE — QR Code premium
                    ══════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', top: 18 * s, right: 14 * s,
                        width: 90 * s,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                        {/* QR avec brackets dorés aux coins */}
                        <div style={{ position: 'relative', padding: `${3 * s}px` }}>

                            {/* Coins dorés — top-left */}
                            <div style={{ position: 'absolute', top: 0, left: 0, width: bracket, height: bracket, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
                            {/* top-right */}
                            <div style={{ position: 'absolute', top: 0, right: 0, width: bracket, height: bracket, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
                            {/* bottom-left */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: bracket, height: bracket, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
                            {/* bottom-right */}
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: bracket, height: bracket, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />

                            {/* QR blanc */}
                            <div style={{
                                background: '#ffffff',
                                padding: `${5 * s}px`,
                                boxShadow: `0 6px 28px rgba(0,0,0,0.65)`,
                            }}>
                                <QRCodeDisplay size={qrSize} />
                            </div>
                        </div>

                        {/* Label */}
                        <div style={{
                            marginTop: 8 * s,
                            color: `${GOLD}75`,
                            fontSize: 6.5 * s,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                            fontFamily: "'Cinzel',serif",
                            textAlign: 'center',
                        }}>
                            Scanner
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════
                        FOOTER — Web & Adresse (sans téléphones)
                    ══════════════════════════════════════════ */}

                    {/* Séparateur pleine largeur gradient */}
                    <div style={{
                        position: 'absolute', bottom: 46 * s, left: 12 * s, right: 12 * s,
                        height: 0.5 * s,
                        background: `linear-gradient(90deg, transparent, ${GOLD}50 30%, ${GOLD}50 70%, transparent)`,
                    }} />

                    {/* Deux lignes footer */}
                    <div style={{ position: 'absolute', bottom: 10 * s, left: 18 * s, right: 18 * s }}>
                        {/* Web + Email */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 * s, marginBottom: 6 * s }}>
                            <IcoGlobe sz={Math.round(8 * s)} col={`${GOLD}85`} />
                            <span style={{
                                color: 'rgba(255,255,255,0.65)',
                                fontSize: 7.5 * s, letterSpacing: '0.02em',
                                fontFamily: "'Inter','Arial',sans-serif",
                            }}>
                                contact@retourgagnantbenin.bj — www.retourgagnantbenin.bj
                            </span>
                        </div>
                        {/* Adresse */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 * s }}>
                            <IcoPin sz={Math.round(8 * s)} col={`${GOLD}85`} />
                            <span style={{
                                color: 'rgba(255,255,255,0.65)',
                                fontSize: 7.5 * s, letterSpacing: '0.02em',
                                fontFamily: "'Inter','Arial',sans-serif",
                            }}>
                                Haie-Vive Cocotiers, Carré N°1158, Cotonou — BÉNIN
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        )
    }
)
CardVerso.displayName = 'CardVerso'
