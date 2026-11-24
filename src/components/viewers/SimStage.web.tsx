// The simulation's stage in a browser: the page in an iframe's srcdoc, with slider values posted to it as
// UPDATE_PARAMS, exactly as the website's studio does.

import { createElement, forwardRef, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import type { SimStageHandle } from "./SimStage";

export type { SimStageHandle };

export const SimStage = forwardRef<SimStageHandle, { html: string; onReady?: () => void }>(function SimStage({ html, onReady }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  useImperativeHandle(
    ref,
    () => ({ pushParams: (params) => frame.current?.contentWindow?.postMessage({ type: "UPDATE_PARAMS", params }, "*") }),
    [],
  );
  return (
    <View className="flex-1 overflow-hidden bg-black">
      {createElement("iframe", {
        ref: frame,
        srcDoc: html,
        onLoad: onReady,
        title: "Simulation",
        sandbox: "allow-scripts",
        style: { border: 0, width: "100%", height: "100%", background: "#000" },
      })}
    </View>
  );
});
