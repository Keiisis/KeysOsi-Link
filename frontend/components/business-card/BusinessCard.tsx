'use client'

import React, { forwardRef, useState } from 'react'
import QRCode from 'react-qr-code'
import Image from 'next/image'

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

const GOLD       = '#C9A84C'
const GOLD_L     = '#E2C97E'
const GOLD_P     = '#F0DFA0'
const DARK       = '#030810'
const BG_RECTO   = 'linear-gradient(158deg, #040c18 0%, #071e30 48%, #051523 100%)'
const BG_VERSO   = 'linear-gradient(158deg, #030a14 0%, #060f1c 50%, #071622 100%)'

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
   CORNER BRACKETS — ornement luxe de coin
══════════════════════════════════════════════════════════════ */

function CornerBrackets({ s }: { s: number }) {
    const arm = 18 * s
    const thick = 2 * s
    const offset = 7 * s
    return (
        <>
            {/* Top-left */}
            <div style={{ position: 'absolute', top: offset, left: offset, width: arm, height: arm }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: thick, background: GOLD }} />
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: thick, background: GOLD }} />
            </div>
            {/* Top-right */}
            <div style={{ position: 'absolute', top: offset, right: offset, width: arm, height: arm }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: thick, background: GOLD }} />
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: thick, background: GOLD }} />
            </div>
            {/* Bottom-left */}
            <div style={{ position: 'absolute', bottom: offset, left: offset, width: arm, height: arm }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: thick, background: GOLD }} />
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: thick, background: GOLD }} />
            </div>
            {/* Bottom-right */}
            <div style={{ position: 'absolute', bottom: offset, right: offset, width: arm, height: arm }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: thick, background: GOLD }} />
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: thick, background: GOLD }} />
            </div>
        </>
    )
}

/* ══════════════════════════════════════════════════════════════
   QR CODE — custom image avec fallback react-qr-code
   Placez votre QR code dans /public/images/qr-code.png
══════════════════════════════════════════════════════════════ */

function QRCodeDisplay({ size }: { size: number }) {
    const [error, setError] = useState(false)
    return error ? (
        <QRCode
            value="https://www.retourgagnantbenin.bj"
            size={size}
            fgColor="#030810"
            bgColor="#ffffff"
            level="M"
        />
    ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src="/images/qr-code.png"
            alt="QR Code Retour Gagnant Bénin"
            width={size}
            height={size}
            style={{ objectFit: 'contain', display: 'block' }}
            onError={() => setError(true)}
        />
    )
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
                {/* Ambiance radiale */}
                <div style={{
                    position: 'absolute', top: '45%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 280 * s, height: 220 * s,
                    background: `radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 65%)`,
                    pointerEvents: 'none',
                }} />

                {/* Ornements coins */}
                <CornerBrackets s={s} />

                {/* ── LOGO + ORG NAME ── */}
                <div style={{
                    position: 'absolute', top: 18 * s, left: 0, right: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 * s,
                }}>
                    <div style={{ width: 38 * s, height: 38 * s, position: 'relative' }}>
                        <Image src="/images/logo-transparent.png" alt="RGB" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <div style={{
                        color: GOLD, fontSize: 8.5 * s, fontWeight: 700,
                        letterSpacing: '0.24em', textTransform: 'uppercase',
                        fontFamily: "'Cinzel','Trajan Pro','Georgia',serif", textAlign: 'center',
                    }}>
                        RETOUR GAGNANT BÉNIN
                    </div>
                    {/* Ornement sous titre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, width: 150 * s }}>
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(90deg, transparent, ${GOLD}80)` }} />
                        <div style={{ width: 3.5 * s, height: 3.5 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(270deg, transparent, ${GOLD}80)` }} />
                    </div>
                </div>

                {/* ── ILLUSTRATION DOMINANTE ── */}
                <div style={{
                    position: 'absolute',
                    top: 60 * s, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 172 * s, height: 138 * s,
                }}>
                    <DoorIllustration opacity={0.92} />
                </div>

                {/* ── TAGLINE BAS ── */}
                <div style={{
                    position: 'absolute', bottom: 14 * s, left: 0, right: 0,
                    textAlign: 'center',
                    color: `${GOLD}80`,
                    fontSize: 4.8 * s,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontFamily: "'Arial', sans-serif",
                }}>
                    retourgagnantbenin.bj
                </div>
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ══════════════════════════════════════════════════════════════
   VERSO — Contact + QR Code + Slogan
══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
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
                    background: BG_VERSO,
                    fontFamily: "'Arial', sans-serif",
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    borderRadius: 12 * s,
                    flexShrink: 0,
                }}
            >
                {/* Ambiance radiale gauche */}
                <div style={{
                    position: 'absolute', top: '50%', left: '28%',
                    transform: 'translate(-50%,-50%)',
                    width: 200 * s, height: 160 * s,
                    background: `radial-gradient(ellipse, rgba(201,168,76,0.055) 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* Watermark illustration */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 220 * s, height: 178 * s,
                    opacity: 0.03, pointerEvents: 'none',
                }}>
                    <DoorIllustration />
                </div>

                {/* Ornements coins */}
                <CornerBrackets s={s} />

                {/* ── CONTENU ── */}
                <div style={{
                    position: 'absolute',
                    inset: `${15 * s}px ${15 * s}px ${15 * s}px ${15 * s}px`,
                    display: 'flex', gap: 12 * s, alignItems: 'stretch',
                }}>
                    {/* Colonne gauche : QR + org */}
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'space-between',
                        width: 90 * s, flexShrink: 0,
                    }}>
                        <div style={{
                            padding: 4 * s, background: '#ffffff',
                            borderRadius: 3 * s,
                            boxShadow: `0 0 0 1px ${GOLD}45, 0 0 16px ${GOLD}20`,
                        }}>
                            <QRCodeDisplay size={Math.round(64 * s)} />
                        </div>
                        <div style={{
                            color: GOLD, fontSize: 6.8 * s, fontWeight: 800,
                            letterSpacing: '0.13em', textTransform: 'uppercase',
                            textAlign: 'center',
                            fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.45,
                        }}>
                            RETOUR<br />GAGNANT<br />BÉNIN
                        </div>
                    </div>

                    {/* Séparateur */}
                    <div style={{
                        width: 0.7 * s,
                        background: `linear-gradient(180deg, transparent, ${GOLD}55, transparent)`,
                        flexShrink: 0,
                    }} />

                    {/* Colonne droite : coordonnées */}
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', minWidth: 0,
                    }}>
                        {/* Nom + poste */}
                        <div>
                            <div style={{
                                color: GOLD_L, fontSize: 8.5 * s, fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                fontFamily: "'Cinzel','Georgia',serif", lineHeight: 1.1,
                            }}>
                                {data.prenom} {data.nom}
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.48)', fontSize: 5.5 * s,
                                letterSpacing: '0.12em', marginTop: 2.5 * s, textTransform: 'uppercase',
                            }}>
                                {data.position}
                            </div>
                        </div>

                        <div style={{ height: 0.5 * s, background: `${GOLD}40` }} />

                        {/* Contact personnel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5 * s }}>
                            {data.phone && (
                                <div style={{ display: 'flex', gap: 5 * s, alignItems: 'center' }}>
                                    <span style={{ color: GOLD, fontSize: 6 * s }}>☎</span>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * s }}>{data.phone}</span>
                                </div>
                            )}
                            {data.email && (
                                <div style={{ display: 'flex', gap: 5 * s, alignItems: 'center' }}>
                                    <span style={{ color: GOLD, fontSize: 6 * s }}>✉</span>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * s }}>{data.email}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ height: 0.5 * s, background: `${GOLD}25` }} />

                        {/* Contact org */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 * s }}>
                            <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 5 * s }}>☎ +229 01 60 32 21 21 · +229 01 94 35 50 50</div>
                            <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 5 * s }}>✉ contact@retourgagnantbenin.bj</div>
                            <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 5 * s }}>🌐 www.retourgagnantbenin.bj</div>
                            <div style={{ color: 'rgba(255,255,255,0.33)', fontSize: 4.5 * s, lineHeight: 1.45 }}>
                                Haie-Vive Cocotiers, Carré N°1158, Cotonou — BÉNIN
                            </div>
                        </div>

                        {/* Slogan */}
                        <div style={{
                            color: GOLD, fontSize: 5.8 * s, fontWeight: 700,
                            letterSpacing: '0.18em', textTransform: 'uppercase',
                            fontFamily: "'Cinzel','Georgia',serif",
                        }}>
                            VOTRE RETOUR, NOTRE MISSION
                        </div>
                    </div>
                </div>
            </div>
        )
    }
)
CardVerso.displayName = 'CardVerso'
