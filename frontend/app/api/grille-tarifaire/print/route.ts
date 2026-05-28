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
        const presidentTitle = tpl.signature_title || 'LA DIRECTION GÉNÉRALE'
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
        const logoUrl = `${baseUrl}/logo.jpg`
        const stampUrl = `${baseUrl}/images/cachet-PDG.png`
        const date = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
        })

        const gridsHtml = grids.map((grid) => {
            const gridRef = `GRI-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${grid.id.toUpperCase().slice(0, 8)}`

            const rowsHtml = grid.rows.map((row: any) => {
                return `
                <tr>
                    <td class="center font-bold">${escapeHtml(row.no)}</td>
                    <td class="font-bold text-left">${escapeHtml(row.service)}</td>
                    <td class="center font-bold">${escapeHtml(row.unit)}</td>
                    <td class="right font-bold price-cell">${escapeHtml(row.price)}</td>
                    <td class="center font-bold">${escapeHtml(row.delay)}</td>
                </tr>
                `
            }).join('')

            return `
            <div class="page">
                <!-- DRAPEAU BÉNIN -->
                <div class="flag-stripe">
                    <div class="flag-vert"></div>
                    <div class="flag-jaune"></div>
                    <div class="flag-rouge"></div>
                </div>

                <!-- HEADER BLANC -->
                <div class="header">
                    <div class="brand">
                        <img src="${logoUrl}" alt="RETOUR GAGNANT" class="logo" onerror="this.style.display='none'" />
                        <div class="brand-text">
                            <div class="brand-name">
                                <span class="vert">RETOUR </span><span class="rouge">GAGNANT</span>
                            </div>
                            <div class="brand-benin">Bénin</div>
                            <div class="brand-slogan">L'agence d'accompagnement à la Nationalité Béninoise et au retour des Afro-descendants.</div>
                        </div>
                    </div>
                    <div class="invoice-meta">
                        <div class="inv-type">GRILLES TARIFAIRES</div>
                        <div class="inv-subtype">${escapeHtml(grid.title)}</div>
                        <div class="inv-num">N° ${gridRef}</div>
                        <div class="inv-date">Date : Cotonou, le ${date}</div>
                    </div>
                </div>

                <div class="body">
                    <!-- TABLEAU DES TARIFS -->
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th class="center" style="width: 50px">N°</th>
                                    <th>Service / Prestation</th>
                                    <th class="center" style="width: 120px">Unité</th>
                                    <th class="right" style="width: 180px">Tarif (FCFA/EUR)</th>
                                    <th class="center" style="width: 120px">Délai</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- ZONE SIGNATURE -->
                    <div class="sig-zone">
                        <div class="sig-box-left">
                            <div class="sig-title">POUR LA DIRECTION GÉNÉRALE</div>
                            <div class="sig-name">${escapeHtml(presidentName)}</div>
                            <div class="sig-sub">${escapeHtml(presidentTitle)}</div>
                            <div class="sig-sub" style="margin-top: 4px">Fait à Cotonou, le ${date}</div>
                            <img src="${stampUrl}" alt="Cachet RGB" class="sig-cachet" onerror="this.style.display='none'" />
                        </div>
                    </div>
                </div>

                <!-- FOOTER BLANC SÉCURISÉ -->
                <div class="white-footer">
                    <p class="footer-company-info">RETOUR GAGNANT BENIN - RCCM: RB/COT/26 B 42001 - IFU: 3202644573981 - Haie-Vive Cocotiers, Cotonou - contact@retourgagnantbenin.bj</p>
                    <div class="doc-ref">Document N° ${gridRef} — Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
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
  <link rel="shortcut icon" href="${baseUrl}/icon.png">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#e8edf2;color:#000000;position:relative}
    
    .print-btn-container {
      max-width: 820px;
      margin: 20px auto 0;
      display: flex;
      justify-content: flex-end;
    }
    
    .print-btn{
      padding: 12px 30px;
      background: #008751;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      letter-spacing: .5px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 135, 81, 0.2);
      transition: all 0.2s;
    }
    .print-btn:hover{background:#006b40;transform:translateY(-1px)}

    .page{
      max-width:820px;
      margin:20px auto 40px;
      background:#fff;
      border-radius:4px;
      overflow:hidden;
      box-shadow:0 8px 40px rgba(0,0,0,.08);
      position:relative;
      z-index:1;
      display: flex;
      flex-direction: column;
      min-height: 1080px;
    }

    /* Drapeau Bénin */
    .flag-stripe{display:flex;height:5px}
    .flag-vert{flex:1;background:#008751}
    .flag-jaune{flex:1;background:#FCD116}
    .flag-rouge{flex:1;background:#E8112D}

    /* Header blanc */
    .header{background:#fff;padding:24px 36px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #008751}
    .brand{display:flex;align-items:center;gap:16px}
    .logo{width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid #e2e8f0;box-shadow: 0 2px 8px rgba(0,0,0,0.05)}
    .brand-text{}
    .brand-name{font-size:24px;font-weight:900;line-height:1.1;letter-spacing:-.3px}
    .brand-name .vert{color:#008751}
    .brand-name .rouge{color:#E8112D}
    .brand-benin{font-size:9px;font-weight:800;color:#555;letter-spacing:3px;text-transform:uppercase;margin-top:2px}
    .brand-slogan{font-size:10px;color:#666;margin-top:4px;max-width:240px;line-height:1.4}
    
    .invoice-meta{text-align:right}
    .inv-type{font-size:20px;font-weight:900;color:#008751;letter-spacing:1px;line-height:1}
    .inv-subtype{font-size:12px;font-weight:800;color:#E8112D;margin-top:4px;text-transform:uppercase}
    .inv-num{font-size:12px;font-weight:700;color:#000000;margin-top:6px;font-family:monospace}
    .inv-date{font-size:11px;color:#333;margin-top:4px}

    /* Corps */
    .body{padding:36px;flex: 1}

    /* Tableau des tarifs */
    .table-wrap{border: 1px solid #000000;border-radius:8px;overflow:hidden;margin-bottom:30px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#008751}
    thead th{padding:12px 14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#fff;text-align:left}
    thead th.right{text-align:right}
    thead th.center{text-align:center}

    tbody tr{background:#ffffff;border-bottom:1px solid #e2e8f0}
    tbody tr:last-child{border-bottom:none}
    tbody tr:nth-child(even){background:#fcfdfe}
    
    tbody td{padding:14px;font-size:12px;color:#000000;line-height:1.5;vertical-align:middle}
    tbody td.right{text-align:right}
    tbody td.center{text-align:center}
    tbody td.font-bold{font-weight:700}
    tbody td.text-left{text-align:left}
    
    .price-cell{color:#008751;font-size:13px}

    /* Zone signature */
    .sig-zone{display:flex;justify-content:flex-end;margin-top:40px;margin-bottom:20px}
    .sig-box-left{
      width:320px;
      border:1px solid #008751;
      border-radius:8px;
      padding:18px;
      background:#f0fff6;
      min-height:120px;
      position:relative;
      overflow:hidden;
      box-shadow: 0 2px 10px rgba(0,135,81,0.04);
    }
    .sig-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;color:#006b40}
    .sig-name{font-size:13px;font-weight:800;color:#008751;margin-top:6px}
    .sig-sub{font-size:10px;color:#333;margin-top:3px}
    .sig-cachet{position:absolute;right:-5px;bottom:-5px;width:100px;height:100px;opacity:.95;object-fit:contain;pointer-events:none}

    /* Footer blanc */
    .white-footer{
      background:#ffffff;
      padding:20px 36px;
      text-align:center;
      border-top:1px solid #dde3ee;
      margin-top: auto;
    }
    .white-footer p.footer-company-info{
      font-size:10.5px;
      color:#000000;
      font-weight:700;
      line-height:1.6;
      margin-bottom: 4px;
    }
    .white-footer .doc-ref{
      font-size:9.5px;
      color:#000000;
      font-weight:600;
    }

    @media print{
      body{background:#fff}
      .print-btn-container{display:none}
      .page{
        box-shadow:none;
        border-radius:0;
        margin:0;
        max-width:100%;
        min-height: 100%;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
      .flag-stripe{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .sig-box-left{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      tbody tr:nth-child(even){-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .price-cell{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
  <div class="print-btn-container">
    <button class="print-btn" onclick="window.print()">🖨&nbsp; Télécharger / Imprimer la Grille</button>
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
