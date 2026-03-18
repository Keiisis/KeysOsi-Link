'use client'

import React, { forwardRef } from 'react'
import QRCode from 'react-qr-code'
import Image from 'next/image'

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface CardData {
    prenom: string
    nom: string
    position: string
    phone: string
    email: string
}

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS — palette luxe premium
   ═══════════════════════════════════════════════════════════════ */

const GOLD        = '#C9A84C'
const GOLD_LIGHT  = '#E2C97E'
const GOLD_PALE   = '#F5E8BA'
const DARK        = '#030810'
const NAVY_MID    = '#061a2e'

/* ═══════════════════════════════════════════════════════════════
   SVG — ILLUSTRATION PORTE DU NON-RETOUR + POING
   Redesignée : plus grande, plus détaillée, ornements enrichis
   ═══════════════════════════════════════════════════════════════ */

function DoorIllustration({ opacity = 1 }: { opacity?: number }) {
    return (
        <svg
            viewBox="0 0 260 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', opacity }}
        >
            <defs>
                <filter id="glow-s">
                    <feGaussianBlur stdDeviation="1" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-m">
                    <feGaussianBlur stdDeviation="1.8" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD_LIGHT} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity="0.5" />
                </linearGradient>
            </defs>

            {/* ── Frise / Architrave ── */}
            <rect x="10" y="28" width="240" height="14" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#glow-s)" />
            <line x1="10" y1="24" x2="250" y2="24" stroke={GOLD} strokeWidth="0.5" opacity="0.4" />
            <line x1="10" y1="45" x2="250" y2="45" stroke={GOLD} strokeWidth="0.4" opacity="0.3" />

            {/* Figures en procession — gauche */}
            {[20, 32, 44, 56, 68, 80].map(cx => (
                <g key={cx} fill={GOLD} opacity="0.9">
                    <circle cx={cx} cy="21" r="3.2" />
                    <rect x={cx - 2.2} y="25" width="4.4" height="5.5" rx="1.8" />
                </g>
            ))}
            {/* Figures en procession — droite */}
            {[180, 192, 204, 216, 228, 240].map(cx => (
                <g key={cx} fill={GOLD} opacity="0.9">
                    <circle cx={cx} cy="21" r="3.2" />
                    <rect x={cx - 2.2} y="25" width="4.4" height="5.5" rx="1.8" />
                </g>
            ))}

            {/* ── Pilier gauche ── */}
            <rect x="12" y="42" width="20" height="115" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#glow-s)" />
            {[57, 70, 83, 96, 109, 122].map(y => (
                <line key={y} x1="12" y1={y} x2="32" y2={y} stroke={GOLD} strokeWidth="0.5" opacity="0.35" />
            ))}

            {/* ── Pilier droit ── */}
            <rect x="228" y="42" width="20" height="115" stroke="url(#gv)" strokeWidth="1.5" fill="none" filter="url(#glow-s)" />
            {[57, 70, 83, 96, 109, 122].map(y => (
                <line key={y} x1="228" y1={y} x2="248" y2={y} stroke={GOLD} strokeWidth="0.5" opacity="0.35" />
            ))}

            {/* ── Grande arche ── */}
            <path d="M 82,157 L 82,100 Q 82,58 130,58 Q 178,58 178,100 L 178,157"
                stroke={GOLD} strokeWidth="2.5" fill="none" filter="url(#glow-m)" />
            {/* Arche intérieure */}
            <path d="M 93,157 L 93,104 Q 93,70 130,70 Q 167,70 167,104 L 167,157"
                stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.35" />
            {/* Bases de l'arche */}
            <rect x="74" y="146" width="12" height="12" stroke={GOLD} strokeWidth="0.9" opacity="0.7" />
            <rect x="174" y="146" width="12" height="12" stroke={GOLD} strokeWidth="0.9" opacity="0.7" />

            {/* ── Poing levé (centré dans l'arche) ── */}
            {/* Paume */}
            <rect x="112" y="116" width="34" height="25" rx="4.5" fill={GOLD} opacity="0.95" />
            {/* Doigts */}
            <rect x="112" y="98" width="8.5" height="20" rx="4" fill={GOLD} />
            <rect x="121.5" y="93" width="8.5" height="25" rx="4" fill={GOLD} />
            <rect x="131" y="95" width="8.5" height="23" rx="4" fill={GOLD} />
            <rect x="140.5" y="98" width="7.5" height="20" rx="3.5" fill={GOLD} />
            {/* Pouce */}
            <rect x="100" y="117" width="15" height="17" rx="4.5" fill={GOLD} transform="rotate(-18 107 125)" />
            {/* Jointures */}
            <line x1="120" y1="116" x2="120" y2="127" stroke={DARK} strokeWidth="1.1" />
            <line x1="129" y1="116" x2="129" y2="127" stroke={DARK} strokeWidth="1.1" />
            <line x1="138" y1="116" x2="138" y2="127" stroke={DARK} strokeWidth="1.1" />
            {/* Reflet knuckle */}
            <line x1="114" y1="117" x2="145" y2="117" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

            {/* ── Chaînes brisées ── */}
            <ellipse cx="112" cy="146" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(-30 112 146)" />
            <ellipse cx="102" cy="159" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(-30 102 159)" />
            <ellipse cx="92"  cy="172" rx="8"   ry="4"   stroke={GOLD} strokeWidth="1.2" opacity="0.6" transform="rotate(-30 92 172)" />

            <ellipse cx="148" cy="146" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(30 148 146)" />
            <ellipse cx="158" cy="159" rx="8.5" ry="4.5" stroke={GOLD} strokeWidth="1.5" transform="rotate(30 158 159)" />
            <ellipse cx="168" cy="172" rx="8"   ry="4"   stroke={GOLD} strokeWidth="1.2" opacity="0.6" transform="rotate(30 168 172)" />

            {/* Fragments de brisure */}
            <rect x="122" y="138" width="5.5" height="2.5" rx="1" fill={GOLD} transform="rotate(-45 124 139)" />
            <rect x="132" y="135" width="4.5" height="2" rx="0.8" fill={GOLD} transform="rotate(40 134 136)" />
            <circle cx="127" cy="132" r="2.2" fill={GOLD} opacity="0.9" />
            <circle cx="119" cy="141" r="1.5" fill={GOLD} opacity="0.6" />
            <circle cx="141" cy="140" r="1.5" fill={GOLD} opacity="0.6" />
            <circle cx="130" cy="145" r="1" fill={GOLD} opacity="0.5" />
        </svg>
    )
}

/* ═══════════════════════════════════════════════════════════════
   ORNEMENT COIN — croix dorée
   ═══════════════════════════════════════════════════════════════ */

function CornerCross({ s }: { s: number }) {
    const arm = 7 * s
    const thick = 1.5 * s
    return (
        <div style={{ position: 'relative', width: arm + thick, height: arm + thick, flexShrink: 0 }}>
            {/* horizontal */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: thick, transform: 'translateY(-50%)', background: GOLD }} />
            {/* vertical */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: thick, transform: 'translateX(-50%)', background: GOLD }} />
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════
   RECTO — Face institutionnelle premium
   ═══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const s = scale

        return (
            <div
                ref={ref}
                style={{
                    width: W,
                    height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(155deg, #030a14 0%, ${NAVY_MID} 55%, #071f30 100%)`,
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    boxShadow: '0 30px 100px rgba(0,0,0,0.85)',
                    flexShrink: 0,
                }}
            >
                {/* ── Ambiance radiale or ── */}
                <div style={{
                    position: 'absolute',
                    top: '38%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 300 * s, height: 240 * s,
                    background: `radial-gradient(ellipse, rgba(201,168,76,0.09) 0%, transparent 65%)`,
                    pointerEvents: 'none',
                }} />

                {/* ── Bande dorée supérieure (épaisse) ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 3 * s,
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD_PALE} 50%, ${GOLD} 70%, transparent 100%)`,
                }} />

                {/* ── Bande dorée inférieure ── */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 3 * s,
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD_PALE} 50%, ${GOLD} 70%, transparent 100%)`,
                }} />

                {/* ── Filets intérieurs fin (cadre double) ── */}
                <div style={{ position: 'absolute', top: 8 * s, left: 8 * s, right: 8 * s, height: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', bottom: 8 * s, left: 8 * s, right: 8 * s, height: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', left: 8 * s, top: 8 * s, bottom: 8 * s, width: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', right: 8 * s, top: 8 * s, bottom: 8 * s, width: 0.7 * s, background: GOLD, opacity: 0.45 }} />

                {/* ── Ornements coins (losanges) ── */}
                {([
                    { top: 4 * s, left: 4 * s },
                    { top: 4 * s, right: 4 * s },
                    { bottom: 4 * s, left: 4 * s },
                    { bottom: 4 * s, right: 4 * s },
                ] as React.CSSProperties[]).map((pos, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: 7 * s, height: 7 * s,
                        background: GOLD,
                        transform: 'rotate(45deg)',
                        ...pos,
                    }} />
                ))}

                {/* ── LOGO + ORG NAME (top centre) ── */}
                <div style={{
                    position: 'absolute',
                    top: 15 * s, left: 0, right: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 * s,
                }}>
                    <div style={{ width: 40 * s, height: 40 * s, position: 'relative' }}>
                        <Image src="/images/logo-transparent.png" alt="RGB" fill style={{ objectFit: 'contain' }} />
                    </div>

                    <div style={{
                        color: GOLD,
                        fontSize: 9 * s,
                        fontWeight: 700,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif",
                        textAlign: 'center',
                    }}>
                        RETOUR GAGNANT BÉNIN
                    </div>

                    {/* Ornement horizontal sous le titre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, width: 160 * s }}>
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(90deg, transparent, ${GOLD}90)` }} />
                        <div style={{ width: 4 * s, height: 4 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 0.6 * s, background: `linear-gradient(270deg, transparent, ${GOLD}90)` }} />
                    </div>
                </div>

                {/* ── ILLUSTRATION centrale (dominante) ── */}
                <div style={{
                    position: 'absolute',
                    top: 64 * s, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 158 * s, height: 130 * s,
                }}>
                    <DoorIllustration opacity={0.92} />
                </div>

                {/* ── Bandeau dégradé bas ── */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 55 * s,
                    background: `linear-gradient(0deg, rgba(3,8,16,0.98) 0%, rgba(3,8,16,0.6) 60%, transparent 100%)`,
                    pointerEvents: 'none',
                }} />

                {/* ── Séparateur fin au-dessus des infos ── */}
                <div style={{
                    position: 'absolute', bottom: 48 * s, left: 18 * s, right: 18 * s,
                    height: 0.5 * s,
                    background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)`,
                }} />

                {/* ── INFOS EMPLOYÉ (bas) ── */}
                <div style={{
                    position: 'absolute', bottom: 12 * s, left: 20 * s, right: 20 * s,
                    display: 'flex', flexDirection: 'column', gap: 3 * s,
                }}>
                    <div style={{
                        color: GOLD_LIGHT,
                        fontSize: 11 * s,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        fontFamily: "'Cinzel', 'Georgia', serif",
                        lineHeight: 1,
                    }}>
                        {data.prenom} {data.nom}
                    </div>
                    <div style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: 6 * s,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontFamily: "'Arial', sans-serif",
                    }}>
                        {data.position}
                    </div>
                </div>
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ═══════════════════════════════════════════════════════════════
   VERSO — Contacts + QR Code
   ═══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const s = scale

        return (
            <div
                ref={ref}
                style={{
                    width: W,
                    height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(155deg, #030a14 0%, #05121e 55%, ${NAVY_MID} 100%)`,
                    fontFamily: "'Arial', sans-serif",
                    boxShadow: '0 30px 100px rgba(0,0,0,0.85)',
                    flexShrink: 0,
                }}
            >
                {/* ── Ambiance radiale gauche ── */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '30%',
                    transform: 'translate(-50%,-50%)',
                    width: 220 * s, height: 180 * s,
                    background: `radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* ── Watermark illustration (fond) ── */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 230 * s, height: 200 * s,
                    opacity: 0.032, pointerEvents: 'none',
                }}>
                    <DoorIllustration />
                </div>

                {/* ── Bandes dorées épaisse haut/bas ── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3 * s,
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD_PALE} 50%, ${GOLD} 70%, transparent 100%)`,
                }} />
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 * s,
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD_PALE} 50%, ${GOLD} 70%, transparent 100%)`,
                }} />

                {/* ── Filets intérieurs ── */}
                <div style={{ position: 'absolute', top: 8 * s, left: 8 * s, right: 8 * s, height: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', bottom: 8 * s, left: 8 * s, right: 8 * s, height: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', left: 8 * s, top: 8 * s, bottom: 8 * s, width: 0.7 * s, background: GOLD, opacity: 0.45 }} />
                <div style={{ position: 'absolute', right: 8 * s, top: 8 * s, bottom: 8 * s, width: 0.7 * s, background: GOLD, opacity: 0.45 }} />

                {/* ── Ornements coins ── */}
                {([
                    { top: 4 * s, left: 4 * s },
                    { top: 4 * s, right: 4 * s },
                    { bottom: 4 * s, left: 4 * s },
                    { bottom: 4 * s, right: 4 * s },
                ] as React.CSSProperties[]).map((pos, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: 7 * s, height: 7 * s,
                        background: GOLD,
                        transform: 'rotate(45deg)',
                        ...pos,
                    }} />
                ))}

                {/* ── CONTENU PRINCIPAL ── */}
                <div style={{
                    position: 'absolute',
                    inset: `${15 * s}px ${15 * s}px ${15 * s}px ${15 * s}px`,
                    display: 'flex',
                    gap: 11 * s,
                    alignItems: 'stretch',
                }}>
                    {/* ─ COLONNE GAUCHE : QR + org ─ */}
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'space-between',
                        width: 90 * s, flexShrink: 0,
                    }}>
                        {/* QR Code avec cadre doré */}
                        <div style={{
                            padding: 4.5 * s,
                            background: '#ffffff',
                            borderRadius: 3 * s,
                            boxShadow: `0 0 0 1px ${GOLD}50, 0 0 18px ${GOLD}25`,
                        }}>
                            <QRCode
                                value="https://www.retourgagnantbenin.bj"
                                size={Math.round(66 * s)}
                                fgColor="#030810"
                                bgColor="#ffffff"
                                level="M"
                            />
                        </div>

                        {/* Nom org compact */}
                        <div style={{
                            color: GOLD,
                            fontSize: 7 * s,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            fontFamily: "'Cinzel', 'Georgia', serif",
                            lineHeight: 1.45,
                        }}>
                            RETOUR<br />GAGNANT<br />BÉNIN
                        </div>
                    </div>

                    {/* ─ Séparateur vertical ─ */}
                    <div style={{
                        width: 0.7 * s,
                        background: `linear-gradient(180deg, transparent, ${GOLD}60, transparent)`,
                        flexShrink: 0,
                    }} />

                    {/* ─ COLONNE DROITE : coordonnées ─ */}
                    <div style={{
                        flex: 1,
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between',
                        minWidth: 0,
                    }}>
                        {/* Nom + poste */}
                        <div>
                            <div style={{
                                color: GOLD_LIGHT,
                                fontSize: 8.5 * s,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                fontFamily: "'Cinzel', 'Georgia', serif",
                                lineHeight: 1.1,
                            }}>
                                {data.prenom} {data.nom}
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.48)',
                                fontSize: 5.5 * s,
                                letterSpacing: '0.12em',
                                marginTop: 2.5 * s,
                                textTransform: 'uppercase',
                            }}>
                                {data.position}
                            </div>
                        </div>

                        {/* Séparateur */}
                        <div style={{ height: 0.5 * s, background: `${GOLD}40` }} />

                        {/* Contact personnel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5 * s }}>
                            {data.phone && (
                                <div style={{ display: 'flex', gap: 5 * s, alignItems: 'center' }}>
                                    <span style={{ color: GOLD, fontSize: 6 * s }}>☎</span>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * s, letterSpacing: '0.02em' }}>{data.phone}</span>
                                </div>
                            )}
                            {data.email && (
                                <div style={{ display: 'flex', gap: 5 * s, alignItems: 'center' }}>
                                    <span style={{ color: GOLD, fontSize: 6 * s }}>✉</span>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * s }}>{data.email}</span>
                                </div>
                            )}
                        </div>

                        {/* Séparateur */}
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
                            color: GOLD,
                            fontSize: 5.8 * s,
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontFamily: "'Cinzel', 'Georgia', serif",
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
