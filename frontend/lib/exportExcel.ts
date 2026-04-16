import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { companyHeaderLines } from '@/lib/company'

type CellType = 'text' | 'currency' | 'number' | 'date' | 'percent' | 'status'

interface ColumnConfig {
  header: string
  key: string
  width?: number
  type?: CellType
  totalFormula?: 'sum' | 'count' | 'avg'
  group?: string
}

interface SheetConfig {
  sheetName: string
  columns: ColumnConfig[]
  data: Record<string, unknown>[]
  title?: string
  subtitle?: string
  summary?: { label: string; value: string | number; type?: CellType }[]
  legalHeader?: boolean
  totalRow?: boolean
}

interface ExportOptions {
  filename: string
  sheetName: string
  columns: ColumnConfig[]
  data: Record<string, unknown>[]
  title?: string
  subtitle?: string
  legalHeader?: boolean
  totalRow?: boolean
}

interface MultiSheetOptions {
  filename: string
  sheets: SheetConfig[]
  coverTitle?: string
  coverSubtitle?: string
  coverPeriod?: string
}

const COLOR_GOLD = 'FFC9A84C'
const COLOR_NAVY = 'FF1B2A4A'
const COLOR_GREEN_BJ = 'FF008751'
const COLOR_YELLOW_BJ = 'FFFCD116'
const COLOR_RED_BJ = 'FFE8112D'
const COLOR_IVORY = 'FFFAF8F4'
const COLOR_ROW_ALT = 'FFF5F0E8'
const COLOR_BORDER = 'FFD4C89C'
const COLOR_TEXT = 'FF1B2A4A'

function columnLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function applyNumFmt(cell: ExcelJS.Cell, type?: CellType) {
  if (type === 'currency') {
    cell.numFmt = '#,##0" FCFA"'
    cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
  } else if (type === 'number') {
    cell.numFmt = '#,##0'
    cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
  } else if (type === 'date') {
    cell.numFmt = 'dd/mm/yyyy'
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  } else if (type === 'percent') {
    cell.numFmt = '0.0%'
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }
}

function addTricoloreBand(worksheet: ExcelJS.Worksheet, row: number, lastCol: string) {
  const cols = lastCol.charCodeAt(0) - 64
  const third = Math.max(1, Math.floor(cols / 3))
  const bandRow = worksheet.getRow(row)
  bandRow.height = 4
  for (let i = 1; i <= cols; i++) {
    const cell = bandRow.getCell(i)
    let color = COLOR_GREEN_BJ
    if (i > third && i <= third * 2) color = COLOR_YELLOW_BJ
    else if (i > third * 2) color = COLOR_RED_BJ
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
  }
}

function buildSheet(worksheet: ExcelJS.Worksheet, cfg: SheetConfig) {
  const { columns, data, title, subtitle, summary, legalHeader, totalRow } = cfg
  const lastCol = columnLetter(columns.length)
  let currentRow = 1

  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
    printTitlesRow: '1:1',
  }
  worksheet.headerFooter = {
    oddFooter: '&L&8CONFIDENTIEL — Retour Gagnant Bénin&C&8&A&R&8Page &P / &N',
  }

  if (legalHeader) {
    const lines = companyHeaderLines()
    lines.forEach((line, idx) => {
      worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`)
      const c = worksheet.getCell(`A${currentRow}`)
      c.value = line
      if (idx === 0) {
        c.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLOR_NAVY } }
        worksheet.getRow(currentRow).height = 22
      } else {
        c.font = { name: 'Arial', size: 9, color: { argb: 'FF4B5563' } }
        worksheet.getRow(currentRow).height = 14
      }
      c.alignment = { vertical: 'middle', horizontal: 'center' }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
      currentRow++
    })
    addTricoloreBand(worksheet, currentRow, lastCol)
    currentRow++
  }

  if (title) {
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`)
    const c = worksheet.getCell(`A${currentRow}`)
    c.value = title.toUpperCase()
    c.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.border = { bottom: { style: 'medium', color: { argb: COLOR_GOLD } } }
    worksheet.getRow(currentRow).height = 32
    currentRow++
  }

  if (subtitle) {
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`)
    const c = worksheet.getCell(`A${currentRow}`)
    c.value = subtitle
    c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
    worksheet.getRow(currentRow).height = 20
    currentRow += 2
  }

  // Largeurs de colonnes (sans forcer les headers — on les écrit nous-mêmes)
  columns.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = col.width || 20
  })

  // Super-headers groupés (ex: HT / TVA / TTC)
  const hasGroups = columns.some(c => c.group)
  if (hasGroups) {
    const groupRow = worksheet.getRow(currentRow)
    groupRow.height = 22
    let i = 0
    while (i < columns.length) {
      const grp = columns[i].group
      if (!grp) {
        groupRow.getCell(i + 1).value = ''
        groupRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
        i++
        continue
      }
      let j = i
      while (j < columns.length && columns[j].group === grp) j++
      const span = j - i
      const cell = groupRow.getCell(i + 1)
      if (span > 1) {
        worksheet.mergeCells(currentRow, i + 1, currentRow, j)
      }
      cell.value = grp
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER } },
        left: { style: 'thin', color: { argb: COLOR_BORDER } },
        right: { style: 'thin', color: { argb: COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
      }
      i = j
    }
    currentRow++
  }

  // Header row (noms de colonnes)
  const headerRowNum = currentRow
  const headerRow = worksheet.getRow(headerRowNum)
  headerRow.height = 28
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = col.header
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'medium', color: { argb: COLOR_GOLD } },
      bottom: { style: 'medium', color: { argb: COLOR_GOLD } },
      left: { style: 'thin', color: { argb: COLOR_BORDER } },
      right: { style: 'thin', color: { argb: COLOR_BORDER } },
    }
  })
  worksheet.autoFilter = `A${headerRowNum}:${lastCol}${headerRowNum}`
  worksheet.views = [{ state: 'frozen', ySplit: headerRowNum, xSplit: 1 }]
  currentRow++

  const dataStartRow = currentRow
  data.forEach((row, index) => {
    const dataRow = worksheet.getRow(currentRow)
    dataRow.height = 20
    const rowColor = index % 2 === 0 ? 'FFFFFFFF' : COLOR_ROW_ALT
    columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1)
      cell.value = row[col.key] as ExcelJS.CellValue
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } }
      cell.font = { name: 'Arial', size: 10, color: { argb: COLOR_TEXT } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      applyNumFmt(cell, col.type)
      if (col.type === 'status') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.font = { bold: true, name: 'Arial', size: 10 }
        const val = String(cell.value ?? '').toLowerCase()
        if (val.includes('termin') || val.includes('payé') || val.includes('paye') || val.includes('succès') || val.includes('accept') || val.includes('soldé') || val.includes('solde')) {
          cell.font.color = { argb: COLOR_GREEN_BJ }
        } else if (val.includes('cours') || val.includes('attente') || val.includes('envoy') || val.includes('traitement') || val.includes('brouillon')) {
          cell.font.color = { argb: 'FFD97706' }
        } else if (val.includes('annul') || val.includes('retard') || val.includes('refus') || val.includes('impay')) {
          cell.font.color = { argb: COLOR_RED_BJ }
        }
      }
    })
    currentRow++
  })
  const dataEndRow = currentRow - 1

  // Ligne TOTAL avec formules Excel
  if (totalRow && data.length > 0) {
    const totalRowObj = worksheet.getRow(currentRow)
    totalRowObj.height = 28
    let labelled = false
    columns.forEach((col, i) => {
      const cell = totalRowObj.getCell(i + 1)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD } }
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLOR_NAVY } }
      cell.border = {
        top: { style: 'medium', color: { argb: COLOR_NAVY } },
        bottom: { style: 'medium', color: { argb: COLOR_NAVY } },
        left: { style: 'thin', color: { argb: COLOR_BORDER } },
        right: { style: 'thin', color: { argb: COLOR_BORDER } },
      }
      if (!labelled && !col.totalFormula) {
        cell.value = 'TOTAL'
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
        labelled = true
      } else if (col.totalFormula) {
        const colL = columnLetter(i + 1)
        const fnMap = { sum: 9, count: 3, avg: 1 }
        const fn = fnMap[col.totalFormula]
        cell.value = { formula: `SUBTOTAL(${fn},${colL}${dataStartRow}:${colL}${dataEndRow})` } as ExcelJS.CellFormulaValue
        applyNumFmt(cell, col.type)
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLOR_NAVY } }
      } else {
        cell.value = ''
      }
    })
    currentRow++
  }

  // Summary (en-dessous, séparé)
  if (summary && summary.length) {
    currentRow++
    summary.forEach(s => {
      const r = worksheet.getRow(currentRow)
      r.height = 22
      const labelCell = r.getCell(1)
      const valueCell = r.getCell(2)
      if (columns.length > 1) worksheet.mergeCells(currentRow, 1, currentRow, Math.max(1, columns.length - 1))
      labelCell.value = s.label
      labelCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLOR_NAVY } }
      labelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
      const valCol = columns.length > 1 ? columns.length : 2
      const finalValueCell = r.getCell(valCol)
      finalValueCell.value = s.value
      finalValueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLOR_GREEN_BJ } }
      finalValueCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
      finalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
      applyNumFmt(finalValueCell, s.type)
      currentRow++
    })
  }
}

function addCoverSheet(wb: ExcelJS.Workbook, opts: { title: string; subtitle?: string; period?: string }) {
  const ws = wb.addWorksheet('Couverture', {
    pageSetup: { orientation: 'portrait', fitToPage: true, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  })
  for (let i = 1; i <= 10; i++) ws.getColumn(i).width = 12

  let r = 1
  // Bandeau tricolore haut
  addTricoloreBand(ws, r, 'J')
  r++

  r++
  ws.mergeCells(`A${r}:J${r}`)
  const legalTop = ws.getCell(`A${r}`)
  legalTop.value = 'RETOUR GAGNANT BÉNIN'
  legalTop.font = { name: 'Arial', size: 26, bold: true, color: { argb: COLOR_NAVY } }
  legalTop.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 44
  r++

  const legals = companyHeaderLines().slice(1)
  legals.forEach(l => {
    ws.mergeCells(`A${r}:J${r}`)
    const c = ws.getCell(`A${r}`)
    c.value = l
    c.font = { name: 'Arial', size: 10, color: { argb: 'FF4B5563' } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = 18
    r++
  })

  r += 2
  ws.mergeCells(`A${r}:J${r}`)
  const title = ws.getCell(`A${r}`)
  title.value = opts.title.toUpperCase()
  title.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
  title.alignment = { horizontal: 'center', vertical: 'middle' }
  title.border = { bottom: { style: 'medium', color: { argb: COLOR_GOLD } } }
  ws.getRow(r).height = 50
  r++

  if (opts.period) {
    ws.mergeCells(`A${r}:J${r}`)
    const p = ws.getCell(`A${r}`)
    p.value = opts.period
    p.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLOR_GOLD } }
    p.alignment = { horizontal: 'center', vertical: 'middle' }
    p.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
    ws.getRow(r).height = 28
    r++
  }

  if (opts.subtitle) {
    ws.mergeCells(`A${r}:J${r}`)
    const s = ws.getCell(`A${r}`)
    s.value = opts.subtitle
    s.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF4B5563' } }
    s.alignment = { horizontal: 'center', vertical: 'middle' }
    s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_IVORY } }
    ws.getRow(r).height = 22
    r++
  }

  r += 3
  ws.mergeCells(`A${r}:J${r}`)
  const meta = ws.getCell(`A${r}`)
  meta.value = `Document généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  meta.font = { name: 'Arial', size: 10, color: { argb: 'FF4B5563' } }
  meta.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 18
  r += 4

  // Zones signature
  const sigStart = r
  ws.mergeCells(`B${r}:D${r}`)
  ws.mergeCells(`G${r}:I${r}`)
  ws.getCell(`B${r}`).value = 'Préparé par'
  ws.getCell(`G${r}`).value = 'Validé par le comptable'
  ;[ws.getCell(`B${r}`), ws.getCell(`G${r}`)].forEach(c => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_NAVY } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  r++
  // Cadre signature
  ;['B', 'G'].forEach(startCol => {
    const endCol = startCol === 'B' ? 'D' : 'I'
    for (let i = 0; i < 4; i++) {
      ws.mergeCells(`${startCol}${r + i}:${endCol}${r + i}`)
      const c = ws.getCell(`${startCol}${r + i}`)
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      c.border = {
        top: i === 0 ? { style: 'medium', color: { argb: COLOR_NAVY } } : undefined,
        bottom: i === 3 ? { style: 'medium', color: { argb: COLOR_NAVY } } : undefined,
        left: { style: 'medium', color: { argb: COLOR_NAVY } },
        right: { style: 'medium', color: { argb: COLOR_NAVY } },
      }
      ws.getRow(r + i).height = 22
    }
  })
  void sigStart
  r += 6

  // Bandeau bas tricolore
  addTricoloreBand(ws, r, 'J')
}

export async function exportToExcelMultiSheet({ filename, sheets, coverTitle, coverSubtitle, coverPeriod }: MultiSheetOptions) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Retour Gagnant Bénin — Comptabilité'
  workbook.lastModifiedBy = 'Retour Gagnant Bénin'
  workbook.created = new Date()
  workbook.company = 'Retour Gagnant Bénin'

  if (coverTitle) {
    addCoverSheet(workbook, { title: coverTitle, subtitle: coverSubtitle, period: coverPeriod })
  }

  sheets.forEach(sheet => {
    const ws = workbook.addWorksheet(sheet.sheetName)
    buildSheet(ws, sheet)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

export async function exportToExcel({ filename, sheetName, columns, data, title, subtitle, legalHeader, totalRow }: ExportOptions) {
  await exportToExcelMultiSheet({
    filename,
    sheets: [{ sheetName, columns, data, title, subtitle, legalHeader, totalRow }],
  })
}
