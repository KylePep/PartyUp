self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'PartyUp';
  const options = {
    body: data.body ?? '',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    data: data.data ?? {}
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const appFocused = clients.some(c => c.focused);
      if (appFocused) return;
      const tasks = [self.registration.showNotification(title, options)];
      if (navigator.setAppBadge) tasks.push(navigator.setAppBadge(1));
      return Promise.all(tasks);
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
