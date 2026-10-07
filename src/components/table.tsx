import type { ReactNode } from 'react'

// A list that is a table on laptops and a stack of cards on phones.
export interface Column<T> { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string; width?: number }

export function DataTable<T>({ columns, rows, rowKey, selectable, selected, onSelect, card, empty = 'Nothing to show', loading, caption }: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  selectable?: boolean
  selected?: Set<string>
  onSelect?: (next: Set<string>) => void
  card: (row: T) => ReactNode
  empty?: ReactNode
  loading?: boolean
  caption?: string
}) {
  const allOn = rows.length > 0 && rows.every((r) => selected?.has(rowKey(r)))
  const toggleAll = () => {
    const next = new Set(selected)
    if (allOn) rows.forEach((r) => next.delete(rowKey(r)))
    else rows.forEach((r) => next.add(rowKey(r)))
    onSelect?.(next)
  }
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelect?.(next)
  }

  if (loading) return <div className="card px-5 py-10 text-center text-[14px] text-muted" role="status">Loading…</div>
  if (!rows.length) return <div className="card px-5 py-10 text-center text-[14px] text-muted">{empty}</div>

  return (
    <>
      <div className="card hidden max-h-[calc(100dvh-140px)] overflow-auto lg:block">
        <table className="tbl">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 44 }}>
                  <input type="checkbox" className="check" aria-label="Select all on this page" checked={allOn} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => <th key={c.key} className={c.className} style={c.width ? { width: c.width } : undefined}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = rowKey(r)
              return (
                <tr key={id}>
                  {selectable && (
                    <td><input type="checkbox" className="check" aria-label="Select row" checked={!!selected?.has(id)} onChange={() => toggle(id)} /></td>
                  )}
                  {columns.map((c) => <td key={c.key} className={c.className}>{c.cell(r)}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2.5 lg:hidden">
        {selectable && (
          <label className="flex min-h-9 items-center gap-2.5 px-1 text-[13px] text-muted">
            <input type="checkbox" className="check" checked={allOn} onChange={toggleAll} />Select all on this page
          </label>
        )}
        {rows.map((r) => {
          const id = rowKey(r)
          return (
            <div key={id} className="card flex gap-3 p-4">
              {selectable && <input type="checkbox" className="check mt-1" aria-label="Select" checked={!!selected?.has(id)} onChange={() => toggle(id)} />}
              <div className="min-w-0 flex-1">{card(r)}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize) return total ? <div className="px-1 text-[13px] text-muted">{total} {total === 1 ? 'record' : 'records'}</div> : null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted">{from}–{to} of {total}</span>
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Back</button>
        <button type="button" className="btn btn-sm" disabled={to >= total} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  )
}

/** Shown when rows are ticked: the bulk actions for them. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/50 bg-surface-3 p-2.5 pl-4 shadow-lg">
      <span className="text-[13px] font-bold">{count} selected</span>
      <button type="button" className="link-btn text-[13px]" onClick={onClear}>Clear</button>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
