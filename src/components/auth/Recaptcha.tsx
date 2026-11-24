// The invisible reCAPTCHA Firebase asks for before it sends an SMS, run in a WebView whose page claims the
// project's auth domain (an authorised domain), the approach Expo's old expo-firebase-recaptcha took. It reports
// one token, or an error, and is unmounted after.

import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { AUTH_DOMAIN } from "@/lib/firebase";

export function recaptchaPage(siteKey: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:transparent">
<div id="c"></div>
<script>
  function post(m) { (window.ReactNativeWebView || window.parent).postMessage(JSON.stringify(m), "*"); }
  function onLoad() {
    try {
      var id = grecaptcha.render("c", {
        sitekey: ${JSON.stringify(siteKey)},
        size: "invisible",
        callback: function (token) { post({ token: token }); },
        "error-callback": function () { post({ error: "The security check failed. Please try again." }); },
        "expired-callback": function () { post({ error: "The security check expired. Please try again." }); }
      });
      grecaptcha.execute(id);
    } catch (e) { post({ error: "The security check could not start." }); }
  }
</script>
<script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit" async defer></script>
</body></html>`;
}

export function Recaptcha({ siteKey, onResult }: { siteKey: string; onResult: (r: { token?: string; error?: string }) => void }) {
  const html = useMemo(() => recaptchaPage(siteKey), [siteKey]);
  return (
    // A challenge may need to be shown, so the view has room; usually it passes invisibly.
    <View style={{ height: 420, marginBottom: 12 }}>
      <WebView
        source={{ html, baseUrl: `https://${AUTH_DOMAIN}` }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onMessage={(e) => {
          try {
            onResult(JSON.parse(e.nativeEvent.data));
          } catch {
            onResult({ error: "The security check failed. Please try again." });
          }
        }}
        onError={() => onResult({ error: "The security check could not load. Check your connection." })}
        style={{ backgroundColor: "transparent" }}
      />
    </View>
  );
}
