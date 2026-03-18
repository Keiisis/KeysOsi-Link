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

const GOLD     = '#C9A84C'
const GOLD_L   = '#E2C97E'
const DARK     = '#030810'
const BG_RECTO = 'linear-gradient(158deg, #040c18 0%, #071e30 48%, #051523 100%)'
const BG_VERSO = 'linear-gradient(158deg, #030a14 0%, #060f1c 50%, #071622 100%)'

/* ══════════════════════════════════════════════════════════════
   SVG — PORTE DU NON-RETOUR + POING
══════════════════════════════════════════════════════════════ */

function DoorIllustration({ opacity = 1 }: { opacity?: number }) {
    return (
        <svg viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', opacity }}>
            <defs>
                <filter id="g-s"><feGaussianBlur stdDeviation="1" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="g-m"><feGaussianBlur stdDeviation="1.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD_L} /><stop offset="100%" stopColor={GOLD} stopOpacity="0.5" /></linearGradient>
            </defs>
            <rect x="10" y="28" width="240" height="14" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#g-s)" />
            <line x1="10" y1="24" x2="250" y2="24" stroke={GOLD} strokeWidth="0.5" opacity="0.4" />
            {[20,32,44,56,68,80].map(cx=>(
                <g key={cx} fill={GOLD} opacity="0.9"><circle cx={cx} cy="21" r="3.2"/><rect x={cx-2.2} y="25" width="4.4" height="5.5" rx="1.8"/></g>
            ))}
            {[180,192,204,216,228,240].map(cx=>(
                <g key={cx} fill={GOLD} opacity="0.9"><circle cx={cx} cy="21" r="3.2"/><rect x={cx-2.2} y="25" width="4.4" height="5.5" rx="1.8"/></g>
            ))}
            <rect x="12" y="42" width="20" height="115" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#g-s)" />
            {[57,70,83,96,109,122].map(y=>(<line key={y} x1="12" y1={y} x2="32" y2={y} stroke={GOLD} strokeWidth="0.5" opacity="0.35"/>))}
            <rect x="228" y="42" width="20" height="115" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#g-s)" />
            {[57,70,83,96,109,122].map(y=>(<line key={y} x1="228" y1={y} x2="248" y2={y} stroke={GOLD} strokeWidth="0.5" opacity="0.35"/>))}
            <path d="M 82,157 L 82,100 Q 82,58 130,58 Q 178,58 178,100 L 178,157" stroke={GOLD} strokeWidth="2.5" fill="none" filter="url(#g-m)" />
            <path d="M 93,157 L 93,104 Q 93,70 130,70 Q 167,70 167,104 L 167,157" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.35" />
            <rect x="74" y="146" width="12" height="12" stroke={GOLD} strokeWidth="0.9" opacity="0.7" />
            <rect x="174" y="146" width="12" height="12" stroke={GOLD} strokeWidth="0.9" opacity="0.7" />
            <rect x="112" y="116" width="34" height="25" rx="4.5" fill={GOLD} opacity="0.95" />
            <rect x="112" y="98" width="8.5" height="20" rx="4" fill={GOLD} />
            <rect x="121.5" y="93" width="8.5" height="25" rx="4" fill={GOLD} />
            <rect x="131" y="95" width="8.5" height="23" rx="4" fill={GOLD} />
            <rect x="140.5" y="98" width="7.5" height="20" rx="3.5" fill={GOLD} />
            <rect x="100" y="117" width="15" height="17" rx="4.5" fill={GOLD} transform="rotate(-18 107 125)" />
            <line x1="120" y1="116" x2="120" y2="127" stroke={DARK} strokeWidth="1.1"/>
            <line x1="129" y1="116" x2="129" y2="127" stroke={DARK} strokeWidth="1.1"/>
            <line x1="138" y1="116" x2="138" y2="127" stroke={DARK} strokeWidth="1.1"/>
            <line x1="114" y1="117" x2="145" y2="117" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
            <ellipse cx="112" cy="146" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(-30 112 146)"/>
            <ellipse cx="102" cy="159" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(-30 102 159)"/>
            <ellipse cx="92" cy="172" rx="8" ry="4" stroke={GOLD} strokeWidth="1.2" opacity="0.6" transform="rotate(-30 92 172)"/>
            <ellipse cx="148" cy="146" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(30 148 146)"/>
            <ellipse cx="158" cy="159" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(30 158 159)"/>
            <ellipse cx="168" cy="172" rx="8" ry="4" stroke={GOLD} strokeWidth="1.2" opacity="0.6" transform="rotate(30 168 172)"/>
            <rect x="122" y="138" width="5.5" height="2.5" rx="1" fill={GOLD} transform="rotate(-45 124 139)"/>
            <rect x="132" y="135" width="4.5" height="2" rx="0.8" fill={GOLD} transform="rotate(40 134 136)"/>
            <circle cx="127" cy="132" r="2.2" fill={GOLD} opacity="0.9"/>
            <circle cx="119" cy="141" r="1.5" fill={GOLD} opacity="0.6"/>
            <circle cx="141" cy="140" r="1.5" fill={GOLD} opacity="0.6"/>
        </svg>
    )
}

/* ══════════════════════════════════════════════════════════════
   CORNER BRACKETS
══════════════════════════════════════════════════════════════ */

function CornerBrackets({ s, arm = 16 }: { s: number; arm?: number }) {
    const a = arm * s, thick = 1.8 * s, off = 8 * s
    const bar = (st: React.CSSProperties) => (
        <div style={{ position: 'absolute', background: GOLD, opacity: 0.7, ...st }} />
    )
    return (
        <>
            <div style={{ position: 'absolute', top: off, left: off, width: a, height: a }}>
                {bar({ top: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, left: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', top: off, right: off, width: a, height: a }}>
                {bar({ top: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, right: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', bottom: off, left: off, width: a, height: a }}>
                {bar({ bottom: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, left: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', bottom: off, right: off, width: a, height: a }}>
                {bar({ bottom: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, right: 0, bottom: 0, width: thick })}
            </div>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   QR CODE — /public/images/qr-code.png avec fallback
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
            } catch {
                setQrSrc(null)
            }
        }
        img.onerror = () => setQrSrc(null)
        img.src = '/images/qr-code.png'
    }, [])

    if (qrSrc) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={qrSrc} alt="QR Code Retour Gagnant Bénin" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
    }
    return <QRCode value="https://www.retourgagnantbenin.bj" size={size} fgColor="#030810" bgColor="#ffffff" level="M" />
}

/* ══════════════════════════════════════════════════════════════
   RECTO — Face institutionnelle (logo + illustration, SANS nom)
══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data: _data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const s = scale

        return (
            <div
                ref={ref}
                style={{
                    width: W, height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: BG_RECTO,
                    fontFamily: "'Georgia', serif",
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    borderRadius: 12 * s,
                    flexShrink: 0,
                }}
            >
                {/* Bande dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, ${GOLD}80, ${GOLD_L}, ${GOLD}80)` }} />

                {/* Lueur centrale */}
                <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%,-50%)', width: 280 * s, height: 220 * s, background: `radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 65%)`, pointerEvents: 'none' }} />

                <CornerBrackets s={s} />

                {/* Logo + Org Name */}
                <div style={{ position: 'absolute', top: 16 * s, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 * s }}>
                    <div style={{ width: 36 * s, height: 36 * s, position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 36 * s, height: 36 * s, objectFit: 'contain' }} />
                    </div>
                    <div style={{ color: GOLD, fontSize: 8 * s, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', fontFamily: "'Cinzel','Trajan Pro','Georgia',serif", textAlign: 'center' }}>
                        RETOUR GAGNANT BÉNIN
                    </div>
                    {/* Ornement */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, width: 140 * s }}>
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(90deg, transparent, ${GOLD}70)` }} />
                        <div style={{ width: 3 * s, height: 3 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(270deg, transparent, ${GOLD}70)` }} />
                    </div>
                </div>

                {/* Illustration dominante */}
                <div style={{ position: 'absolute', top: 58 * s, left: '50%', transform: 'translateX(-50%)', width: 168 * s, height: 134 * s }}>
                    <DoorIllustration opacity={0.9} />
                </div>

                {/* Tagline bas */}
                <div style={{ position: 'absolute', bottom: 10 * s, left: 0, right: 0, textAlign: 'center', color: `${GOLD}75`, fontSize: 5 * s, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Arial', sans-serif" }}>
                    retourgagnantbenin.bj
                </div>
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ══════════════════════════════════════════════════════════════
   VERSO — Contact professionnel (épuré, sans emojis)
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const s = scale

        /* Préfixes de style "carte de luxe" : T. / E. */
        const ContactRow = ({ label, value }: { label: string; value: string }) => (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 * s }}>
                <span style={{ color: GOLD, fontSize: 6 * s, fontWeight: 700, letterSpacing: '0.05em', fontFamily: "'Cinzel','Georgia',serif", flexShrink: 0 }}>
                    {label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 5.8 * s, letterSpacing: '0.02em', fontFamily: "'Arial',sans-serif" }}>
                    {value}
                </span>
            </div>
        )

        return (
            <div
                ref={ref}
                style={{
                    width: W, height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: BG_VERSO,
                    fontFamily: "'Arial', sans-serif",
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    borderRadius: 12 * s,
                    flexShrink: 0,
                }}
            >
                {/* Bande dorée haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s, background: `linear-gradient(90deg, ${GOLD}80, ${GOLD_L}, ${GOLD}80)` }} />

                {/* Barre accent gauche */}
                <div style={{ position: 'absolute', top: 3 * s, left: 0, width: 2.5 * s, bottom: 0, background: `linear-gradient(180deg, ${GOLD}90, ${GOLD_L}70, ${GOLD}40)` }} />

                {/* Watermark illustration */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 220 * s, height: 178 * s, opacity: 0.025, pointerEvents: 'none' }}>
                    <DoorIllustration />
                </div>

                <CornerBrackets s={s} />

                {/* ── CONTENU PRINCIPAL ── */}
                <div style={{ position: 'absolute', top: 14 * s, left: 18 * s, right: 14 * s, bottom: 44 * s, display: 'flex', gap: 12 * s }}>

                    {/* Colonne gauche : identité + contacts */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>

                        {/* Identité */}
                        <div>
                            <div style={{ color: GOLD_L, fontSize: 12.5 * s, fontWeight: 700, letterSpacing: '0.05em', fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.1 }}>
                                {data.prenom} {data.nom}
                            </div>
                            <div style={{ width: 80 * s, height: 0.8 * s, background: `linear-gradient(90deg, ${GOLD}, transparent)`, marginTop: 5 * s, marginBottom: 4 * s }} />
                            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 6.2 * s, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Arial',sans-serif" }}>
                                {data.position}
                            </div>
                        </div>

                        {/* Contacts personnels */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 * s }}>
                            {data.phone && <ContactRow label="T." value={data.phone} />}
                            {data.email && <ContactRow label="E." value={data.email} />}
                        </div>
                    </div>

                    {/* Séparateur vertical */}
                    <div style={{ width: 0.7 * s, background: `linear-gradient(180deg, transparent, ${GOLD}45, transparent)`, flexShrink: 0 }} />

                    {/* Colonne droite : QR + marque */}
                    <div style={{ width: 82 * s, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ padding: 4 * s, background: '#ffffff', borderRadius: 3 * s, boxShadow: `0 0 0 1px ${GOLD}40, 0 0 18px ${GOLD}18` }}>
                            <QRCodeDisplay size={Math.round(62 * s)} />
                        </div>
                        <div style={{ color: GOLD, fontSize: 6.5 * s, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.55, textAlign: 'center' }}>
                            RETOUR<br />GAGNANT<br />BÉNIN
                        </div>
                    </div>
                </div>

                {/* ── BANDE BAS — org info ── */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44 * s, background: 'rgba(0,0,0,0.45)', borderTop: `0.8px solid ${GOLD}50`, paddingLeft: 18 * s, paddingRight: 14 * s, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 * s }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 * s }}>
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 6 * s }}>W. www.retourgagnantbenin.bj</span>
                        <span style={{ color: `${GOLD}80`, fontSize: 6 * s }}>·</span>
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 6 * s }}>T. +229 01 60 32 21 21</span>
                    </div>
                    <div style={{ color: GOLD, fontSize: 6.5 * s, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif" }}>
                        VOTRE RETOUR, NOTRE MISSION
                    </div>
                </div>
            </div>
        )
    }
)
CardVerso.displayName = 'CardVerso'
