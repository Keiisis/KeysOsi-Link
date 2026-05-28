import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 503 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch settings (grilles_tarifaires)
        const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'grilles_tarifaires')
            .maybeSingle()

        // 2. Fetch signature details
        const { data: templateData } = await supabase
            .from('document_templates')
            .select('content')
            .eq('id', 'official_devis_facture')
            .maybeSingle()

        const tpl = templateData?.content || {}
        const presidentName = tpl.signature_name || 'N. R. G'

        // Default layout data if settings are empty
        const defaultGrids = [
            {
                id: 'documents-identite',
                title: 'DOCUMENTS & IDENTITÉ',
                rows: [
                    { no: '1', service: 'Acte de naissance béninois (sécurisé)', unit: 'Par document', price: '15 000 FCFA / 23 €', delay: '72h' },
                    { no: '2', service: 'Passeport Biométrique Béninois', unit: 'Par demande', price: '75 000 FCFA / 115 €', delay: '10 à 15 jours' },
                    { no: '3', service: 'Carte Nationale d\'Identité (CNIB)', unit: 'Par demande', price: '30 000 FCFA / 46 €', delay: '5 à 7 jours' },
                    { no: '4', service: 'Certificat d\'Identification Personnelle (CIP)', unit: 'Par document', price: '10 000 FCFA / 15 €', delay: '48h' },
                    { no: '5', service: 'Casier Judiciaire Béninois', unit: 'Par document', price: '12 000 FCFA / 18 €', delay: '72h' }
                ]
            }
        ]

        let grids = defaultGrids
        if (settingsData?.value) {
            try {
                grids = JSON.parse(settingsData.value)
            } catch (e) {
                console.error('Error parsing grilles_tarifaires settings:', e)
            }
        }

        // Filter if gridId is provided
        const url = new URL(request.url)
        const gridId = url.searchParams.get('gridId')
        if (gridId) {
            grids = grids.filter(g => g.id === gridId)
        }

        if (grids.length === 0) {
            return new NextResponse('Aucune grille tarifaire trouvée.', { status: 404 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.retourgagnantbenin.bj'
        const logoUrl = `${baseUrl}/images/logo-transparent.png`
        const stampUrl = `${baseUrl}/images/cachet-PDG.png`
        const date = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
        })

        const gridsHtml = grids.map((grid) => {
            const gridRef = `GRI-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${grid.id.toUpperCase().slice(0, 8)}`

            const rowsHtml = grid.rows.map((row: any) => {
                return `
                <tr>
                    <td class="center bold">${escapeHtml(row.no)}</td>
                    <td class="bold text-left">${escapeHtml(row.service)}</td>
                    <td class="center bold">${escapeHtml(row.unit)}</td>
                    <td class="right bold price-cell">${escapeHtml(row.price)}</td>
                    <td class="center bold">${escapeHtml(row.delay)}</td>
                </tr>
                `
            }).join('')

            return `
            <div class="page">
                <!-- RUBAN DRAPEAU BÉNIN -->
                <div class="flag-stripe">
                    <div class="flag-g"></div>
                    <div class="flag-j"></div>
                    <div class="flag-r"></div>
                </div>

                <!-- ENTÊTE -->
                <div class="header">
                    <div class="brand">
                        <img src="${logoUrl}" alt="RETOUR GAGNANT" class="logo" onerror="this.style.display='none'" />
                        <div class="brand-text">
                            <div class="brand-name">
                                <span class="c-vert">RETOUR </span><span class="c-rouge">GAGNANT</span>
                            </div>
                            <div class="brand-benin">Bénin</div>
                            <div class="brand-slogan">L'agence d'accompagnement à la Nationalité Béninoise et au retour des Afro-descendants.</div>
                        </div>
                    </div>
                    <div class="meta">
                        <div class="meta-type">GRILLES TARIFAIRES</div>
                        <div class="meta-sub">${escapeHtml(grid.title)}</div>
                        <div class="meta-ref">N° ${gridRef}</div>
                        <div class="meta-date">Date : Cotonou, le ${date}</div>
                    </div>
                </div>

                <!-- CORPS -->
                <div class="body">
                    <!-- TEXTE INTRODUCTIF -->
                    <div class="intro">
                        Retour Gagnant Bénin est le partenaire stratégique de référence dédié à la réussite absolue de votre retour et de votre établissement au Bénin. De l'acquisition rigoureuse de votre nationalité béninoise à la sécurisation de vos projets de vie et d'investissement, notre agence déploie une expertise d'excellence pour chacun de vos besoins administratifs et juridiques. C'est avec le plus haut niveau d'engagement que nous vous présentons ci-dessous la grille tarifaire officielle de nos prestations pour le pôle <strong>${escapeHtml(grid.title)}</strong>.
                    </div>

                    <!-- TABLEAU DES TARIFS -->
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th class="center" style="width:50px">N°</th>
                                    <th>Service / Prestation</th>
                                    <th class="center" style="width:120px">Unité</th>
                                    <th class="right" style="width:180px">Tarif (FCFA/EUR)</th>
                                    <th class="center" style="width:120px">Délai</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- ZONE SIGNATURE + CACHET -->
                    <div class="sig-zone">
                        <div class="sig-content">
                            <div class="sig-box">
                                <div class="sig-title">DIRECTION GÉNÉRALE</div>
                                <div class="sig-company">RETOUR GAGNANT BÉNIN</div>
                                <div class="sig-label">La Présidente Directrice Générale :</div>
                                <div class="sig-name">${escapeHtml(presidentName)}</div>
                                <div class="sig-date">Fait à Cotonou, Le ${date}</div>
                                <div class="sig-valid">Validité officielle garantie</div>
                            </div>
                            <div class="cachet-area">
                                <img src="${stampUrl}" alt="Cachet officiel" class="cachet-img" onerror="this.style.display='none'" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- PIED DE PAGE -->
                <div class="footer">
                    <p class="footer-info">RETOUR GAGNANT BENIN - RCCM: RB/COT/26 B 42001 - IFU: 3202644573981 - Haie-Vive Cocotiers, Cotonou - contact@retourgagnantbenin.bj</p>
                    <p class="footer-ref">Document N° ${gridRef} — Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>
            `
        }).join('')

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Grilles Tarifaires — Retour Gagnant Bénin</title>
  <link rel="icon" type="image/png" href="${baseUrl}/icon.png">
  <style>
    /* ===== RESET ===== */
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#e8edf2;color:#000}

    /* ===== BOUTON TÉLÉCHARGER ===== */
    .actions{max-width:210mm;margin:18px auto 0;display:flex;justify-content:flex-end;gap:10px}
    .btn{padding:11px 28px;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:7px;transition:all .2s}
    .btn-print{background:#008751;color:#fff;box-shadow:0 4px 12px rgba(0,135,81,.2)}
    .btn-print:hover{background:#006b40;transform:translateY(-1px)}

    /* ===== FEUILLE A4 ===== */
    .page{
      width:210mm;
      height:297mm;
      margin:18px auto 36px;
      background:#fff;
      position:relative;
      display:flex;
      flex-direction:column;
      box-shadow:0 8px 40px rgba(0,0,0,.08);
      overflow:hidden;
    }

    /* ===== RUBAN DRAPEAU ===== */
    .flag-stripe{display:flex;height:6px;flex-shrink:0}
    .flag-g{flex:1;background:#008751}
    .flag-j{flex:1;background:#FCD116}
    .flag-r{flex:1;background:#E8112D}

    /* ===== ENTÊTE ===== */
    .header{
      display:flex;justify-content:space-between;align-items:center;
      padding:16px 28px 14px;
      border-bottom:2.5px solid #008751;
      flex-shrink:0;
    }
    .brand{display:flex;align-items:center;gap:16px}

    /* Logo libre, sans fond noir, sans cadre */
    .logo{
      width:90px;height:auto;
      object-fit:contain;
      display:block;
      background:transparent !important;
      border:none !important;
      box-shadow:none !important;
      border-radius:0 !important;
      padding:0 !important;
    }

    .brand-name{font-size:24px;font-weight:900;line-height:1.1;letter-spacing:-.3px}
    .c-vert{color:#008751}
    .c-rouge{color:#E8112D}
    .brand-benin{font-size:9px;font-weight:800;color:#000;letter-spacing:3px;text-transform:uppercase;margin-top:2px}
    .brand-slogan{font-size:9.5px;color:#000;margin-top:4px;max-width:260px;line-height:1.35;font-weight:700}

    .meta{text-align:right}
    .meta-type{font-size:20px;font-weight:900;color:#008751;letter-spacing:1px}
    .meta-sub{font-size:12px;font-weight:800;color:#E8112D;margin-top:4px;text-transform:uppercase}
    .meta-ref{font-size:12px;font-weight:700;color:#000;margin-top:6px;font-family:monospace}
    .meta-date{font-size:11px;color:#000;margin-top:4px;font-weight:700}

    /* ===== CORPS ===== */
    .body{
      flex:1;
      display:flex;
      flex-direction:column;
      padding:18px 28px 0;
    }

    /* Texte introductif */
    .intro{
      font-size:11.5px;
      line-height:1.55;
      color:#000;
      margin-bottom:16px;
      text-align:justify;
      font-weight:700;
    }

    /* ===== TABLEAU ===== */
    .table-wrap{
      border:2px solid #000;
      border-radius:8px;
      overflow:hidden;
      margin-bottom:auto;
    }
    table{width:100%;border-collapse:collapse}
    thead tr{background:#008751}
    thead th{padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;color:#fff;text-align:left}
    thead th.right{text-align:right}
    thead th.center{text-align:center}

    tbody tr{background:#fff;border-bottom:1.5px solid #000}
    tbody tr:last-child{border-bottom:none}
    tbody tr:nth-child(even){background:#f8fafc}

    tbody td{padding:11px 12px;font-size:12px;color:#000;line-height:1.4;vertical-align:middle}
    tbody td.right{text-align:right}
    tbody td.center{text-align:center}
    tbody td.text-left{text-align:left}
    .bold{font-weight:700}
    .price-cell{color:#008751;font-weight:900;font-size:12.5px}

    /* ===== ZONE SIGNATURE ===== */
    .sig-zone{
      margin-top:auto;
      padding-top:14px;
      display:flex;
      justify-content:flex-end;
    }

    .sig-content{
      display:flex;
      align-items:flex-start;
      gap:0;
    }

    .sig-box{
      width:300px;
      border:2.5px solid #008751;
      border-radius:10px;
      padding:16px 18px;
      background:#f0fff6;
    }
    .sig-title{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#006b40;margin-bottom:2px}
    .sig-company{font-size:10px;font-weight:800;color:#008751;margin-bottom:8px}
    .sig-label{font-size:10.5px;font-weight:700;color:#000;margin-bottom:1px}
    .sig-name{font-size:14px;font-weight:900;color:#008751;margin-bottom:6px}
    .sig-date{font-size:10px;font-weight:700;color:#000;margin-bottom:3px}
    .sig-valid{font-size:8.5px;font-weight:800;text-transform:uppercase;color:#008751;letter-spacing:1px}

    /* Cachet à droite de la boîte signature, décalé pour ne pas toucher le texte */
    .cachet-area{
      position:relative;
      width:180px;
      margin-left:-30px;
      margin-top:10px;
    }
    .cachet-img{
      width:180px;
      height:180px;
      object-fit:contain;
      opacity:.92;
      display:block;
    }

    /* ===== PIED DE PAGE ===== */
    .footer{
      position:absolute;
      bottom:0;left:0;right:0;
      background:#fff;
      padding:14px 28px;
      text-align:center;
      border-top:2px solid #dde3ee;
    }
    .footer-info{font-size:9.5px;font-weight:900;color:#000;line-height:1.5;margin-bottom:3px}
    .footer-ref{font-size:8.5px;font-weight:800;color:#000}

    /* ===== IMPRESSION / PDF ===== */
    @page{size:A4;margin:0}

    @media print{
      body{background:#fff}
      .actions{display:none !important}
      .page{
        box-shadow:none;
        margin:0;
        width:210mm;
        height:297mm;
        page-break-after:always;
        break-after:page;
      }
      .page:last-child{page-break-after:avoid;break-after:avoid}
      /* Forcer les couleurs à l'impression */
      .flag-stripe,.flag-g,.flag-j,.flag-r{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .sig-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      tbody tr:nth-child(even){-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .price-cell{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn btn-print" onclick="window.print()">🖨&nbsp; Télécharger / Imprimer la Grille</button>
  </div>
  
  ${gridsHtml}
</body>
</html>`

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        })
    } catch (err) {
        console.error('Grille print error:', err)
        return new NextResponse('Erreur lors de la génération de la grille tarifaire.', { status: 500 })
    }
}
