// src/lib/facebookSdk.ts
//
// Loads the Facebook JS SDK once and initializes it.
// Required ONLY for WhatsApp Embedded Signup (FB.login popup).
// Facebook/Instagram page-posting do NOT need this — they use
// a plain server-side OAuth redirect instead (see Posters.tsx).

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string): Promise<void> {
  if (!appId) {
    // Fail loudly and immediately instead of letting FB.init
    // silently misbehave with an undefined/blank App ID -
    // this is the #1 cause of "FB.login is not a function"
    // even though sdk.js itself loaded fine.
    return Promise.reject(
      new Error('VITE_META_APP_ID is missing — check your frontend .env')
    );
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    // If the SDK script never calls fbAsyncInit within 10s (blocked
    // by an ad blocker, CSP, or network issue), fail instead of
    // hanging forever on a spinner with no explanation.
    const timeout = setTimeout(() => {
      reject(new Error('Facebook SDK did not initialize (timed out after 10s)'));
    }, 10000);

    window.fbAsyncInit = () => {
      clearTimeout(timeout);
      try {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: false,
          version: 'v24.0',
        });
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error('FB.init failed'));
      }
    };

    if (document.getElementById('facebook-jssdk')) {
      // Script tag already present from a previous mount — fbAsyncInit
      // above will still fire once it loads (or the timeout above
      // will catch it if that never happens).
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load the Facebook SDK script (network/CSP blocked it)'));
    };
    document.body.appendChild(script);
  });

  // Don't cache a rejected promise — let the next call retry from scratch.
  sdkPromise.catch(() => {
    sdkPromise = null;
  });

  return sdkPromise;
}