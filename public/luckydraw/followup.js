/* Shaan Fitness — Dandiya Nights 2K26 lead follow-up (Sabir only).
   Ranks every entry, writes a personal call script + WhatsApp messages for each, and tracks calls / status / notes.
   The lead data is loaded live after Sabir logs in; nothing personal is stored in this file. */

const FU = { rows: {}, loaded: false, filter: "todo", q: "", leads: [],
  offer: { text: "your fitness assessment and first training session are free", until: "30 November" } };
const OWN_NUMS = ["9502318090", "9912130409", "9963547869"];          // Sabir, Ram, studio — never a lead's number
const STUDIO = "Shaan Fitness, 5th Floor, PNR Enclave, near D-Mart, RTO Office Road, Kakinada";
const VOUCHER_END = "26 November";
const FU_STATUS = [["new", "Not contacted"], ["no_answer", "No answer"], ["talked", "Talked"], ["booked", "Trial booked"],
  ["trial_done", "Trial done"], ["joined", "Joined ✓"], ["not_now", "Not interested"], ["wrong", "Wrong number"]];
const BODY = ["Fat Loss", "Weight Loss", "Weight Gain", "Muscle Gain"], HEALTH = ["PCOS / PCOD", "Thyroid", "Diabetes"];
const GOAL_TXT = { "Fat Loss": "fat loss", "Weight Loss": "weight loss", "Weight Gain": "weight gain", "Muscle Gain": "muscle gain",
  "Strength": "getting stronger", "General Fitness": "general fitness", "PCOS / PCOD": "PCOS/PCOD", "Thyroid": "thyroid health", "Diabetes": "managing diabetes" };
const GOAL_NOUN = { "Fat Loss": "fat loss", "Weight Loss": "weight loss", "Weight Gain": "weight gain", "Muscle Gain": "muscle gain",
  "Strength": "strength training", "General Fitness": "fitness routine" };
const TIP_FOR = { "Fat Loss": "fat loss", "Weight Loss": "weight loss", "Weight Gain": "weight gain", "Muscle Gain": "muscle gain", "Strength": "building strength",
  "General Fitness": "staying fit", "PCOS / PCOD": "PCOS/PCOD", "Thyroid": "thyroid health", "Diabetes": "diabetes" };
const HEALTH_SHORT = { "PCOS / PCOD": "PCOS/PCOD", "Thyroid": "thyroid", "Diabetes": "diabetes" };
const SAFE_WITH = { "PCOS / PCOD": "with PCOS/PCOD", "Thyroid": "with my thyroid", "Diabetes": "with diabetes" };
// greeting names the heuristic can't guess (Telugu names often put the family name first)
const NAME_FIX = { "DN26-C002": "Deepthi", "DN26-S003": "Abdul" };

/* ---------- small helpers ---------- */
const fuCap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
function fuFirst(name){
  const t = String(name || "").trim().replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").split(/[\s.]+/).filter(Boolean);
  return fuCap(t.find(x => x.length > 2) || t[0] || "");
}
const fuLetters = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
const fuPhoneOk = (p) => /^[6-9]\d{9}$/.test(p || "") && !/^(\d)\1{4,}/.test(String(p).slice(1)) && !OWN_NUMS.includes(p);
function fuList(a){ a = a.filter(Boolean); return a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
function fuGoalsPhrase(goals, other){
  const g = goals.filter(x => x !== "Others").map(x => GOAL_TXT[x] || x.toLowerCase());
  if (goals.includes("Others") && other) g.push(String(other).trim().toLowerCase());
  return fuList([...new Set(g)]);
}
function fuEmailIssue(email, name){
  const e = String(email || "").toLowerCase().trim(), [loc = "", dom = ""] = e.split("@");
  const typo = { "gamil.con": 1, "gamil.com": 1, "gamail.com": 1, "hmail.con": 1, "hamil.com": 1, "gmail.com.com": 1, "gmail.con": 1, "gmial.com": 1, "gmai.com": 1 };
  if (typo[dom]) return { kind: "typo", text: `Email has a typo (@${dom}), so their ID email never arrived. Confirm the right email on the call.` };
  if (/^(no|noma|nomail|\d*nomail|none|test|na|abc|xyz)$/.test(loc)) return { kind: "fake", text: "Email looks made up. Ask for their real one on the call." };
  if (loc && loc === fuLetters(name) && dom === "gmail.com") return { kind: "maybe", text: "Email is just their name @gmail.com, so it may not be theirs. Confirm it." };
  return null;
}

/* ---------- build the lead list from the applicants ---------- */
function fuBuild(){
  const ents = (adm.entries || []).filter(e => !e.archived);
  const winIds = new Set(), wonCat = {};
  (adm.draws || []).filter(d => d.status === "final" && !d.archived).forEach(d => (d.winner_ids || []).forEach(id => { winIds.add(id); wonCat[id] = d.category; }));
  const winners = ents.filter(e => winIds.has(e.id));
  // a couple's partner who also entered as a single → one lead, partner's real number from the single entry
  const merged = {};
  ents.filter(e => e.category === "couple" && e.partner_email).forEach(c => {
    const pe = fuLetters(String(c.partner_email).split("@")[0]), pf = fuLetters(fuFirst(c.partner_name));
    if (pe.length < 8 || pf.length < 3 || fuEmailIssue(c.partner_email, c.partner_name)) return;   // never merge on made-up emails
    const s = ents.find(x => x.category === "single" && fuLetters(String(x.email || "").split("@")[0]) === pe && fuLetters(x.name).includes(pf));
    if (s) merged[s.code] = c.code, merged[c.code + ":p"] = s;
  });
  const leads = [];
  ents.forEach(e => {
    if (merged[e.code]) return;                             // shown inside the couple's card
    const couple = e.category === "couple", flags = [], reasons = [];
    let partner = null;
    if (couple) {
      const dup = merged[e.code + ":p"];
      const pPhone = fuPhoneOk(e.partner_phone) ? e.partner_phone : dup && fuPhoneOk(dup.phone) ? dup.phone : "";
      const pName = /^(unknown|na|none|-)?$/i.test(String(e.partner_name || "").trim()) ? "" : e.partner_name;
      partner = { name: pName, first: pName ? fuFirst(pName) : "", phone: pPhone, gender: e.partner_gender,
        goals: [...new Set([...(e.partner_goals || []), ...(dup ? dup.goals || [] : [])])], other: e.partner_goal_other };
      if (dup) flags.push(`${partner.first || "Partner"} also entered as a single (${dup.code}), merged here. Call them together.`);
      if (OWN_NUMS.includes(e.partner_phone)) flags.push(`Partner's number on the form is your own number${pPhone ? ", so the number from " + dup.code + " is used" : ""}.`);
      else if (!fuPhoneOk(e.partner_phone) && !pPhone) flags.push(`No real number for the partner${pName ? " (" + pName + ")" : ""}. Ask for it on the call.`);
      if (!pName) flags.push("Partner's name is missing. Ask who they'd train with.");
    }
    const goals = [...new Set([...(e.goals || []), ...(partner ? partner.goals : [])])];
    const ei = fuEmailIssue(e.email, e.name); if (ei) flags.push(ei.text);
    // who they might know (same family name as a winner, or named inside a winner's email)
    const sur = (n) => { const t = String(n || "").trim().split(/\s+/); return t.length > 1 && t[t.length - 1].length > 2 ? t[t.length - 1].toLowerCase() : ""; };
    const knows = winners.find(w => w.id !== e.id && ((sur(w.name) && sur(w.name) === sur(e.name)) || (fuLetters(e.name).length >= 6 && fuLetters(String(w.email).split("@")[0]).includes(fuLetters(e.name)))));
    const twin = ents.find(x => x.id !== e.id && !merged[x.code] && fuLetters(x.name) === fuLetters(e.name));
    if (twin) flags.push(`Same name as ${twin.code}. Check it isn't the same person before calling twice.`);
    const near = ents.find(x => x.id !== e.id && x.phone && e.phone && x.phone !== e.phone && x.phone.slice(0, 8) === e.phone.slice(0, 8));
    if (near) flags.push(`Number is almost the same as ${near.name} (${near.code}), so they may be family. Mention it naturally.`);
    const doctor = /^dr[._]/i.test(String(e.email || "")) || /^dr\.?\s/i.test(e.name || "");
    const won = winIds.has(e.id);
    // ---- score ----
    let score = 0;
    if (couple) { if (partner.phone && partner.name) { score += 3; reasons.push("Couple +3"); } else { score += 1; reasons.push("Couple, partner details missing +1"); } }
    const h = goals.filter(g => HEALTH.includes(g)); if (h.length) { score += 4 + (h.length - 1); reasons.push(`Health goal (${h.join(", ")}) +${4 + h.length - 1}`); }
    const b = goals.filter(g => BODY.includes(g)); if (b.length) { score += 2; reasons.push(`Clear body goal +2`); }
    const ng = goals.filter(g => g !== "Others" || e.goal_other).length;
    if (ng >= 3) { score += 2; reasons.push(`Picked ${ng} goals +2`); } else if (ng === 2) { score += 1; reasons.push("Picked 2 goals +1"); }
    if (knows) { score += 1; reasons.push(`Knows a winner (${fuFirst(knows.name)}) +1`); flags.push(`Probably knows ${knows.name} (winner, ${knows.code}). Mention that ${fuFirst(knows.name)} is starting with us.`); }
    if (doctor) { score += 2; reasons.push("Possibly a doctor +2"); flags.push("Email suggests she may be a doctor. Ask, as she could also be a referral partner."); }
    if (ei && ei.kind === "fake") { score -= 1; reasons.push("Made-up email −1"); }
    const tier = won ? 0 : score >= 5 ? 1 : score >= 2 ? 2 : 3;
    leads.push({ e, code: e.code, couple, partner, goals, won, wonCat: wonCat[e.id], score, tier, reasons, flags, knows,
      first: NAME_FIX[e.code] || fuFirst(e.name), phone: fuPhoneOk(e.phone) ? e.phone : "", applied: e.created_at });
  });
  // duo winners train together: tell each about the other
  leads.forEach(L => { if (L.won && L.wonCat === "single") L.duoWith = leads.find(x => x !== L && x.won && x.wonCat === "single"); });
  leads.sort((a, b) => a.tier - b.tier || b.score - a.score || String(a.applied).localeCompare(String(b.applied)));
  leads.forEach((L, i) => L.rank = i + 1);
  return leads;
}

/* ---------- words for each lead ---------- */
const FU_HOOK = {
  "Fat Loss": "That's the goal we help people with most, and the ones who succeed are the ones with a plan they can actually stick to.",
  "Weight Loss": "That's the goal we help people with most, and the ones who succeed are the ones with a plan they can actually stick to.",
  "Weight Gain": "Gaining good weight is hard for a lot of people. It usually comes down to training with weights and eating the right way, not just eating more.",
  "Muscle Gain": "Building muscle properly needs progressive training and enough protein, and that's exactly how we coach.",
  "Strength": "Strength makes everything else easier: energy, posture and confidence.",
  "General Fitness": "That's a great place to start: feeling fit and energetic every day.",
  "health": "Regular strength training and exercise can really help with how you feel day to day, and we always plan it around your doctor's advice.",
};
const FU_ASK = {
  "Fat Loss": ["How much would you like to lose, and is there a date you're working towards?", "What have you tried before, and what made it hard to keep going?"],
  "Weight Loss": ["What weight would you be happy at, and by when?", "What has made it hard to stay consistent before?"],
  "Weight Gain": ["Have you found it hard to gain even when you eat more?", "Are you training anywhere right now?"],
  "Muscle Gain": ["Are you training right now? How many days a week?", "Which area do you most want to build first?"],
  "Strength": ["What does stronger mean for you: daily energy, posture, a sport, or lifting heavier?", "Have you done weight training before?"],
  "General Fitness": ["What would feeling fit look like for you three months from now?", "How active are you in a normal week?"],
  "PCOS / PCOD": ["You mentioned PCOS/PCOD. Is a doctor guiding you on it right now, and have they suggested exercise?"],
  "Thyroid": ["You mentioned thyroid health. Is a doctor guiding you on it, and how are your energy levels during the day?"],
  "Diabetes": ["You mentioned diabetes. Is a doctor guiding you on it, and is there any medication we should plan around?"],
};
const FU_LINE = {
  "Fat Loss": "We'd love to help you get there with a plan you can actually stick to.",
  "Weight Loss": "We'd love to help you get there with a plan you can actually stick to.",
  "Weight Gain": "We'll help you gain the right way: strength training plus simple eating habits.",
  "Muscle Gain": "We'll build it the right way, with a progressive plan and a coach in every session.",
  "Strength": "Strength training is what we do best: coached, safe and progressive.",
  "General Fitness": "We'll help you build a routine that keeps you fit and energetic.",
};
const FU_TIP = {
  "Fat Loss": "a daily 30–45 minute walk plus protein in every meal makes fat loss far easier to keep up than crash dieting.",
  "Weight Loss": "a daily 30–45 minute walk plus protein in every meal makes weight loss far easier to keep up than crash dieting.",
  "Weight Gain": "add one extra protein-rich meal or snack a day (curd, eggs, paneer, peanuts) and lift weights 3 times a week. That's how healthy weight gain starts.",
  "Muscle Gain": "muscle grows when you add a little more weight or one more rep each week, with enough protein and sleep.",
  "Strength": "three short strength sessions a week with basics like squats, push-ups and rows build real strength within weeks.",
  "General Fitness": "aim for 7–8k steps a day and two strength sessions a week. It's the simplest base for feeling fit.",
  "PCOS / PCOD": "regular strength training helps the body use insulin better, which is one reason exercise is recommended for PCOS, always alongside your doctor's guidance.",
  "Thyroid": "steady, moderate exercise and good sleep help with energy levels. We plan the intensity around how you feel and your doctor's advice.",
  "Diabetes": "a 10–15 minute walk after meals helps with blood sugar, and strength training helps your muscles use glucose better. Always follow your doctor's advice.",
};
const fuMainOf = (goals) => goals.find(g => BODY.includes(g)) || goals.find(g => g === "Strength") || goals.find(g => g === "General Fitness") || "General Fitness";
const fuMainGoal = (L) => fuMainOf(L.e.goals && L.e.goals.length ? L.e.goals : L.goals);
const fuOwnHealth = (L) => (L.e.goals || []).filter(g => HEALTH.includes(g));
const fuGreet = (L) => L.couple && L.partner && L.partner.first ? `${L.first} & ${L.partner.first}` : L.first;
function fuPlan(L){
  if (L.won) return `Activate the voucher before ${VOUCHER_END}. After the month, offer Semi-Private (Side-by-Side) ₹7,999 to continue.`;
  if (L.couple) return "Pitch after the trial: Semi-Private (Side-by-Side) ₹7,999, so they train together.";
  if (L.goals.some(g => HEALTH.includes(g))) return "Pitch after the trial: 1:1 Elite ₹14,999 (or Semi-Private ₹7,999), planned around their doctor's advice.";
  if (L.goals.filter(g => BODY.includes(g) || g === "Strength").length >= 2) return "Pitch after the trial: Semi-Private ₹7,999 (or Group ₹4,999).";
  return "Pitch after the trial: Group ₹4,999.";
}
function fuObjections(L){
  const o = [];
  if (L.couple) o.push(["\"We need to check our schedules.\"", "Of course. Let's pencil in a slot that suits you both, and you can move it if needed. Do mornings or evenings generally work better for the two of you?"]);
  const h = L.goals.find(g => HEALTH.includes(g));
  if (h) o.push([`"Is training safe for me ${SAFE_WITH[h]}?"`, "That's exactly why we start with an assessment. We go at your pace, plan around your doctor's advice, and a coach is with you in every session."]);
  const m = fuMainGoal(L);
  if (m === "Weight Gain") o.push(["\"I eat a lot but I don't gain.\"", "Very common. Usually it's about enough protein, eaten consistently, plus training with weights. We'll show you exactly how in the assessment."]);
  else if (m === "Fat Loss" || m === "Weight Loss") o.push(["\"I've tried before and it didn't last.\"", "That's why we coach you in person and check progress every week. You won't be doing it on your own this time."]);
  else if (m === "Muscle Gain" || m === "Strength") o.push(["\"I already go to a gym.\"", "Great. The assessment will show where you're at and what to change. Many people train for months without a plan; that's what we fix."]);
  if (L.tier === 3) o.push(["\"I only entered for the lucky draw.\"", "Totally fine! The free assessment is yours anyway, with no obligation to join."]);
  o.push(["\"How much does it cost?\"", "It depends on the plan that suits you: Group, Semi-Private or 1:1. Come for the free assessment first; I'll recommend one and show you the price, with no pressure."]);
  return o;
}
function fuQuestions(L){
  const q = [];
  fuOwnHealth(L).forEach(g => q.push(...FU_ASK[g]));
  const m = fuMainGoal(L);
  (FU_ASK[m] || []).slice(0, q.length ? 1 : 2).forEach(x => q.push(x));
  if (L.couple && L.partner && L.partner.first) {
    const pg = L.partner.goals.filter(g => g !== "Others");
    q.push(pg.length ? `And for ${L.partner.first}: ${fuGoalsPhrase(pg)}. What would ${L.partner.gender === "female" ? "she" : L.partner.gender === "male" ? "he" : "they"} like from it?` : `What would ${L.partner.first} like to get out of it?`);
  }
  q.push("Which works better for you: mornings or evenings?");
  return q.slice(0, 5);
}
// The call script, in five short steps plus answers to likely doubts
function fuScript(L){
  const O = FU.offer, Z = L.wonCat ? P(L.wonCat) : null;
  const goals = fuGoalsPhrase(L.e.goals || [], L.e.goal_other), pf = L.partner && L.partner.first;
  if (L.won) {
    const steps = [
      ["Open", `Hi ${L.first}, this is Sabir, Head Coach at Shaan Fitness. Congratulations again on winning the ${Z.title} at Dandiya Nights! Is now a good time to plan your start?`],
      ["Explain", `Your prize is ${Z.detail}. The voucher is valid until ${VOUCHER_END}, so I'd like to get your sessions started this week.`],
      ["Ask", [L.couple ? `On your entry you picked ${goals}${pf && L.partner.goals.length ? `, and ${pf} picked ${fuGoalsPhrase(L.partner.goals, L.partner.other)}` : ""}. We'll plan the month around that. Anything else we should know?` : `On your entry you picked ${goals}. We'll plan the month around that. Anything else we should know?`,
        "Do you have the physical voucher from the AuraPeak organiser? Please bring it on your first day.",
        L.duoWith ? `The Duo voucher is shared with ${L.duoWith.e.name}, the other Duo winner. Would a common slot work for you, or would separate times be easier?` : L.couple ? "Which times work for both of you?" : "Which time suits you best: morning or evening?"]],
      ["Book", `Shall I book your first session for this week? I'll WhatsApp you the location and time right now.`],
    ];
    return { steps, objections: [["\"I'm busy this month.\"", `I understand. The voucher ends on ${VOUCHER_END}, so even 3 sessions a week is enough to use it well. Let's find two fixed times that fit your week.`]],
      note: fuPlan(L) + " Ask for a short testimonial video at the end of the month, and who else they know who'd like to start." };
  }
  const own = fuOwnHealth(L), hook = own.length ? FU_HOOK.health : FU_HOOK[fuMainGoal(L)] || FU_HOOK["General Fitness"];
  const steps = [
    ["Open", `Hi ${L.first}, this is Sabir, Head Coach at Shaan Fitness here in Kakinada. ${L.couple ? `You${pf ? " and " + pf : ""} entered` : "You entered"} our lucky draw at AuraPeak Dandiya Nights on 18 October. Do you have two minutes?` + `<br><i>If not: "No problem, when's a better time today or tomorrow?" Then set the next follow-up date.</i>`],
    ["Connect", `On your entry you picked ${goals || "general fitness"}${L.couple && pf && L.partner.goals.length ? `, and ${pf} picked ${fuGoalsPhrase(L.partner.goals, L.partner.other)}` : ""}. ${hook}` + (L.knows ? ` <i>(If it fits: "${fuFirst(L.knows.name)}, one of our Dandiya winners, is starting with us too.")</i>` : "")],
    ["Ask", fuQuestions(L)],
    ["Show how we work", `Every plan starts with an assessment of body composition, strength and movement. I personally coach half of your sessions each month, and a coach is with you in every session.${L.couple ? " The two of you can train side by side in the same slot." : ""}${L.goals.some(g => HEALTH.includes(g)) ? " We'll ask about your doctor's guidance first and plan around it." : ""}`],
    ["Offer & book", `Because you entered at Dandiya Nights, ${O.text}, until ${O.until}. Would this week work, morning or evening? <i>Then fix a day and time.</i> "Great, I'll WhatsApp you the location and time right now."`],
  ];
  return { steps, objections: fuObjections(L), note: fuPlan(L) };
}
// WhatsApp messages: first message, missed-call message, then the day-3 / day-6 / day-10 follow-ups
function fuMessages(L){
  const O = FU.offer, g = fuGreet(L), Z = L.wonCat ? P(L.wonCat) : null;
  if (L.won) return {
    first: `Congratulations again, ${g}! 🎉\nThis is Sabir, Head Coach at Shaan Fitness. Your ${Z.title} voucher is valid until ${VOUCHER_END}, so let's get you started this week.` +
      (L.duoWith ? `\nThe Duo voucher is shared with ${L.duoWith.first}, the other Duo winner. I'll find a slot that suits you both.` : "") +
      `\nPlease bring the physical voucher you received on stage on your first day.\nWhich time suits you best, morning or evening?\n📍 ${STUDIO}`,
    missed: `Hi ${L.first}, Sabir from Shaan Fitness here. I tried calling to plan the start of your winning voucher (valid until ${VOUCHER_END}). When can I call you back? Or just reply here 🙂`,
    later: [["Day 3", `Hi ${L.first}, just a reminder that your ${Z.short} voucher is valid until ${VOUCHER_END}. Shall I book your first session this week? Reply with a day and I'll confirm the time.`]],
  };
  const goals = fuGoalsPhrase(L.goals, L.e.goal_other), main = fuMainGoal(L), h = L.goals.find(x => HEALTH.includes(x));
  const tipGoal = h || main, tip = FU_TIP[tipGoal] || FU_TIP["General Fitness"], hs = L.goals.filter(x => HEALTH.includes(x));
  return {
    first: `Hi ${g} 👋\nThis is Sabir, Head Coach at Shaan Fitness. Thank you for entering our lucky draw at AuraPeak Dandiya Nights!\n` +
      `You mentioned ${goals || "general fitness"}. ${hs.length ? `With ${fuList(hs.map(x => HEALTH_SHORT[x]))}, we always plan training around your doctor's advice. ` : ""}${FU_LINE[main] || FU_LINE["General Fitness"]}\n` +
      `As a Dandiya Nights entrant, ${O.text} (until ${O.until}).\nWhich day this week suits you, morning or evening?\n📍 ${STUDIO}`,
    missed: `Hi ${L.first}, Sabir from Shaan Fitness here. I just tried calling about your Dandiya Nights lucky-draw entry. When's a good time to call back? Or just reply here 🙂`,
    later: [
      ["Day 3", `Hi ${L.first}, just checking you saw my message about your free assessment at Shaan Fitness. Even a 30-minute visit is enough to plan your ${GOAL_NOUN[main] || "fitness routine"}. Would this weekend work?`],
      ["Day 6", `Hi ${L.first}, a quick tip for ${TIP_FOR[tipGoal] || "staying fit"}: ${tip}\nIf you'd like a plan built for you, your free assessment is open until ${O.until}.`],
      ["Day 10", `Hi ${L.first}, a last reminder from Shaan Fitness: your free Dandiya Nights assessment is open until ${O.until}. Reply YES and I'll share this week's free slots.\nIf now isn't the right time, no problem at all. Just let me know and I won't message again.`],
    ],
  };
}
const fuWa = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;

/* ---------- data ---------- */
async function fuLoad(){
  const r = await DN.rpc("dn_followups_get", { p_pin: auth.token });
  if (!r || !r.ok) { toast((r && r.message) || "Couldn't load follow-ups."); return; }
  FU.rows = {}; (r.rows || []).forEach(x => FU.rows[x.code] = x);
  const s = FU.rows.__offer; if (s && s.notes) { try { const o = JSON.parse(s.notes); if (o.text) FU.offer = o; } catch (_) {} }
  FU.loaded = true;
}
async function fuSave(code, patch){
  FU.rows[code] = { ...(FU.rows[code] || { code, status: "new", calls: 0, wa_sent: false }), ...patch };
  const r = await DN.rpc("dn_followup_save", { p_code: code, p: patch, p_pin: auth.token });
  if (!r || !r.ok) toast((r && r.message) || "Not saved. Check your internet and try again.");
  return r && r.ok;
}
const fuRow = (code) => FU.rows[code] || { status: "new", calls: 0, wa_sent: false, notes: "", next_on: null };
const fuToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);   // date in India
const fuContacted = (r) => r.status !== "new" || r.calls > 0 || r.wa_sent;
const fuOpen = (r) => !["joined", "not_now", "wrong"].includes(r.status);

/* ---------- screen ---------- */
async function viewFollowup(body){
  body.innerHTML = `<div class="panel"><p class="muted">Loading your leads…</p></div>`;
  await Promise.all([loadAdm(), fuLoad()]);
  if (tab !== "followup") return;
  FU.leads = fuBuild();
  body.innerHTML = `
    <div class="panel fu-head" id="fuSummary"></div>
    <details class="panel fu-play"><summary><h3 style="display:inline">How to work these leads</h3></summary><div id="fuPlay"></div></details>
    <div class="fu-filters" id="fuFilters"></div>
    <input type="search" id="fuQ" placeholder="Search name, ID, number or goal" value="${esc(FU.q)}">
    <div id="fuList"></div>`;
  $("#fuQ").oninput = (e) => { FU.q = e.target.value; fuPaintList(); };
  fuPaintSummary(); fuPaintPlay(); fuPaintFilters(); fuPaintList();
}
function fuCounts(){
  const L = FU.leads, rs = L.map(x => fuRow(x.code)), today = fuToday();
  return { total: L.length, people: L.reduce((n, x) => n + 1 + (x.couple && x.partner && x.partner.name ? 1 : 0), 0),
    contacted: rs.filter(fuContacted).length, talked: rs.filter(r => ["talked", "booked", "trial_done", "joined", "not_now"].includes(r.status)).length,
    booked: rs.filter(r => ["booked", "trial_done", "joined"].includes(r.status)).length, joined: rs.filter(r => r.status === "joined").length,
    due: L.filter(x => { const r = fuRow(x.code); return fuOpen(r) && (!fuContacted(r) || (r.next_on && r.next_on <= today)); }).length,
    tiers: [0, 1, 2, 3].map(t => L.filter(x => x.tier === t).length) };
}
function fuPaintSummary(){
  const c = fuCounts(), pct = (n) => c.total ? Math.round(n * 100 / c.total) : 0;
  $("#fuSummary").innerHTML = `<h3>Dandiya Nights leads</h3>
    <p class="muted">${c.total} entries · ${c.people} people. Ranked by how likely they are to join. Work from the top.</p>
    <div class="fu-funnel">
      ${[["Contacted", c.contacted], ["Talked", c.talked], ["Trial booked", c.booked], ["Joined", c.joined]].map(([k, v]) => `
        <div class="fu-f"><b>${v}</b><span>${k}</span><i style="width:${pct(v)}%"></i></div>`).join("")}
    </div>
    <p class="note" style="text-align:left;margin-top:10px">${c.due ? `<b style="color:var(--gold2)">${c.due} to contact today</b> (not contacted yet, or follow-up due).` : "Everyone due today has been contacted. 👏"} Aim for every lead contacted and logged; joining is their choice, so these numbers show your real rate.</p>`;
}
function fuPaintPlay(){
  const c = fuCounts();
  $("#fuPlay").innerHTML = `
    <div class="fu-order">
      <div><span class="tier t0">Winners</span><p><b>${c.tiers[0]} · call today.</b> Vouchers end ${VOUCHER_END}. Book their first session this week, then they become your success stories.</p></div>
      <div><span class="tier t1">Hot</span><p><b>${c.tiers[1]} · call first.</b> Couples and people with health goals or several goals. Send the WhatsApp message within 5 minutes of the call.</p></div>
      <div><span class="tier t2">Warm</span><p><b>${c.tiers[2]} · call next.</b> A clear goal. If there's no answer, send the missed-call message straight away.</p></div>
      <div><span class="tier t3">Nurture</span><p><b>${c.tiers[3]} · WhatsApp first.</b> Picked one general goal. Call the ones who reply.</p></div>
    </div>
    <h4>Rules that make it work</h4>
    <ul class="fu-rules">
      <li>Speed wins: the event was on 18 Oct, so every day of waiting costs replies. Finish Winners and Hot today.</li>
      <li>Call between 11 am–1 pm or 5–8 pm. Up to 3 call attempts on different days, then WhatsApp only.</li>
      <li>Book on the call: a fixed day and time, never "I'll let you know". Confirm the evening before.</li>
      <li>After the trial, show the plan and price the same day, while the session is fresh.</li>
      <li>Log every call and message here, and set the next follow-up date. Nothing gets forgotten.</li>
      <li>Never promise results or medical outcomes. With PCOS, thyroid or diabetes, always plan around their doctor.</li>
      <li>If someone says no, thank them and stop. Respect keeps your name good in Kakinada.</li>
    </ul>
    <h4>The offer in every script and message</h4>
    <label class="f" for="fuOffer">As a Dandiya Nights entrant, …</label><input type="text" id="fuOffer" value="${esc(FU.offer.text)}">
    <label class="f" for="fuUntil">Valid until</label><input type="text" id="fuUntil" value="${esc(FU.offer.until)}">
    <div class="stack"><button class="btn sm" id="fuOfferSave">Save offer, update all messages</button></div>`;
  $("#fuOfferSave").onclick = async () => {
    const text = $("#fuOffer").value.trim(), until = $("#fuUntil").value.trim();
    if (!text || !until) return toast("Fill in both the offer and the date.");
    FU.offer = { text, until };
    if (await fuSave("__offer", { notes: JSON.stringify(FU.offer) })) { toast("Offer saved. All scripts and messages are updated."); fuPaintList(); }
  };
}
const FU_FILTERS = [["todo", "To do today"], ["all", "All"], ["t0", "Winners"], ["t1", "Hot"], ["t2", "Warm"], ["t3", "Nurture"], ["booked", "Booked"], ["done", "Closed"]];
function fuPaintFilters(){
  $("#fuFilters").innerHTML = FU_FILTERS.map(([k, t]) => `<button class="chip" aria-pressed="${FU.filter === k}" data-fuf="${k}">${t}</button>`).join("");
  $$("#fuFilters [data-fuf]").forEach(b => b.onclick = () => { FU.filter = b.dataset.fuf; fuPaintFilters(); fuPaintList(); });
}
function fuVisible(L){
  const r = fuRow(L.code), f = FU.filter, today = fuToday();
  if (FU.q) { const q = FU.q.toLowerCase(); const hay = [L.code, L.e.name, L.e.partner_name, L.phone, L.partner && L.partner.phone, L.goals.join(" ")].join(" ").toLowerCase(); if (!hay.includes(q)) return false; }
  if (f === "all") return true;
  if (f === "todo") return fuOpen(r) && (!fuContacted(r) || (r.next_on && r.next_on <= today) || (L.won && r.status !== "booked" && r.status !== "trial_done"));
  if (f === "booked") return ["booked", "trial_done"].includes(r.status);
  if (f === "done") return !fuOpen(r);
  return L.tier === +f.slice(1);
}
const FU_TIER = ["Winner", "Hot", "Warm", "Nurture"];
function fuCard(L){
  const r = fuRow(L.code), M = fuMessages(L), today = fuToday();
  const due = fuOpen(r) && r.next_on && r.next_on <= today;
  const phones = [[L.first, L.phone]].concat(L.couple && L.partner && L.partner.phone ? [[L.partner.first || "Partner", L.partner.phone]] : []).filter(x => x[1]);
  return `<article class="fu-lead${fuOpen(r) ? "" : " closed"}" data-code="${esc(L.code)}">
    <header><span class="rank">#${L.rank}</span><div class="fu-who"><b>${esc(L.e.name)}${L.couple && L.partner && L.partner.name ? " &amp; " + esc(L.partner.name) : ""}</b>
      <span>${esc(L.code)} · ${L.couple ? "Couple" : L.e.gender === "male" ? "Single · M" : "Single · F"} · applied ${esc(fmtTime(L.applied))}</span></div>
      <span class="tier t${L.tier}">${FU_TIER[L.tier]}</span></header>
    <div class="goals">${L.goals.map(g => `<span>${esc(g === "Others" && L.e.goal_other ? L.e.goal_other : g)}</span>`).join("")}</div>
    ${L.won ? `<p class="why">🏆 Won the ${esc(P(L.wonCat).title)}${L.duoWith ? ` with ${esc(L.duoWith.e.name)}` : ""}. Voucher ends ${VOUCHER_END}.</p>` : `<p class="why">Score ${L.score}: ${esc(L.reasons.join(" · ") || "one general goal")}</p>`}
    ${L.flags.length ? `<ul class="flags">${L.flags.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
    <div class="acts">
      ${phones.map(([n, p]) => `<a class="btn sm" href="tel:+91${p}" data-fucall="${esc(L.code)}">📞 Call ${esc(n)}</a>`).join("") || `<span class="note">No valid number</span>`}
      ${L.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${fuWa(L.phone, M.first)}" data-fuwa="${esc(L.code)}">WhatsApp${r.wa_sent ? " ✓" : ""}</a>` : ""}
    </div>
    <div class="state">
      <label><span>Status</span><select data-fust="${esc(L.code)}">${FU_STATUS.map(([k, t]) => `<option value="${k}"${r.status === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <label><span>Next follow-up${due ? ' <b class="due">due</b>' : ""}</span><input type="date" data-funext="${esc(L.code)}" value="${esc(r.next_on || "")}"></label>
      <span class="calls">${r.calls ? `${r.calls} call${r.calls > 1 ? "s" : ""}` : "No calls yet"}</span>
    </div>
    <details data-fuscript="${esc(L.code)}"><summary>Call script</summary><div class="script"></div></details>
    <details data-fumsgs="${esc(L.code)}"><summary>WhatsApp messages</summary><div class="msgs"></div></details>
    <textarea data-funote="${esc(L.code)}" rows="2" placeholder="Notes: what they said, best time, objections…">${esc(r.notes || "")}</textarea>
  </article>`;
}
function fuPaintList(){
  const el = $("#fuList"); if (!el) return;
  const list = FU.leads.filter(fuVisible);
  el.innerHTML = list.length ? list.map(fuCard).join("") : `<div class="panel"><p class="muted">${FU.filter === "todo" ? "Nothing due today. 👏 Check “All” for the full list." : "No leads here."}</p></div>`;
}
function fuScriptHTML(L){
  const S = fuScript(L);
  return S.steps.map(([h, t], i) => `<div class="sstep"><b>${i + 1} · ${h}</b>${Array.isArray(t) ? `<ul>${t.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p>${t}</p>`}</div>`).join("") +
    `<div class="sstep"><b>If they hesitate</b>${S.objections.map(([q, a]) => `<p><i>${esc(q)}</i><br>${esc(a)}</p>`).join("")}</div>
     <div class="sstep note-for"><b>Your note</b><p>${esc(S.note)}</p></div>`;
}
function fuMsgsHTML(L){
  const M = fuMessages(L), btn = (t, label) => L.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${fuWa(L.phone, t)}">${label}</a>` : "";
  const box = (title, t, label) => `<div class="msg"><b>${title}</b><pre>${esc(t)}</pre><div class="row">${btn(t, label)}<button class="btn sm ghost" data-fucopy>Copy</button></div></div>`;
  return box("First message", M.first, "Send on WhatsApp") + box("If they don't answer the call", M.missed, "Send missed-call message") +
    M.later.map(([d, t]) => box(`${d} (if no reply)`, t, `Send ${d} message`)).join("") +
    (L.couple && L.partner && L.partner.phone ? `<p class="note" style="text-align:left">Partner's WhatsApp: <a href="${fuWa(L.partner.phone, M.first)}" target="_blank" rel="noopener">send the same first message to ${esc(L.partner.first || "partner")}</a></p>` : "");
}

/* ---------- actions (saved straight away) ---------- */
document.addEventListener("toggle", (e) => {
  const d = e.target; if (!d.open || !d.matches || !d.matches("details[data-fuscript],details[data-fumsgs]")) return;
  const L = FU.leads.find(x => x.code === (d.dataset.fuscript || d.dataset.fumsgs)); if (!L) return;
  if (d.dataset.fuscript) $(".script", d).innerHTML = fuScriptHTML(L); else $(".msgs", d).innerHTML = fuMsgsHTML(L);
}, true);
document.addEventListener("click", (e) => {
  const call = e.target.closest("[data-fucall]"), wa = e.target.closest("[data-fuwa]"), cp = e.target.closest("[data-fucopy]");
  if (call) { const c = call.dataset.fucall, r = fuRow(c); fuSave(c, { calls: (r.calls || 0) + 1 }).then(() => fuRefreshCard(c)); }
  if (wa) { const c = wa.dataset.fuwa; fuSave(c, { wa_sent: true }).then(() => fuRefreshCard(c)); }
  if (cp) { const t = cp.closest(".msg").querySelector("pre").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied."), () => toast("Long-press the message to copy it.")); }
});
document.addEventListener("change", (e) => {
  const s = e.target.closest("[data-fust]"), n = e.target.closest("[data-funext]"), t = e.target.closest("[data-funote]");
  if (s) fuSave(s.dataset.fust, { status: s.value }).then(() => { fuPaintSummary(); fuRefreshCard(s.dataset.fust); toast("Saved."); });
  if (n) fuSave(n.dataset.funext, { next_on: n.value || "" }).then(() => { fuPaintSummary(); toast("Follow-up date saved."); });
  if (t) fuSave(t.dataset.funote, { notes: t.value }).then((ok) => ok && toast("Note saved."));
});
function fuRefreshCard(code){
  const old = $(`.fu-lead[data-code="${code}"]`), L = FU.leads.find(x => x.code === code); if (!old || !L) return;
  const open = [...old.querySelectorAll("details")].map(d => d.open);
  const tmp = document.createElement("div"); tmp.innerHTML = fuCard(L); const neu = tmp.firstElementChild;
  old.replaceWith(neu);
  neu.querySelectorAll("details").forEach((d, i) => { if (open[i]) d.open = true; });
  fuPaintSummary();
}
