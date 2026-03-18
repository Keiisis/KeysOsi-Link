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
   CONSTANTES DE DESIGN
   ═══════════════════════════════════════════════════════════════ */

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#E2C97E'
const NAVY = '#071525'
const TEAL = '#0c2d3a'

/* ═══════════════════════════════════════════════════════════════
   SVG — PORTE DU NON-RETOUR + POING BRISEUR DE CHAÎNES
   ═══════════════════════════════════════════════════════════════ */

function DoorIllustration() {
    return (
        <svg viewBox="0 0 200 175" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <defs>
                <filter id="gold-glow">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* === ARCHITRAVE / BEAM SUPÉRIEUR === */}
            <rect x="5" y="30" width="190" height="11" stroke={GOLD} strokeWidth="1.3" filter="url(#gold-glow)" />
            <rect x="5" y="30" width="190" height="11" stroke={GOLD_LIGHT} strokeWidth="0.3" opacity="0.25" />
            {/* Ligne décorative sous l'architrave */}
            <line x1="5" y1="45" x2="195" y2="45" stroke={GOLD} strokeWidth="0.5" opacity="0.5" />

            {/* === SILHOUETTES EN PROCESSION sur l'architrave === */}
            {[18, 30, 42, 54, 66].map(cx => (
                <g key={cx} opacity="0.85" fill={GOLD}>
                    <circle cx={cx} cy="24" r="2.8" />
                    <rect x={cx - 1.5} y="27" width="3" height="5" rx="1" />
                </g>
            ))}
            {[134, 146, 158, 170, 182].map(cx => (
                <g key={cx} opacity="0.85" fill={GOLD}>
                    <circle cx={cx} cy="24" r="2.8" />
                    <rect x={cx - 1.5} y="27" width="3" height="5" rx="1" />
                </g>
            ))}

            {/* === PILIER GAUCHE === */}
            <rect x="8" y="41" width="16" height="84" stroke={GOLD} strokeWidth="1.3" filter="url(#gold-glow)" />
            <line x1="8" y1="55" x2="24" y2="55" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
            <line x1="8" y1="65" x2="24" y2="65" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
            <line x1="8" y1="75" x2="24" y2="75" stroke={GOLD} strokeWidth="0.6" opacity="0.3" />

            {/* === PILIER DROIT === */}
            <rect x="176" y="41" width="16" height="84" stroke={GOLD} strokeWidth="1.3" filter="url(#gold-glow)" />
            <line x1="176" y1="55" x2="192" y2="55" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
            <line x1="176" y1="65" x2="192" y2="65" stroke={GOLD} strokeWidth="0.6" opacity="0.5" />
            <line x1="176" y1="75" x2="192" y2="75" stroke={GOLD} strokeWidth="0.6" opacity="0.3" />

            {/* === ARCHE CENTRALE === */}
            <path d="M 68,125 L 68,78 Q 68,48 100,48 Q 132,48 132,78 L 132,125"
                stroke={GOLD} strokeWidth="2" filter="url(#gold-glow)" />
            {/* Arche intérieure décorative */}
            <path d="M 76,125 L 76,82 Q 76,57 100,57 Q 124,57 124,82 L 124,125"
                stroke={GOLD} strokeWidth="0.8" opacity="0.4" />

            {/* Bases de l'arche */}
            <rect x="62" y="116" width="10" height="9" stroke={GOLD} strokeWidth="0.8" opacity="0.6" />
            <rect x="128" y="116" width="10" height="9" stroke={GOLD} strokeWidth="0.8" opacity="0.6" />

            {/* === POING LEVÉ (briseur de chaînes) === */}
            {/* Paume */}
            <rect x="86" y="91" width="26" height="20" rx="3.5" fill={GOLD} opacity="0.95" />
            {/* Doigts */}
            <rect x="86" y="78" width="6.5" height="15" rx="3" fill={GOLD} />
            <rect x="93.5" y="75" width="6.5" height="18" rx="3" fill={GOLD} />
            <rect x="101" y="76" width="6.5" height="17" rx="3" fill={GOLD} />
            <rect x="108.5" y="78" width="5.5" height="15" rx="2.5" fill={GOLD} />
            {/* Pouce */}
            <rect x="79" y="92" width="10" height="13" rx="3.5" fill={GOLD} transform="rotate(-18 84 98)" />
            {/* Jointures */}
            <line x1="92.5" y1="91" x2="92.5" y2="98" stroke={NAVY} strokeWidth="0.9" />
            <line x1="100" y1="91" x2="100" y2="98" stroke={NAVY} strokeWidth="0.9" />
            <line x1="107.5" y1="91" x2="107.5" y2="98" stroke={NAVY} strokeWidth="0.9" />

            {/* === CHAÎNES BRISÉES === */}
            {/* Maillon gauche 1 */}
            <ellipse cx="89" cy="116" rx="6.5" ry="3.5" stroke={GOLD} strokeWidth="1.3" transform="rotate(-25 89 116)" />
            <ellipse cx="81" cy="126" rx="6.5" ry="3.5" stroke={GOLD} strokeWidth="1.3" transform="rotate(-25 81 126)" />
            <ellipse cx="73" cy="136" rx="6" ry="3" stroke={GOLD} strokeWidth="1.1" opacity="0.7" transform="rotate(-25 73 136)" />
            {/* Maillon droit 1 */}
            <ellipse cx="111" cy="116" rx="6.5" ry="3.5" stroke={GOLD} strokeWidth="1.3" transform="rotate(25 111 116)" />
            <ellipse cx="119" cy="126" rx="6.5" ry="3.5" stroke={GOLD} strokeWidth="1.3" transform="rotate(25 119 126)" />
            <ellipse cx="127" cy="136" rx="6" ry="3" stroke={GOLD} strokeWidth="1.1" opacity="0.7" transform="rotate(25 127 136)" />

            {/* === FRAGMENTS DE BRISURE === */}
            <rect x="94" y="110" width="4" height="2" rx="1" fill={GOLD} transform="rotate(-40 96 111)" />
            <rect x="102" y="108" width="3" height="1.5" rx="0.5" fill={GOLD} transform="rotate(35 103 108)" />
            <circle cx="98" cy="106" r="1.5" fill={GOLD} opacity="0.9" />
            <circle cx="92" cy="113" r="1" fill={GOLD} opacity="0.6" />
            <circle cx="108" cy="112" r="1" fill={GOLD} opacity="0.6" />
            <circle cx="100" cy="115" r="0.8" fill={GOLD} opacity="0.5" />
        </svg>
    )
}

/* ═══════════════════════════════════════════════════════════════
   RECTO — Face institutionnelle + nom employé
   ═══════════════════════════════════════════════════════════════ */

export const CardRecto = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const fs = scale // font scale factor

        return (
            <div
                ref={ref}
                style={{
                    width: W,
                    height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 55%, #0a2233 100%)`,
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    flexShrink: 0,
                }}
            >
                {/* Texture subtile */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(12,45,58,0.8) 0%, transparent 50%)',
                    pointerEvents: 'none',
                }} />

                {/* Filet doré supérieur */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 2 * scale,
                    background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                }} />

                {/* === LOGO === */}
                <div style={{
                    position: 'absolute', top: 14 * scale, left: '50%', transform: 'translateX(-50%)',
                    width: 44 * scale, height: 44 * scale,
                }}>
                    <Image src="/images/logo-transparent.png" alt="RGB Logo" fill style={{ objectFit: 'contain' }} />
                </div>

                {/* === NOM DE L'ORGANISATION === */}
                <div style={{
                    position: 'absolute', top: 62 * scale, left: 0, right: 0, textAlign: 'center',
                    color: GOLD,
                    fontSize: 10.5 * fs,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: "'Cinzel', 'Trajan Pro', 'Georgia', serif",
                }}>
                    RETOUR GAGNANT BÉNIN
                </div>

                {/* === MISSION === */}
                <div style={{
                    position: 'absolute', top: 76 * scale, left: 20 * scale, right: 20 * scale,
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 5.8 * fs,
                    letterSpacing: '0.04em',
                    lineHeight: 1.4,
                    fontFamily: "'Arial', sans-serif",
                }}>
                    L&apos;Agence d&apos;Accompagnement à la Nationalité<br />
                    et au Retour des Afro-descendants
                </div>

                {/* === ILLUSTRATION PORTE + POING === */}
                <div style={{
                    position: 'absolute',
                    top: 90 * scale,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 120 * scale,
                    height: 105 * scale,
                    opacity: 0.9,
                }}>
                    <DoorIllustration />
                </div>

                {/* === INFORMATIONS EMPLOYÉ (bas de carte) === */}
                {/* Ligne séparatrice */}
                <div style={{
                    position: 'absolute', bottom: 44 * scale, left: 20 * scale, right: 20 * scale,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)`,
                }} />

                <div style={{
                    position: 'absolute', bottom: 12 * scale, left: 20 * scale, right: 20 * scale,
                    display: 'flex', flexDirection: 'column', gap: 2 * scale,
                }}>
                    <div style={{
                        color: GOLD_LIGHT,
                        fontSize: 9 * fs,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: "'Cinzel', 'Georgia', serif",
                    }}>
                        {data.prenom} {data.nom}
                    </div>
                    <div style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 6.5 * fs,
                        letterSpacing: '0.1em',
                        fontFamily: "'Arial', sans-serif",
                    }}>
                        {data.position}
                    </div>
                </div>

                {/* Filet doré inférieur */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 2 * scale,
                    background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                }} />
            </div>
        )
    }
)
CardRecto.displayName = 'CardRecto'

/* ═══════════════════════════════════════════════════════════════
   VERSO — Contact + QR code
   ═══════════════════════════════════════════════════════════════ */

export const CardVerso = forwardRef<HTMLDivElement, { data: CardData; scale?: number }>(
    ({ data, scale = 1 }, ref) => {
        const W = 340 * scale
        const H = 220 * scale
        const fs = scale

        return (
            <div
                ref={ref}
                style={{
                    width: W,
                    height: H,
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, #060f1a 0%, #0a1e2e 60%, ${TEAL} 100%)`,
                    fontFamily: "'Arial', sans-serif",
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    flexShrink: 0,
                }}
            >
                {/* Filets dorés */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 * scale, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 * scale, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

                {/* Filets verticaux */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 2 * scale, background: `linear-gradient(180deg, transparent, ${GOLD}80, transparent)` }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2 * scale, background: `linear-gradient(180deg, transparent, ${GOLD}80, transparent)` }} />

                {/* Watermark porte (très subtil) */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 180 * scale, height: 160 * scale,
                    opacity: 0.04,
                    pointerEvents: 'none',
                }}>
                    <DoorIllustration />
                </div>

                {/* === LAYOUT GAUCHE : QR + infos, DROITE : contact perso === */}
                <div style={{
                    position: 'absolute',
                    inset: `${12 * scale}px ${14 * scale}px ${12 * scale}px ${14 * scale}px`,
                    display: 'flex',
                    gap: 12 * scale,
                    alignItems: 'center',
                }}>
                    {/* Colonne gauche : QR + org name */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6 * scale,
                        minWidth: 80 * scale,
                    }}>
                        {/* QR code */}
                        <div style={{
                            background: '#ffffff',
                            padding: 5 * scale,
                            borderRadius: 4 * scale,
                            boxShadow: `0 0 12px ${GOLD}30`,
                        }}>
                            <QRCode
                                value="https://www.retourgagnantbenin.bj"
                                size={60 * scale}
                                fgColor="#071525"
                                bgColor="#ffffff"
                                level="M"
                            />
                        </div>

                        <div style={{
                            color: GOLD,
                            fontSize: 5.2 * fs,
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            fontFamily: "'Cinzel', 'Georgia', serif",
                            lineHeight: 1.3,
                        }}>
                            RETOUR<br />GAGNANT<br />BÉNIN
                        </div>
                    </div>

                    {/* Séparateur vertical */}
                    <div style={{
                        width: 1,
                        alignSelf: 'stretch',
                        background: `linear-gradient(180deg, transparent, ${GOLD}50, transparent)`,
                        flexShrink: 0,
                    }} />

                    {/* Colonne droite : coordonnées */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5 * scale,
                        justifyContent: 'center',
                    }}>
                        {/* Nom employé */}
                        <div>
                            <div style={{ color: GOLD_LIGHT, fontSize: 7.5 * fs, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Cinzel','Georgia',serif" }}>
                                {data.prenom} {data.nom}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 5.5 * fs, letterSpacing: '0.1em', marginTop: 1 * scale }}>
                                {data.position}
                            </div>
                        </div>

                        {/* Séparateur */}
                        <div style={{ height: 1, background: `${GOLD}30` }} />

                        {/* Contact employé */}
                        {data.phone && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 * scale }}>
                                <span style={{ color: GOLD, fontSize: 5 * fs, marginTop: 1 * scale }}>☎</span>
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * fs }}>{data.phone}</span>
                            </div>
                        )}
                        {data.email && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 * scale }}>
                                <span style={{ color: GOLD, fontSize: 5 * fs, marginTop: 1 * scale }}>✉</span>
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 5.5 * fs }}>{data.email}</span>
                            </div>
                        )}

                        {/* Séparateur */}
                        <div style={{ height: 1, background: `${GOLD}20` }} />

                        {/* Infos org */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 * scale }}>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5 * fs }}>
                                ☎ +229 01 60 32 21 21 | +229 01 94 35 50 50
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5 * fs }}>
                                ✉ contact@retourgagnantbenin.bj
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 5 * fs }}>
                                🌐 www.retourgagnantbenin.bj
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 4.5 * fs, lineHeight: 1.4 }}>
                                Haie-Vive Cocotiers, Carré N°1158, Cotonou
                            </div>
                        </div>

                        {/* Slogan */}
                        <div style={{
                            color: GOLD,
                            fontSize: 5.5 * fs,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            fontFamily: "'Cinzel','Georgia',serif",
                            marginTop: 2 * scale,
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
