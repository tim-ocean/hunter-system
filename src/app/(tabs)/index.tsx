import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { addDays, dayKey, parseKey } from "../../engine/dates";
import { currentPlan, equipTitle } from "../../engine/game";
import { BODY_GOALS } from "../../engine/program";
import { AREAS, AREA_KEYS, TITLES, areaCost, bestStreak, currentStreak, hunterRank, levelFrom, overallCost, totalXp } from "../../engine/rules";
import { usePlayer } from "../../store/game";
import { Bar, Btn, Row, Rule, Screen, Stat, T, Win } from "../../ui/kit";
import { WeightChart } from "../../ui/WeightChart";
import { areaColor, color, font } from "../../ui/theme";

const n = (x: number) => x.toLocaleString("en-US");

export default function StatusScreen() {
  const { state: s, today, act } = usePlayer();
  const lv = levelFrom(totalXp(s), overallCost);
  const title = TITLES.find((t) => t.id === s.title)?.name ?? "None";
  const plan = currentPlan(s);

  return (
    <Screen>
      <T style={{ fontFamily: font.displayBold, letterSpacing: 3.6, color: color.glow, fontSize: 15 }}>THE SYSTEM</T>

      <Win tag="STATUS">
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <View style={{ alignItems: "center", paddingRight: 16, borderRightWidth: 1, borderRightColor: color.faint }}>
            <T v="big">{lv.level}</T>
            <T v="label">Level</T>
          </View>
          <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
            <KV k="Name" v={s.name} />
            <KV k="Title" v={title} />
            <Row style={{ gap: 8 }}>
              <T v="label">Rank</T>
              <View style={{ borderWidth: 1, borderColor: color.glow, paddingHorizontal: 8 }}>
                <T style={{ fontFamily: font.displayBold, color: color.glow, fontSize: 17 }}>{hunterRank(lv.level)}</T>
              </View>
              <T v="label" style={{ marginLeft: 6 }}>Streak</T>
              <T v="mono" style={{ fontSize: 16 }}>{currentStreak(s, today)}d</T>
            </Row>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Bar value={lv.into} max={lv.need} />
          <Row style={{ justifyContent: "space-between" }}>
            <T v="monoDim">EXP</T>
            <T v="monoDim">{n(lv.into)} / {n(lv.need)}</T>
          </Row>
        </View>
        {s.penalty ? <T style={{ color: color.danger, textAlign: "center" }}>Penalty Trial active. XP gains are halved. Clear it on the Daily tab.</T> : null}
        <Rule />
        {AREA_KEYS.map((a) => {
          const L = levelFrom(s.xp[a], areaCost);
          return (
            <View key={a} style={{ gap: 6, padding: 12, borderWidth: 1, borderColor: color.faint, backgroundColor: color.inset }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T v="h3" style={{ color: areaColor[a] }}>{AREAS[a].name}</T>
                <T v="mono">Lv {L.level}</T>
              </Row>
              <T v="label" style={{ fontSize: 11 }}>{AREAS[a].stats}</T>
              <Bar value={L.into} max={L.need} tint={areaColor[a]} />
              <Row style={{ justifyContent: "space-between" }}>
                <T v="monoDim">{n(s.xp[a])} XP</T>
                <T v="monoDim">{n(L.need - L.into)} to next</T>
              </Row>
            </View>
          );
        })}
      </Win>

      {plan && s.profile && s.program ? (
        <Win tag="PROGRAM">
          <Row style={{ gap: 10, alignItems: "stretch" }}>
            <Stat label="Goal" value={BODY_GOALS[s.profile.goal]} text />
            <Stat label="Stage" value={String(s.program.stage + 1)} />
            <Stat label="Calories" value={`${n(plan.kcal)} kcal`} />
            <Stat label="Protein" value={`${plan.protein} g`} />
            <Stat label="Next assessment" value={parseKey(s.program.nextCheckin).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          </Row>
          <WeightChart weights={s.weights} />
        </Win>
      ) : (
        <Win tag="ASSESSMENT REQUIRED" bang>
          <T v="dim" style={{ textAlign: "center" }}>Tell the System about your body, time and money goals, and it will build quests that fit you.</T>
          <Row style={{ justifyContent: "center" }}>
            <Btn label="Start assessment" size="lg" onPress={() => router.push("/assessment")} />
          </Row>
        </Win>
      )}

      <Win tag="RECORD">
        <Calendar />
        <Row style={{ gap: 14 }}>
          <Legend tint={color.glow} label="Cleared" />
          <Legend tint="rgba(92,200,255,0.35)" label="Partial" />
          <Legend tint="rgba(255,65,87,0.45)" label="Failed" />
          <T v="dim" style={{ fontSize: 12 }}>Best streak {bestStreak(s)}d</T>
        </Row>
      </Win>

      <Win tag="TITLES">
        <T v="dim" style={{ textAlign: "center" }}>Tap an acquired title to equip it.</T>
        <View style={{ gap: 8 }}>
          {TITLES.map((t) => {
            const has = s.titles.includes(t.id);
            const on = s.title === t.id;
            return (
              <Pressable
                key={t.id}
                disabled={!has}
                onPress={() => act(equipTitle(t.id))}
                accessibilityRole="button"
                accessibilityState={{ disabled: !has, selected: on }}
                style={{ padding: 12, borderWidth: 1, borderColor: on ? color.glow : color.faint, opacity: has ? 1 : 0.45, gap: 2 }}
              >
                <T style={{ fontFamily: font.display, fontSize: 16 }}>{has ? t.name : "???"}</T>
                <T v="dim" style={{ fontSize: 12 }}>{t.how}</T>
              </Pressable>
            );
          })}
        </View>
      </Win>
    </Screen>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <Row style={{ gap: 8, flexWrap: "nowrap" }}>
      <T v="label">{k}</T>
      <T style={{ fontFamily: font.display, fontSize: 17, flexShrink: 1 }} numberOfLines={2}>{v}</T>
    </Row>
  );
}

function Legend({ tint, label }: { tint: string; label: string }) {
  return (
    <Row style={{ gap: 6 }}>
      <View style={{ width: 10, height: 10, backgroundColor: tint }} />
      <T v="dim" style={{ fontSize: 12 }}>{label}</T>
    </Row>
  );
}

/** Five weeks ending this Sunday, weeks starting Monday. */
function Calendar() {
  const { state: s, today } = usePlayer();
  const end = parseKey(today);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  const endKey = dayKey(end);
  const weeks = [0, 1, 2, 3, 4].map((w) => [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(endKey, -(34 - (w * 7 + d)))));
  return (
    <View style={{ gap: 4 }} accessibilityLabel="Daily Quest record, last five weeks">
      {weeks.map((week, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 4 }}>
          {week.map((k) => {
            const rec = s.days[k];
            let bg: string = color.faint;
            let opacity = 0.6;
            if (k > today || k < s.createdDay) opacity = 0.18;
            else if (rec?.cleared) (bg = color.glow), (opacity = 1);
            else if (rec?.done.length) (bg = "rgba(92,200,255,0.35)"), (opacity = 1);
            else if (k < today && k !== s.createdDay) (bg = "rgba(255,65,87,0.45)"), (opacity = 1);
            return (
              <View
                key={k}
                style={{ flex: 1, aspectRatio: 1, backgroundColor: bg, opacity, borderWidth: k === today ? 1 : 0, borderColor: "#fff" }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
