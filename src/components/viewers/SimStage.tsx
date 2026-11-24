// The simulation's stage on a phone: the page in a WebView. Slider values are pushed in with the same
// UPDATE_PARAMS message the website's studio posts to its iframe.

import { forwardRef, useImperativeHandle, useRef, type ComponentType, type Ref } from "react";
import { View } from "react-native";
import { WebView, type WebViewProps } from "react-native-webview";

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

// The package's platform-neutral typings omit the ref its Android and iOS components forward.
const StageWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export interface SimStageHandle {
  pushParams: (params: Record<string, number>) => void;
}

const paramsScript = (params: Record<string, number>) => `(function() {
  var p = ${JSON.stringify(params)};
  try {
    if (window.params && typeof window.params === 'object') Object.assign(window.params, p);
    else if (typeof params === 'object' && params) { Object.assign(params, p); window.params = params; }
  } catch (e) {}
  window.postMessage({ type: 'UPDATE_PARAMS', params: p }, '*');
})(); true;`;

export const SimStage = forwardRef<SimStageHandle, { html: string; onReady?: () => void }>(function SimStage({ html, onReady }, ref) {
  const web = useRef<WebViewHandle>(null);
  useImperativeHandle(ref, () => ({ pushParams: (p) => web.current?.injectJavaScript(paramsScript(p)) }), []);
  return (
    <View className="flex-1 overflow-hidden bg-black">
      <StageWebView
        ref={web}
        source={{ html, baseUrl: "https://playablecraft.local/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        onLoadEnd={onReady}
        style={{ flex: 1, backgroundColor: "#000" }}
      />
    </View>
  );
});
