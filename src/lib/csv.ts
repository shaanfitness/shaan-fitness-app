// CSV export for lists (YDL "Export to CSV"). Opens cleanly in Excel, including Telugu text.
export function downloadCsv<T>(filename: string, rows: T[], columns: [string, (row: T) => unknown][]) {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    // Stop spreadsheet formulas sneaking in from typed-in text.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const lines = [columns.map(([h]) => cell(h)).join(','), ...rows.map((r) => columns.map(([, f]) => cell(f(r))).join(','))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
