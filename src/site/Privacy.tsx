import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { addressLines, prettyPhone, useSite } from '../db/site'
import { SitePage } from './chrome'

/** Saved with each sign-up, so we know which notice a person agreed to. */
export const PRIVACY_VERSION = '2026-10-09'

// The privacy notice members agree to when they join (India's Digital Personal Data Protection Act, 2023).
// Plain words, matching what the app actually stores and who can see it.
export default function Privacy() {
  const { i18n } = useTranslation()
  const { data } = useSite()
  const s = data?.studio
  const name = s?.name ?? 'Shaan Fitness'
  const contact = [s?.email, s?.mobile ? prettyPhone(s.mobile) : null].filter(Boolean).join(' · ')
  useEffect(() => { document.title = `Privacy notice · ${name}` }, [name])
  return (
    <SitePage>
      <article className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-12 text-[16px] leading-relaxed text-ink-soft lg:px-8 lg:py-16">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">Last updated 9 October 2026</p>
          <h1 className="headline text-[48px] text-ink">Privacy notice</h1>
          {i18n.language === 'te' && <p className="m-0 text-[14px] text-muted">ఈ నోటీసు ప్రస్తుతం ఇంగ్లీష్‌లో మాత్రమే ఉంది. సందేహాలుంటే ఫ్రంట్ డెస్క్‌ను అడగండి.</p>}
          <p className="m-0">
            {name} (“we”) runs this website, the member and coach app, and the system our staff use. This notice explains what
            personal data we keep about you, why, who can see it, and the choices you have.
          </p>
        </header>

        <Part title="What we keep">
          <ul className="m-0 flex flex-col gap-1.5 pl-5">
            <li>Who you are: name, mobile number, email, gender, date of birth, address and an emergency contact, if you give them.</li>
            <li>Your membership: plans, payments, invoices, receipts, freezes, bookings and check-ins.</li>
            <li>Your training: body measurements, progress photos, workout and diet plans, and notes from your coach.</li>
            <li>Health details you choose to share, such as injuries or medical conditions, so we can train you safely.</li>
            <li>Messages between you and our team in the app.</li>
          </ul>
        </Part>

        <Part title="Why we keep it">
          <p className="m-0">
            To run your membership: billing and receipts, batch and class bookings, attendance, renewal reminders and follow-up calls,
            and coaching that fits your goals and health. We use your details only for these purposes and never sell them.
          </p>
        </Part>

        <Part title="Who can see it">
          <ul className="m-0 flex flex-col gap-1.5 pl-5">
            <li>Our staff see only what their job needs. Each login (front desk, coach, doctor, owner) has its own access, which the owner controls.</li>
            <li>Health details are seen only by your own care team: your coach and, where your plan includes one, your doctor.</li>
            <li>Services that run the system for us: secure cloud hosting for the database and website and, when we turn them on, the services that send SMS, WhatsApp, email and online payments. They handle your data only to provide that service.</li>
            <li>Before-and-after photos or stories appear on this website only if you agree, and you can ask us to remove them at any time.</li>
          </ul>
        </Part>

        <Part title="On your device">
          <p className="m-0">
            The website and app remember your login and your chosen language on your device. We use no advertising or tracking cookies.
            Fonts load from Google Fonts.
          </p>
        </Part>

        <Part title="How long we keep it">
          <p className="m-0">
            While you are a member, and afterwards only as long as accounting and tax law require or you ask us to keep it.
            Then we delete it or remove what identifies you.
          </p>
        </Part>

        <Part title="Your rights">
          <p className="m-0">
            You can ask to see the data we hold about you, correct it, or delete it, and you can withdraw your consent at any time
            (we may still need to keep billing records the law requires). You can also name someone to act for you. Children under 18
            join with a parent or guardian, who gives consent for them.
          </p>
        </Part>

        <Part title="Contact us">
          <p className="m-0">
            For any question or complaint about your data, contact {name}
            {s ? `, ${addressLines(s).join(', ')}` : ''}{contact ? `: ${contact}` : ''}. If you are not satisfied with our answer, you may
            complain to the Data Protection Board of India.
          </p>
        </Part>
      </article>
    </SitePage>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-[20px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}
