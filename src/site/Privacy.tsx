import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { addressLines, prettyPhone, useSite } from '../db/site'
import { SiteLayout } from './layout'

/** Saved with each sign-up, so we know which notice a person agreed to. */
export const PRIVACY_VERSION = '2026-10-24'

// The privacy notice members agree to when they join (India's Digital Personal Data Protection Act, 2023).
// Plain words, matching what the app actually stores and who can see it.
export default function Privacy() {
  const { i18n } = useTranslation()
  const { data } = useSite()
  const s = data?.studio
  const name = s?.name ?? 'Shaan Fitness'
  const contact = [s?.email, s?.mobile ? prettyPhone(s.mobile) : null].filter(Boolean).join(' · ')
  useEffect(() => { document.title = `Privacy notice | ${name}` }, [name])
  return (
    <SiteLayout>
      <article className="sf-wrap sf-prose" lang="en">
        <header>
          <p className="sf-small">Last updated 24 October 2026</p>
          <h1 className="sf-h1">Privacy notice</h1>
          {i18n.language === 'te' && <p className="sf-small" lang="te">ఈ నోటీసు ప్రస్తుతం ఇంగ్లీష్‌లో మాత్రమే ఉంది. సందేహాలుంటే ఫ్రంట్ డెస్క్‌ను అడగండి.</p>}
          <p>
            {name} (“we”) runs this website, the member and coach app, and the system our staff use. This notice explains what
            personal data we keep about you, why, who can see it, and the choices you have.
          </p>
        </header>

        <Part title="What we keep">
          <ul>
            <li>Who you are: name, mobile number, email, gender, date of birth, address and an emergency contact, if you give them.</li>
            <li>Your membership: plans, payments, invoices, receipts, freezes, bookings and check-ins.</li>
            <li>Your training: body measurements, progress photos, workout and diet plans, and notes from your coach.</li>
            <li>Health details you choose to share, such as injuries or medical conditions, so we can train you safely.</li>
            <li>Messages between you and our team in the app.</li>
            <li>If you ask for a free trial on this website: your name, mobile number, what you are interested in and anything you write, so we can call you.</li>
          </ul>
        </Part>

        <Part title="Why we keep it">
          <p>
            To run your membership: billing and receipts, batch and class bookings, attendance, renewal reminders and follow-up calls,
            and coaching that fits your goals and health. We use your details only for these purposes and never sell them.
          </p>
        </Part>

        <Part title="Who can see it">
          <ul>
            <li>Our staff see only what their job needs. Each login (front desk, coach, doctor, owner) has its own access, which the owner controls.</li>
            <li>Health details are seen only by your own care team: your coach and, where your plan includes one, your doctor.</li>
            <li>Services that run the system for us: secure cloud hosting for the database and website and, when we turn them on, the services that send SMS, WhatsApp, email and online payments. They handle your data only to provide that service.</li>
            <li>Before-and-after photos or stories appear on this website only if you agree, and you can ask us to remove them at any time.</li>
          </ul>
        </Part>

        <Part title="On your device">
          <p>
            The website and app remember your login and your chosen language on your device. We use no advertising or tracking cookies.
            The app loads some fonts from Google Fonts, and the map on the contact page loads from Google Maps only when you choose to show it.
          </p>
        </Part>

        <Part title="How long we keep it">
          <p>
            While you are a member, and afterwards only as long as accounting and tax law require or you ask us to keep it.
            Then we delete it or remove what identifies you.
          </p>
        </Part>

        <Part title="Your rights">
          <p>
            You can ask to see the data we hold about you, correct it, or delete it, and you can withdraw your consent at any time
            (we may still need to keep billing records the law requires). You can also name someone to act for you. Children under 18
            join with a parent or guardian, who gives consent for them.
          </p>
        </Part>

        <Part title="Contact us">
          <p>
            For any question or complaint about your data, contact {name}
            {s ? `, ${addressLines(s).join(', ')}` : ''}{contact ? `: ${contact}` : ''}. If you are not satisfied with our answer, you may
            complain to the Data Protection Board of India.
          </p>
        </Part>
      </article>
    </SiteLayout>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="sf-h3">{title}</h2>
      {children}
    </section>
  )
}
