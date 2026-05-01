// public/sw.js
self.addEventListener("push", (event) =>
{
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title ?? "Converso", {
            body: data.body,
            icon: "/images/logo.svg",
            badge: "/images/logo.svg",
            data: { url: data.url ?? "/dashboard" },
        })
    );
});

self.addEventListener("notificationclick", (event) =>
{
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) =>
        {
            const url = event.notification.data.url;
            const existing = clientList.find((c) => c.url === url && "focus" in c);
            if (existing) return existing.focus();
            return clients.openWindow(url);
        })
    );
});