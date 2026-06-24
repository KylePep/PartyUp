import { useState } from 'react';
import { usePushSubscription } from '../../hooks/usePushSubscription';

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function PushPermissionBanner() {
  const { subscribe, isSupported } = usePushSubscription();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('push-banner-dismissed') === '1'
  );

  if (
    !isSupported ||
    dismissed ||
    Notification.permission === 'granted' ||
    Notification.permission === 'denied'
  ) {
    return null;
  }

  const ios = isIos();
  const installed = isStandalone();
  const iosNotInstalled = ios && !installed;

  function dismiss() {
    localStorage.setItem('push-banner-dismissed', '1');
    setDismissed(true);
  }

  async function handleEnable() {
    const granted = await subscribe();
    if (granted) dismiss();
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 p-4 flex flex-col gap-2"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {iosNotInstalled ? (
        <>
          <p className="text-sm font-semibold text-text">
            Install PartyUp to enable notifications
          </p>
          <p className="text-xs text-muted">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then reopen the app
            to turn on match alerts.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-text">Stay in the loop</p>
          <p className="text-xs text-muted">
            Get notified when you match or receive a sticker, even when the app is closed.
            {ios && ' Works best when installed to your home screen.'}
          </p>
        </>
      )}
      <div className="flex items-center gap-4 mt-1">
        {!iosNotInstalled && (
          <button
            onClick={handleEnable}
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Enable Notifications
          </button>
        )}
        <button onClick={dismiss} className="text-xs text-muted underline">
          {iosNotInstalled ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
