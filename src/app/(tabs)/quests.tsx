import { useState } from "react";
import { Pressable, View } from "react-native";

import { addQuest, clearQuest, deleteQuest } from "../../engine/game";
import { AREAS, RANK_XP } from "../../engine/rules";
import type { Area, Rank } from "../../engine/types";
import { usePlayer } from "../../store/game";
import { Btn, Field, Pills, Row, Screen, T, Win } from "../../ui/kit";
import { AREA_OPTIONS, RANK_OPTIONS } from "../../ui/options";
import { RankBadge } from "../../ui/RankBadge";
import { areaColor, color } from "../../ui/theme";

const IDEAS: { title: string; area: Area; rank: Rank }[] = [
  { title: "Cook every meal at home for a week", area: "body", rank: "C" },
  { title: "Finish one online course module", area: "mind", rank: "D" },
  { title: "Cancel subscriptions I don't use", area: "wealth", rank: "D" },
  { title: "Ask for a raise or raise my rates", area: "wealth", rank: "A" },
  { title: "Book a health check-up", area: "body", rank: "E" },
];

export default function QuestsScreen() {
  const { state: s, act } = usePlayer();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>("body");
  const [rank, setRank] = useState<Rank>("D");
  const [showDone, setShowDone] = useState(false);
  const active = s.quests.filter((q) => !q.doneAt);
  const done = s.quests.filter((q) => q.doneAt).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  return (
    <Screen>
      <Win tag="NEW QUEST">
        <T v="dim" style={{ textAlign: "center" }}>One-off missions. Rank them by how hard they are for you right now.</T>
        <Field label="Quest" value={title} onChangeText={setTitle} placeholder="Cancel subscriptions I don't use" maxLength={100} />
        <Pills label="Area" options={AREA_OPTIONS} value={area} onChange={setArea} />
        <Pills label="Difficulty (XP)" options={RANK_OPTIONS} value={rank} onChange={setRank} />
        <Row style={{ justifyContent: "center" }}>
          <Btn
            label="Accept quest"
            size="lg"
            disabled={!title.trim()}
            onPress={() => {
              act(addQuest(title.trim(), area, rank));
              setTitle("");
            }}
          />
        </Row>
      </Win>

      <Win tag="ACTIVE QUESTS">
        {active.length === 0 ? (
          <View style={{ gap: 10 }}>
            <T v="dim" style={{ textAlign: "center" }}>No active quests. Accept one above, or pick a starter:</T>
            <Row style={{ justifyContent: "center", gap: 6 }}>
              {IDEAS.map((q) => (
                <Pressable
                  key={q.title}
                  onPress={() => (setTitle(q.title), setArea(q.area), setRank(q.rank))}
                  style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderStyle: "dashed", borderColor: color.faint }}
                >
                  <T v="dim" style={{ fontSize: 13 }}>{q.title}</T>
                </Pressable>
              ))}
            </Row>
          </View>
        ) : (
          active.map((q) => (
            <View key={q.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderWidth: 1, borderColor: color.faint, backgroundColor: color.inset }}>
              <RankBadge rank={q.rank} />
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontSize: 16 }}>{q.title}</T>
                <T v="dim" style={{ fontSize: 12 }}>
                  <T v="dim" style={{ fontSize: 12, color: areaColor[q.area] }}>{AREAS[q.area].name}</T> · {RANK_XP[q.rank]} XP
                </T>
              </View>
              <View style={{ gap: 6 }}>
                <Btn label="Clear" size="sm" onPress={() => act(clearQuest(q.id))} />
                <Btn label="Abandon" kind="ghost" size="sm" onPress={() => act(deleteQuest(q.id))} accessibilityLabel={`Abandon ${q.title}`} />
              </View>
            </View>
          ))
        )}
        {done.length ? (
          <>
            <Btn label={`${showDone ? "Hide" : "Show"} cleared quests (${done.length})`} kind="ghost" size="sm" onPress={() => setShowDone(!showDone)} />
            {showDone
              ? done.slice(0, 30).map((q) => (
                  <View key={q.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", opacity: 0.7 }}>
                    <RankBadge rank={q.rank} />
                    <View style={{ flex: 1 }}>
                      <T v="dim">{q.title}</T>
                      <T v="dim" style={{ fontSize: 12 }}>
                        Cleared {new Date(q.doneAt!).toLocaleDateString()} · +{q.xp} XP
                      </T>
                    </View>
                  </View>
                ))
              : null}
          </>
        ) : null}
      </Win>
    </Screen>
  );
}
