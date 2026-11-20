import type { Lang } from './content'

// Pages that explain before they sell: what semi-private training is, what the assessment checks, and one page per
// goal (strength, training after 40, athletes). Each answers one search, in English and Telugu. Prices never appear
// here; the subscriptions block near the end of a page reads them from the CRM.

export type GuideId = 'semi' | 'assessment' | 'strength' | 'seniors' | 'athletes'

type Item = { t: string; d: string }
type Tone = { tone?: 'deep' | 'ink' }
export type GuideBlock =
  | ({ kind: 'cards'; title: string; sub?: string; items: Item[]; cols?: 2 | 3 } & Tone)
  | ({ kind: 'steps'; title: string; sub?: string; items: Item[] } & Tone)
  | ({ kind: 'checks'; title: string; sub?: string; items: string[] } & Tone)
  /** A fair comparison: one row per question, one column per kind of gym; the last column is Shaan. */
  | ({ kind: 'compare'; title: string; sub?: string; cols: string[]; rows: { t: string; v: string[] }[] } & Tone)
  /** Short text with a heading. {{sessions}} is the number of sessions in a plan cycle; `alt` is used when it is unknown. */
  | ({ kind: 'story'; title: string; text: string; alt?: string } & Tone)
  /** The ways to train, drawn as figures (one coach and how many people), from the subscriptions in the CRM. */
  | ({ kind: 'ways'; title: string; sub?: string } & Tone)
  | { kind: 'method' | 'athletic' | 'bmi' | 'join' | 'coaches' | 'app' }
  | { kind: 'subs'; title?: string }
  /** A link to another page of the site, with a line of text. */
  | ({ kind: 'link'; title: string; text: string; to: 'assessment' | 'semi' | 'deadlift' | 'events' | 'personal' | 'weightLoss'; label: string } & Tone)

export interface GuideCopy { nav: string; desc: string; h1: string; intro: string; blocks: GuideBlock[]; faq: { q: string; a: string }[] }
export interface Guide {
  id: GuideId; path: string
  /** Search result title (under 60 characters) and description (under 160). */
  seo: { title: string; description: string }
  /** For the Service data sent to Google; none for the assessment page. */
  service?: string
  copy: Record<Lang, GuideCopy>
}

export const GUIDES: Guide[] = [
  {
    id: 'semi',
    path: '/semi-private-training-kakinada',
    seo: {
      title: 'Semi-Private Training in Kakinada | Shaan Fitness',
      description: 'What semi-private training is: your own plan, a coach watching every set, and only a few people. In a small group, side by side or one-on-one, Kakinada.',
    },
    service: 'Semi-private personal training',
    copy: {
      en: {
        nav: 'Semi-private training',
        desc: 'Your own plan, with only a few people sharing the coach.',
        h1: 'Semi-private training in Kakinada',
        intro: 'Personal coaching in small numbers: the model many of the world’s leading studios coach by. You follow a plan written for you, a coach watches every set, and you train with a few people instead of a crowd.',
        blocks: [
          { kind: 'ways', title: 'One coach, a few people', sub: 'The coach is the same every time. You choose how many people share the coach.' },
          {
            kind: 'compare', tone: 'deep', title: 'How it compares', sub: 'What changes when the coach has only a few people to watch.',
            cols: ['A regular gym', 'Big group classes', 'Shaan Fitness'],
            rows: [
              { t: 'A coach watches your sets', v: ['Not usually', 'Not every set', 'Every set'] },
              { t: 'A plan written for you', v: ['Rarely', 'Rarely', 'yes'] },
              { t: 'Progress checked every week', v: ['Rarely', 'Rarely', 'yes'] },
              { t: 'Diet plan and the Shaan app', v: ['Rarely', 'Rarely', 'yes'] },
              { t: 'Who shares the coach', v: ['Everyone on the floor', 'The whole class', 'A few people, or only you'] },
            ],
          },
          {
            kind: 'steps', title: 'What a session looks like',
            items: [
              { t: 'Warm-up and mobility', d: 'Breathing, joint work and stretching for the day’s training.' },
              { t: 'Your strength work', d: 'Your own lifts and weights from your plan. The coach checks every set and corrects your form.' },
              { t: 'Conditioning or power', d: 'Intervals, circuits, jumps or throws, depending on the day and your goal.' },
              { t: 'Logged in the app', d: 'Sets, weights and how it felt, so the next session starts where this one ended.' },
            ],
          },
          {
            kind: 'story', tone: 'ink', title: 'Training in 4-week blocks',
            text: 'Every subscription is a 4-week block of {{sessions}} coached sessions. Each block builds on the last: at the end, your coach reviews your numbers and writes the next one.',
            alt: 'Every subscription is a 4-week block of coached sessions. Each block builds on the last: at the end, your coach reviews your numbers and writes the next one.',
          },
          {
            kind: 'cards', title: 'Who it suits', cols: 2,
            items: [
              { t: 'Beginners', d: 'You learn every lift properly from the first day, with a coach beside you.' },
              { t: 'People coming back', d: 'After a break, a baby or an injury, you restart at the right level.' },
              { t: 'Couples and friends', d: 'Train side by side, each on your own plan, with one coach watching both of you.' },
              { t: 'Busy professionals', d: 'Every minute of the hour is planned, so you don’t waste a session.' },
            ],
          },
          { kind: 'story', tone: 'deep', title: 'Who it isn’t for', text: 'If you want to train alone with headphones and nobody correcting you, a regular gym will suit you better. At Shaan, a coach is always watching.' },
          { kind: 'subs', title: 'Choose how you train' },
          { kind: 'link', title: 'It starts with an assessment', text: 'Before you choose, a coach checks how you move, how strong you are and what you want.', to: 'assessment', label: 'What happens at the assessment' },
        ],
        faq: [
          { q: 'What is semi-private training?', a: 'Personal training shared by a few people. Each of you follows your own written plan, and one coach watches and corrects every set.' },
          { q: 'How many people train with one coach?', a: 'It depends on how you choose to train: a small group, two people side by side, or only you.' },
          { q: 'Do I get my own plan in a group?', a: 'Yes. Your plan is written for your body and your goal, even when you train with others.' },
          { q: 'Can I train with my husband, wife or a friend?', a: 'Yes. Side-by-side training is for two people, each on their own plan, with the same coach.' },
          { q: 'Is it cheaper than one-on-one personal training?', a: 'Yes. A small group and side-by-side cost less than one-on-one, because the coach is shared. You still get a written plan and a coach watching every set.' },
        ],
      },
      te: {
        nav: 'సెమీ-ప్రైవేట్ ట్రైనింగ్',
        desc: 'మీ సొంత ప్లాన్, కోచ్‌ను పంచుకునేది కొద్ది మంది మాత్రమే.',
        h1: 'కాకినాడలో సెమీ-ప్రైవేట్ ట్రైనింగ్',
        intro: 'తక్కువ మందితో పర్సనల్ కోచింగ్: ప్రపంచంలోని ఎన్నో అగ్రశ్రేణి స్టూడియోలు పాటించే పద్ధతి. మీ కోసం రాసిన ప్లాన్‌ను మీరు ఫాలో అవుతారు, ప్రతి సెట్‌ను కోచ్ చూస్తారు, గుంపుతో కాకుండా కొద్ది మందితో ట్రైన్ అవుతారు.',
        blocks: [
          { kind: 'ways', title: 'ఒక కోచ్, కొద్ది మంది', sub: 'కోచ్ ఎప్పుడూ అదే. కోచ్‌ను ఎంత మంది పంచుకోవాలో మీరే ఎంచుకుంటారు.' },
          {
            kind: 'compare', tone: 'deep', title: 'తేడా ఏమిటి', sub: 'కోచ్ చూడాల్సింది కొద్ది మందిని మాత్రమే అయినప్పుడు ఏం మారుతుంది.',
            cols: ['సాధారణ జిమ్', 'పెద్ద గ్రూప్ క్లాసులు', 'షాన్ ఫిట్‌నెస్'],
            rows: [
              { t: 'కోచ్ మీ సెట్లు చూస్తారు', v: ['సాధారణంగా కాదు', 'ప్రతి సెట్ కాదు', 'ప్రతి సెట్'] },
              { t: 'మీ కోసం రాసిన ప్లాన్', v: ['అరుదుగా', 'అరుదుగా', 'yes'] },
              { t: 'ప్రతి వారం ప్రగతి చెక్', v: ['అరుదుగా', 'అరుదుగా', 'yes'] },
              { t: 'డైట్ ప్లాన్, షాన్ యాప్', v: ['అరుదుగా', 'అరుదుగా', 'yes'] },
              { t: 'కోచ్‌ను ఎవరు పంచుకుంటారు', v: ['ఫ్లోర్‌పై అందరూ', 'క్లాస్ మొత్తం', 'కొద్ది మంది, లేదా మీరు మాత్రమే'] },
            ],
          },
          {
            kind: 'steps', title: 'ఒక సెషన్ ఎలా ఉంటుంది',
            items: [
              { t: 'వార్మ్-అప్, మొబిలిటీ', d: 'ఆ రోజు ట్రైనింగ్‌కు శ్వాస, జాయింట్ వర్క్, స్ట్రెచింగ్.' },
              { t: 'మీ స్ట్రెంత్ వర్క్', d: 'మీ ప్లాన్‌లోని మీ లిఫ్ట్‌లు, మీ బరువులు. కోచ్ ప్రతి సెట్ చూసి మీ ఫామ్ సరిచేస్తారు.' },
              { t: 'కండిషనింగ్ లేదా పవర్', d: 'రోజును, మీ లక్ష్యాన్ని బట్టి ఇంటర్వల్స్, సర్క్యూట్లు, జంప్స్ లేదా త్రోస్.' },
              { t: 'యాప్‌లో రికార్డ్', d: 'సెట్లు, బరువులు, ఎలా అనిపించింది, కాబట్టి తర్వాతి సెషన్ ఇక్కడి నుండే మొదలవుతుంది.' },
            ],
          },
          {
            kind: 'story', tone: 'ink', title: '4 వారాల బ్లాక్‌లలో ట్రైనింగ్',
            text: 'ప్రతి సబ్‌స్క్రిప్షన్ {{sessions}} కోచ్ సెషన్లతో 4 వారాల బ్లాక్. ప్రతి బ్లాక్ ముందుదానిపై నిర్మితమవుతుంది: చివర్లో కోచ్ మీ నంబర్లు చూసి తర్వాతి బ్లాక్ రాస్తారు.',
            alt: 'ప్రతి సబ్‌స్క్రిప్షన్ కోచ్ సెషన్లతో 4 వారాల బ్లాక్. ప్రతి బ్లాక్ ముందుదానిపై నిర్మితమవుతుంది: చివర్లో కోచ్ మీ నంబర్లు చూసి తర్వాతి బ్లాక్ రాస్తారు.',
          },
          {
            kind: 'cards', title: 'ఎవరికి సరిపోతుంది', cols: 2,
            items: [
              { t: 'బిగినర్స్', d: 'మొదటి రోజు నుండే కోచ్ పక్కనే ఉండి ప్రతి లిఫ్ట్ సరిగ్గా నేర్పిస్తారు.' },
              { t: 'మళ్లీ మొదలుపెట్టేవారు', d: 'బ్రేక్, ప్రసవం లేదా గాయం తర్వాత, సరైన స్థాయి నుండి మళ్లీ మొదలుపెడతారు.' },
              { t: 'జంటలు, స్నేహితులు', d: 'పక్కపక్కనే ట్రైన్ అవ్వండి, ఒక్కొక్కరికి సొంత ప్లాన్, ఇద్దరినీ ఒకే కోచ్ చూస్తారు.' },
              { t: 'బిజీ ప్రొఫెషనల్స్', d: 'గంటలో ప్రతి నిమిషం ప్లాన్ చేసి ఉంటుంది, కాబట్టి ఏ సెషన్ వృథా కాదు.' },
            ],
          },
          { kind: 'story', tone: 'deep', title: 'ఎవరికి సరిపోదు', text: 'హెడ్‌ఫోన్స్ పెట్టుకుని, ఎవరూ సరిచేయకుండా ఒంటరిగా ట్రైన్ అవ్వాలనుకుంటే, సాధారణ జిమ్ మీకు బాగుంటుంది. షాన్‌లో కోచ్ ఎప్పుడూ చూస్తూనే ఉంటారు.' },
          { kind: 'subs', title: 'ఎలా ట్రైన్ అవ్వాలో ఎంచుకోండి' },
          { kind: 'link', title: 'అసెస్‌మెంట్‌తో మొదలవుతుంది', text: 'మీరు ఎంచుకునే ముందు, మీరు ఎలా కదులుతారు, ఎంత బలంగా ఉన్నారు, మీకు ఏం కావాలో కోచ్ చూస్తారు.', to: 'assessment', label: 'అసెస్‌మెంట్‌లో ఏం జరుగుతుంది' },
        ],
        faq: [
          { q: 'సెమీ-ప్రైవేట్ ట్రైనింగ్ అంటే ఏమిటి?', a: 'కొద్ది మంది పంచుకునే పర్సనల్ ట్రైనింగ్. ఒక్కొక్కరు సొంతంగా రాసిన ప్లాన్ ఫాలో అవుతారు, ఒక కోచ్ ప్రతి సెట్‌ను చూసి సరిచేస్తారు.' },
          { q: 'ఒక కోచ్‌తో ఎంత మంది ట్రైన్ అవుతారు?', a: 'మీరు ఎంచుకున్నదాన్ని బట్టి: చిన్న గ్రూప్, పక్కపక్కనే ఇద్దరు, లేదా మీరు మాత్రమే.' },
          { q: 'గ్రూప్‌లో నాకు సొంత ప్లాన్ ఉంటుందా?', a: 'అవును. ఇతరులతో ట్రైన్ అయినా, మీ ప్లాన్ మీ శరీరానికి, మీ లక్ష్యానికి రాసినదే.' },
          { q: 'నా భర్త, భార్య లేదా స్నేహితుడితో కలిసి ట్రైన్ అవ్వొచ్చా?', a: 'అవును. పక్కపక్కనే ట్రైనింగ్ ఇద్దరి కోసం, ఒక్కొక్కరికి సొంత ప్లాన్, ఒకే కోచ్.' },
          { q: 'వన్-ఆన్-వన్ పర్సనల్ ట్రైనింగ్ కంటే తక్కువ ఖర్చా?', a: 'అవును. కోచ్‌ను పంచుకుంటారు కాబట్టి చిన్న గ్రూప్, పక్కపక్కనే ట్రైనింగ్ వన్-ఆన్-వన్ కంటే తక్కువ. అయినా రాసిన ప్లాన్, ప్రతి సెట్ చూసే కోచ్ ఉంటారు.' },
        ],
      },
    },
  },
  {
    id: 'assessment',
    path: '/fitness-assessment-kakinada',
    seo: {
      title: 'Fitness Assessment in Kakinada | The Shaan Assessment',
      description: 'Every Shaan Fitness member starts with an assessment: posture, mobility, strength, health history and your goal, then honest advice on how to train.',
    },
    copy: {
      en: {
        nav: 'The assessment',
        desc: 'Where every plan starts: how you move, how strong you are, what you want.',
        h1: 'The Shaan Assessment',
        intro: 'Every member starts here. Before you choose a plan, a coach checks how you move, how strong you are and what you want, then tells you honestly how to train.',
        blocks: [
          {
            kind: 'steps', title: 'What we check',
            items: [
              { t: 'Your goal and your week', d: 'What you want to change, and the days and times you can really train.' },
              { t: 'Your health history', d: 'Past injuries, pain, and conditions such as BP, sugar or thyroid, and the medicines you take.' },
              { t: 'Posture', d: 'How you stand and sit, and where your body compensates.' },
              { t: 'Mobility', d: 'How freely your hips, ankles, shoulders and back move.' },
              { t: 'Strength', d: 'Simple tests of how you squat, push, pull and hold, at a level that suits you.' },
              { t: 'Your starting numbers', d: 'Weight and measurements, so your progress can be measured from day one.' },
            ],
          },
          {
            kind: 'cards', tone: 'deep', title: 'What you leave with',
            items: [
              { t: 'How to train', d: 'Which way fits you best: a small group, side by side, or one-on-one.' },
              { t: 'Where to start', d: 'The level, the lifts and the pace your plan begins with.' },
              { t: 'Honest advice', d: 'If something needs a doctor’s check first, we say so before you train.' },
            ],
          },
          {
            kind: 'checks', title: 'Come prepared',
            items: ['Comfortable training clothes and shoes', 'A water bottle', 'Any medical reports or prescriptions you have', 'A light meal one to two hours before'],
          },
          { kind: 'bmi' },
          { kind: 'join' },
          { kind: 'link', tone: 'deep', title: 'New to semi-private training?', text: 'See how training in small numbers works, and what a session looks like.', to: 'semi', label: 'What semi-private training is' },
        ],
        faq: [
          { q: 'Do I need to be fit before the assessment?', a: 'No. The assessment is how we find your starting level. Every test is scaled to you.' },
          { q: 'What should I bring?', a: 'Training clothes and shoes, a water bottle, and any medical reports or prescriptions you have.' },
          { q: 'I have BP, diabetes, thyroid or back pain. Can I still train?', a: 'Tell your coach at the assessment. Your plan is built around it, and if you need a doctor’s check first, we will tell you.' },
          { q: 'What happens after the assessment?', a: 'Your coach tells you which way to train fits you. You choose a subscription, and your first session and batch time are fixed.' },
        ],
      },
      te: {
        nav: 'అసెస్‌మెంట్',
        desc: 'ప్రతి ప్లాన్ ఇక్కడే మొదలవుతుంది: మీరు ఎలా కదులుతారు, ఎంత బలం, మీకేం కావాలి.',
        h1: 'షాన్ అసెస్‌మెంట్',
        intro: 'ప్రతి సభ్యుడు ఇక్కడే మొదలుపెడతారు. మీరు ప్లాన్ ఎంచుకునే ముందు, మీరు ఎలా కదులుతారు, ఎంత బలంగా ఉన్నారు, మీకు ఏం కావాలో కోచ్ చూసి, ఎలా ట్రైన్ అవ్వాలో నిజాయితీగా చెబుతారు.',
        blocks: [
          {
            kind: 'steps', title: 'మేము ఏం చూస్తాం',
            items: [
              { t: 'మీ లక్ష్యం, మీ వారం', d: 'మీరు ఏం మార్చుకోవాలనుకుంటున్నారు, నిజంగా ఏ రోజులు, ఏ సమయాల్లో ట్రైన్ అవ్వగలరు.' },
              { t: 'మీ ఆరోగ్య చరిత్ర', d: 'పాత గాయాలు, నొప్పులు, BP, షుగర్, థైరాయిడ్ వంటి సమస్యలు, మీరు వాడే మందులు.' },
              { t: 'పోస్చర్', d: 'మీరు ఎలా నిలబడతారు, కూర్చుంటారు, మీ శరీరం ఎక్కడ సర్దుకుంటుంది.' },
              { t: 'మొబిలిటీ', d: 'మీ తుంటి, చీలమండలు, భుజాలు, వీపు ఎంత స్వేచ్ఛగా కదులుతాయి.' },
              { t: 'బలం', d: 'మీకు సరిపోయే స్థాయిలో, స్క్వాట్, పుష్, పుల్, హోల్డ్ ఎలా చేస్తారో చిన్న టెస్టులు.' },
              { t: 'మీ మొదటి నంబర్లు', d: 'బరువు, కొలతలు, కాబట్టి మొదటి రోజు నుండే మీ ప్రగతిని కొలవొచ్చు.' },
            ],
          },
          {
            kind: 'cards', tone: 'deep', title: 'మీకు ఏం దొరుకుతుంది',
            items: [
              { t: 'ఎలా ట్రైన్ అవ్వాలి', d: 'మీకు ఏది బాగా సరిపోతుంది: చిన్న గ్రూప్, పక్కపక్కనే, లేదా వన్-ఆన్-వన్.' },
              { t: 'ఎక్కడ మొదలుపెట్టాలి', d: 'మీ ప్లాన్ మొదలయ్యే స్థాయి, లిఫ్ట్‌లు, వేగం.' },
              { t: 'నిజాయితీ సలహా', d: 'ముందు డాక్టర్ చెక్ అవసరమైతే, ట్రైనింగ్ ముందే చెబుతాం.' },
            ],
          },
          {
            kind: 'checks', title: 'ఇవి తీసుకురండి',
            items: ['సౌకర్యవంతమైన ట్రైనింగ్ బట్టలు, షూస్', 'వాటర్ బాటిల్', 'మీ దగ్గర ఉన్న మెడికల్ రిపోర్టులు లేదా ప్రిస్క్రిప్షన్లు', 'ఒకటి రెండు గంటల ముందు తేలికపాటి భోజనం'],
          },
          { kind: 'bmi' },
          { kind: 'join' },
          { kind: 'link', tone: 'deep', title: 'సెమీ-ప్రైవేట్ ట్రైనింగ్ కొత్తా?', text: 'తక్కువ మందితో ట్రైనింగ్ ఎలా పనిచేస్తుందో, ఒక సెషన్ ఎలా ఉంటుందో చూడండి.', to: 'semi', label: 'సెమీ-ప్రైవేట్ ట్రైనింగ్ అంటే ఏమిటి' },
        ],
        faq: [
          { q: 'అసెస్‌మెంట్‌కు ముందు నేను ఫిట్‌గా ఉండాలా?', a: 'అవసరం లేదు. మీ మొదటి స్థాయిని కనుక్కోవడానికే అసెస్‌మెంట్. ప్రతి టెస్ట్ మీకు తగ్గట్టుగా ఉంటుంది.' },
          { q: 'ఏం తీసుకురావాలి?', a: 'ట్రైనింగ్ బట్టలు, షూస్, వాటర్ బాటిల్, మీ దగ్గర ఉన్న మెడికల్ రిపోర్టులు లేదా ప్రిస్క్రిప్షన్లు.' },
          { q: 'నాకు BP, షుగర్, థైరాయిడ్ లేదా నడుము నొప్పి ఉంది. ట్రైన్ అవ్వొచ్చా?', a: 'అసెస్‌మెంట్‌లో కోచ్‌కు చెప్పండి. మీ ప్లాన్ దానికి తగ్గట్టుగా ఉంటుంది, ముందు డాక్టర్ చెక్ అవసరమైతే మేము చెబుతాం.' },
          { q: 'అసెస్‌మెంట్ తర్వాత ఏం జరుగుతుంది?', a: 'మీకు ఏ విధమైన ట్రైనింగ్ సరిపోతుందో కోచ్ చెబుతారు. మీరు సబ్‌స్క్రిప్షన్ ఎంచుకుంటారు, మీ మొదటి సెషన్, బ్యాచ్ సమయం నిర్ణయిస్తాం.' },
        ],
      },
    },
  },
  {
    id: 'strength',
    path: '/strength-training-kakinada',
    seo: {
      title: 'Strength Training in Kakinada | Coached Lifting | Shaan Fitness',
      description: 'Coached strength training in Kakinada: squat, deadlift, press and pull on a written plan, with the weight going up block after block. Beginners welcome.',
    },
    service: 'Strength training',
    copy: {
      en: {
        nav: 'Strength training',
        desc: 'Squat, deadlift, press and pull, on a plan that adds weight every block.',
        h1: 'Strength training in Kakinada',
        intro: 'Get stronger on a written plan: squat, hinge, press and pull, with the weight going up block after block and a coach checking your form on every set.',
        blocks: [
          {
            kind: 'cards', title: 'What you train', cols: 2,
            items: [
              { t: 'Squat', d: 'Goblet squats to barbell squats: legs and hips strong enough for stairs, sport and lifting your children.' },
              { t: 'Hinge', d: 'Deadlifts and hip work that protect your back instead of hurting it.' },
              { t: 'Press', d: 'Bench and overhead pressing for strong shoulders, chest and arms.' },
              { t: 'Pull', d: 'Rows, pull-downs and pull-ups for a strong upper back and better posture.' },
            ],
          },
          {
            kind: 'steps', tone: 'deep', title: 'How you get stronger',
            items: [
              { t: 'Learn the lift', d: 'Light weights and perfect form first. Your coach teaches every movement.' },
              { t: 'Add a little each week', d: 'A bit more weight or a few more reps, planned in advance.' },
              { t: 'Check your numbers', d: 'At the end of each 4-week block, your coach tests your lifts.' },
              { t: 'Start the next block', d: 'A new plan built from those numbers, so you keep progressing.' },
            ],
          },
          { kind: 'method' },
          {
            kind: 'cards', title: 'Why strength matters', cols: 3,
            items: [
              { t: 'For your body', d: 'Muscle and bone stay strong, and everyday jobs feel easier.' },
              { t: 'For fat loss', d: 'Muscle helps you keep your shape while you lose fat.' },
              { t: 'For your mind', d: 'Seeing your lifts go up week after week builds real confidence.' },
            ],
          },
          { kind: 'link', tone: 'ink', title: 'Deadlift December', text: 'Our members’ deadlift challenge: the winners lifted up to 250% of their body weight.', to: 'deadlift', label: 'See the event' },
          { kind: 'subs' },
          { kind: 'coaches' },
        ],
        faq: [
          { q: 'Will lifting weights make me bulky?', a: 'No. Building muscle is slow and planned. Most people, women especially, look leaner and more toned as they get stronger.' },
          { q: 'Is strength training safe for beginners?', a: 'Yes, when it is coached. You start light, learn each lift properly, and your coach watches every set.' },
          { q: 'Can women do strength training?', a: 'Yes. Strength training is for everyone, and our team includes a woman trainer.' },
          { q: 'Do you train for powerlifting?', a: 'Yes. The squat, bench press and deadlift are at the centre of our strength plans, and we run challenges such as Deadlift December.' },
        ],
      },
      te: {
        nav: 'స్ట్రెంత్ ట్రైనింగ్',
        desc: 'స్క్వాట్, డెడ్‌లిఫ్ట్, ప్రెస్, పుల్, ప్రతి బ్లాక్‌లో బరువు పెరిగే ప్లాన్‌తో.',
        h1: 'కాకినాడలో స్ట్రెంత్ ట్రైనింగ్',
        intro: 'రాసిన ప్లాన్‌తో బలంగా అవ్వండి: స్క్వాట్, హింజ్, ప్రెస్, పుల్, బ్లాక్ తర్వాత బ్లాక్ బరువు పెరుగుతూ, ప్రతి సెట్‌లో కోచ్ మీ ఫామ్ చెక్ చేస్తూ.',
        blocks: [
          {
            kind: 'cards', title: 'మీరు ఏం ట్రైన్ చేస్తారు', cols: 2,
            items: [
              { t: 'స్క్వాట్', d: 'గాబ్లెట్ స్క్వాట్ నుండి బార్‌బెల్ స్క్వాట్ వరకు: మెట్లు, ఆటలు, పిల్లల్ని ఎత్తడానికి సరిపడా బలమైన కాళ్లు, తుంటి.' },
              { t: 'హింజ్', d: 'మీ వీపును గాయపరచకుండా కాపాడే డెడ్‌లిఫ్ట్‌లు, తుంటి వర్క్.' },
              { t: 'ప్రెస్', d: 'బలమైన భుజాలు, ఛాతీ, చేతులకు బెంచ్, ఓవర్‌హెడ్ ప్రెస్.' },
              { t: 'పుల్', d: 'బలమైన పై వీపు, మంచి పోస్చర్ కోసం రోస్, పుల్-డౌన్స్, పుల్-అప్స్.' },
            ],
          },
          {
            kind: 'steps', tone: 'deep', title: 'మీరు బలంగా ఎలా అవుతారు',
            items: [
              { t: 'లిఫ్ట్ నేర్చుకోండి', d: 'ముందు తేలికపాటి బరువులు, సరైన ఫామ్. ప్రతి కదలికను కోచ్ నేర్పిస్తారు.' },
              { t: 'ప్రతి వారం కొంచెం పెంచండి', d: 'కొంచెం ఎక్కువ బరువు లేదా కొన్ని ఎక్కువ రెప్స్, ముందే ప్లాన్ చేసి.' },
              { t: 'మీ నంబర్లు చెక్ చేయండి', d: 'ప్రతి 4 వారాల బ్లాక్ చివర్లో కోచ్ మీ లిఫ్ట్‌లను టెస్ట్ చేస్తారు.' },
              { t: 'తర్వాతి బ్లాక్ మొదలుపెట్టండి', d: 'ఆ నంబర్లతో కొత్త ప్లాన్, కాబట్టి మీ ప్రగతి ఆగదు.' },
            ],
          },
          { kind: 'method' },
          {
            kind: 'cards', title: 'బలం ఎందుకు ముఖ్యం', cols: 3,
            items: [
              { t: 'మీ శరీరానికి', d: 'కండరాలు, ఎముకలు బలంగా ఉంటాయి, రోజువారీ పనులు సులువు అవుతాయి.' },
              { t: 'ఫ్యాట్ లాస్‌కు', d: 'ఫ్యాట్ తగ్గేటప్పుడు మీ ఆకారాన్ని నిలుపుకోవడానికి కండరాలు సహాయపడతాయి.' },
              { t: 'మీ మనసుకు', d: 'వారం వారం మీ లిఫ్ట్‌లు పెరగడం చూస్తే నిజమైన ఆత్మవిశ్వాసం వస్తుంది.' },
            ],
          },
          { kind: 'link', tone: 'ink', title: 'డెడ్‌లిఫ్ట్ డిసెంబర్', text: 'మా సభ్యుల డెడ్‌లిఫ్ట్ ఛాలెంజ్: విజేతలు తమ శరీర బరువుకు 250% వరకు ఎత్తారు.', to: 'deadlift', label: 'ఈవెంట్ చూడండి' },
          { kind: 'subs' },
          { kind: 'coaches' },
        ],
        faq: [
          { q: 'బరువులు ఎత్తితే నేను లావుగా కనిపిస్తానా?', a: 'లేదు. కండరాలు పెరగడం నెమ్మదిగా, ప్లాన్ ప్రకారం జరుగుతుంది. చాలామంది, ముఖ్యంగా మహిళలు, బలం పెరిగే కొద్దీ మరింత సన్నగా, టోన్‌గా కనిపిస్తారు.' },
          { q: 'బిగినర్స్‌కు స్ట్రెంత్ ట్రైనింగ్ సురక్షితమేనా?', a: 'అవును, కోచ్ ఉంటే. తేలికగా మొదలుపెడతారు, ప్రతి లిఫ్ట్ సరిగ్గా నేర్చుకుంటారు, ప్రతి సెట్ కోచ్ చూస్తారు.' },
          { q: 'మహిళలు స్ట్రెంత్ ట్రైనింగ్ చేయొచ్చా?', a: 'అవును. స్ట్రెంత్ ట్రైనింగ్ అందరి కోసం, మా టీమ్‌లో మహిళా ట్రైనర్ ఉన్నారు.' },
          { q: 'పవర్‌లిఫ్టింగ్ కోసం ట్రైన్ చేస్తారా?', a: 'అవును. మా స్ట్రెంత్ ప్లాన్లకు స్క్వాట్, బెంచ్ ప్రెస్, డెడ్‌లిఫ్ట్ కేంద్రం, డెడ్‌లిఫ్ట్ డిసెంబర్ వంటి ఛాలెంజ్‌లు కూడా నిర్వహిస్తాం.' },
        ],
      },
    },
  },
  {
    id: 'seniors',
    path: '/fitness-after-40-kakinada',
    seo: {
      title: 'Fitness After 40 & for Seniors in Kakinada | Shaan Fitness',
      description: 'Coached training after 40 and for seniors in Kakinada: strength, balance and mobility at your pace, with your health history planned in from day one.',
    },
    service: 'Fitness training after 40 and for seniors',
    copy: {
      en: {
        nav: 'After 40 and seniors',
        desc: 'Strength, balance and mobility that keep you independent.',
        h1: 'Strong at every age: training after 40',
        intro: 'Strength, balance and mobility that keep you independent: climbing stairs, getting up from the floor, carrying the shopping, playing with your grandchildren. Coached in small numbers, at your pace.',
        blocks: [
          {
            kind: 'cards', title: 'What we work on',
            items: [
              { t: 'Strength', d: 'Legs, back and grip, so everyday jobs stay easy.' },
              { t: 'Balance', d: 'Steady on your feet, on stairs and on uneven ground.' },
              { t: 'Mobility', d: 'Hips, back and shoulders that move freely, without stiffness.' },
              { t: 'Heart and lungs', d: 'Walking and intervals at your level, to build stamina.' },
              { t: 'Bones', d: 'Load-bearing exercise, which helps keep bones strong as you age.' },
              { t: 'Confidence', d: 'Knowing what your body can do, and trusting it.' },
            ],
          },
          {
            kind: 'checks', tone: 'deep', title: 'How we keep it safe',
            items: [
              'An assessment first, with your health history: BP, sugar, thyroid, joints and medicines',
              'Every exercise scaled to you, with an easier version always ready',
              'A coach watching every set',
              'Steady progress, never a sudden jump',
              'A doctor’s clearance first when your health needs it',
            ],
          },
          { kind: 'ways', title: 'Train the way that suits you', sub: 'One-on-one, side by side with your husband or wife, or in a small group once you feel at home.' },
          { kind: 'subs' },
          { kind: 'link', title: 'It starts with an assessment', text: 'A coach checks your health history, posture, mobility and strength before you begin.', to: 'assessment', label: 'What happens at the assessment' },
        ],
        faq: [
          { q: 'Am I too old to start?', a: 'No. Strength and balance improve at any age with the right plan. Your coach starts where you are.' },
          { q: 'Is it safe if I have BP or diabetes?', a: 'Tell your coach at the assessment. Your plan is built around it, and we ask for a doctor’s clearance when needed.' },
          { q: 'I have knee or back pain. Can I still train?', a: 'Often, yes. We work around the pain and strengthen the muscles that support the joint. If it needs a doctor first, we will tell you.' },
          { q: 'Can my husband or wife train with me?', a: 'Yes. Side-by-side training is for two people, each on their own plan, with the same coach.' },
        ],
      },
      te: {
        nav: '40 తర్వాత, సీనియర్స్',
        desc: 'మిమ్మల్ని స్వతంత్రంగా ఉంచే బలం, బ్యాలెన్స్, మొబిలిటీ.',
        h1: 'ఏ వయసులోనైనా బలంగా: 40 తర్వాత ట్రైనింగ్',
        intro: 'మిమ్మల్ని స్వతంత్రంగా ఉంచే బలం, బ్యాలెన్స్, మొబిలిటీ: మెట్లు ఎక్కడం, నేల నుండి లేవడం, సరుకులు మోయడం, మనవళ్లతో ఆడుకోవడం. తక్కువ మందితో, మీ వేగంలో, కోచ్‌తో.',
        blocks: [
          {
            kind: 'cards', title: 'మేము దేనిపై పనిచేస్తాం',
            items: [
              { t: 'బలం', d: 'కాళ్లు, వీపు, పట్టు, కాబట్టి రోజువారీ పనులు సులువుగా ఉంటాయి.' },
              { t: 'బ్యాలెన్స్', d: 'మెట్లపై, ఎగుడుదిగుడు నేలపై స్థిరంగా నిలబడటం.' },
              { t: 'మొబిలిటీ', d: 'బిగుసుకుపోకుండా స్వేచ్ఛగా కదిలే తుంటి, వీపు, భుజాలు.' },
              { t: 'గుండె, ఊపిరితిత్తులు', d: 'స్టామినా కోసం మీ స్థాయిలో నడక, ఇంటర్వల్స్.' },
              { t: 'ఎముకలు', d: 'బరువు మోసే వ్యాయామం, వయసు పెరిగినా ఎముకలు బలంగా ఉండటానికి సహాయపడుతుంది.' },
              { t: 'ఆత్మవిశ్వాసం', d: 'మీ శరీరం ఏం చేయగలదో తెలుసుకుని, దాన్ని నమ్మడం.' },
            ],
          },
          {
            kind: 'checks', tone: 'deep', title: 'సురక్షితంగా ఎలా ఉంచుతాం',
            items: [
              'ముందు అసెస్‌మెంట్, మీ ఆరోగ్య చరిత్రతో: BP, షుగర్, థైరాయిడ్, జాయింట్లు, మందులు',
              'ప్రతి వ్యాయామం మీకు తగ్గట్టుగా, సులువైన వెర్షన్ ఎప్పుడూ సిద్ధంగా',
              'ప్రతి సెట్‌ను చూసే కోచ్',
              'నెమ్మదిగా, స్థిరంగా ప్రగతి, ఎప్పుడూ ఒక్కసారిగా పెంచడం కాదు',
              'మీ ఆరోగ్యానికి అవసరమైతే ముందు డాక్టర్ అనుమతి',
            ],
          },
          { kind: 'ways', title: 'మీకు సరిపోయే విధంగా ట్రైన్ అవ్వండి', sub: 'వన్-ఆన్-వన్‌గా, మీ భర్త లేదా భార్యతో పక్కపక్కనే, లేదా అలవాటయ్యాక చిన్న గ్రూప్‌లో.' },
          { kind: 'subs' },
          { kind: 'link', title: 'అసెస్‌మెంట్‌తో మొదలవుతుంది', text: 'మీరు మొదలుపెట్టే ముందు కోచ్ మీ ఆరోగ్య చరిత్ర, పోస్చర్, మొబిలిటీ, బలం చూస్తారు.', to: 'assessment', label: 'అసెస్‌మెంట్‌లో ఏం జరుగుతుంది' },
        ],
        faq: [
          { q: 'మొదలుపెట్టడానికి నాకు వయసు ఎక్కువైందా?', a: 'లేదు. సరైన ప్లాన్‌తో ఏ వయసులోనైనా బలం, బ్యాలెన్స్ మెరుగవుతాయి. మీరు ఉన్న చోటు నుండే కోచ్ మొదలుపెడతారు.' },
          { q: 'నాకు BP లేదా షుగర్ ఉంటే సురక్షితమేనా?', a: 'అసెస్‌మెంట్‌లో కోచ్‌కు చెప్పండి. మీ ప్లాన్ దానికి తగ్గట్టుగా ఉంటుంది, అవసరమైతే డాక్టర్ అనుమతి అడుగుతాం.' },
          { q: 'నాకు మోకాలు లేదా నడుము నొప్పి ఉంది. ట్రైన్ అవ్వొచ్చా?', a: 'చాలాసార్లు అవును. నొప్పిని తప్పించి, జాయింట్‌కు సపోర్ట్ చేసే కండరాలను బలపరుస్తాం. ముందు డాక్టర్ అవసరమైతే మేము చెబుతాం.' },
          { q: 'నా భర్త లేదా భార్య నాతో కలిసి ట్రైన్ అవ్వొచ్చా?', a: 'అవును. పక్కపక్కనే ట్రైనింగ్ ఇద్దరి కోసం, ఒక్కొక్కరికి సొంత ప్లాన్, ఒకే కోచ్.' },
        ],
      },
    },
  },
  {
    id: 'athletes',
    path: '/athletic-training-kakinada',
    seo: {
      title: 'Athletic Training in Kakinada | Absolute Athleticism',
      description: 'Speed, power and conditioning for players in Kakinada: our 18-week Absolute Athleticism program in three phases, coached in small numbers.',
    },
    service: 'Athletic performance training',
    copy: {
      en: {
        nav: 'Athletic training',
        desc: 'Speed, power and conditioning: our 18-week program.',
        h1: 'Athletic training in Kakinada',
        intro: 'Speed, power and conditioning for players, and for anyone who wants to move like one, built on our 18-week Absolute Athleticism program.',
        blocks: [
          { kind: 'athletic' },
          {
            kind: 'cards', title: 'What we build',
            items: [
              { t: 'Speed', d: 'Acceleration, footwork and changes of direction.' },
              { t: 'Power', d: 'Jumps, throws and explosive lifts that turn strength into speed.' },
              { t: 'Strength', d: 'Squat, hinge, press and pull, the base everything else stands on.' },
              { t: 'Conditioning', d: 'The engine to keep going hard to the end of the game.' },
              { t: 'Mobility', d: 'Hips, ankles and shoulders that move well and recover faster.' },
              { t: 'Staying fit to play', d: 'Strong joints and smart training loads, planned around your matches.' },
            ],
          },
          {
            kind: 'cards', tone: 'deep', title: 'Who it is for', cols: 2,
            items: [
              { t: 'Players of any sport', d: 'Cricket, football, kabaddi, badminton, athletics: the plan is built around your sport and your season.' },
              { t: 'Anyone who wants to move like an athlete', d: 'Faster, more powerful and fitter, even if you don’t play a sport.' },
            ],
          },
          { kind: 'subs' },
        ],
        faq: [
          { q: 'Which sports do you train for?', a: 'Any sport. Your plan is built around your sport, your position and your season.' },
          { q: 'Do I need to be fit to start?', a: 'No. The first phase builds movement quality, strength and work capacity before speed and power.' },
          { q: 'How long is the program?', a: 'Absolute Athleticism runs for 18 weeks in three phases: Beginner, Intermediate and Advanced.' },
        ],
      },
      te: {
        nav: 'అథ్లెటిక్ ట్రైనింగ్',
        desc: 'వేగం, పవర్, కండిషనింగ్: మా 18 వారాల ప్రోగ్రామ్.',
        h1: 'కాకినాడలో అథ్లెటిక్ ట్రైనింగ్',
        intro: 'క్రీడాకారుల కోసం, అలా కదలాలనుకునే ప్రతి ఒక్కరి కోసం వేగం, పవర్, కండిషనింగ్, మా 18 వారాల Absolute Athleticism ప్రోగ్రామ్ ఆధారంగా.',
        blocks: [
          { kind: 'athletic' },
          {
            kind: 'cards', title: 'మేము ఏం పెంచుతాం',
            items: [
              { t: 'వేగం', d: 'యాక్సిలరేషన్, ఫుట్‌వర్క్, దిశ మార్చడం.' },
              { t: 'పవర్', d: 'బలాన్ని వేగంగా మార్చే జంప్స్, త్రోస్, ఎక్స్‌ప్లోసివ్ లిఫ్ట్‌లు.' },
              { t: 'బలం', d: 'స్క్వాట్, హింజ్, ప్రెస్, పుల్, మిగతా అన్నీ నిలబడే పునాది.' },
              { t: 'కండిషనింగ్', d: 'ఆట చివరి వరకు గట్టిగా ఆడే శక్తి.' },
              { t: 'మొబిలిటీ', d: 'బాగా కదిలి, త్వరగా కోలుకునే తుంటి, చీలమండలు, భుజాలు.' },
              { t: 'ఆటకు ఫిట్‌గా', d: 'మీ మ్యాచ్‌లకు తగ్గట్టుగా ప్లాన్ చేసిన బలమైన జాయింట్లు, సరైన ట్రైనింగ్ లోడ్.' },
            ],
          },
          {
            kind: 'cards', tone: 'deep', title: 'ఎవరి కోసం', cols: 2,
            items: [
              { t: 'ఏ క్రీడ ఆడేవారైనా', d: 'క్రికెట్, ఫుట్‌బాల్, కబడ్డీ, బ్యాడ్మింటన్, అథ్లెటిక్స్: మీ క్రీడకు, మీ సీజన్‌కు తగ్గట్టుగా ప్లాన్.' },
              { t: 'అథ్లెట్‌లా కదలాలనుకునే ఎవరైనా', d: 'క్రీడ ఆడకపోయినా, మరింత వేగంగా, శక్తివంతంగా, ఫిట్‌గా.' },
            ],
          },
          { kind: 'subs' },
        ],
        faq: [
          { q: 'ఏ క్రీడలకు ట్రైన్ చేస్తారు?', a: 'ఏ క్రీడకైనా. మీ ప్లాన్ మీ క్రీడ, మీ పొజిషన్, మీ సీజన్‌కు తగ్గట్టుగా ఉంటుంది.' },
          { q: 'మొదలుపెట్టడానికి ఫిట్‌గా ఉండాలా?', a: 'అవసరం లేదు. వేగం, పవర్‌కు ముందు మొదటి దశ కదలికల నాణ్యత, బలం, పని సామర్థ్యం పెంచుతుంది.' },
          { q: 'ప్రోగ్రామ్ ఎంత కాలం?', a: 'Absolute Athleticism మూడు దశల్లో 18 వారాలు: బిగినర్, ఇంటర్మీడియట్, అడ్వాన్స్‌డ్.' },
        ],
      },
    },
  },
]

export const isGuideId = (id: string): id is GuideId => GUIDES.some((g) => g.id === id)
export const guideById = (id: GuideId) => GUIDES.find((g) => g.id === id)!
