// A horizontal slider built on a touch responder (React Native has no slider of its own; this saves a native
// module). Values are continuous between min and max.

import { useRef, useState } from "react";
import { View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";

export function Slider({ min, max, value, onChange }: { min: number; max: number; value: number; onChange: (v: number) => void }) {
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  const frac = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

  const at = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    const f = Math.min(1, Math.max(0, e.nativeEvent.locationX / width));
    // Two decimals is all a label shows; it also keeps a drag from sending a message per pixel.
    const v = Math.round((min + f * (max - min)) * 100) / 100;
    if (v !== last.current) {
      last.current = v;
      onChange(v);
    }
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={at}
      onResponderMove={at}
      className="h-8 justify-center"
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
    >
      <View pointerEvents="none" className="h-1.5 rounded-full bg-tag">
        <View className="h-1.5 rounded-full bg-primary" style={{ width: `${frac * 100}%` }} />
      </View>
      <View pointerEvents="none" className="absolute h-5 w-5 rounded-full border-2 border-primary bg-ink" style={{ left: Math.max(0, frac * width - 10) }} />
    </View>
  );
}
