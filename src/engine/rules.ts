import { addDays } from "./dates";
import type { Area, GameState, Rank } from "./types";

export const AREAS: Record<Area, { name: string; stats: string }> = {
  body: { name: "Body", stats: "STR · VIT · AGI" },
  mind: { name: "Mind", stats: "INT · SENSE · WILL" },
  wealth: { name: "Wealth", stats: "GOLD · LUCK · TRADE" },
};
export const AREA_KEYS = Object.keys(AREAS) as Area[];

export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];
export const RANK_XP: Record<Rank, number> = { E: 10, D: 20, C: 40, B: 80, A: 150, S: 300 };

export const DAILY_XP = 10;
export const CLEAR_BONUS = 30;
export const GATE_LOG_XP = 5;
export const GATE_CLEAR_MULT = 3;
export const CHECKIN_XP = 20;
export const LOG_MAX = 200;

/** XP to go from area level k to k+1. */
export const areaCost = (k: number) => 40 + 20 * k;
/** XP to go from player level k to k+1. */
export const overallCost = (k: number) => 100 + 50 * k;

export function levelFrom(xp: number, cost: (k: number) => number) {
  let level = 1;
  let need = cost(1);
  while (xp >= need) {
    xp -= need;
    level++;
    need = cost(level);
  }
  return { level, into: xp, need };
}

export const hunterRank = (level: number): Rank =>
  level >= 70 ? "S" : level >= 50 ? "A" : level >= 35 ? "B" : level >= 20 ? "C" : level >= 10 ? "D" : "E";

export const totalXp = (s: GameState) => AREA_KEYS.reduce((a, k) => a + s.xp[k], 0);
export const playerLevel = (s: GameState) => levelFrom(totalXp(s), overallCost).level;
export const areaLevel = (s: GameState, a: Area) => levelFrom(s.xp[a], areaCost).level;

export const clearedDays = (s: GameState) =>
  Object.keys(s.days)
    .filter((k) => s.days[k].cleared)
    .sort();

export function bestStreak(s: GameState) {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of clearedDays(s)) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function currentStreak(s: GameState, today: string) {
  let k = s.days[today]?.cleared ? today : addDays(today, -1);
  let n = 0;
  while (s.days[k]?.cleared) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export const TITLES: { id: string; name: string; how: string; test: (s: GameState) => boolean }[] = [
  { id: "player", name: "Player", how: "Accept the System", test: () => true },
  { id: "early", name: "Early Riser", how: "Clear the Daily Quest once", test: (s) => clearedDays(s).length >= 1 },
  { id: "discipline", name: "Iron Discipline", how: "Reach a 7-day streak", test: (s) => bestStreak(s) >= 7 },
  { id: "adversity", name: "Unyielding", how: "Survive a Penalty Quest", test: (s) => s.penaltiesCleared >= 1 },
  { id: "gate", name: "Gatebreaker", how: "Clear your first Gate", test: (s) => s.gates.some((g) => g.clearedAt) },
  { id: "veteran", name: "Veteran Hunter", how: "Clear 50 quests", test: (s) => s.quests.filter((q) => q.doneAt).length >= 50 },
  { id: "iron", name: "Iron Body", how: "Body reaches Lv 10", test: (s) => areaLevel(s, "body") >= 10 },
  { id: "sage", name: "Sage", how: "Mind reaches Lv 10", test: (s) => areaLevel(s, "mind") >= 10 },
  { id: "merchant", name: "Merchant King", how: "Wealth reaches Lv 10", test: (s) => areaLevel(s, "wealth") >= 10 },
  { id: "unbroken", name: "Unbroken", how: "Reach a 30-day streak", test: (s) => bestStreak(s) >= 30 },
  { id: "sovereign", name: "Sovereign", how: "Reach S-Rank", test: (s) => hunterRank(playerLevel(s)) === "S" },
];
