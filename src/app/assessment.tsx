import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { applyAssessment } from "../engine/game";
import { ACTIVITY, BODY_GOALS, DIFFICULTY, EQUIPMENT, EXPERIENCE, WEALTH_GOALS } from "../engine/program";
import type { Difficulty, MindMinutes, Profile } from "../engine/types";
import { usePlayer } from "../store/game";
import { Btn, Field, Pills, Row, Rule, Screen, T, Win } from "../ui/kit";
import { areaColor, color } from "../ui/theme";

type Form = Omit<Profile, "age" | "heightCm" | "weightKg" | "waistCm"> & { age: string; height: string; weight: string; waist: string; money: string };

const entries = <K extends string>(o: Record<K, string>) => Object.entries(o) as [K, string][];
const num = (s: string) => parseFloat(s.replace(",", "."));

export default function AssessmentScreen() {
  const { state, act } = usePlayer();
  const p = state.profile;
  const [f, setF] = useState<Form>({
    sex: p?.sex ?? "male",
    age: p ? String(p.age) : "",
    height: p ? String(p.heightCm) : "",
    weight: p ? String(p.weightKg) : "",
    waist: p?.waistCm ? String(p.waistCm) : "",
    goal: p?.goal ?? "recomp",
    activity: p?.activity ?? "light",
    experience: p?.experience ?? "new",
    equipment: p?.equipment ?? "gym",
    trainDays: p?.trainDays ?? 3,
    mindMinutes: p?.mindMinutes ?? 30,
    wealthGoal: p?.wealthGoal ?? "save",
    currency: p?.currency ?? "$",
    money: "",
    difficulty: p?.difficulty ?? 2,
  });
  const [error, setError] = useState("");
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    const { age, height, weight, waist, money: _money, ...picks } = f;
    const profile: Profile = {
      ...picks,
      age: num(age),
      heightCm: num(height),
      weightKg: num(weight),
      waistCm: num(waist) || null,
      currency: f.currency.trim() || "$",
    };
    if (!(profile.age >= 14 && profile.age <= 90)) return setError("Enter an age between 14 and 90.");
    if (!(profile.heightCm >= 120 && profile.heightCm <= 230)) return setError("Enter your height in centimeters.");
    if (!(profile.weightKg >= 35 && profile.weightKg <= 300)) return setError("Enter your weight in kilograms.");
    act(applyAssessment(profile, num(f.money) || 0));
    router.dismissTo("/daily");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: color.void }}>
      <Screen>
        <Win tag="PLAYER ASSESSMENT" bang>
          <T v="dim" style={{ textAlign: "center" }}>
            The System will measure you and build a program that fits. You can retake this any time from the System tab.
          </T>

          <T v="h3" style={{ color: areaColor.body, letterSpacing: 2.6 }}>BODY</T>
          <Pills label="Sex" options={[["male", "Male"], ["female", "Female"]] as [Profile["sex"], string][]} value={f.sex} onChange={set("sex")} />
          <Row style={{ alignItems: "flex-start" }}>
            <Field label="Age" value={f.age} onChangeText={set("age")} keyboardType="number-pad" placeholder="30" />
            <Field label="Height, cm" value={f.height} onChangeText={set("height")} keyboardType="decimal-pad" placeholder="180" />
          </Row>
          <Row style={{ alignItems: "flex-start" }}>
            <Field label="Weight, kg" value={f.weight} onChangeText={set("weight")} keyboardType="decimal-pad" placeholder="90" />
            <Field label="Waist, cm" value={f.waist} onChangeText={set("waist")} keyboardType="decimal-pad" placeholder="optional" hint="At the navel. Best sign of fat loss." />
          </Row>
          <Pills label="Goal" options={entries(BODY_GOALS)} value={f.goal} onChange={set("goal")} />
          <Pills
            label="Daily activity outside workouts"
            options={(Object.keys(ACTIVITY) as Profile["activity"][]).map((k) => [k, ACTIVITY[k].label])}
            value={f.activity}
            onChange={set("activity")}
          />
          <Pills label="Lifting experience" options={entries(EXPERIENCE)} value={f.experience} onChange={set("experience")} />
          <Pills label="Equipment" options={entries(EQUIPMENT)} value={f.equipment} onChange={set("equipment")} />
          <Pills label="Strength days per week" options={([2, 3, 4, 5] as const).map((d) => [d, String(d)])} value={f.trainDays} onChange={set("trainDays")} />

          <Rule />
          <T v="h3" style={{ color: areaColor.mind, letterSpacing: 2.6 }}>MIND</T>
          <Pills
            label="Time a day for reading, meditation and learning"
            options={[[15, "15 min"], [30, "30 min"], [60, "1 hour"]] as [MindMinutes, string][]}
            value={f.mindMinutes}
            onChange={set("mindMinutes")}
          />

          <Rule />
          <T v="h3" style={{ color: areaColor.wealth, letterSpacing: 2.6 }}>WEALTH</T>
          <Pills label="Main money goal" options={entries(WEALTH_GOALS)} value={f.wealthGoal} onChange={set("wealthGoal")} />
          <Row style={{ alignItems: "flex-start" }}>
            <Field label="Currency" value={f.currency} onChangeText={set("currency")} maxLength={5} />
            <Field
              label="First money target"
              value={f.money}
              onChangeText={set("money")}
              keyboardType="decimal-pad"
              placeholder="optional"
              hint="Becomes a Gate, e.g. a 3-month emergency fund."
            />
          </Row>

          <Rule />
          <Pills
            label="Difficulty"
            options={([1, 2, 3] as Difficulty[]).map((d) => [d, DIFFICULTY[d]])}
            value={f.difficulty}
            onChange={set("difficulty")}
          />
          <T v="dim" style={{ fontSize: 13 }}>
            Steady start: fewer daily goals. Tough but doable: the full set. No mercy: extra cardio, more volume and higher caps.
          </T>
          {error ? <T style={{ color: color.danger }}>{error}</T> : null}
          <Row style={{ justifyContent: "center" }}>
            {p ? <Btn label="Cancel" kind="ghost" size="lg" onPress={() => router.back()} /> : null}
            <Btn label="Analyze" size="lg" onPress={submit} />
          </Row>
        </Win>
      </Screen>
    </KeyboardAvoidingView>
  );
}
