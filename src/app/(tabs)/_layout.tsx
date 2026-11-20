import { router } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useEffect, useRef } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { checkinDue } from "../../engine/game";
import { usePlayer } from "../../store/game";
import { color, font } from "../../ui/theme";

type IconName = "status" | "daily" | "quests" | "gates" | "system";

function TabIcon({ name, tint }: { name: IconName; tint: string }) {
  const p = { stroke: tint, strokeWidth: 1.6, fill: "none" } as const;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === "status" && (
        <>
          <Rect x={3} y={4} width={18} height={16} {...p} />
          <Path d="M7 9h6M7 13h10M7 17h8" {...p} />
        </>
      )}
      {name === "daily" && (
        <>
          <Rect x={4} y={4} width={16} height={16} {...p} />
          <Path d="M12 7.5v6.5" {...p} />
          <Circle cx={12} cy={17} r={0.9} fill={tint} />
        </>
      )}
      {name === "quests" && <Path d="M6 3h9l3 3v15H6z M9 9h6M9 13h6M9 17h4" {...p} />}
      {name === "gates" && (
        <>
          <Path d="M12 2l8 10-8 10-8-10z" {...p} />
          <Circle cx={12} cy={12} r={3} {...p} />
        </>
      )}
      {name === "system" && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...p} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...p} />
        </>
      )}
    </Svg>
  );
}

export default function TabsLayout() {
  const { state, today } = usePlayer();
  const asked = useRef(false);

  // A new Player goes straight to the assessment, once.
  useEffect(() => {
    if (!state.profile && !asked.current) {
      asked.current = true;
      setTimeout(() => router.push("/assessment"), 0);
    }
  }, [state.profile]);

  const rec = state.days[today];
  const dailyOpen = !!state.penalty || !rec?.cleared || checkinDue(state, today);

  const icon = (name: IconName) => ({ focused }: { focused: boolean }) => <TabIcon name={name} tint={focused ? color.text : color.dim} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.void },
        tabBarStyle: { backgroundColor: "rgba(6, 10, 19, 0.98)", borderTopColor: "rgba(58, 141, 255, 0.45)" },
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.dim,
        tabBarLabelStyle: { fontFamily: font.display, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Status", tabBarIcon: icon("status") }} />
      <Tabs.Screen
        name="daily"
        options={{
          title: "Daily",
          tabBarIcon: icon("daily"),
          tabBarBadge: dailyOpen ? "" : undefined,
          tabBarBadgeStyle: { backgroundColor: color.danger, minWidth: 9, maxHeight: 9, borderRadius: 5, marginTop: 4 },
        }}
      />
      <Tabs.Screen name="quests" options={{ title: "Quests", tabBarIcon: icon("quests") }} />
      <Tabs.Screen name="gates" options={{ title: "Gates", tabBarIcon: icon("gates") }} />
      <Tabs.Screen name="system" options={{ title: "System", tabBarIcon: icon("system") }} />
    </Tabs>
  );
}
