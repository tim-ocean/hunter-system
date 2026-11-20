import { View } from "react-native";

import type { Rank } from "../engine/types";
import { T } from "./kit";
import { font, rankColor } from "./theme";

export function RankBadge({ rank }: { rank: Rank }) {
  const tint = rankColor[rank];
  return (
    <View style={{ width: 34, height: 34, borderWidth: 1, borderColor: tint, alignItems: "center", justifyContent: "center" }}>
      <T style={{ fontFamily: font.displayBold, fontSize: 18, color: tint }}>{rank}</T>
    </View>
  );
}
