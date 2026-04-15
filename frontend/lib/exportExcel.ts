import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ColumnConfig {
  header: string
  key: string
  width?: number
  type?: 'text' | 'currency' | 'date' | 'percent' | 'status'
}

interface ExportOptions {
  filename: string
  sheetName: string
  columns: ColumnConfig[]
  data: Record<string, unknown>[]
  title?: string
  subtitle?: string
}

interface SheetConfig {
  sheetName: string
  columns: ColumnConfig[]
  data: Record<string, unknown>[]
  title?: string
  subtitle?: string
  summary?: { label: string; value: string | number; type?: ColumnConfig['type'] }[]
}

interface MultiSheetOptions {
  filename: string
  sheets: SheetConfig[]
}

function columnLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function buildSheet(worksheet: ExcelJS.Worksheet, cfg: SheetConfig) {
  const { columns, data, title, subtitle, summary } = cfg
  const lastCol = columnLetter(columns.length)
  let currentRow = 1

  if (title) {
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`)
    const c = worksheet.getCell(`A${currentRow}`)
    c.value = title.toUpperCase()
    c.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008751' } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    worksheet.getRow(currentRow).height = 32
    currentRow++
  }

  if (subtitle) {
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`)
    const c = worksheet.getCell(`A${currentRow}`)
    c.value = subtitle
    c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    worksheet.getRow(currentRow).height = 20
    currentRow += 2
  }

  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
    style: { font: { name: 'Arial', size: 10 } }
  }))

  const headerRow = worksheet.getRow(currentRow)
  headerRow.values = columns.map(c => c.header)
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4B5563' } },
      left: { style: 'thin', color: { argb: 'FF4B5563' } },
      bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
      right: { style: 'thin', color: { argb: 'FF4B5563' } }
    }
  })
  worksheet.autoFilter = `A${currentRow}:${lastCol}${currentRow}`
  worksheet.views = [{ state: 'frozen', ySplit: currentRow }]

  data.forEach((row, index) => {
    const dataRow = worksheet.addRow(row)
    dataRow.height = 20
    const rowColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB'
    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      const colConfig = columns[colNumber - 1]
      if (colConfig.type === 'currency' && typeof cell.value === 'number') {
        cell.numFmt = '#,##0 [$XOF]'
        cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
      } else if (colConfig.type === 'date' && cell.value) {
        cell.numFmt = 'dd/mm/yyyy'
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colConfig.type === 'percent' && typeof cell.value === 'number') {
        cell.value = cell.value / 100
        cell.numFmt = '0%'
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colConfig.type === 'status') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.font = { bold: true, name: 'Arial', size: 10 }
        const val = String(cell.value).toLowerCase()
        if (val.includes('termin') || val.includes('payé') || val.includes('paye') || val.includes('succès') || val.includes('accept')) {
          cell.font.color = { argb: 'FF008751' }
        } else if (val.includes('cours') || val.includes('attente') || val.includes('envoy') || val.includes('traitement')) {
          cell.font.color = { argb: 'FFD97706' }
        } else if (val.includes('annul') || val.includes('retard') || val.includes('refus')) {
          cell.font.color = { argb: 'FFDC2626' }
        }
      }
    })
  })

  if (summary && summary.length) {
    worksheet.addRow({})
    summary.forEach(s => {
      const r = worksheet.addRow([s.label, s.value])
      r.height = 22
      const labelCell = r.getCell(1)
      const valueCell = r.getCell(2)
      labelCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F2937' } }
      labelCell.alignment = { horizontal: 'right', vertical: 'middle' }
      valueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF008751' } }
      valueCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
      if (s.type === 'currency' && typeof s.value === 'number') {
        valueCell.numFmt = '#,##0 [$XOF]'
      }
    })
  }
}

export async function exportToExcelMultiSheet({ filename, sheets }: MultiSheetOptions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Retour Gagnant Bénin — Comptabilité'
  workbook.created = new Date()
  sheets.forEach(sheet => {
    const ws = workbook.addWorksheet(sheet.sheetName)
    buildSheet(ws, sheet)
  })
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

export async function exportToExcel({
  filename,
  sheetName,
  columns,
  data,
  title,
  subtitle
}: ExportOptions) {
  // 1. Initialiser le classeur Excel
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Nexus Tracker ERP'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: title ? 4 : 1 }]
  })

  let currentRow = 1

  // 2. Ajouter le Titre et Sous-titre si fournis
  if (title) {
    worksheet.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`)
    const titleCell = worksheet.getCell('A1')
    titleCell.value = title.toUpperCase()
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008751' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    currentRow++
  }

  if (subtitle) {
    worksheet.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`)
    const subtitleCell = worksheet.getCell('A2')
    subtitleCell.value = subtitle
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } }
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    currentRow += 2 // Laisse une ligne vide
  }

  // 3. Définir les colonnes et les en-têtes
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
    style: { font: { name: 'Arial', size: 10 } }
  }))

  const headerRow = worksheet.getRow(currentRow)
  headerRow.values = columns.map(c => c.header)
  headerRow.height = 25
  
  // Style de l'en-tête
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } } // Dark gray
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4B5563' } },
      left: { style: 'thin', color: { argb: 'FF4B5563' } },
      bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
      right: { style: 'thin', color: { argb: 'FF4B5563' } }
    }
  })

  // Ajout du filtre automatique
  worksheet.autoFilter = `A${currentRow}:${String.fromCharCode(64 + columns.length)}${currentRow}`

  // 4. Ajouter les données avec formatage dynamique
  data.forEach((row, index) => {
    const dataRow = worksheet.addRow(row)
    dataRow.height = 20

    // Zebra striping pour alterner les couleurs des lignes pour la lisibilité
    const isEven = index % 2 === 0
    const rowColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB' // White & Light Gray (Tailwind gray-50)

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      const colConfig = columns[colNumber - 1]
      
      // Application de styles par type de donnée
      if (colConfig.type === 'currency' && typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00 [$XOF]'
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      } else if (colConfig.type === 'date' && cell.value) {
        cell.numFmt = 'dd/mm/yyyy hh:mm'
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colConfig.type === 'percent' && typeof cell.value === 'number') {
        cell.value = cell.value / 100 // Excel % format expects numbers between 0 and 1
        cell.numFmt = '0%'
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colConfig.type === 'status') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.font = { bold: true, name: 'Arial', size: 10 }
        // Couleurs selon certains statuts classiques
        const val = String(cell.value).toLowerCase()
        if (val.includes('termin') || val.includes('payé') || val.includes('succès')) {
          cell.font.color = { argb: 'FF008751' } // Green
        } else if (val.includes('cours') || val.includes('attente') || val.includes('traitement')) {
          cell.font.color = { argb: 'FFD97706' } // Orange (Tailwind amber-600)
        } else if (val.includes('annul') || val.includes('retard') || val.includes('refus')) {
          cell.font.color = { argb: 'FFDC2626' } // Red
        }
      }
    })
  })

  // 5. Ajustement et Génération du Fichier
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}
