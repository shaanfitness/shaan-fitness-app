import { Link, useLocation } from 'react-router-dom'
import { pageFor } from '../../nav'
import { PageHeader } from '../../components/ui'

// Placeholder for YDL pages not built yet: says which YDL page it replaces.
export default function InProgress() {
  const { pathname } = useLocation()
  const page = pageFor(pathname)
  return (
    <>
      <PageHeader title={page?.label ?? 'Page'} sub={page ? `${page.group} · replaces YDL "${page.ydl}"` : undefined} />
      <div className="px-5 pt-5 lg:px-8">
        <div className="card flex max-w-[640px] flex-col gap-3 p-6">
          <span className="chip chip-amber self-start">Being built</span>
          <p className="m-0 text-[15px] leading-relaxed">
            This page is on the YDL replica list and is being built with every field, filter, column and action YDL has.
            Until then, keep using YDL for it.
          </p>
          <p className="m-0 text-[13px] text-muted">Ready now: <Link to="/dashboard">Dashboard</Link>, <Link to="/enquiries">Enquiries</Link>, <Link to="/enquiries/new">Add enquiry</Link>, <Link to="/follow-ups">Follow-ups</Link> and <Link to="/settings/lists">Dropdown lists</Link>.</p>
        </div>
      </div>
    </>
  )
}
