/* ReelCruiter service worker — handles Web Push when the app is closed or in the background. */

self.addEventListener("push", (event) => {
  let payload = { title: "ReelCruiter", body: "You have new activity", url: "/" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "ReelCruiter", {
      body: payload.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: payload.tag || "reelcruiter",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || "/";
  const absolute = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absolute);
      }
      return undefined;
    }),
  );
});
