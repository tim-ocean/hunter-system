export type Area = "body" | "mind" | "wealth";
export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export type Sex = "male" | "female";
export type BodyGoal = "recomp" | "lose" | "build" | "maintain";
export type Activity = "sedentary" | "light" | "moderate" | "high";
export type Experience = "new" | "some" | "regular";
export type Equipment = "none" | "dumbbells" | "gym";
export type WealthGoal = "save" | "debt" | "income" | "invest";
export type Difficulty = 1 | 2 | 3;
export type MindMinutes = 15 | 30 | 60;

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  waistCm: number | null;
  goal: BodyGoal;
  activity: Activity;
  experience: Experience;
  equipment: Equipment;
  trainDays: 2 | 3 | 4 | 5;
  mindMinutes: MindMinutes;
  wealthGoal: WealthGoal;
  currency: string;
  difficulty: Difficulty;
}

export interface Program {
  start: string;
  stage: number;
  kcalAdj: number;
  nextCheckin: string;
  /** Generated goal ids the player removed or replaced; regeneration skips them. */
  removed: string[];
}

export interface Daily {
  id: string;
  area: Area;
  title: string;
  target: string;
  /** Weekdays (0 = Sunday) the goal applies to; absent means every day. */
  dow?: number[];
  custom?: boolean;
}

export interface DayRecord {
  done: string[];
  xp: Record<string, number>;
  bonus: number;
  cleared: boolean;
}

export interface Quest {
  id: string;
  title: string;
  area: Area;
  rank: Rank;
  createdAt: number;
  doneAt: number | null;
  xp: number;
}

export interface Gate {
  id: string;
  title: string;
  area: Area;
  rank: Rank;
  goal: number;
  unit: string;
  progress: number;
  createdAt: number;
  clearedAt: number | null;
  /** Set on Gates the assessment created, so a retake doesn't duplicate them. */
  gen?: string;
  /** Gates that fill themselves from weigh-ins. */
  auto?: "weight" | "waist";
  start?: number;
}

export interface WeighIn {
  d: string;
  kg: number;
  waist: number | null;
}

export interface LogEntry {
  t: number;
  msg: string;
  xp: number;
  area: Area | null;
}

export interface GameState {
  v: 1;
  name: string;
  createdAt: number;
  createdDay: string;
  updatedAt: number;
  lastSeen: string;
  xp: Record<Area, number>;
  dailies: Daily[];
  days: Record<string, DayRecord>;
  quests: Quest[];
  gates: Gate[];
  log: LogEntry[];
  weights: WeighIn[];
  profile: Profile | null;
  program: Program | null;
  penalty: { since: string; text: string } | null;
  penaltyText: string;
  penaltyCustom: boolean;
  penaltiesCleared: number;
  titles: string[];
  title: string;
  reminders: boolean;
}

/** Text in modal lines may wrap a phrase in **double asterisks** to emphasize it. */
export interface SystemNotice {
  tone?: "red";
  head: string;
  huge?: string;
  sub?: string;
  lines?: string[];
  note?: string;
}

export type GameEvent =
  | { kind: "toast"; text: string }
  | { kind: "modal"; notice: SystemNotice };
