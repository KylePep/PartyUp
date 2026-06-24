import { useState, useEffect } from 'react';
import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from '../api/endpoints/pushSubscriptions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export function usePushSubscription() {
  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(sub !== null);
      });
    });
  }, [isSupported]);

  async function subscribe(): Promise<boolean> {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const publicKey = await getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    await registerPushSubscription({
      endpoint: json.endpoint!,
      p256dh: (json.keys as Record<string, string>).p256dh,
      auth: (json.keys as Record<string, string>).auth,
    });

    setIsSubscribed(true);
    return true;
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await unregisterPushSubscription(endpoint);
    setIsSubscribed(false);
  }

  return { subscribe, unsubscribe, isSubscribed, isSupported };
}
