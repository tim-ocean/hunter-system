/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { addDays, dayKey } from "./dates";
import {
  applyAssessment,
  clearPenalty,
  dailiesFor,
  newState,
  rollover,
  run,
  toggleDaily,
  weeklyCheckin,
} from "./game";
import { buildPlan, sessionFor } from "./program";
import { levelFrom, overallCost } from "./rules";
import type { GameState, Profile } from "./types";

const profile: Profile = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 120,
  waistCm: 115,
  goal: "recomp",
  activity: "light",
  experience: "new",
  equipment: "gym",
  trainDays: 3,
  mindMinutes: 30,
  wealthGoal: "save",
  currency: "$",
  difficulty: 2,
};

const at = (k: string, h = 12) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d, h);
};
let n = 0;
const uid = () => `id${++n}`;

function assessed(start = "2026-10-19"): GameState {
  return run(newState("Player", at(start)), applyAssessment(profile, 6000), at(start), uid).state;
}

function clearDay(s: GameState, k: string) {
  for (const d of dailiesFor(s, k)) s = run(s, toggleDaily(d.id), at(k), uid).state;
  return s;
}

test("plan for a 180 cm, 120 kg man getting leaner", () => {
  const plan = buildPlan(profile);
  assert.equal(Math.round(plan.bmi * 10) / 10, 37);
  assert.equal(plan.kcal, 2400);
  assert.equal(plan.protein, 180);
  assert.equal(plan.steps, 8000);
  assert.equal(plan.water, 4);
  assert.ok(plan.heavy);
  assert.deepEqual(plan.trainDays, [1, 3, 5]);
});

test("calories never drop below the floor", () => {
  const plan = buildPlan({ ...profile, sex: "female", heightCm: 150, weightKg: 45, goal: "lose", activity: "sedentary" });
  assert.ok(plan.kcal >= 1300);
});

test("strength sessions land only on training days and alternate A/B", () => {
  const plan = buildPlan(profile);
  assert.equal(sessionFor(profile, plan, "2026-10-20"), null); // Tuesday
  const mon = sessionFor(profile, plan, "2026-10-19")!;
  const wed = sessionFor(profile, plan, "2026-10-21")!;
  assert.notEqual(mon.letter, wed.letter);
  assert.equal(mon.exercises.length, 5);
});

test("assessment generates goals, weigh-in and starter gates", () => {
  const s = assessed();
  assert.ok(s.dailies.some((d) => d.id === "g-steps"));
  assert.ok(s.dailies.some((d) => d.id === "g-strength" && d.dow?.includes(1)));
  assert.equal(s.weights.length, 1);
  assert.deepEqual(
    s.gates.map((g) => g.gen).sort(),
    ["books", "money", "waist", "weight"],
  );
  // Retaking doesn't duplicate gates.
  const again = run(s, applyAssessment(profile, 6000), at("2026-10-19"), uid).state;
  assert.equal(again.gates.length, s.gates.length);
});

test("clearing every goal clears the day and pays the bonus; unticking takes it back", () => {
  const k = "2026-10-19";
  let s = assessed(k);
  s = clearDay(s, k);
  assert.ok(s.days[k].cleared);
  const total = s.xp.body + s.xp.mind + s.xp.wealth;
  assert.equal(total, dailiesFor(s, k).length * 10 + 30);
  s = run(s, toggleDaily("g-steps"), at(k), uid).state;
  assert.equal(s.days[k].cleared, false);
  assert.equal(s.xp.body + s.xp.mind + s.xp.wealth, total - 10 - 30);
});

test("a missed day issues a penalty that halves XP until cleared", () => {
  const start = "2026-10-19";
  let s = assessed(start);
  s = clearDay(s, start);
  // Skip the 20th entirely, open the app on the 21st.
  const r = run(s, rollover, at("2026-10-21"), uid);
  s = r.state;
  assert.equal(s.penalty?.since, "2026-10-20");
  assert.ok(r.events.some((e) => e.kind === "modal" && e.notice.huge === "PENALTY"));
  const before = s.xp.body;
  s = run(s, toggleDaily("g-steps"), at("2026-10-21"), uid).state;
  assert.equal(s.xp.body - before, 5);
  s = run(s, clearPenalty, at("2026-10-21"), uid).state;
  assert.equal(s.penalty, null);
  assert.ok(s.titles.includes("adversity"));
});

test("the creation day is never penalized", () => {
  const s = run(assessed("2026-10-19"), rollover, at("2026-10-20"), uid).state;
  assert.equal(s.penalty, null);
});

test("weekly check-in raises targets after a strong week and tracks the weight gate", () => {
  const start = "2026-10-19";
  let s = assessed(start);
  for (let i = 0; i < 7; i++) s = clearDay(s, addDays(start, i));
  const k = addDays(start, 7);
  s = clearDay(s, k);
  const r = run(s, weeklyCheckin(119.2, 114), at(k), uid);
  s = r.state;
  assert.equal(s.program!.stage, 1);
  assert.equal(buildPlan(s.profile!, s.program).steps, 8500);
  assert.equal(s.gates.find((g) => g.gen === "weight")!.progress, 0.8);
  assert.equal(s.gates.find((g) => g.gen === "waist")!.progress, 1);
  assert.equal(s.program!.nextCheckin, addDays(k, 7));
});

test("losing too fast adds calories back", () => {
  const start = "2026-10-19";
  let s = assessed(start);
  for (let i = 0; i <= 7; i++) s = clearDay(s, addDays(start, i));
  s = run(s, weeklyCheckin(117.5, null), at(addDays(start, 7)), uid).state;
  assert.equal(s.program!.kcalAdj, 150);
});

test("levels follow the overall cost curve", () => {
  assert.equal(levelFrom(0, overallCost).level, 1);
  assert.equal(levelFrom(150, overallCost).level, 2);
  assert.equal(dayKey(at("2026-10-19")), "2026-10-19");
});
