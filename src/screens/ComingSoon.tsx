import { ScreenHeader } from '../components/ui'

export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <>
      <ScreenHeader title={title} />
      <div className="px-5 pt-6 lg:px-8">
        <div className="card flex flex-col gap-2 p-6">
          <span className="eyebrow">Coming soon</span>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">{note}</p>
        </div>
      </div>
    </>
  )
}
