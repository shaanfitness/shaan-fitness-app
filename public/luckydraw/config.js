// Shaan Fitness lucky draw — shared settings
window.DN = {
  SB_URL: "https://izdsqmghkawvdvcolajv.supabase.co",
  SB_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZHNxbWdoa2F3dmR2Y29sYWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzQ4OTMsImV4cCI6MjEwMjY1MDg5M30.3l46wtCn9sv4huDZqCptOZ5CHW7u-Cl-cgEtpWtn2V8",
  SITE: "https://www.shaanfitness.com/luckydraw/",
  // Shaan Fitness WhatsApp number (entrants send their ID here; it stays in their chat as proof)
  SF_WHATSAPP: "919502318090",
  // "manual" = chits drawn by hand from a bowl on stage, Sabir enters each winner's ID. "online" = Ram's Shuffle → Draw.
  DRAW_MODE: "manual",
  PRIZE: {
    couple: { title: "₹29,000 Couple Edition", short: "Couple Edition", amt: "₹29,000", voucher: "SF-AP26-COUPLE-001", img: "assets/couple-front.jpg",
      detail: "1 month Elite Personal Coaching for the couple + 6 months gym membership each" },
    single: { title: "₹24,000 Duo Edition", short: "Duo Edition", amt: "₹24,000", voucher: "SF-AP26-DUO-001", img: "assets/duo-front.jpg",
      detail: "1 month Elite Personal Coaching for two + 3 months gym membership each" },
  },
};
const NO_NET = "No internet connection. Please check your network and try again.";
// every request gives up after a while, so a weak venue network never leaves a button stuck
function dnFetch(url, opts, ms){
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal, cache: "no-store" }).finally(() => clearTimeout(t));
}
const dnHeaders = (json) => ({ ...(json ? { "Content-Type": "application/json" } : {}), apikey: DN.SB_KEY, Authorization: "Bearer " + DN.SB_KEY });
DN.rest = async (path) => {
  const r = await dnFetch(DN.SB_URL + "/rest/v1/" + path, { headers: dnHeaders(false) }, 9000);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
};
DN.fn = async (name, body) => {
  try {
    const r = await dnFetch(DN.SB_URL + "/functions/v1/" + name, { method: "POST", headers: dnHeaders(true), body: JSON.stringify(body) }, 25000);
    const j = await r.json().catch(() => null);
    return j || { ok: false, net: true, message: "Network error. Please try again." };
  } catch (_) { return { ok: false, net: true, message: NO_NET }; }
};
// net: true means "couldn't reach the server" (not a real "no" from the server)
DN.rpc = async (name, args) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await dnFetch(DN.SB_URL + "/rest/v1/rpc/" + name, { method: "POST", headers: dnHeaders(true), body: JSON.stringify(args) }, 15000);
      const j = await r.json().catch(() => null);
      if (r.ok && j) return j;
      if (r.status >= 500 || r.status === 429 || !j) throw new Error("HTTP " + r.status);
      return { ok: false, message: (j && j.message) || "Request failed." };
    } catch (_) { if (attempt === 0) await new Promise(r => setTimeout(r, 800)); }
  }
  return { ok: false, net: true, message: NO_NET };
};
DN.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
