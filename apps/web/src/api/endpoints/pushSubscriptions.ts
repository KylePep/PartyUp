import { API_BASE } from '../client';

export async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(`${API_BASE}/push-subscriptions/vapid-public-key`);
  const data = await response.json();
  return data.publicKey;
}

export async function registerPushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/push-subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify(sub),
  });
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/push-subscriptions`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: JSON.stringify({ endpoint }),
  });
}
