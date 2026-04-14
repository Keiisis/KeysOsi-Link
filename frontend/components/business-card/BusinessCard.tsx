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
   PALETTE — Fond blanc, accents dorés, texte sombre
══════════════════════════════════════════════════════════════ */

const GOLD   = '#C9A84C'
const GOLD_D = '#B08D3A'
const DARK   = '#1A1A2E'
const TEXT   = '#222222'
const TEXT_L = '#555555'

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
   RECTO — Fond Blanc, Logo TRÈS Grand, Nom Agence + Tagline
   Dimensions professionnelles : 600 × 388 px (ratio 85:55mm)
══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ scale = 1 }, ref) => {
        const W = 600 * scale, H = 388 * scale, s = scale

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                borderRadius: 12 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
                background: '#FFFFFF',
            }}>
                {/* ── Liseré doré en haut ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 4.5 * s,
                    background: `linear-gradient(90deg, ${GOLD_D}, ${GOLD}, ${GOLD_D})`,
                    zIndex: 3,
                }} />

                {/* ── Liseré doré en bas ── */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 4.5 * s,
                    background: `linear-gradient(90deg, ${GOLD_D}, ${GOLD}, ${GOLD_D})`,
                    zIndex: 3,
                }} />

                {/* ── Cadre subtil intérieur ── */}
                <div style={{
                    position: 'absolute',
                    top: 12 * s, bottom: 12 * s, left: 12 * s, right: 12 * s,
                    border: `1px solid ${GOLD}30`,
                    borderRadius: 6 * s,
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* ── Contenu centré ── */}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 2, padding: `${20 * s}px`,
                }}>

                    {/* LOGO — TRÈS GRAND */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/logo-transparent.png"
                        alt="Retour Gagnant Bénin"
                        style={{
                            width: 170 * s,
                            height: 170 * s,
                            objectFit: 'contain',
                            marginBottom: 14 * s,
                            filter: 'drop-shadow(0px 4px 12px rgba(201,168,76,0.15))',
                        }}
                    />

                    {/* Ornement doré ─── ◆ ─── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10 * s,
                        marginBottom: 14 * s,
                    }}>
                        <div style={{
                            width: 80 * s, height: 1.5 * s,
                            background: `linear-gradient(90deg, transparent, ${GOLD})`,
                        }} />
                        <div style={{
                            width: 8 * s, height: 8 * s,
                            background: GOLD,
                            transform: 'rotate(45deg)',
                            boxShadow: `0 0 8px ${GOLD}50`,
                            flexShrink: 0,
                        }} />
                        <div style={{
                            width: 80 * s, height: 1.5 * s,
                            background: `linear-gradient(270deg, transparent, ${GOLD})`,
                        }} />
                    </div>

                    {/* NOM DE L'AGENCE — Grand, lisible, sombre */}
                    <div style={{
                        color: DARK,
                        fontSize: 26 * s,
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        fontFamily: "'Cinzel','Georgia',serif",
                        textAlign: 'center',
                        lineHeight: 1.15,
                        marginLeft: `${0.25 * 26 * s}px`,
                    }}>
                        Retour Gagnant
                    </div>
                    <div style={{
                        color: DARK,
                        fontSize: 26 * s,
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        fontFamily: "'Cinzel','Georgia',serif",
                        textAlign: 'center',
                        lineHeight: 1.15,
                        marginTop: 6 * s,
                        marginLeft: `${0.25 * 26 * s}px`,
                    }}>
                        Bénin
                    </div>

                    {/* Tagline — italique doré */}
                    <div style={{
                        color: GOLD_D,
                        fontSize: 13 * s,
                        letterSpacing: '0.10em',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        marginTop: 16 * s,
                        fontWeight: 500,
                        fontFamily: "'Georgia',serif",
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
   VERSO — Fond Blanc, toutes tailles optimisées impression
   Contacts très lisibles + QR Code premium
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 600 * scale, H = 388 * scale, s = scale
        const qrSize = Math.round(100 * s)
        const bracket = 14 * s

        return (
            <div ref={ref} style={{
                width: W, height: H, position: 'relative', overflow: 'hidden',
                borderRadius: 12 * s, flexShrink: 0,
                fontFamily: "'Arial','Helvetica',sans-serif",
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
                background: '#FFFFFF',
            }}>

                {/* ── Liseré supérieur doré pleine largeur ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 4.5 * s,
                    background: `linear-gradient(90deg, ${GOLD_D}, ${GOLD}, ${GOLD_D})`,
                    zIndex: 3,
                }} />

                {/* ── Barre verticale accent gauche ── */}
                <div style={{
                    position: 'absolute', top: 20 * s, bottom: 20 * s, left: 0,
                    width: 4 * s,
                    background: `linear-gradient(180deg, transparent, ${GOLD} 25%, ${GOLD} 75%, transparent)`,
                    zIndex: 3,
                }} />

                <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>

                    {/* ══════════════════════════════════════════
                        COLONNE GAUCHE — Identité + Contacts
                    ══════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute',
                        top: 30 * s, left: 30 * s,
                        right: 180 * s,
                    }}>

                        {/* Petit ornement pré-nom */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 7 * s, marginBottom: 14 * s,
                        }}>
                            <div style={{
                                width: 36 * s, height: 1.5 * s,
                                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
                            }} />
                            <div style={{
                                width: 6 * s, height: 6 * s,
                                background: GOLD, transform: 'rotate(45deg)',
                                flexShrink: 0,
                            }} />
                            <div style={{
                                width: 16 * s, height: 1.5 * s,
                                background: `linear-gradient(90deg, ${GOLD}80, transparent)`,
                            }} />
                        </div>

                        {/* Prénom — sombre, lisible */}
                        <div style={{
                            color: TEXT_L,
                            fontSize: 22 * s,
                            fontWeight: 400,
                            letterSpacing: '0.08em',
                            fontFamily: "'Cinzel','Georgia',serif",
                            lineHeight: 1.15,
                            marginBottom: 4 * s,
                            textTransform: 'uppercase',
                        }}>
                            {data.prenom}
                        </div>

                        {/* NOM — doré, dominant, très lisible */}
                        <div style={{
                            color: GOLD_D,
                            fontSize: 30 * s,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            fontFamily: "'Cinzel','Georgia',serif",
                            lineHeight: 1.15,
                            marginBottom: 14 * s,
                            textTransform: 'uppercase',
                        }}>
                            {data.nom}
                        </div>

                        {/* Ligne or gradient */}
                        <div style={{
                            height: 2 * s, marginBottom: 14 * s,
                            background: `linear-gradient(90deg, ${GOLD}, ${GOLD}50 70%, transparent)`,
                            width: 140 * s,
                        }} />

                        {/* Poste */}
                        <div style={{
                            color: GOLD,
                            fontSize: 13 * s,
                            fontWeight: 600,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            fontFamily: "'Inter','Arial',sans-serif",
                            marginBottom: 26 * s,
                            overflow: 'hidden',
                        }}>
                            {data.position || 'CONSULTANT(E)'}
                        </div>

                        {/* Téléphone agent */}
                        {data.phone && (
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                gap: 12 * s, marginBottom: 12 * s,
                            }}>
                                <IcoPhone sz={Math.round(15 * s)} col={GOLD} />
                                <span style={{
                                    color: TEXT,
                                    fontSize: 15 * s,
                                    fontWeight: 500,
                                    letterSpacing: '0.04em',
                                    fontFamily: "'Inter','Arial',sans-serif",
                                }}>
                                    {data.phone}
                                </span>
                            </div>
                        )}

                        {/* Email agent */}
                        {data.email && (
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                gap: 12 * s,
                            }}>
                                <IcoMail sz={Math.round(15 * s)} col={GOLD} />
                                <span style={{
                                    color: TEXT,
                                    fontSize: 15 * s,
                                    fontWeight: 500,
                                    letterSpacing: '0.01em',
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
                        position: 'absolute',
                        top: 30 * s, right: 24 * s,
                        width: 140 * s,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                        {/* QR avec brackets dorés aux coins */}
                        <div style={{
                            position: 'relative',
                            padding: `${4 * s}px`,
                        }}>

                            {/* Coins dorés — top-left */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                width: bracket, height: bracket,
                                borderTop: `2.5px solid ${GOLD}`,
                                borderLeft: `2.5px solid ${GOLD}`,
                            }} />
                            {/* top-right */}
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                width: bracket, height: bracket,
                                borderTop: `2.5px solid ${GOLD}`,
                                borderRight: `2.5px solid ${GOLD}`,
                            }} />
                            {/* bottom-left */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0,
                                width: bracket, height: bracket,
                                borderBottom: `2.5px solid ${GOLD}`,
                                borderLeft: `2.5px solid ${GOLD}`,
                            }} />
                            {/* bottom-right */}
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: bracket, height: bracket,
                                borderBottom: `2.5px solid ${GOLD}`,
                                borderRight: `2.5px solid ${GOLD}`,
                            }} />

                            {/* QR */}
                            <div style={{
                                background: '#ffffff',
                                padding: `${8 * s}px`,
                                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                            }}>
                                <QRCodeDisplay size={qrSize} />
                            </div>
                        </div>

                        {/* Label Scanner */}
                        <div style={{
                            marginTop: 12 * s,
                            color: GOLD,
                            fontSize: 10 * s,
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            fontFamily: "'Cinzel',serif",
                            textAlign: 'center',
                            fontWeight: 600,
                        }}>
                            Scanner
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════
                        FOOTER — Web & Adresse
                    ══════════════════════════════════════════ */}

                    {/* Séparateur pleine largeur gradient */}
                    <div style={{
                        position: 'absolute',
                        bottom: 72 * s, left: 20 * s, right: 20 * s,
                        height: 1 * s,
                        background: `linear-gradient(90deg, transparent, ${GOLD}60 20%, ${GOLD}60 80%, transparent)`,
                    }} />

                    {/* Deux lignes footer */}
                    <div style={{
                        position: 'absolute',
                        bottom: 18 * s, left: 30 * s, right: 30 * s,
                    }}>
                        {/* Web + Email */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 10 * s, marginBottom: 10 * s,
                        }}>
                            <IcoGlobe sz={Math.round(13 * s)} col={GOLD} />
                            <span style={{
                                color: TEXT_L,
                                fontSize: 12 * s,
                                letterSpacing: '0.02em',
                                fontFamily: "'Inter','Arial',sans-serif",
                                fontWeight: 500,
                            }}>
                                contact@retourgagnantbenin.bj — www.retourgagnantbenin.bj
                            </span>
                        </div>
                        {/* Adresse */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: 10 * s,
                        }}>
                            <IcoPin sz={Math.round(13 * s)} col={GOLD} />
                            <span style={{
                                color: TEXT_L,
                                fontSize: 12 * s,
                                letterSpacing: '0.02em',
                                fontFamily: "'Inter','Arial',sans-serif",
                                fontWeight: 500,
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
