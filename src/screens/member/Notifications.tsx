import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMe } from '../../auth'
import { markNotificationsRead, myNotifications } from '../../db/messages'
import { fmtDateTime } from '../../lib/dates'
import { Icon, Loading } from '../../components/ui'

// Member app: notifications from the gym (Send Notification, notices, holidays, class changes).

function useMine() {
  const me = useMe()
  return useQuery({ queryKey: ['my-notifications', me.memberId], queryFn: () => myNotifications(me.memberId!), enabled: !!me.memberId, staleTime: 60_000 })
}

/** The bell, with a dot while something is unread. */
export function NotificationBell() {
  const { t } = useTranslation()
  const q = useMine()
  const unread = (q.data ?? []).filter((n) => !n.read_at).length
  return (
    <Link to="/app/notifications" className="icon-btn relative no-underline" aria-label={unread ? t('app.unread', { count: unread }) : t('app.notifications')}>
      <Icon name="bell" size={20} />
      {unread > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-on-gold" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  )
}

export default function MemberNotifications() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const q = useMine()
  const unread = (q.data ?? []).filter((n) => !n.read_at).map((n) => n.id)
  // Opening the page reads them; the ones that were new stay marked "New" for this visit.
  const [fresh, setFresh] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (q.data && !fresh) setFresh(new Set(unread))
    if (!unread.length) return
    const ids = [...unread]
    const timer = setTimeout(() => { markNotificationsRead(ids).then(() => qc.invalidateQueries({ queryKey: ['my-notifications'] })).catch(() => undefined) }, 1500)
    return () => clearTimeout(timer)
  }, [unread.join(','), q.data, qc]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-6 lg:mx-auto lg:max-w-[720px]">
      <Link to="/app" className="flex items-center gap-1 self-start text-[13px] font-semibold no-underline lg:hidden"><Icon name="chevronLeft" size={16} />{t('app.back')}</Link>
      <h1 className="title text-[36px]">{t('app.notifications')}</h1>
      {q.isLoading ? <Loading /> : !q.data?.length ? <div className="card px-5 py-8 text-center text-[14px] text-muted">{t('app.noNotifications')}</div> : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {q.data.map((n) => (
            <li key={n.id} className={`card flex flex-col gap-1 p-4 ${!n.read_at || fresh?.has(n.id) ? 'border-gold/60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="m-0 text-[16px] font-bold">{n.title}</h2>
                {(!n.read_at || fresh?.has(n.id)) && <span className="chip chip-gold shrink-0">{t('app.new')}</span>}
              </div>
              <p className="m-0 text-[14px] whitespace-pre-wrap">{n.body}</p>
              <span className="text-[12px] text-muted">{fmtDateTime(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
