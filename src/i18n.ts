import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Member-facing words in each language. Telugu is a first draft:
// have a native speaker check it before launch.
const en = {
  nav: { home: 'Home', book: 'Book', plan: 'Plan', chat: 'Chat', profile: 'Profile', today: 'Today', slots: 'Slots', followUps: 'Follow-ups', members: 'Members', more: 'More', dashboard: 'Dashboard', mySlots: 'My slots', consults: 'Consults' },
  login: { tagline: 'Your trusted health partner', intro: 'Members, coaches and staff use this one app. After you log in, it opens your own space.', mobile: 'Mobile number', send: 'Send code', codeNote: 'We send a one-time code by SMS or WhatsApp. Staff accounts also need their password.', demo: 'Demo · open the app as', demoNote: 'This preview uses sample data. Real logins start once the database is connected.' },
  member: {
    hi: 'Hi {{name}}', thisCycle: 'This cycle', daysLeft_one: '{{count}} day left', daysLeft_other: '{{count}} days left', endsToday: 'Ends today', ended: 'Cycle ended',
    of: 'of {{total}}', summary: '{{plan}} · ends {{date}}', nextSession: 'Next session', today: 'Today', tomorrow: 'Tomorrow', withCoach: '{{plan}} with Coach {{coach}}',
    checkIn: 'Check-in QR', reschedule: 'Reschedule', momentum: 'Keep your momentum', renewText: 'Your cycle ends {{date}}. Renew {{plan}} for the next {{sessions}} sessions.',
    renew: 'Renew now', autopay: 'Turn on autopay so you never miss a cycle', todaysPlan: "Today's plan", fromCoach: 'from Coach {{coach}}',
    workout: 'Lower body strength', workoutMeta: '6 exercises · about 45 minutes', meals: 'Meals', mealsMeta: '4 meals · 1,650 kcal · 2 logged',
    offers: 'Offers', swipe: 'Swipe for more', viewOffer: 'View offer', posterImage: 'Poster image', noSlot: 'No session booked yet',
    chatPreview: 'Great squats on Monday. Keep the same weight today.',
  },
  common: { signOut: 'Sign out', language: 'Language', comingSoon: 'Coming soon' },
}

const te: typeof en = {
  nav: { home: 'హోమ్', book: 'బుక్', plan: 'ప్లాన్', chat: 'చాట్', profile: 'ప్రొఫైల్', today: 'ఈరోజు', slots: 'స్లాట్లు', followUps: 'ఫాలో-అప్‌లు', members: 'సభ్యులు', more: 'మరిన్ని', dashboard: 'డాష్‌బోర్డ్', mySlots: 'నా స్లాట్లు', consults: 'సంప్రదింపులు' },
  login: { tagline: 'మీ నమ్మకమైన ఆరోగ్య భాగస్వామి', intro: 'సభ్యులు, కోచ్‌లు, సిబ్బంది అందరూ ఈ ఒక్క యాప్‌నే వాడతారు. లాగిన్ అయిన తర్వాత మీ స్వంత పేజీ తెరుచుకుంటుంది.', mobile: 'మొబైల్ నంబర్', send: 'కోడ్ పంపండి', codeNote: 'SMS లేదా WhatsApp ద్వారా ఒకసారి వాడే కోడ్ పంపుతాం. సిబ్బందికి పాస్‌వర్డ్ కూడా అవసరం.', demo: 'డెమో · ఇలా తెరవండి', demoNote: 'ఈ ప్రివ్యూలో నమూనా డేటా ఉంది. డేటాబేస్ కనెక్ట్ అయిన తర్వాత అసలు లాగిన్‌లు మొదలవుతాయి.' },
  member: {
    hi: 'నమస్తే {{name}}', thisCycle: 'ఈ సైకిల్', daysLeft_one: 'ఇంకా {{count}} రోజు', daysLeft_other: 'ఇంకా {{count}} రోజులు', endsToday: 'ఈరోజే ముగుస్తుంది', ended: 'సైకిల్ ముగిసింది',
    of: '{{total}} లో', summary: '{{plan}} · {{date}} న ముగుస్తుంది', nextSession: 'తదుపరి సెషన్', today: 'ఈరోజు', tomorrow: 'రేపు', withCoach: 'కోచ్ {{coach}} తో {{plan}}',
    checkIn: 'చెక్-ఇన్ QR', reschedule: 'సమయం మార్చండి', momentum: 'మీ జోరు కొనసాగించండి', renewText: 'మీ సైకిల్ {{date}} న ముగుస్తుంది. తదుపరి {{sessions}} సెషన్ల కోసం {{plan}} రెన్యూ చేయండి.',
    renew: 'ఇప్పుడే రెన్యూ చేయండి', autopay: 'ఆటోపే ఆన్ చేయండి, ఏ సైకిల్ మిస్ అవ్వదు', todaysPlan: 'ఈరోజు ప్లాన్', fromCoach: 'కోచ్ {{coach}} నుండి',
    workout: 'లోయర్ బాడీ స్ట్రెంత్', workoutMeta: '6 వ్యాయామాలు · సుమారు 45 నిమిషాలు', meals: 'భోజనాలు', mealsMeta: '4 భోజనాలు · 1,650 కేలరీలు · 2 నమోదయ్యాయి',
    offers: 'ఆఫర్లు', swipe: 'మరిన్నింటి కోసం స్వైప్ చేయండి', viewOffer: 'ఆఫర్ చూడండి', posterImage: 'పోస్టర్ చిత్రం', noSlot: 'ఇంకా సెషన్ బుక్ చేయలేదు',
    chatPreview: 'సోమవారం స్క్వాట్స్ బాగా చేశారు. ఈరోజు కూడా అదే బరువు వాడండి.',
  },
  common: { signOut: 'సైన్ అవుట్', language: 'భాష', comingSoon: 'త్వరలో' },
}

let saved: string | null = null
try { saved = localStorage.getItem('sf.lang') } catch { saved = null }

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, te: { translation: te } },
  lng: saved === 'te' ? 'te' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'te') {
  i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  try { localStorage.setItem('sf.lang', lang) } catch { /* private mode: keep it for this visit only */ }
}

export default i18n
