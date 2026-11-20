import { useState } from "react";
import { Pressable, View } from "react-native";

import { addGate, deleteGate, logGate } from "../../engine/game";
import { GATE_CLEAR_MULT } from "../../engine/rules";
import type { Area, Gate, Rank } from "../../engine/types";
import { usePlayer } from "../../store/game";
import { Bar, Btn, Field, Pills, Row, Screen, T, Win } from "../../ui/kit";
import { AREA_OPTIONS, RANK_OPTIONS } from "../../ui/options";
import { RankBadge } from "../../ui/RankBadge";
import { color } from "../../ui/theme";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const num = (s: string) => parseFloat(s.replace(",", "."));

const IDEAS: { title: string; area: Area; rank: Rank; goal: number; unit: string }[] = [
  { title: "Emergency fund: 3 months of expenses", area: "wealth", rank: "A", goal: 6000, unit: "$" },
  { title: "Read 12 books", area: "mind", rank: "B", goal: 12, unit: "books" },
  { title: "Walk 300 km", area: "body", rank: "B", goal: 300, unit: "km" },
  { title: "Pay off a credit card", area: "wealth", rank: "B", goal: 1500, unit: "$" },
];

export default function GatesScreen() {
  const { state: s, act } = usePlayer();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("");
  const [area, setArea] = useState<Area>("wealth");
  const [rank, setRank] = useState<Rank>("B");
  const open = s.gates.filter((g) => !g.clearedAt);
  const cleared = s.gates.filter((g) => g.clearedAt);
  const valid = title.trim() && num(goal) > 0;

  return (
    <Screen>
      <Win tag="OPEN A GATE">
        <T v="dim" style={{ textAlign: "center" }}>
          Gates are long goals with a number to beat. Log progress to drain the boss's HP; clearing pays {GATE_CLEAR_MULT}× the rank reward.
        </T>
        <Field label="Goal" value={title} onChangeText={setTitle} placeholder="Emergency fund: 3 months of expenses" maxLength={100} />
        <Row style={{ alignItems: "flex-start" }}>
          <Field label="Target" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="6000" />
          <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="$" maxLength={12} />
        </Row>
        <Pills label="Area" options={AREA_OPTIONS} value={area} onChange={setArea} />
        <Pills label="Rank (XP)" options={RANK_OPTIONS} value={rank} onChange={setRank} />
        <Row style={{ justifyContent: "center" }}>
          <Btn
            label="Enter the gate"
            size="lg"
            disabled={!valid}
            onPress={() => {
              act(addGate({ title: title.trim(), goal: num(goal), unit: unit.trim(), area, rank }));
              setTitle("");
              setGoal("");
              setUnit("");
            }}
          />
        </Row>
        {open.length === 0 ? (
          <Row style={{ justifyContent: "center", gap: 6 }}>
            {IDEAS.map((g) => (
              <Pressable
                key={g.title}
                onPress={() => (setTitle(g.title), setGoal(String(g.goal)), setUnit(g.unit), setArea(g.area), setRank(g.rank))}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderStyle: "dashed", borderColor: color.faint }}
              >
                <T v="dim" style={{ fontSize: 13 }}>{g.title}</T>
              </Pressable>
            ))}
          </Row>
        ) : null}
      </Win>

      <Win tag="ACTIVE GATES">
        {open.length === 0 ? <T v="dim" style={{ textAlign: "center" }}>No open gates. Pick an idea above and edit the numbers to fit you.</T> : null}
        {open.map((g) => (
          <GateCard key={g.id} g={g} onLog={(n) => act(logGate(g.id, n))} onClose={() => act(deleteGate(g.id))} />
        ))}
        {cleared.length ? <T v="label">Cleared gates</T> : null}
        {cleared.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", opacity: 0.7 }}>
            <RankBadge rank={g.rank} />
            <View style={{ flex: 1 }}>
              <T v="dim">{g.title}</T>
              <T v="dim" style={{ fontSize: 12 }}>
                {fmt(g.goal)} {g.unit} · cleared {new Date(g.clearedAt!).toLocaleDateString()}
              </T>
            </View>
          </View>
        ))}
      </Win>
    </Screen>
  );
}

function GateCard({ g, onLog, onClose }: { g: Gate; onLog: (n: number) => void; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 12, borderWidth: 1, borderColor: color.faint, backgroundColor: color.inset }}>
      <RankBadge rank={g.rank} />
      <View style={{ flex: 1, gap: 8 }}>
        <T style={{ fontSize: 16 }}>{g.title}</T>
        <Bar value={g.goal - g.progress} max={g.goal} tint={color.danger} />
        <Row style={{ justifyContent: "space-between" }}>
          <T v="monoDim">
            Boss HP {fmt(g.goal - g.progress)} {g.unit}
          </T>
          <T v="monoDim">
            {fmt(g.progress)} / {fmt(g.goal)} {g.unit}
          </T>
        </Row>
        {g.auto ? (
          <T v="dim" style={{ fontSize: 12 }}>Updates from your Weekly Assessment.</T>
        ) : (
          <Row style={{ alignItems: "flex-end" }}>
            <Field label="Progress" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="+ amount" style={{ flexBasis: 100 }} />
            <Btn
              label="Attack"
              disabled={!(num(amount) > 0)}
              onPress={() => {
                onLog(num(amount));
                setAmount("");
              }}
            />
          </Row>
        )}
        <Row style={{ justifyContent: "flex-end" }}>
          <Btn label="Close gate" kind="ghost" size="sm" onPress={onClose} accessibilityLabel={`Close ${g.title}`} />
        </Row>
      </View>
    </View>
  );
}
