import type { Lang } from './content'

// Events and projects Shaan Fitness has run or supported, newest first. Each has its own page under /events/…, an
// Instagram gallery (embedded from the studio's posts), and facts taken from the event's own pages and posts.
// To add an event: add an id to EventId and PATHS (content.ts), then an entry here.

export type EventId = 'dandiya' | 'lungRun' | 'deadlift' | 'summerFiesta'

interface EventCopy {
  name: string
  /** Shaan Fitness's part in it. */
  role: string
  when: string
  where: string
  /** One line for the events list. */
  summary: string
  /** Under the page headline. */
  intro: string
  facts: { k: string; v: string }[]
  /** The big number on the card, with its label. */
  stat: { v: string; k: string }
  story: string[]
  /** Results, winners or the route: titled cards. */
  blocks: { title: string; sub?: string; numbered?: boolean; items: { t: string; d: string; img?: string }[] }[]
  links?: { t: string; href: string }[]
  seoTitle: string
  seoDesc: string
}

export interface ShaanEvent {
  id: EventId
  start: string
  end?: string
  image?: string
  /** Instagram posts and reels, as "p/CODE" or "reel/CODE". */
  gallery: string[]
  place: { name: string; address: string }
  copy: Record<Lang, EventCopy>
}

export const EVENTS: ShaanEvent[] = [
  {
    id: 'dandiya',
    start: '2026-10-18T18:00:00+05:30',
    image: '/events/dandiya-nights.webp',
    gallery: ['reel/DemMFadzQxP', 'p/DelrNlvM_rx', 'p/Deq0_7uT256', 'p/De1AMuQToVX', 'p/De1AfLwTrb9', 'p/De1AsLDzLr8'],
    place: { name: 'Halcyon Times Club', address: 'Nagamallithota Junction, Kakinada, Andhra Pradesh' },
    copy: {
      en: {
        name: 'AuraPeak Dandiya Nights 2K26',
        role: 'Supporting partner · Lucky draw',
        when: 'Sunday, 18 October 2026',
        where: 'Halcyon Times Club, Nagamallithota Junction, Kakinada',
        summary: 'A night of dandiya, and a free lucky draw for attendees with ₹53,000 of fitness prizes, drawn live on stage.',
        intro: 'Shaan Fitness was a supporting partner of AuraPeak Dandiya Nights 2K26, with a free lucky draw for everyone at the event: two fitness prizes worth ₹53,000, drawn live on stage.',
        facts: [
          { k: 'Date', v: 'Sun, 18 Oct 2026' },
          { k: 'Venue', v: 'Halcyon Times Club, Kakinada' },
          { k: 'Our part', v: 'Supporting partner' },
          { k: 'Prizes', v: '₹53,000 in fitness prizes' },
        ],
        stat: { v: '₹53,000', k: 'in fitness prizes' },
        story: [
          'Kakinada came out for a night of dandiya, music and celebration at the Halcyon Times Club. Shaan Fitness joined AuraPeak as a supporting partner and brought a lucky draw that was free for every attendee, for couples and singles.',
          'Entrants applied on their phones and received a Lucky Draw ID. The winners were drawn live on stage, and everyone could follow the draw on their phone as it happened.',
        ],
        blocks: [
          {
            title: 'The prizes',
            items: [
              { t: '₹29,000 Couple Edition', d: 'One month of Elite Personal Coaching for the couple, plus six months of gym membership each.', img: '/events/dandiya-couple.webp' },
              { t: '₹24,000 Duo Edition', d: 'One month of Elite Personal Coaching for two, plus three months of gym membership each.', img: '/events/dandiya-duo.webp' },
            ],
          },
          {
            title: 'The winners',
            sub: 'Drawn live on stage on 18 October 2026.',
            items: [
              { t: 'Rekha & Manikanta', d: '₹29,000 Couple Edition · Entry ID DN26-C003' },
              { t: 'Kishan Ganchi', d: '₹24,000 Duo Edition · Entry ID DN26-S002' },
              { t: 'Kalpana', d: '₹24,000 Duo Edition · Entry ID DN26-S037' },
            ],
          },
        ],
        links: [{ t: 'Open the lucky draw page', href: '/luckydraw/' }],
        seoTitle: 'Dandiya Nights 2K26 Lucky Draw | Shaan Fitness Kakinada',
        seoDesc: 'Shaan Fitness was a supporting partner of AuraPeak Dandiya Nights 2K26 in Kakinada, with a free lucky draw of ₹53,000 in fitness prizes. See the winners.',
      },
      te: {
        name: 'AuraPeak దాండియా నైట్స్ 2K26',
        role: 'సపోర్టింగ్ పార్ట్‌నర్ · లక్కీ డ్రా',
        when: 'ఆదివారం, 18 అక్టోబర్ 2026',
        where: 'హాల్సియన్ టైమ్స్ క్లబ్, నాగమల్లితోట జంక్షన్, కాకినాడ',
        summary: 'దాండియా రాత్రి, హాజరైన వారికి ఉచిత లక్కీ డ్రా: ₹53,000 విలువైన ఫిట్‌నెస్ బహుమతులు, స్టేజ్‌పై లైవ్‌గా.',
        intro: 'AuraPeak దాండియా నైట్స్ 2K26కు షాన్ ఫిట్‌నెస్ సపోర్టింగ్ పార్ట్‌నర్. హాజరైన అందరికీ ఉచిత లక్కీ డ్రా: ₹53,000 విలువైన రెండు ఫిట్‌నెస్ బహుమతులు, స్టేజ్‌పై లైవ్‌గా డ్రా.',
        facts: [
          { k: 'తేదీ', v: 'ఆది, 18 అక్టో 2026' },
          { k: 'వేదిక', v: 'హాల్సియన్ టైమ్స్ క్లబ్, కాకినాడ' },
          { k: 'మా పాత్ర', v: 'సపోర్టింగ్ పార్ట్‌నర్' },
          { k: 'బహుమతులు', v: '₹53,000 ఫిట్‌నెస్ బహుమతులు' },
        ],
        stat: { v: '₹53,000', k: 'ఫిట్‌నెస్ బహుమతులు' },
        story: [
          'హాల్సియన్ టైమ్స్ క్లబ్‌లో దాండియా, సంగీతం, సంబరాలతో కాకినాడ కలిసింది. AuraPeakతో సపోర్టింగ్ పార్ట్‌నర్‌గా షాన్ ఫిట్‌నెస్ ప్రతి హాజరీకి, జంటలకూ సింగిల్స్‌కూ ఉచిత లక్కీ డ్రా తెచ్చింది.',
          'ఫోన్‌లో అప్లై చేసిన వారికి లక్కీ డ్రా ID వచ్చింది. విజేతలను స్టేజ్‌పై లైవ్‌గా డ్రా చేశారు, అందరూ తమ ఫోన్‌లో డ్రాను చూశారు.',
        ],
        blocks: [
          {
            title: 'బహుమతులు',
            items: [
              { t: '₹29,000 కపుల్ ఎడిషన్', d: 'జంటకు ఒక నెల ఎలీట్ పర్సనల్ కోచింగ్, ఒక్కొక్కరికి ఆరు నెలల జిమ్ మెంబర్‌షిప్.', img: '/events/dandiya-couple.webp' },
              { t: '₹24,000 డ్యుయో ఎడిషన్', d: 'ఇద్దరికి ఒక నెల ఎలీట్ పర్సనల్ కోచింగ్, ఒక్కొక్కరికి మూడు నెలల జిమ్ మెంబర్‌షిప్.', img: '/events/dandiya-duo.webp' },
            ],
          },
          {
            title: 'విజేతలు',
            sub: '18 అక్టోబర్ 2026న స్టేజ్‌పై లైవ్‌గా డ్రా.',
            items: [
              { t: 'రేఖ & మణికంఠ', d: '₹29,000 కపుల్ ఎడిషన్ · ఎంట్రీ ID DN26-C003' },
              { t: 'కిషన్ గంచి', d: '₹24,000 డ్యుయో ఎడిషన్ · ఎంట్రీ ID DN26-S002' },
              { t: 'కల్పన', d: '₹24,000 డ్యుయో ఎడిషన్ · ఎంట్రీ ID DN26-S037' },
            ],
          },
        ],
        links: [{ t: 'లక్కీ డ్రా పేజీ తెరవండి', href: '/luckydraw/' }],
        seoTitle: 'దాండియా నైట్స్ 2K26 లక్కీ డ్రా | షాన్ ఫిట్‌నెస్',
        seoDesc: 'AuraPeak దాండియా నైట్స్ 2K26కు షాన్ ఫిట్‌నెస్ సపోర్టింగ్ పార్ట్‌నర్, ₹53,000 ఫిట్‌నెస్ బహుమతుల ఉచిత లక్కీ డ్రా.',
      },
    },
  },
  {
    id: 'lungRun',
    start: '2026-08-01T06:00:00+05:30',
    image: '/events/lung-run.webp',
    gallery: ['p/DbUV6FEE0sv', 'p/DbaEvuQTHPD', 'reel/DbYKjGmz8Ph', 'reel/DbdhnU_TEZn', 'reel/DbfC1BqTHEu', 'reel/Db77mQyT5Ij'],
    place: { name: 'Shaan Fitness', address: 'PNR Enclave, RTO Office Road, Godari Gunta, Kakinada, Andhra Pradesh 533003' },
    copy: {
      en: {
        name: 'Community Lung Run 2026',
        role: 'Organised by Shaan Fitness · World Lung Cancer Day',
        when: 'Saturday, 1 August 2026',
        where: 'Starts and finishes at Shaan Fitness, Kakinada',
        summary: 'A 3 km walk, jog and run for lung health awareness. Every ₹99 registration went to two Kakinada children living with SMA.',
        intro: 'Every breath matters. Every step gives hope. A 3 km community walk, jog and run on World Lung Cancer Day, for lung health awareness and for Moses Royal and Beenal, two Kakinada children living with Spinal Muscular Atrophy.',
        facts: [
          { k: 'Date', v: 'Sat, 1 Aug 2026' },
          { k: 'Reporting · Flag-off', v: '6:00 AM · 6:30 AM' },
          { k: 'Route', v: '3 km, out and back' },
          { k: 'Registration', v: '₹99, 100% donated' },
        ],
        stat: { v: '₹16,252', k: 'raised and donated in full' },
        story: [
          'This was not a race. No winners, no podium, no timing: a community walking, jogging and running together, to spread awareness about lung health and to extend hope to children living with Spinal Muscular Atrophy (SMA).',
          'SMA is a rare genetic condition that affects the nerves controlling muscle movement, including the muscles that support breathing. Moses Royal and Beenal, two children from Kakinada, need ongoing therapy and support, and every rupee of the registration fee went directly to their families.',
          'Rain tested us on the morning, and Kakinada showed up anyway. Thank you to Inspector Prakash Garu and the Sarpavaram Police Station for granting permission for the run.',
        ],
        blocks: [
          {
            title: 'Who we ran for',
            items: [
              { t: 'Moses Royal', d: 'Living with SMA. ₹8,126 donated through his Milaap fundraiser.', img: '/events/lung-run-moses.webp' },
              { t: 'Beenal', d: 'Living with SMA. ₹8,126 donated through her Milaap fundraiser.', img: '/events/lung-run-beenal.webp' },
            ],
          },
          {
            title: 'Where every rupee went',
            sub: 'Nothing was kept by Shaan Fitness.',
            items: [
              { t: '₹16,252 collected', d: 'From ₹99 registrations, donated in full.' },
              { t: '₹8,126 to Moses Royal', d: 'Transferred to his Milaap fundraiser.' },
              { t: '₹8,126 to Beenal', d: 'Transferred to her Milaap fundraiser.' },
            ],
          },
          {
            title: 'The route', numbered: true,
            sub: '3 km, out and back, no cut-off times.',
            items: [
              { t: 'Start', d: 'Shaan Fitness' },
              { t: 'Via', d: 'RTO Office Junction' },
              { t: 'Turnaround', d: 'Alluri Sita Rama Raju Statue' },
              { t: 'Finish', d: 'Back at Shaan Fitness' },
            ],
          },
        ],
        links: [
          { t: 'Donation proof: Moses Royal', href: 'https://drive.google.com/file/d/1B88BOiXQCBs0R-fG-Zln5a8fdjGRhK6n/view' },
          { t: 'Donation proof: Beenal', href: 'https://drive.google.com/file/d/1P9PXU8v-P291iEps9znmhC80mmIleFqv/view' },
        ],
        seoTitle: 'Community Lung Run 2026, Kakinada | Shaan Fitness',
        seoDesc: 'Shaan Fitness’s 3 km Community Lung Run on World Lung Cancer Day 2026 raised ₹16,252 for two Kakinada children living with SMA, donated in full.',
      },
      te: {
        name: 'కమ్యూనిటీ లంగ్ రన్ 2026',
        role: 'షాన్ ఫిట్‌నెస్ నిర్వహణ · వరల్డ్ లంగ్ క్యాన్సర్ డే',
        when: 'శనివారం, 1 ఆగస్టు 2026',
        where: 'షాన్ ఫిట్‌నెస్, కాకినాడ నుంచి మొదలై అక్కడే ముగింపు',
        summary: 'ఊపిరితిత్తుల ఆరోగ్యంపై అవగాహనకు 3 కి.మీ. నడక, జాగ్, రన్. ప్రతి ₹99 రిజిస్ట్రేషన్ SMAతో జీవిస్తున్న ఇద్దరు కాకినాడ పిల్లలకు.',
        intro: 'ప్రతి శ్వాస విలువైనది. ప్రతి అడుగు ఆశనిస్తుంది. వరల్డ్ లంగ్ క్యాన్సర్ డే నాడు 3 కి.మీ. కమ్యూనిటీ నడక, జాగ్, రన్: ఊపిరితిత్తుల ఆరోగ్యంపై అవగాహనకు, SMAతో జీవిస్తున్న మోసెస్ రాయల్, బీనల్ కోసం.',
        facts: [
          { k: 'తేదీ', v: 'శని, 1 ఆగ 2026' },
          { k: 'రిపోర్టింగ్ · ఫ్లాగ్-ఆఫ్', v: 'ఉ. 6:00 · ఉ. 6:30' },
          { k: 'రూట్', v: '3 కి.మీ., వెళ్ళి రావడం' },
          { k: 'రిజిస్ట్రేషన్', v: '₹99, 100% విరాళం' },
        ],
        stat: { v: '₹16,252', k: 'సేకరించి పూర్తిగా విరాళం' },
        story: [
          'ఇది రేస్ కాదు. విజేతలు లేరు, పోడియం లేదు, టైమింగ్ లేదు: ఊపిరితిత్తుల ఆరోగ్యంపై అవగాహన కోసం, స్పైనల్ మస్క్యులర్ అట్రోఫీ (SMA)తో జీవిస్తున్న పిల్లలకు ఆశ కోసం కలిసి నడిచిన, పరిగెత్తిన కమ్యూనిటీ.',
          'SMA కండరాల కదలికను నియంత్రించే నరాలను, శ్వాసకు సహాయపడే కండరాలను కూడా ప్రభావితం చేసే అరుదైన జన్యు వ్యాధి. కాకినాడకు చెందిన మోసెస్ రాయల్, బీనల్‌కు నిరంతర థెరపీ అవసరం; రిజిస్ట్రేషన్ ఫీజులో ప్రతి రూపాయి నేరుగా వారి కుటుంబాలకు వెళ్ళింది.',
          'ఆ ఉదయం వర్షం పరీక్షించినా కాకినాడ వచ్చింది. రన్‌కు అనుమతి ఇచ్చిన ఇన్‌స్పెక్టర్ ప్రకాష్ గారికి, సర్పవరం పోలీస్ స్టేషన్‌కు ధన్యవాదాలు.',
        ],
        blocks: [
          {
            title: 'ఎవరి కోసం పరిగెత్తాం',
            items: [
              { t: 'మోసెస్ రాయల్', d: 'SMAతో జీవిస్తున్నాడు. అతని Milaap ఫండ్‌రైజర్ ద్వారా ₹8,126 విరాళం.', img: '/events/lung-run-moses.webp' },
              { t: 'బీనల్', d: 'SMAతో జీవిస్తోంది. ఆమె Milaap ఫండ్‌రైజర్ ద్వారా ₹8,126 విరాళం.', img: '/events/lung-run-beenal.webp' },
            ],
          },
          {
            title: 'ప్రతి రూపాయి ఎక్కడికి వెళ్ళింది',
            sub: 'షాన్ ఫిట్‌నెస్ ఏమీ ఉంచుకోలేదు.',
            items: [
              { t: '₹16,252 సేకరణ', d: '₹99 రిజిస్ట్రేషన్ల నుంచి, పూర్తిగా విరాళం.' },
              { t: 'మోసెస్ రాయల్‌కు ₹8,126', d: 'అతని Milaap ఫండ్‌రైజర్‌కు బదిలీ.' },
              { t: 'బీనల్‌కు ₹8,126', d: 'ఆమె Milaap ఫండ్‌రైజర్‌కు బదిలీ.' },
            ],
          },
          {
            title: 'రూట్', numbered: true,
            sub: '3 కి.మీ., వెళ్ళి రావడం, కట్-ఆఫ్ సమయం లేదు.',
            items: [
              { t: 'మొదలు', d: 'షాన్ ఫిట్‌నెస్' },
              { t: 'మీదుగా', d: 'RTO ఆఫీస్ జంక్షన్' },
              { t: 'వెనక్కి', d: 'అల్లూరి సీతారామరాజు విగ్రహం' },
              { t: 'ముగింపు', d: 'తిరిగి షాన్ ఫిట్‌నెస్' },
            ],
          },
        ],
        links: [
          { t: 'విరాళం రుజువు: మోసెస్ రాయల్', href: 'https://drive.google.com/file/d/1B88BOiXQCBs0R-fG-Zln5a8fdjGRhK6n/view' },
          { t: 'విరాళం రుజువు: బీనల్', href: 'https://drive.google.com/file/d/1P9PXU8v-P291iEps9znmhC80mmIleFqv/view' },
        ],
        seoTitle: 'కమ్యూనిటీ లంగ్ రన్ 2026, కాకినాడ | షాన్ ఫిట్‌నెస్',
        seoDesc: 'వరల్డ్ లంగ్ క్యాన్సర్ డే 2026న షాన్ ఫిట్‌నెస్ 3 కి.మీ. లంగ్ రన్: SMAతో జీవిస్తున్న ఇద్దరు పిల్లలకు ₹16,252 పూర్తిగా విరాళం.',
      },
    },
  },
  {
    id: 'deadlift',
    start: '2023-12-17T17:00:00+05:30',
    gallery: ['p/C0lXxeRPvhu', 'p/C0rexrDPIGF', 'p/C08CySSPws_', 'p/C1EiDrkvcNc', 'p/C1EhBu6vmP9', 'p/C1Eg1F3PtVo', 'p/C1EhQoEPjh2', 'p/C1EjDIrv5Ab'],
    place: { name: 'Shaan Fitness', address: 'PNR Enclave, RTO Office Road, Godari Gunta, Kakinada, Andhra Pradesh 533003' },
    copy: {
      en: {
        name: 'Deadlift December Challenge 2023',
        role: 'Organised by Shaan Fitness',
        when: 'Sunday, 17 December 2023',
        where: 'Shaan Fitness, Kakinada',
        summary: 'Members lifted in their body-weight categories, and the winner was the strongest for their size: the strongman percentage.',
        intro: 'A strength challenge for our members, judged by the strongman percentage: the weight lifted as a share of your own body weight, so the strongest for their size wins.',
        facts: [
          { k: 'Date', v: 'Sun, 17 Dec 2023' },
          { k: 'Start', v: '5:00 PM' },
          { k: 'Format', v: 'Body-weight categories' },
          { k: 'Judged by', v: 'Strongman percentage' },
        ],
        stat: { v: '250%', k: 'winning strongman percentage' },
        story: [
          'Members competed in their body-weight category. The winner of each was decided by the strongman percentage: weight lifted divided by body weight.',
          'Winners received a whey protein pack and a medal, and every participant received a certificate of participation. Thank you to our judges, Raghu sir, Surya sir and Altaf sir, for their time, expertise and fair judging.',
        ],
        blocks: [
          {
            title: 'The winners',
            items: [
              { t: '1st · Pandu Ranga', d: '170 kg at 68 kg body weight: 250%' },
              { t: '2nd · Anil Varma', d: '130 kg at 62 kg body weight: 209%' },
              { t: '3rd · Govind Menon', d: '160 kg at 77 kg body weight: 207%' },
            ],
          },
        ],
        seoTitle: 'Deadlift December Challenge 2023 | Shaan Fitness Kakinada',
        seoDesc: 'Shaan Fitness’s Deadlift December Challenge 2023 in Kakinada, judged by strongman percentage. Winner Pandu Ranga lifted 170 kg at 68 kg body weight.',
      },
      te: {
        name: 'డెడ్‌లిఫ్ట్ డిసెంబర్ ఛాలెంజ్ 2023',
        role: 'షాన్ ఫిట్‌నెస్ నిర్వహణ',
        when: 'ఆదివారం, 17 డిసెంబర్ 2023',
        where: 'షాన్ ఫిట్‌నెస్, కాకినాడ',
        summary: 'సభ్యులు తమ బరువు విభాగాల్లో లిఫ్ట్ చేశారు; తమ బరువుకు తగ్గ బలం ఎక్కువ ఉన్నవారు గెలిచారు: స్ట్రాంగ్‌మ్యాన్ శాతం.',
        intro: 'మా సభ్యుల కోసం బల పోటీ, స్ట్రాంగ్‌మ్యాన్ శాతంతో తీర్పు: మీ శరీర బరువుకు ఎంత రెట్లు ఎత్తారో, కాబట్టి తమ బరువుకు తగ్గ బలం ఎక్కువ ఉన్నవారు గెలుస్తారు.',
        facts: [
          { k: 'తేదీ', v: 'ఆది, 17 డిసె 2023' },
          { k: 'మొదలు', v: 'సా. 5:00' },
          { k: 'పద్ధతి', v: 'శరీర బరువు విభాగాలు' },
          { k: 'తీర్పు', v: 'స్ట్రాంగ్‌మ్యాన్ శాతం' },
        ],
        stat: { v: '250%', k: 'గెలిచిన స్ట్రాంగ్‌మ్యాన్ శాతం' },
        story: [
          'సభ్యులు తమ శరీర బరువు విభాగంలో పోటీ పడ్డారు. ప్రతి విభాగంలో విజేతను స్ట్రాంగ్‌మ్యాన్ శాతంతో నిర్ణయించారు: ఎత్తిన బరువు ÷ శరీర బరువు.',
          'విజేతలకు వే ప్రోటీన్ ప్యాక్, మెడల్; ప్రతి పాల్గొన్నవారికి సర్టిఫికెట్. న్యాయనిర్ణేతలు రఘు సర్, సూర్య సర్, అల్తాఫ్ సర్‌కు ధన్యవాదాలు.',
        ],
        blocks: [
          {
            title: 'విజేతలు',
            items: [
              { t: '1వ · పాండు రంగ', d: '68 కి. బరువుతో 170 కి.: 250%' },
              { t: '2వ · అనిల్ వర్మ', d: '62 కి. బరువుతో 130 కి.: 209%' },
              { t: '3వ · గోవింద్ మీనన్', d: '77 కి. బరువుతో 160 కి.: 207%' },
            ],
          },
        ],
        seoTitle: 'డెడ్‌లిఫ్ట్ డిసెంబర్ ఛాలెంజ్ 2023 | షాన్ ఫిట్‌నెస్',
        seoDesc: 'కాకినాడ షాన్ ఫిట్‌నెస్ డెడ్‌లిఫ్ట్ డిసెంబర్ ఛాలెంజ్ 2023, స్ట్రాంగ్‌మ్యాన్ శాతంతో తీర్పు.',
      },
    },
  },
  {
    id: 'summerFiesta',
    start: '2023-05-20T16:00:00+05:30',
    end: '2023-05-22T19:30:00+05:30',
    gallery: ['p/CsSykq5vWV-', 'p/CsoSwTFyqn8'],
    place: { name: '82° East SRMT Mall', address: 'Kakinada, Andhra Pradesh' },
    copy: {
      en: {
        name: 'Kids Fitness Workshop at Summer Fiesta 2023',
        role: 'Run by Shaan Fitness coaches',
        when: '20 to 22 May 2023',
        where: '82° East SRMT Mall, Kakinada',
        summary: 'Three days of fitness for kids aged 4 to 12 at the mall’s Summer Fiesta, with Zumba, yoga, games and challenges.',
        intro: 'A three-day fitness workshop for children at 82° East SRMT Mall’s Summer Fiesta, led by Shaan Fitness coaches: Zumba, yoga, games and challenges to keep kids active and having fun.',
        facts: [
          { k: 'Dates', v: '20 to 22 May 2023' },
          { k: 'Ages 4 to 8', v: '4:00 to 5:30 PM' },
          { k: 'Ages 9 to 12', v: '6:00 to 7:30 PM' },
          { k: 'Venue', v: '82° East SRMT Mall' },
        ],
        stat: { v: '3 days', k: 'of kids’ fitness' },
        story: [
          'Our coaches ran fitness activities made for kids, taught new exercises and techniques to stay active, and kept it fun with games and challenges in a friendly, encouraging setting.',
          'The workshop included Zumba and yoga sessions that were both fun and challenging, and the children learned new moves and got fit together.',
        ],
        blocks: [],
        seoTitle: 'Kids Fitness Workshop, Summer Fiesta 2023 | Shaan Fitness',
        seoDesc: 'Shaan Fitness ran a three-day kids fitness workshop with Zumba and yoga at 82° East SRMT Mall’s Summer Fiesta 2023 in Kakinada.',
      },
      te: {
        name: 'సమ్మర్ ఫియెస్టా 2023లో పిల్లల ఫిట్‌నెస్ వర్క్‌షాప్',
        role: 'షాన్ ఫిట్‌నెస్ కోచ్‌లు నిర్వహించారు',
        when: '20 నుంచి 22 మే 2023',
        where: '82° East SRMT మాల్, కాకినాడ',
        summary: 'మాల్ సమ్మర్ ఫియెస్టాలో 4 నుంచి 12 ఏళ్ళ పిల్లలకు మూడు రోజుల ఫిట్‌నెస్: జుంబా, యోగా, ఆటలు, ఛాలెంజ్‌లు.',
        intro: '82° East SRMT మాల్ సమ్మర్ ఫియెస్టాలో పిల్లలకు మూడు రోజుల ఫిట్‌నెస్ వర్క్‌షాప్, షాన్ ఫిట్‌నెస్ కోచ్‌ల ఆధ్వర్యంలో: జుంబా, యోగా, ఆటలు, ఛాలెంజ్‌లు.',
        facts: [
          { k: 'తేదీలు', v: '20 నుంచి 22 మే 2023' },
          { k: '4 నుంచి 8 ఏళ్ళు', v: 'సా. 4:00 నుంచి 5:30' },
          { k: '9 నుంచి 12 ఏళ్ళు', v: 'సా. 6:00 నుంచి 7:30' },
          { k: 'వేదిక', v: '82° East SRMT మాల్' },
        ],
        stat: { v: '3 రోజులు', k: 'పిల్లల ఫిట్‌నెస్' },
        story: [
          'మా కోచ్‌లు పిల్లల కోసం ప్రత్యేక ఫిట్‌నెస్ యాక్టివిటీలు, కొత్త వ్యాయామాలు నేర్పారు, ఆటలు, ఛాలెంజ్‌లతో సరదాగా ఉంచారు.',
          'వర్క్‌షాప్‌లో సరదాగా, సవాలుగా ఉండే జుంబా, యోగా సెషన్లు; పిల్లలు కొత్త కదలికలు నేర్చుకుని కలిసి ఫిట్ అయ్యారు.',
        ],
        blocks: [],
        seoTitle: 'పిల్లల ఫిట్‌నెస్ వర్క్‌షాప్, సమ్మర్ ఫియెస్టా 2023 | షాన్ ఫిట్‌నెస్',
        seoDesc: 'కాకినాడ 82° East SRMT మాల్ సమ్మర్ ఫియెస్టా 2023లో షాన్ ఫిట్‌నెస్ మూడు రోజుల పిల్లల ఫిట్‌నెస్ వర్క్‌షాప్.',
      },
    },
  },
]

export const eventById = (id: EventId) => EVENTS.find((e) => e.id === id)!
export const isEventId = (id: string): id is EventId => EVENTS.some((e) => e.id === id)
