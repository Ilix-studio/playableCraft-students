// The invisible reCAPTCHA in a browser: rendered into this page itself, whose origin must be one of the Firebase
// project's authorised domains (localhost is, by default).

import { useEffect, useEffectEvent } from "react";
import { View } from "react-native";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (f: () => void) => void;
      render: (el: HTMLElement, o: Record<string, unknown>) => number;
      execute: (id: number) => void;
    };
  }
}

function loadScript(): Promise<void> {
  if (window.grecaptcha) return new Promise((r) => window.grecaptcha!.ready(r));
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    s.async = true;
    s.onload = () => window.grecaptcha!.ready(resolve);
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

export function Recaptcha({ siteKey, onResult }: { siteKey: string; onResult: (r: { token?: string; error?: string }) => void }) {
  const report = useEffectEvent(onResult);
  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    loadScript()
      .then(() => {
        const id = window.grecaptcha!.render(el, {
          sitekey: siteKey,
          size: "invisible",
          callback: (token: string) => report({ token }),
          "error-callback": () => report({ error: "The security check failed. Please try again." }),
        });
        window.grecaptcha!.execute(id);
      })
      .catch(() => report({ error: "The security check could not load. Check your connection." }));
    return () => el.remove();
  }, [siteKey]);
  return <View />;
}
