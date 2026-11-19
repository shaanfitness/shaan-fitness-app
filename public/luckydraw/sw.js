// Shaan Fitness lucky draw — shows draw alerts on the phone and opens the live page when tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Shaan Fitness lucky draw", {
    body: d.body || "Tap to open the lucky draw.",
    icon: "assets/icon-192.png",
    badge: "assets/icon-192.png",
    tag: d.tag || "dn",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of tabs) {
      if (c.url.includes("/luckydraw")) { try { await c.navigate(url); } catch (_) {} return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
