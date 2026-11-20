import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Polygon, Polyline } from "react-native-svg";

import type { WeighIn } from "../engine/types";
import { Row, T } from "./kit";
import { color } from "./theme";

export function WeightChart({ weights }: { weights: WeighIn[] }) {
  const [width, setWidth] = useState(0);
  const w = weights.slice(-16);
  if (w.length < 2) {
    return <T v="dim" style={{ fontSize: 13 }}>Starting weight {w[0]?.kg ?? "?"} kg. Your trend appears after the first Weekly Assessment.</T>;
  }
  const H = 96;
  const padX = 8;
  const padY = 14;
  const kgs = w.map((x) => x.kg);
  const lo = Math.min(...kgs) - 0.5;
  const hi = Math.max(...kgs) + 0.5;
  const pts = w.map((x, i) => [padX + (i * (width - 2 * padX)) / (w.length - 1), padY + ((hi - x.kg) * (H - 2 * padY)) / (hi - lo)]);
  const line = pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
  const last = pts[pts.length - 1];
  const diff = kgs[kgs.length - 1] - kgs[0];
  return (
    <View style={{ gap: 4 }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel={`Weight trend from ${kgs[0]} to ${kgs[kgs.length - 1]} kg`}>
        {width > 0 ? (
          <Svg width={width} height={H}>
            <Polygon points={`${padX},${H - 4} ${line} ${last[0].toFixed(1)},${H - 4}`} fill="rgba(92,200,255,0.12)" />
            <Polyline points={line} fill="none" stroke={color.glow} strokeWidth={2} />
            <Circle cx={last[0]} cy={last[1]} r={4} fill={color.glow} />
          </Svg>
        ) : (
          <View style={{ height: H }} />
        )}
      </View>
      <Row style={{ justifyContent: "space-between" }}>
        <T v="monoDim">{w[0].d}: {kgs[0]} kg</T>
        <T v="monoDim">
          {kgs[kgs.length - 1]} kg ({diff > 0 ? "+" : ""}
          {diff.toFixed(1)})
        </T>
      </Row>
    </View>
  );
}
