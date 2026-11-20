import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { DOW, pad } from "../../engine/dates";
import {
  addDaily,
  checkinDue,
  clearPenalty,
  currentPlan,
  dailiesFor,
  editDaily,
  removeDaily,
  setPenaltyText,
  toggleDaily,
  weeklyCheckin,
} from "../../engine/game";
import { sessionFor } from "../../engine/program";
import { AREAS, AREA_KEYS, CLEAR_BONUS, DAILY_XP } from "../../engine/rules";
import type { Area, Daily } from "../../engine/types";
import { usePlayer } from "../../store/game";
import { Btn, Field, Pills, Row, Screen, Stat, T, Win } from "../../ui/kit";
import { AREA_OPTIONS } from "../../ui/options";
import { areaColor, color, font } from "../../ui/theme";

export default function DailyScreen() {
  const { state: s, today, act } = usePlayer();
  const [editing, setEditing] = useState(false);
  const plan = currentPlan(s);

  return (
    <Screen>
      {s.profile && checkinDue(s, today) ? <Checkin /> : null}
      {!s.profile ? (
        <Win tag="ASSESSMENT REQUIRED" bang>
          <T v="dim" style={{ textAlign: "center" }}>Take the Player Assessment and the System will build a program around your body, time and money goals.</T>
          <Row style={{ justifyContent: "center" }}>
            <Btn label="Start assessment" size="lg" onPress={() => router.push("/assessment")} />
          </Row>
        </Win>
      ) : null}
      {s.penalty ? (
        <Win tag="PENALTY QUEST" bang tone="red">
          <T v="title">Clear the Penalty Trial</T>
          <T v="dim" style={{ textAlign: "center" }}>Issued for the missed Daily Quest on {s.penalty.since}.</T>
          <T style={{ textAlign: "center" }}>{s.penalty.text}</T>
          <T style={{ color: color.danger, textAlign: "center" }}>XP gains are halved until you clear this.</T>
          <Row style={{ justifyContent: "center" }}>
            <Btn label="I survived" kind="red" size="lg" onPress={() => act(clearPenalty)} />
          </Row>
        </Win>
      ) : null}
      {editing ? <EditGoals onDone={() => setEditing(false)} /> : <Quest onEdit={() => setEditing(true)} />}
      {plan && s.profile && !editing ? <Training /> : null}
    </Screen>
  );
}

function Quest({ onEdit }: { onEdit: () => void }) {
  const { state: s, today, act } = usePlayer();
  const rec = s.days[today];
  const todays = dailiesFor(s, today);
  const done = todays.filter((d) => rec?.done.includes(d.id)).length;

  return (
    <Win tag="QUEST INFO" bang>
      <T v="title">Daily Quest: Forge Your Strength</T>
      <T v="dim" style={{ textAlign: "center" }}>
        Goals {done}/{todays.length}
      </T>
      {todays.length === 0 ? <T v="dim" style={{ textAlign: "center" }}>No goals today. Add a few to start leveling.</T> : null}
      {AREA_KEYS.map((a) => {
        const list = todays.filter((d) => d.area === a);
        if (!list.length) return null;
        return (
          <View key={a} style={{ gap: 2 }}>
            <T v="label" style={{ color: areaColor[a] }}>{AREAS[a].name}</T>
            {list.map((d) => (
              <Goal key={d.id} d={d} done={!!rec?.done.includes(d.id)} onPress={() => act(toggleDaily(d.id))} />
            ))}
          </View>
        );
      })}
      <T style={{ color: color.danger, textAlign: "center", fontSize: 14 }}>
        WARNING: Goals left unfinished at midnight trigger a Penalty Trial.
      </T>
      <Countdown />
      <T v="dim" style={{ textAlign: "center" }}>
        Reward: {DAILY_XP} XP per goal, +{CLEAR_BONUS} XP clear bonus{s.penalty ? " (halved)" : ""}
      </T>
      <Row style={{ justifyContent: "center" }}>
        <Btn label="Edit goals" kind="ghost" onPress={onEdit} />
      </Row>
    </Win>
  );
}

function Goal({ d, done, onPress }: { d: Daily; done: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${d.title}, ${d.target}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.faint }}
    >
      <T style={{ flex: 1, fontSize: 16, color: done ? color.dim : color.text }}>{d.title}</T>
      <T v="mono" style={{ color: done ? color.ok : color.dim }}>{done ? "[COMPLETE]" : d.target}</T>
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: done ? color.ok : color.dim,
          backgroundColor: done ? "rgba(75,227,164,0.15)" : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <T style={{ color: color.ok, fontFamily: font.bodySemi, fontSize: 14, lineHeight: 16 }}>✓</T> : null}
      </View>
    </Pressable>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const left = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000));
  return (
    <T v="monoDim" style={{ textAlign: "center", fontSize: 13 }}>
      Time remaining {pad(Math.floor(left / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
    </T>
  );
}

function Training() {
  const { state: s, today } = usePlayer();
  const plan = currentPlan(s)!;
  const session = sessionFor(s.profile!, plan, today);
  return (
    <Win tag={session ? `TRAINING · SESSION ${session.letter}` : "RECOVERY DAY"}>
      {session ? (
        <>
          <View>
            {session.exercises.map(([name, dose]) => (
              <Row key={name} style={{ justifyContent: "space-between", flexWrap: "nowrap", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.faint }}>
                <T style={{ flexShrink: 1 }}>{name}</T>
                <T v="monoDim">{dose}</T>
              </Row>
            ))}
          </View>
          <T v="dim" style={{ fontSize: 13 }}>
            Warm up 5-10 min. Pick a weight where the last 2 reps are hard but clean. When you hit the top of the range on every set, add a little weight next time. Rest 90 s between sets.
          </T>
        </>
      ) : (
        <T v="dim" style={{ textAlign: "center" }}>
          No lifting today. Hit your steps{s.profile!.difficulty === 3 ? " and cardio" : " and stretch"} so you recover for the next session (
          {plan.trainDays.map((x) => DOW[x]).join(", ")}).
        </T>
      )}
      <Row style={{ gap: 10, alignItems: "stretch" }}>
        <Stat label="Calories" value={plan.kcal.toLocaleString("en-US")} />
        <Stat label="Protein" value={`${plan.protein} g`} />
        <Stat label="Steps" value={plan.steps.toLocaleString("en-US")} />
        <Stat label="Water" value={`${plan.water} L`} />
      </Row>
    </Win>
  );
}

function Checkin() {
  const { state: s, act } = usePlayer();
  const [kg, setKg] = useState("");
  const [waist, setWaist] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const k = parseFloat(kg.replace(",", "."));
    const w = parseFloat(waist.replace(",", ".")) || null;
    if (!(k >= 35 && k <= 300)) return setError("Enter your weight in kilograms.");
    setError("");
    act(weeklyCheckin(k, w));
  };
  return (
    <Win tag="WEEKLY ASSESSMENT" bang>
      <T v="title">Report your measurements</T>
      <T v="dim" style={{ textAlign: "center" }}>Weigh in the morning, after the bathroom, before eating. The System will adjust your program to your progress.</T>
      <Row style={{ alignItems: "flex-start" }}>
        <Field label="Weight, kg" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={String(s.profile!.weightKg)} />
        <Field label="Waist, cm" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder={s.profile!.waistCm ? String(s.profile!.waistCm) : "optional"} />
      </Row>
      {error ? <T style={{ color: color.danger }}>{error}</T> : null}
      <Row style={{ justifyContent: "center" }}>
        <Btn label="Submit · +20 XP" size="lg" onPress={submit} />
      </Row>
    </Win>
  );
}

function EditGoals({ onDone }: { onDone: () => void }) {
  const { state: s, act } = usePlayer();
  const [drafts, setDrafts] = useState(() => Object.fromEntries(s.dailies.map((d) => [d.id, { area: d.area, title: d.title, target: d.target }])));
  const [penalty, setPenalty] = useState(s.penaltyText);
  const [newGoal, setNewGoal] = useState({ area: "body" as Area, title: "", target: "" });

  const save = () => {
    for (const d of s.dailies) {
      const draft = drafts[d.id];
      if (draft) act(editDaily(d.id, { ...draft, title: draft.title.trim() || d.title, target: draft.target.trim() }));
    }
    act(setPenaltyText(penalty.trim()));
    onDone();
  };

  return (
    <Win tag="EDIT DAILY QUEST">
      <T v="dim" style={{ textAlign: "center" }}>
        Each goal is worth {DAILY_XP} XP, plus a {CLEAR_BONUS} XP bonus when all of the day's goals are done.
      </T>
      {s.dailies.map((d) => {
        const draft = drafts[d.id] ?? d;
        const set = (patch: Partial<typeof draft>) => setDrafts((all) => ({ ...all, [d.id]: { ...draft, ...patch } }));
        return (
          <View key={d.id} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: color.faint }}>
            <Row style={{ alignItems: "flex-end" }}>
              <Field label="Goal" value={draft.title} onChangeText={(title) => set({ title })} maxLength={80} style={{ flexBasis: 200 }} />
              <Field label="Target" value={draft.target} onChangeText={(target) => set({ target })} maxLength={24} style={{ flexBasis: 90 }} />
            </Row>
            <Row style={{ justifyContent: "space-between" }}>
              <Pills options={AREA_OPTIONS} value={draft.area} onChange={(area) => set({ area })} />
              <Row>
                <T v="dim" style={{ fontSize: 12 }}>{d.dow ? d.dow.map((x) => DOW[x]).join(" ") : "Daily"}</T>
                <Btn label="Remove" kind="ghost" size="sm" onPress={() => act(removeDaily(d.id))} accessibilityLabel={`Remove ${d.title}`} />
              </Row>
            </Row>
          </View>
        );
      })}
      <T v="label">Add a goal</T>
      <Row style={{ alignItems: "flex-end" }}>
        <Field label="New goal" value={newGoal.title} onChangeText={(title) => setNewGoal({ ...newGoal, title })} placeholder="Stretch before bed" maxLength={80} style={{ flexBasis: 200 }} />
        <Field label="Target" value={newGoal.target} onChangeText={(target) => setNewGoal({ ...newGoal, target })} placeholder="10 min" maxLength={24} style={{ flexBasis: 90 }} />
      </Row>
      <Row style={{ justifyContent: "space-between" }}>
        <Pills options={AREA_OPTIONS} value={newGoal.area} onChange={(area) => setNewGoal({ ...newGoal, area })} />
        <Btn
          label="Add"
          disabled={!newGoal.title.trim()}
          onPress={() => {
            act(addDaily({ area: newGoal.area, title: newGoal.title.trim(), target: newGoal.target.trim() }));
            setNewGoal({ ...newGoal, title: "", target: "" });
          }}
        />
      </Row>
      <Field label="Penalty for a missed day" value={penalty} onChangeText={setPenalty} multiline maxLength={240} />
      <Row style={{ justifyContent: "center" }}>
        <Btn label="Cancel" kind="ghost" size="lg" onPress={onDone} />
        <Btn label="Save goals" size="lg" onPress={save} />
      </Row>
    </Win>
  );
}
