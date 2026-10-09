import type { ReactNode } from 'react'
import { useCanCsv } from './access'

/** Shows a CSV export only to those YDL's "Download CSV Access" allows (the owner always). */
export function CsvOnly({ children }: { children: ReactNode }) {
  return useCanCsv() ? <>{children}</> : null
}
