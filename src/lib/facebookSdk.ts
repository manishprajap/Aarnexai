// src/lib/facebookSdk.ts
//
// Loads the Facebook JS SDK once and initializes it.
// Required ONLY for WhatsApp Embedded Signup (FB.login).
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
    return Promise.reject(
      new Error(
        'VITE_META_APP_ID is missing — check your frontend .env'
      )
    );
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(
        new Error(
          'Facebook SDK did not initialize (timed out after 10s)'
        )
      );
    }, 10000);

    window.fbAsyncInit = () => {
      clearTimeout(timeout);

      try {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: false,

          // Keep this synchronized with backend META_GRAPH_VERSION
          version: 'v26.0',
        });

        resolve();
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('FB.init failed')
        );
      }
    };

    if (document.getElementById('facebook-jssdk')) {
      return;
    }

    const script = document.createElement('script');

    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      clearTimeout(timeout);

      reject(
        new Error(
          'Failed to load the Facebook SDK script (network/CSP blocked it)'
        )
      );
    };

    document.body.appendChild(script);
  });

  // Allow retry if initialization fails.
  sdkPromise.catch(() => {
    sdkPromise = null;
  });

  return sdkPromise;
}