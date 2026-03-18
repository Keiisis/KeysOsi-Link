'use client'

import React, { forwardRef, useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

/* ══════════════════════════════════════════════════════════════
   PALETTE & DIMENSIONS
══════════════════════════════════════════════════════════════ */

const GOLD    = '#C9A84C'
const GOLD_L  = '#E2C97E'
const DARK    = '#03080f'
const BG_DARK = 'linear-gradient(158deg, #0b2054 0%, #163a7e 40%, #0d2d6b 70%, #071840 100%)'
const BG_CREAM = '#fdf9f2'
const TEXT_DARK  = '#1c1408'
const TEXT_MED   = '#4a3a20'
const TEXT_LIGHT = '#7a6545'

// A4 portrait en pixels (72 ppi de référence)
export const BASE_W = 595
export const BASE_H = 842

/* ══════════════════════════════════════════════════════════════
   CONTENU TEXTUEL — FRANÇAIS
══════════════════════════════════════════════════════════════ */

const FR = {
    s1_title: 'I — PRÉSENTATION GÉNÉRALE DE L\'AGENCE',
    s1_body: 'L\'Agence Retour Gagnant Bénin est une institution privée de référence, dédiée à l\'accompagnement technique et opérationnel du retour des Afro-descendants vers le Bénin.\n\nPortée par une équipe aux compétences pluridisciplinaires — juridiques, administratives, économiques et interculturelles — l\'Agence maîtrise l\'ensemble des paramètres qui conditionnent la réussite d\'un retour : connaissance approfondie du cadre légal et foncier béninois, maîtrise des procédures administratives et consulaires, expertise en montage de projets d\'investissement, et capacité à mobiliser un réseau dense de partenaires institutionnels et privés rigoureusement sélectionnés.\n\nQu\'il s\'agisse d\'un retour définitif, d\'une installation partielle, d\'un investissement sectoriel, d\'un transfert de compétences ou d\'un partenariat économique, l\'Agence déploie une méthodologie d\'accompagnement structurée, adaptée et orientée vers des résultats concrets.\n\nAncrée dans la réalité historique et mémorielle du Bénin, pionnier de la réconciliation mémorielle, l\'Agence Retour Gagnant Bénin est l\'institution qui transforme une aspiration profonde en projet viable, un désir de réconciliation en réalité concrète, et un retour en une véritable expérience.',
    s2_title: 'II — LES SERVICES DE RGB',
    s2_items: [
        { title: '1. Accueil et orientation personnalisée', body: 'Chaque personne ou famille bénéficie d\'un interlocuteur dédié qui évalue sa situation, ses aspirations, ses ressources et son projet de retour.' },
        { title: '2. Accompagnement administratif', body: 'Obtention ou renouvellement de documents d\'identité, démarches consulaires, régularisation de la situation administrative au Bénin, obtention de la nationalité béninoise pour les Afro-descendants éligibles.' },
        { title: '3. Investissement et entrepreneuriat', body: 'Identification des secteurs porteurs, mise en relation avec les institutions financières partenaires, assistance à la création d\'entreprise et au montage de projets.' },
        { title: '4. Logement et immobilier', body: 'Réseau de promoteurs immobiliers, notaires partenaires et agences foncières fiables pour trouver, sécuriser et acquérir un logement ou un terrain dans les meilleures conditions.' },
        { title: '5. Voyages de découverte et d\'immersion', body: 'Avant de décider, il faut voir. L\'Agence organise des voyages incluant visites de sites, rencontres avec des retournants, réunions avec des institutions et entrepreneurs locaux.' },
    ],
    s3_title: 'III — NOS PARTENAIRES STRATÉGIQUES',
    s3_intro: 'Chaque partenaire est choisi sur la base de trois critères non négociables : expertise avérée, fiabilité démontrée et engagement réel en faveur de la réussite des Afro-descendants.',
    s3_items: [
        { label: 'Institutionnels', body: 'Ministères et agences publiques fournissant le cadre légal, administratif et réglementaire.' },
        { label: 'Financiers', body: 'Banques, institutions de microfinance et structures d\'investissement soutenant vos projets.' },
        { label: 'Transport aérien', body: 'Compagnies aériennes engagées à rendre le voyage vers le Bénin plus accessible et abordable.' },
        { label: 'Tourisme mémoriel', body: 'Opérateurs dédiés à une expérience mémorielle authentique et transformatrice sur le sol béninois.' },
        { label: 'Santé & Éducation', body: 'Cliniques, hôpitaux et établissements d\'enseignement prêts à accueillir les familles et professionnels.' },
    ],
    s3_cta: 'Votre retour mérite d\'être préparé, accompagné et réussi. L\'Agence Retour Gagnant Bénin est là pour cela.',
}

/* ══════════════════════════════════════════════════════════════
   CONTENU TEXTUEL — ENGLISH
══════════════════════════════════════════════════════════════ */

const EN = {
    s1_title: 'I — GENERAL PRESENTATION OF THE AGENCY',
    s1_body: 'The Agence Retour Gagnant Bénin — RGB is a leading private institution dedicated to providing technical and operational support for the return of Afro-descendants to Benin.\n\nDriven by a multidisciplinary team with expertise in legal, administrative, economic, and intercultural fields, the Agency has full command of all the key factors that determine a successful return: in-depth knowledge of Benin\'s legal and land frameworks, mastery of administrative and consular procedures, strong expertise in investment project development, and the ability to mobilize a robust network of carefully selected institutional and private partners.\n\nWhether it involves a permanent return, partial relocation, sector-specific investment, skills transfer, or economic partnership, Return Winning Benin Agency implements a structured and tailored support methodology focused on delivering concrete results.\n\nRooted in the historical and memorial reality of Benin — a pioneer in memorial reconciliation — RGB is the institution that transforms a deep aspiration into a viable project, a desire for reconciliation into tangible reality, and a return into a truly meaningful experience.',
    s2_title: 'II — RGB SERVICES',
    s2_items: [
        { title: '1. Personalized Reception & Orientation', body: 'Every individual or family is assigned a dedicated advisor who assesses their situation, aspirations, resources, and return project.' },
        { title: '2. Administrative Support', body: 'Obtaining or renewing identity documents, handling consular processes, regularizing administrative status in Benin, and acquiring Beninese nationality for eligible Afro-descendants.' },
        { title: '3. Investment & Entrepreneurship Support', body: 'Identifying high-potential sectors, connecting with partner financial institutions, and providing comprehensive assistance with business creation and project development.' },
        { title: '4. Housing & Real Estate Facilitation', body: 'A network of real estate developers, partner notaries, and trusted land agencies to help beneficiaries find, secure, and acquire housing or land under the best conditions.' },
        { title: '5. Discovery & Immersion Trips', body: 'Before making a decision, one must experience the environment. RGB organizes discovery trips including site visits, meetings with returnees, and exploration of residential areas.' },
    ],
    s3_title: 'III — OUR STRATEGIC PARTNERS',
    s3_intro: 'Each partner is chosen on the basis of three non-negotiable criteria: proven expertise, demonstrated reliability, and genuine commitment to the success of returning Afro-descendants.',
    s3_items: [
        { label: 'Institutional Partners', body: 'Ministries and public agencies providing the legal, administrative and policy framework for your return.' },
        { label: 'Financial Partners', body: 'Banks, microfinance institutions and investment bodies supporting your financial projects and access to capital.' },
        { label: 'Air Transport Partners', body: 'Airlines committed to making the journey to Benin more accessible, affordable and comfortable for the diaspora.' },
        { label: 'Memorial Tourism Partners', body: 'Operators dedicated to offering an authentic, meaningful and transformative memorial experience on Beninese soil.' },
        { label: 'Healthcare & Education Partners', body: 'Clinics, hospitals and educational institutions ready to welcome returning families and professionals.' },
    ],
    s3_cta: 'Your return deserves to be well prepared, well supported, and successful. Return Winning Benin Agency is here to make that happen.',
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */

function CornerBrackets({ s, arm = 24, col = GOLD, opacity = 1 }: { s: number; arm?: number; col?: string; opacity?: number }) {
    const a = arm * s, thick = 2.5 * s, off = 12 * s
    const bar = (st: React.CSSProperties) => (
        <div style={{ position: 'absolute', background: col, ...st }} />
    )
    return (
        <>
            <div style={{ position: 'absolute', top: off, left: off, width: a, height: a, opacity }}>
                {bar({ top: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, left: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', top: off, right: off, width: a, height: a, opacity }}>
                {bar({ top: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, right: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', bottom: off, left: off, width: a, height: a, opacity }}>
                {bar({ bottom: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, left: 0, bottom: 0, width: thick })}
            </div>
            <div style={{ position: 'absolute', bottom: off, right: off, width: a, height: a, opacity }}>
                {bar({ bottom: 0, left: 0, right: 0, height: thick })}
                {bar({ top: 0, right: 0, bottom: 0, width: thick })}
            </div>
        </>
    )
}

function Diamond({ s }: { s: number }) {
    return <div style={{ width: 5 * s, height: 5 * s, background: GOLD, transform: 'rotate(45deg)', flexShrink: 0 }} />
}

function HRule({ s, opacity = 0.35, w = '100%' }: { s: number; opacity?: number; w?: string | number }) {
    return <div style={{ width: w, height: 0.8 * s, background: `linear-gradient(90deg, transparent, ${GOLD}${Math.round(opacity * 255).toString(16).padStart(2,'0')}, transparent)` }} />
}

function QRDisplay({ size }: { size: number }) {
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
        return <img src={qrSrc} alt="QR Code RGB" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
    }
    return <QRCode value="https://www.retourgagnantbenin.bj" size={size} fgColor={DARK} bgColor="#ffffff" level="M" />
}

/* ══════════════════════════════════════════════════════════════
   PANEL 1 RECTO — COUVERTURE (COVER)
══════════════════════════════════════════════════════════════ */

export const Panel1Recto = forwardRef<HTMLDivElement, { scale?: number }>(
    ({ scale = 1 }, ref) => {
        const W = BASE_W * scale, H = BASE_H * scale, s = scale
        return (
            <div ref={ref} style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: BG_DARK, fontFamily: "'Georgia',serif", flexShrink: 0 }}>

                {/* Lueur centrale */}
                <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', width: 420 * s, height: 420 * s, background: `radial-gradient(ellipse, rgba(201,168,76,0.09) 0%, transparent 62%)`, pointerEvents: 'none' }} />
                {/* Accent vert haut droite */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200 * s, height: 200 * s, background: `radial-gradient(circle at 100% 0%, rgba(0,135,81,0.1) 0%, transparent 60%)`, pointerEvents: 'none' }} />

                <CornerBrackets s={s} arm={30} />

                {/* ── LOGO + ORG ── */}
                <div style={{ position: 'absolute', top: 90 * s, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * s }}>
                    {/* Médaillon logo */}
                    <div style={{ width: 100 * s, height: 100 * s, borderRadius: 18 * s, border: `1px solid ${GOLD}35`, background: `radial-gradient(circle, rgba(201,168,76,0.07), transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 76 * s, height: 76 * s, objectFit: 'contain' }} />
                    </div>

                    {/* Titre */}
                    <div style={{ textAlign: 'center', lineHeight: 1 }}>
                        <div style={{ color: `${GOLD}cc`, fontSize: 26 * s, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif" }}>
                            RETOUR GAGNANT
                        </div>
                        <div style={{ color: GOLD_L, fontSize: 42 * s, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", marginTop: 2 * s }}>
                            BÉNIN
                        </div>
                    </div>

                    {/* Ornement */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 * s, width: 220 * s }}>
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(90deg, transparent, ${GOLD}70)` }} />
                        <Diamond s={s} />
                        <div style={{ flex: 1, height: 0.8 * s, background: `linear-gradient(270deg, transparent, ${GOLD}70)` }} />
                    </div>

                    {/* Sous-titre */}
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 5 * s }}>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5 * s, letterSpacing: '0.06em', fontFamily: "'Arial','Helvetica',sans-serif" }}>
                            L&apos;Agence du Retour des Afro-descendants
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5 * s, letterSpacing: '0.1em', fontFamily: "'Arial','Helvetica',sans-serif" }}>
                            au Bénin
                        </div>
                    </div>
                </div>

                {/* Watermark RGB */}
                <div style={{ position: 'absolute', bottom: 100 * s, left: 0, right: 0, textAlign: 'center', color: `${GOLD}07`, fontSize: 168 * s, fontWeight: 900, letterSpacing: '-0.02em', fontFamily: "'Cinzel','Georgia',serif", pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>
                    RGB
                </div>

                {/* Bande bas */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 16 * s, paddingBottom: 20 * s, borderTop: `1px solid ${GOLD}22`, background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 * s }}>
                    <div style={{ color: GOLD, fontSize: 8.5 * s, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif" }}>
                        VOTRE RETOUR, NOTRE MISSION
                    </div>
                    <div style={{ color: `${GOLD}60`, fontSize: 7.5 * s, letterSpacing: '0.14em', fontFamily: "'Arial',sans-serif" }}>
                        www.retourgagnantbenin.bj
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 7 * s, letterSpacing: '0.07em', fontFamily: "'Arial',sans-serif" }}>
                        Haie-Vive Cocotiers, Cotonou — BÉNIN
                    </div>
                </div>
            </div>
        )
    }
)
Panel1Recto.displayName = 'Panel1Recto'

/* ══════════════════════════════════════════════════════════════
   HELPER — PANNEAU TEXTE (réutilisé FR + EN)
══════════════════════════════════════════════════════════════ */

type ContentData = typeof FR

function TextPanelInner({ s, content, lang }: { s: number; content: ContentData; lang: 'FR' | 'EN' }) {
    const W = BASE_W * s
    const H = BASE_H * s

    const SH = ({ children }: { children: React.ReactNode }) => (
        <div style={{ color: TEXT_DARK, fontSize: 8.5 * s, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: "'Arial',sans-serif", marginBottom: 6 * s, paddingBottom: 4 * s, borderBottom: `1.5px solid ${GOLD}`, lineHeight: 1 }}>
            {children}
        </div>
    )

    const Body = ({ children }: { children: React.ReactNode }) => (
        <div style={{ color: TEXT_MED, fontSize: 8 * s, lineHeight: 1.55, fontFamily: "'Arial',sans-serif", whiteSpace: 'pre-line' }}>
            {children}
        </div>
    )

    const ItemHead = ({ children }: { children: React.ReactNode }) => (
        <div style={{ color: TEXT_DARK, fontSize: 8 * s, fontWeight: 700, fontFamily: "'Arial',sans-serif", marginBottom: 2 * s, marginTop: 9 * s }}>
            {children}
        </div>
    )

    const BulletItem = ({ label, body }: { label: string; body: string }) => (
        <div style={{ marginBottom: 8 * s }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, marginBottom: 2 * s }}>
                <div style={{ width: 4 * s, height: 4 * s, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                <span style={{ color: TEXT_DARK, fontSize: 8 * s, fontWeight: 700, fontFamily: "'Arial',sans-serif" }}>{label}</span>
            </div>
            <div style={{ color: TEXT_LIGHT, fontSize: 7.5 * s, lineHeight: 1.45, fontFamily: "'Arial',sans-serif", paddingLeft: 9 * s }}>{body}</div>
        </div>
    )

    // Colonnes : gauche = Section I + items 1-2 de II + CTA épinglé, droite = items 3-5 + Section III + contacts épinglés
    const colPad = 32 * s
    const colGap = 16 * s
    const colW = (W - colPad * 2 - colGap) / 2
    const headerH = 58 * s
    const footerH = 32 * s
    const contentH = H - headerH - footerH - colPad * 2
    const colStyle: React.CSSProperties = { width: colW, flexShrink: 0, overflow: 'hidden', height: contentH, display: 'flex', flexDirection: 'column' }

    return (
        <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: BG_CREAM, fontFamily: "'Arial',sans-serif", flexShrink: 0 }}>

            {/* Bordure haut dorée */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 * s, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L}, ${GOLD})` }} />

            {/* Header */}
            <div style={{ position: 'absolute', top: 4 * s, left: 0, right: 0, height: headerH, background: TEXT_DARK, display: 'flex', alignItems: 'center', paddingLeft: colPad, paddingRight: colPad, gap: 12 * s }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 30 * s, height: 30 * s, objectFit: 'contain', opacity: 0.9 }} />
                <div style={{ flex: 1 }}>
                    <div style={{ color: GOLD, fontSize: 9.5 * s, fontWeight: 700, letterSpacing: '0.16em', fontFamily: "'Cinzel','Georgia',serif" }}>RETOUR GAGNANT BÉNIN</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 7 * s, letterSpacing: '0.12em', marginTop: 2 * s }}>PRÉSENTATION & SERVICES</div>
                </div>
                <div style={{ paddingLeft: 8 * s, paddingRight: 8 * s, paddingTop: 4 * s, paddingBottom: 4 * s, border: `1px solid ${GOLD}60`, borderRadius: 4 * s, color: GOLD, fontSize: 8.5 * s, fontWeight: 700, letterSpacing: '0.15em', fontFamily: "'Cinzel',serif" }}>
                    {lang}
                </div>
            </div>

            {/* Colonnes de contenu */}
            <div style={{ position: 'absolute', top: 4 * s + headerH + colPad, left: colPad, right: colPad, display: 'flex', gap: colGap, height: contentH }}>

                {/* Colonne gauche */}
                <div style={colStyle}>
                    <SH>{content.s1_title}</SH>
                    <Body>{content.s1_body}</Body>
                    <div style={{ marginTop: 12 * s }}>
                        <SH>{content.s2_title}</SH>
                        {content.s2_items.slice(0, 2).map((item, i) => (
                            <div key={i}>
                                <ItemHead>{item.title}</ItemHead>
                                <Body>{item.body}</Body>
                            </div>
                        ))}
                    </div>

                    {/* CTA épinglé en bas */}
                    <div style={{ marginTop: 'auto', paddingTop: 14 * s, borderTop: `1px solid ${GOLD}45` }}>
                        <div style={{ color: TEXT_DARK, fontSize: 8.5 * s, fontWeight: 700, lineHeight: 1.5, fontFamily: "'Georgia',serif", fontStyle: 'italic' }}>
                            &ldquo;{content.s3_cta}&rdquo;
                        </div>
                    </div>
                </div>

                {/* Séparateur */}
                <div style={{ width: 0.8 * s, background: `linear-gradient(180deg, transparent, ${GOLD}40, transparent)`, flexShrink: 0 }} />

                {/* Colonne droite */}
                <div style={colStyle}>
                    {content.s2_items.slice(2).map((item, i) => (
                        <div key={i}>
                            <ItemHead>{item.title}</ItemHead>
                            <Body>{item.body}</Body>
                        </div>
                    ))}

                    <div style={{ marginTop: 14 * s }}>
                        <SH>{content.s3_title}</SH>
                        <div style={{ color: TEXT_MED, fontSize: 7.5 * s, lineHeight: 1.5, fontFamily: "'Arial',sans-serif", marginBottom: 8 * s }}>
                            {content.s3_intro}
                        </div>
                        {content.s3_items.map((item, i) => (
                            <BulletItem key={i} label={item.label} body={item.body} />
                        ))}
                    </div>

                    {/* Contacts épinglés en bas */}
                    <div style={{ marginTop: 'auto', paddingTop: 12 * s, borderTop: `1px solid ${GOLD}45` }}>
                        <div style={{ color: TEXT_DARK, fontSize: 7 * s, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 * s }}>Contact</div>
                        {[
                            '+229 01 60 32 21 21  ·  +229 01 94 35 50 50',
                            'contact@retourgagnantbenin.bj',
                            'www.retourgagnantbenin.bj',
                        ].map((text, i) => (
                            <div key={i} style={{ color: TEXT_LIGHT, fontSize: 7.5 * s, lineHeight: 1.6, letterSpacing: '0.02em' }}>{text}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: footerH, background: TEXT_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 * s }}>
                <div style={{ color: `${GOLD}70`, fontSize: 6.5 * s, letterSpacing: '0.12em' }}>contact@retourgagnantbenin.bj</div>
                <div style={{ width: 1 * s, height: 10 * s, background: `${GOLD}35` }} />
                <div style={{ color: `${GOLD}70`, fontSize: 6.5 * s, letterSpacing: '0.12em' }}>+229 01 60 32 21 21</div>
                <div style={{ width: 1 * s, height: 10 * s, background: `${GOLD}35` }} />
                <div style={{ color: `${GOLD}70`, fontSize: 6.5 * s, letterSpacing: '0.12em' }}>www.retourgagnantbenin.bj</div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════
   PANEL 1 VERSO — FRANÇAIS
══════════════════════════════════════════════════════════════ */

export const Panel1Verso = forwardRef<HTMLDivElement, { scale?: number }>(
    ({ scale = 1 }, ref) => (
        <div ref={ref} style={{ flexShrink: 0 }}>
            <TextPanelInner s={scale} content={FR} lang="FR" />
        </div>
    )
)
Panel1Verso.displayName = 'Panel1Verso'

/* ══════════════════════════════════════════════════════════════
   PANEL 2 VERSO — ENGLISH
══════════════════════════════════════════════════════════════ */

export const Panel2Verso = forwardRef<HTMLDivElement, { scale?: number }>(
    ({ scale = 1 }, ref) => (
        <div ref={ref} style={{ flexShrink: 0 }}>
            <TextPanelInner s={scale} content={EN} lang="EN" />
        </div>
    )
)
Panel2Verso.displayName = 'Panel2Verso'

/* ══════════════════════════════════════════════════════════════
   PANEL 2 RECTO — 4e DE COUVERTURE (BACK)
══════════════════════════════════════════════════════════════ */

export const Panel2Recto = forwardRef<HTMLDivElement, { scale?: number }>(
    ({ scale = 1 }, ref) => {
        const W = BASE_W * scale, H = BASE_H * scale, s = scale
        return (
            <div ref={ref} style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: BG_DARK, fontFamily: "'Arial',sans-serif", flexShrink: 0 }}>

                {/* Lueur */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400 * s, height: 400 * s, background: `radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <CornerBrackets s={s} arm={28} />

                {/* Bande haut */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 * s, background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L}, ${GOLD})` }} />

                {/* Logo + nom */}
                <div style={{ position: 'absolute', top: 60 * s, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 * s }}>
                    <div style={{ width: 64 * s, height: 64 * s, borderRadius: 12 * s, border: `1px solid ${GOLD}30`, background: `radial-gradient(circle, rgba(201,168,76,0.06), transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/logo-transparent.png" alt="RGB" style={{ width: 48 * s, height: 48 * s, objectFit: 'contain' }} />
                    </div>
                    <div style={{ color: GOLD, fontSize: 14 * s, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif", textAlign: 'center' }}>
                        RETOUR GAGNANT BÉNIN
                    </div>
                    <HRule s={s} w={180 * s} opacity={0.4} />
                </div>

                {/* QR Code central */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * s }}>
                    <div style={{ padding: 10 * s, background: '#ffffff', borderRadius: 8 * s, boxShadow: `0 0 0 1px ${GOLD}40, 0 8px 40px rgba(0,0,0,0.5), 0 0 32px ${GOLD}15` }}>
                        <QRDisplay size={Math.round(140 * s)} />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7 * s, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                        Scannez pour nous découvrir
                    </div>
                </div>

                {/* Coordonnées */}
                <div style={{ position: 'absolute', bottom: 70 * s, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 * s }}>
                    <HRule s={s} w={240 * s} opacity={0.3} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 * s }}>
                        {[
                            { icon: '📍', text: 'Haie-Vive Cocotiers, Carré N°1158, Cotonou — BÉNIN' },
                            { icon: '☎', text: '+229 01 60 32 21 21  ·  +229 01 94 35 50 50' },
                            { icon: '✉', text: 'contact@retourgagnantbenin.bj' },
                            { icon: '🌐', text: 'www.retourgagnantbenin.bj' },
                        ].map(({ icon, text }) => (
                            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 * s }}>
                                <span style={{ fontSize: 7 * s }}>{icon}</span>
                                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 7.5 * s, letterSpacing: '0.04em' }}>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Slogan bas */}
                <div style={{ position: 'absolute', bottom: 22 * s, left: 0, right: 0, textAlign: 'center', color: GOLD, fontSize: 8 * s, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', fontFamily: "'Cinzel','Georgia',serif" }}>
                    VOTRE RETOUR, NOTRE MISSION
                </div>
            </div>
        )
    }
)
Panel2Recto.displayName = 'Panel2Recto'
