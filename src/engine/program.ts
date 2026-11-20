// The program engine: turns a Player Assessment into calorie and protein
// targets, a strength split, daily goals for all three areas, and starter Gates.
// Pure functions only, so the same rules can run on a server later.

import { parseKey } from "./dates";
import type { Activity, BodyGoal, Daily, Difficulty, Equipment, Experience, Gate, Profile, Program, WealthGoal } from "./types";

export const ACTIVITY: Record<Activity, { label: string; mult: number; steps: number }> = {
  sedentary: { label: "Mostly sitting", mult: 1.2, steps: 4000 },
  light: { label: "On my feet a bit", mult: 1.375, steps: 6000 },
  moderate: { label: "Active job or sport", mult: 1.55, steps: 8000 },
  high: { label: "Very active", mult: 1.725, steps: 10000 },
};
export const BODY_GOALS: Record<BodyGoal, string> = {
  recomp: "Get leaner, keep muscle",
  lose: "Lose weight",
  build: "Build muscle",
  maintain: "Stay fit",
};
export const EXPERIENCE: Record<Experience, string> = { new: "New to lifting", some: "Trained before", regular: "Train regularly" };
export const EQUIPMENT: Record<Equipment, string> = { none: "No equipment", dumbbells: "Dumbbells at home", gym: "Gym" };
export const WEALTH_GOALS: Record<WealthGoal, string> = {
  save: "Build savings",
  debt: "Pay off debt",
  income: "Grow my income",
  invest: "Start investing",
};
export const DIFFICULTY: Record<Difficulty, string> = { 1: "Steady start", 2: "Tough but doable", 3: "No mercy" };

const TRAIN_DAYS: Record<Profile["trainDays"], number[]> = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6] };

const SESSIONS: Record<Equipment, { A: string[]; B: string[] }> = {
  none: {
    A: ["Squat to a chair", "Incline push-up (hands on a counter)", "Towel or doorframe row", "Glute bridge", "Dead bug"],
    B: ["Supported split squat (hand on a wall)", "Incline push-up, lower surface", "Backpack row", "Good-morning hip hinge", "Side plank"],
  },
  dumbbells: {
    A: ["Goblet squat", "Dumbbell floor press", "One-arm dumbbell row", "Romanian deadlift", "Dead bug"],
    B: ["Split squat", "Seated overhead press", "Chest-supported row", "Hip thrust", "Suitcase carry"],
  },
  gym: {
    A: ["Leg press", "Bench press", "Lat pulldown", "Romanian deadlift", "Cable crunch"],
    B: ["Goblet or hack squat", "Incline dumbbell press", "Seated cable row", "Hip thrust", "Farmer carry"],
  },
};

const PAGES = { 15: 10, 30: 20, 60: 30 } as const;
const MEDITATE = { 15: 5, 30: 10, 60: 15 } as const;
const BOOKS = { 15: 4, 30: 8, 60: 12 } as const;

export const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function bodyMetrics(p: Profile) {
  const bmi = p.weightKg / (p.heightCm / 100) ** 2;
  // Mifflin-St Jeor
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  return { bmi, bmr, tdee: bmr * ACTIVITY[p.activity].mult };
}

export type Plan = ReturnType<typeof buildPlan>;

export function buildPlan(p: Profile, prog?: Pick<Program, "stage" | "kcalAdj"> | null) {
  const { bmi, bmr, tdee } = bodyMetrics(p);
  const d = p.difficulty;
  const stage = prog?.stage ?? 0;
  const change = {
    recomp: bmi >= 30 ? -0.2 : bmi >= 25 ? -0.15 : -0.1,
    lose: bmi >= 30 ? -0.25 : -0.2,
    build: 0.1,
    maintain: 0,
  }[p.goal];
  const floor = Math.max(p.sex === "male" ? 1600 : 1300, bmr * 0.8);
  const kcal = roundTo(Math.max(floor, tdee * (1 + change) + (prog?.kcalAdj ?? 0)), 50);
  // At BMI 30+ bodyweight overstates lean mass, so protein keys off height instead.
  const protein = roundTo(bmi >= 30 ? p.heightCm : p.weightKg * (p.goal === "build" ? 2 : 1.8), 5);
  const water = Math.min(4, Math.max(2, Math.round(p.weightKg * 0.033 * 2) / 2));
  const steps = Math.min(d === 3 ? 15000 : 12000, roundTo(ACTIVITY[p.activity].steps + 1000 * d + 500 * stage, 500));
  const sets = Math.min(5, { new: 3, some: 3, regular: 4 }[p.experience] + (d === 1 ? -1 : d === 3 ? 1 : 0));
  const reps = { new: "10", some: "8-12", regular: "6-10" }[p.experience];
  return {
    bmi,
    bmr,
    tdee,
    kcal,
    protein,
    water,
    steps,
    sets,
    reps,
    weeklyLoss: change < 0 ? p.weightKg * (bmi >= 30 ? 0.0075 : 0.005) : 0,
    trainDays: TRAIN_DAYS[p.trainDays],
    sessionMin: roundTo(10 + 5 * sets * 2.5, 5),
    pages: Math.min(PAGES[p.mindMinutes] * 2, PAGES[p.mindMinutes] + 5 * stage),
    meditate: MEDITATE[p.mindMinutes] + (d === 3 ? 5 : 0),
    /** Use walking over running and joint-friendly lifts. */
    heavy: bmi >= 35,
  };
}

export function sessionFor(p: Profile, plan: Plan, k: string) {
  const date = parseKey(k);
  const idx = plan.trainDays.indexOf(date.getDay());
  if (idx < 0) return null;
  const week = Math.floor(date.getTime() / (7 * 864e5));
  const letter: "A" | "B" = (week * plan.trainDays.length + idx) % 2 ? "B" : "A";
  const exercises = SESSIONS[p.equipment][letter].map((name): [string, string] => {
    if (/plank|carry|dead bug/i.test(name)) return [name, `${plan.sets} × ${p.experience === "new" ? "20" : "30-45"} s`];
    return [name, `${plan.sets} × ${plan.reps}${/split|row|carry/i.test(name) ? " each side" : ""}`];
  });
  return { letter, exercises };
}

export function generateDailies(p: Profile, plan: Plan): Daily[] {
  const d = p.difficulty;
  const rest = [0, 1, 2, 3, 4, 5, 6].filter((x) => !plan.trainDays.includes(x));
  const g = (id: string, area: Daily["area"], title: string, target: string, dow?: number[]): Daily => ({
    id: "g-" + id,
    area,
    title,
    target,
    ...(dow ? { dow } : {}),
  });
  const out: Daily[] = [
    g("steps", "body", "Walk", `${plan.steps.toLocaleString("en-US")} steps`),
    g("protein", "body", "Hit your protein", `${plan.protein} g`),
    g("kcal", "body", p.goal === "build" ? "Eat your calories" : "Stay under your calories", `${plan.kcal.toLocaleString("en-US")} kcal`),
    g("strength", "body", "Strength session", `${plan.sessionMin} min`, plan.trainDays),
    g("recovery", "body", d === 3 ? "Zone 2 cardio (bike, incline walk or swim)" : "Mobility and stretching", d === 3 ? "25 min" : "10 min", rest),
  ];
  if (d >= 2) out.push(g("water", "body", "Drink water", `${plan.water} L`), g("sleep", "body", "Sleep last night", "7+ h"));
  out.push(g("read", "mind", "Read", `${plan.pages} pages`), g("meditate", "mind", "Meditate", `${plan.meditate} min`));
  if (d >= 2) out.push(g("journal", "mind", "Plan tomorrow and journal", "3 lines"));
  if (p.mindMinutes === 60) out.push(g("study", "mind", "Study a skill", "30 min"));
  if (d === 3) out.push(g("nophone", "mind", "No phone for the first hour after waking", "1 h"));
  out.push(g("expenses", "wealth", "Log every expense", "today"));
  const wealth: Record<WealthGoal, [string, string, string][]> = {
    save: [["impulse", "No impulse buys (24-hour rule)", "today"], ["save", "Move money to savings", "any amount"]],
    debt: [["nodebt", "No new debt", "today"], ["payoff", "Check balances and payoff plan", "5 min"]],
    income: [["deepwork", "Deep work on an income skill", `${[30, 60, 90][d - 1]} min`], ["outreach", "One step toward a client, raise or offer", "1 action"]],
    invest: [["learn", "Learn about investing", `${[15, 20, 30][d - 1]} min`], ["save", "Move money to savings", "any amount"]],
  };
  const wg = wealth[p.wealthGoal];
  out.push(g(wg[0][0], "wealth", wg[0][1], wg[0][2]));
  if (d >= 2) out.push(g(wg[1][0], "wealth", wg[1][1], wg[1][2]));
  return out;
}

export const penaltyFor = (plan: Plan) =>
  plan.heavy
    ? "Penalty Trial: a 30-minute brisk walk on top of your step goal, and no social media for the rest of the day."
    : "Penalty Trial: 30 minutes of hard training (intervals, burpees or a long run) and no social media for the rest of the day.";

export type GateSeed = Omit<Gate, "id" | "progress" | "createdAt" | "clearedAt">;

export function suggestedGates(p: Profile, moneyTarget: number): GateSeed[] {
  const out: GateSeed[] = [];
  if (p.goal === "recomp" || p.goal === "lose") {
    out.push({ gen: "weight", title: "First milestone: lose 5% of bodyweight", area: "body", rank: "A", goal: roundTo(p.weightKg * 0.05, 0.5), unit: "kg", auto: "weight", start: p.weightKg });
    if (p.waistCm) out.push({ gen: "waist", title: "Take 5 cm off your waist", area: "body", rank: "B", goal: 5, unit: "cm", auto: "waist", start: p.waistCm });
  } else {
    out.push({ gen: "sessions", title: "Complete 24 strength sessions", area: "body", rank: "B", goal: 24, unit: "sessions" });
  }
  out.push({ gen: "books", title: `Read ${BOOKS[p.mindMinutes]} books`, area: "mind", rank: "B", goal: BOOKS[p.mindMinutes], unit: "books" });
  if (moneyTarget > 0) {
    const title = { save: "Build an emergency fund", debt: "Pay off debt", income: "Raise monthly income", invest: "Invest your first target" }[p.wealthGoal];
    out.push({ gen: "money", title, area: "wealth", rank: "A", goal: moneyTarget, unit: p.currency || "$" });
  }
  return out;
}
