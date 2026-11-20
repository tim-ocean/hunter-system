// Game actions. Each one mutates a draft copy of the state and reports what the
// player should see (toasts and System notices) as events; `run` wraps an action
// with the copy, title checks and level-up notices.

import { addDays, dayKey, parseKey, weekdayOf } from "./dates";
import {
  BODY_GOALS,
  DIFFICULTY,
  buildPlan,
  generateDailies,
  penaltyFor,
  roundTo,
  suggestedGates,
  type Plan,
} from "./program";
import {
  AREAS,
  AREA_KEYS,
  CHECKIN_XP,
  CLEAR_BONUS,
  DAILY_XP,
  GATE_CLEAR_MULT,
  GATE_LOG_XP,
  LOG_MAX,
  RANK_XP,
  TITLES,
  areaLevel,
  currentStreak,
  hunterRank,
  playerLevel,
} from "./rules";
import type { Area, Daily, GameEvent, GameState, Gate, Profile, Rank } from "./types";

export interface Ctx {
  today: string;
  now: number;
  events: GameEvent[];
  uid: () => string;
}

const defaultUid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_PENALTY =
  "Penalty Trial: 30 minutes of hard training and no social media for the rest of the day.";

export function newState(name: string, now = new Date()): GameState {
  const today = dayKey(now);
  return {
    v: 1,
    name,
    createdAt: now.getTime(),
    createdDay: today,
    updatedAt: now.getTime(),
    lastSeen: today,
    xp: { body: 0, mind: 0, wealth: 0 },
    dailies: [],
    days: {},
    quests: [],
    gates: [],
    log: [{ t: now.getTime(), msg: "The System has registered you. Welcome, Player.", xp: 0, area: null }],
    weights: [],
    profile: null,
    program: null,
    penalty: null,
    penaltyText: DEFAULT_PENALTY,
    penaltyCustom: false,
    penaltiesCleared: 0,
    titles: ["player"],
    title: "player",
    reminders: false,
  };
}

/** Title ids from earlier versions, mapped to their current ids. */
const RENAMED_TITLES: Record<string, string> = { wolf: "discipline", monarch: "sovereign" };

/** Fill in fields added after a save was written, so old saves keep loading. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<GameState>;
  if (!s.xp || !Array.isArray(s.dailies)) return null;
  const base = newState(s.name || "Hunter", new Date(s.createdAt || Date.now()));
  const titles = (s.titles ?? base.titles).map((t) => RENAMED_TITLES[t] ?? t);
  const title = s.title ? (RENAMED_TITLES[s.title] ?? s.title) : base.title;
  return { ...base, ...s, titles, title, xp: { ...base.xp, ...s.xp }, log: s.log ?? [] } as GameState;
}

export const dailiesFor = (s: GameState, k: string) => {
  const dow = weekdayOf(k);
  return s.dailies.filter((d) => !d.dow || d.dow.includes(dow));
};

export const currentPlan = (s: GameState): Plan | null => (s.profile ? buildPlan(s.profile, s.program) : null);

export const checkinDue = (s: GameState, today: string) => !!s.program && today >= s.program.nextCheckin;

/* ---------- internals ---------- */

const xpMult = (s: GameState) => (s.penalty ? 0.5 : 1);

function award(s: GameState, area: Area, base: number) {
  const xp = Math.round(base * xpMult(s));
  s.xp[area] = Math.max(0, s.xp[area] + xp);
  return xp;
}

function addLog(s: GameState, ctx: Ctx, msg: string, xp = 0, area: Area | null = null) {
  s.log.unshift({ t: ctx.now, msg, xp, area });
  if (s.log.length > LOG_MAX) s.log.length = LOG_MAX;
}

const toast = (ctx: Ctx, text: string) => ctx.events.push({ kind: "toast", text });
const notice = (ctx: Ctx, n: Extract<GameEvent, { kind: "modal" }>["notice"]) => ctx.events.push({ kind: "modal", notice: n });

function dayRec(s: GameState, k: string) {
  return (s.days[k] ??= { done: [], xp: {}, bonus: 0, cleared: false });
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/* ---------- runner ---------- */

export function run(
  state: GameState,
  action: (s: GameState, ctx: Ctx) => void,
  clock: Date = new Date(),
  uid: () => string = defaultUid,
): { state: GameState; events: GameEvent[] } {
  const s: GameState = JSON.parse(JSON.stringify(state));
  const ctx: Ctx = { today: dayKey(clock), now: clock.getTime(), events: [], uid };
  const before = {
    player: playerLevel(s),
    areas: Object.fromEntries(AREA_KEYS.map((a) => [a, areaLevel(s, a)])) as Record<Area, number>,
    titles: s.titles.slice(),
  };
  action(s, ctx);

  for (const t of TITLES) {
    if (!s.titles.includes(t.id) && t.test(s)) {
      s.titles.push(t.id);
      addLog(s, ctx, `Title acquired: ${t.name}`);
    }
  }
  const after = playerLevel(s);
  const lines = AREA_KEYS.filter((a) => areaLevel(s, a) > before.areas[a]).map((a) => `${AREAS[a].name} reached **Lv ${areaLevel(s, a)}**`);
  const titles = s.titles
    .filter((t) => !before.titles.includes(t))
    .map((id) => `Title acquired: **${TITLES.find((t) => t.id === id)?.name}**`);
  if (after > before.player) {
    addLog(s, ctx, `Level up: Lv ${after}`);
    const rankUp = hunterRank(after) !== hunterRank(before.player);
    notice(ctx, {
      head: "NOTIFICATION",
      huge: "LEVEL UP!",
      sub: `You have reached Level ${after}.`,
      lines: [...(rankUp ? [`Hunter rank raised to **${hunterRank(after)}-Rank**`] : []), ...lines, ...titles],
    });
  } else if (lines.length || titles.length) {
    notice(ctx, { head: "NOTIFICATION", huge: lines.length ? "STAT UP" : "TITLE", lines: [...lines, ...titles] });
  }
  s.updatedAt = ctx.now;
  return { state: s, events: ctx.events };
}

/* ---------- daily quest ---------- */

export const toggleDaily = (id: string) => (s: GameState, ctx: Ctx) => {
  const rec = dayRec(s, ctx.today);
  const d = s.dailies.find((x) => x.id === id);
  if (!d) return;
  if (rec.done.includes(id)) {
    rec.done = rec.done.filter((x) => x !== id);
    s.xp[d.area] = Math.max(0, s.xp[d.area] - (rec.xp[id] || 0));
    delete rec.xp[id];
  } else {
    rec.done.push(id);
    rec.xp[id] = award(s, d.area, DAILY_XP);
    toast(ctx, `Goal complete: ${d.title}. +${rec.xp[id]} XP ${AREAS[d.area].name}`);
  }
  const todays = dailiesFor(s, ctx.today);
  const all = todays.length > 0 && todays.every((x) => rec.done.includes(x.id));
  if (all && !rec.cleared) {
    rec.cleared = true;
    rec.bonus = AREA_KEYS.reduce((sum, a) => sum + award(s, a, Math.round(CLEAR_BONUS / 3)), 0);
    addLog(s, ctx, "Daily Quest cleared", Object.values(rec.xp).reduce((a, b) => a + b, 0) + rec.bonus);
    const streak = currentStreak(s, ctx.today);
    notice(ctx, {
      head: "QUEST INFO",
      huge: "CLEAR",
      sub: "Daily Quest: Forge Your Strength has been completed.",
      lines: [`Reward: **+${rec.bonus}** bonus XP across all areas`, `Streak: **${streak}** day${streak === 1 ? "" : "s"}`],
    });
  } else if (!all && rec.cleared) {
    rec.cleared = false;
    const each = Math.round(rec.bonus / 3);
    for (const a of AREA_KEYS) s.xp[a] = Math.max(0, s.xp[a] - each);
    rec.bonus = 0;
    addLog(s, ctx, "Daily Quest reopened");
  }
};

/** Run at launch and whenever the date changes: a missed day issues a Penalty Quest. */
export const rollover = (s: GameState, ctx: Ctx) => {
  if (s.lastSeen >= ctx.today) return;
  let k = s.lastSeen;
  let missed: string | null = null;
  while (k < ctx.today) {
    if (k !== s.createdDay && !s.days[k]?.cleared) missed ??= k;
    k = addDays(k, 1);
  }
  s.lastSeen = ctx.today;
  if (missed && !s.penalty) {
    s.penalty = { since: missed, text: s.penaltyText };
    addLog(s, ctx, `Daily Quest failed (${missed}). Penalty Quest issued.`);
    notice(ctx, {
      tone: "red",
      head: "WARNING",
      huge: "PENALTY",
      sub: "The Daily Quest was not completed. A Penalty Trial has begun.",
      lines: [s.penaltyText, "XP gains are halved until the Penalty Quest is cleared."],
    });
  }
};

export const clearPenalty = (s: GameState, ctx: Ctx) => {
  if (!s.penalty) return;
  s.penalty = null;
  s.penaltiesCleared++;
  addLog(s, ctx, "Penalty Quest survived");
  toast(ctx, "Penalty Quest cleared. Full XP restored.");
};

export const addDaily = (d: Omit<Daily, "id" | "custom">) => (s: GameState, ctx: Ctx) => {
  s.dailies.push({ ...d, id: ctx.uid(), custom: true });
};

export const removeDaily = (id: string) => (s: GameState) => {
  if (id.startsWith("g-") && s.program) s.program.removed.push(id);
  s.dailies = s.dailies.filter((d) => d.id !== id);
};

/** An edited generated goal becomes the player's own, so regeneration won't overwrite it. */
export const editDaily = (id: string, patch: Pick<Daily, "area" | "title" | "target">) => (s: GameState, ctx: Ctx) => {
  const d = s.dailies.find((x) => x.id === id);
  if (!d || (d.area === patch.area && d.title === patch.title && d.target === patch.target)) return;
  Object.assign(d, patch);
  if (d.id.startsWith("g-") && s.program) {
    s.program.removed.push(d.id);
    d.id = ctx.uid();
    d.custom = true;
  }
};

export const setPenaltyText = (text: string) => (s: GameState) => {
  if (!text || text === s.penaltyText) return;
  s.penaltyText = text;
  s.penaltyCustom = true;
};

/* ---------- quests and gates ---------- */

export const addQuest = (title: string, area: Area, rank: Rank) => (s: GameState, ctx: Ctx) => {
  s.quests.unshift({ id: ctx.uid(), title, area, rank, createdAt: ctx.now, doneAt: null, xp: 0 });
  addLog(s, ctx, `Quest accepted: ${title}`);
};

export const clearQuest = (id: string) => (s: GameState, ctx: Ctx) => {
  const q = s.quests.find((x) => x.id === id);
  if (!q || q.doneAt) return;
  q.doneAt = ctx.now;
  q.xp = award(s, q.area, RANK_XP[q.rank]);
  addLog(s, ctx, `Quest cleared: ${q.title}`, q.xp, q.area);
  toast(ctx, `Quest cleared. +${q.xp} XP ${AREAS[q.area].name}`);
};

export const deleteQuest = (id: string) => (s: GameState) => {
  s.quests = s.quests.filter((q) => q.id !== id);
};

export const addGate = (g: Pick<Gate, "title" | "area" | "rank" | "goal" | "unit">) => (s: GameState, ctx: Ctx) => {
  s.gates.unshift({ ...g, id: ctx.uid(), progress: 0, createdAt: ctx.now, clearedAt: null });
  addLog(s, ctx, `Gate opened: ${g.title}`);
};

function clearGate(s: GameState, ctx: Ctx, g: Gate) {
  g.clearedAt = ctx.now;
  const bonus = award(s, g.area, RANK_XP[g.rank] * GATE_CLEAR_MULT);
  addLog(s, ctx, `Gate cleared: ${g.title}`, bonus, g.area);
  notice(ctx, {
    head: "NOTIFICATION",
    huge: "GATE CLEARED",
    sub: `The boss of "${g.title}" has been defeated.`,
    lines: [`Reward: **+${bonus}** XP ${AREAS[g.area].name}`],
  });
}

export const logGate = (id: string, amount: number) => (s: GameState, ctx: Ctx) => {
  const g = s.gates.find((x) => x.id === id);
  if (!g || g.clearedAt || !(amount > 0)) return;
  g.progress = Math.min(g.goal, +(g.progress + amount).toFixed(2));
  const xp = award(s, g.area, GATE_LOG_XP);
  if (g.progress >= g.goal) clearGate(s, ctx, g);
  else {
    addLog(s, ctx, `Gate progress: ${g.title} +${fmt(amount)} ${g.unit}`, xp, g.area);
    toast(ctx, `Boss HP -${fmt(amount)} ${g.unit}. +${xp} XP`);
  }
};

export const deleteGate = (id: string) => (s: GameState) => {
  s.gates = s.gates.filter((g) => g.id !== id);
};

/* ---------- profile ---------- */

export const rename = (name: string) => (s: GameState) => {
  if (name.trim()) s.name = name.trim();
};

export const equipTitle = (id: string) => (s: GameState) => {
  if (s.titles.includes(id)) s.title = id;
};

export const setReminders = (on: boolean) => (s: GameState) => {
  s.reminders = on;
};

/* ---------- assessment and weekly recalibration ---------- */

function regenerate(s: GameState): Plan {
  const plan = buildPlan(s.profile!, s.program);
  const removed = s.program?.removed ?? [];
  const custom = s.dailies.filter((d) => d.custom);
  s.dailies = [...generateDailies(s.profile!, plan).filter((d) => !removed.includes(d.id)), ...custom];
  if (!s.penaltyCustom) s.penaltyText = penaltyFor(plan);
  return plan;
}

export const applyAssessment = (p: Profile, moneyTarget: number) => (s: GameState, ctx: Ctx) => {
  const first = !s.program;
  s.profile = p;
  s.program = first
    ? { start: ctx.today, stage: 0, kcalAdj: 0, nextCheckin: addDays(ctx.today, 7), removed: [] }
    : { ...s.program!, kcalAdj: 0 };
  const last = s.weights.at(-1);
  if (!last || last.kg !== p.weightKg || last.d !== ctx.today) s.weights.push({ d: ctx.today, kg: p.weightKg, waist: p.waistCm });
  const plan = regenerate(s);
  for (const g of suggestedGates(p, moneyTarget)) {
    if (!s.gates.some((x) => x.gen === g.gen && !x.clearedAt)) s.gates.push({ ...g, id: ctx.uid(), progress: 0, createdAt: ctx.now, clearedAt: null });
  }
  addLog(s, ctx, first ? "Player Assessment complete. Program generated." : "Player Assessment retaken. Program rebuilt.");
  const lines = [
    `Target: **${plan.kcal.toLocaleString("en-US")} kcal** a day (maintenance is about ${roundTo(plan.tdee, 50).toLocaleString("en-US")})`,
    `Protein: **${plan.protein} g** a day to hold on to muscle`,
    `Steps: **${plan.steps.toLocaleString("en-US")}** a day, rising as you keep up`,
    `Strength: **${plan.trainDays.length}× a week**, ${plan.sets} sets per exercise`,
  ];
  if (plan.weeklyLoss) lines.push(`Expected pace: about **${plan.weeklyLoss.toFixed(1)} kg** a week, mostly fat while protein and lifting protect muscle`);
  notice(ctx, {
    head: "PLAYER ANALYSIS",
    sub: `BMI ${plan.bmi.toFixed(1)} · ${BODY_GOALS[p.goal]} · ${DIFFICULTY[p.difficulty]}`,
    lines,
    note: plan.heavy
      ? "At your size the program uses walking instead of running and joint-friendly lifts, so your knees and back can keep up while you get stronger. Get a doctor's OK before training hard if you have heart, blood pressure or joint issues."
      : undefined,
  });
};

export function completionRate(s: GameState, today: string, days = 7) {
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(today, -i);
    if (s.program && k < s.program.start) continue;
    const list = dailiesFor(s, k);
    const rec = s.days[k];
    due += list.length;
    done += rec ? list.filter((x) => rec.done.includes(x.id)).length : 0;
  }
  return due ? done / due : 1;
}

export const weeklyCheckin = (kg: number, waist: number | null) => (s: GameState, ctx: Ctx) => {
  const p = s.profile;
  const prog = s.program;
  if (!p || !prog) return;
  const old = buildPlan(p, prog);
  const prev = s.weights.at(-1);
  const rate = completionRate(s, ctx.today);
  const changes: string[] = [];

  if (rate >= 0.85) {
    prog.stage++;
    changes.push("You kept up. Targets go up one step.");
  } else if (rate < 0.5 && prog.stage > 0) {
    prog.stage--;
    changes.push("Completion was low. Targets ease off one step so you can rebuild the habit.");
  } else changes.push("Targets hold steady this week.");

  // Only trust the scale when the plan was actually followed.
  if (prev && rate >= 0.6) {
    const weeks = Math.max(1, (parseKey(ctx.today).getTime() - parseKey(prev.d).getTime()) / (7 * 864e5));
    const pace = (prev.kg - kg) / prev.kg / weeks;
    const cutting = p.goal === "recomp" || p.goal === "lose";
    if (cutting && pace > 0.012) {
      prog.kcalAdj += 150;
      changes.push("You're losing fast enough to risk muscle. Calories go up 150.");
    } else if (cutting && pace < 0.002) {
      prog.kcalAdj -= 100;
      changes.push("Weight held still. Calories go down 100.");
    } else if (p.goal === "build" && pace > -0.001) {
      prog.kcalAdj += 100;
      changes.push("Weight isn't rising. Calories go up 100.");
    }
  }

  p.weightKg = kg;
  if (waist) p.waistCm = waist;
  s.weights.push({ d: ctx.today, kg, waist });
  prog.nextCheckin = addDays(ctx.today, 7);
  const plan = regenerate(s);

  for (const g of s.gates) {
    if (g.clearedAt || !g.auto || g.start == null) continue;
    const val = g.auto === "weight" ? kg : waist;
    if (!val) continue;
    const progress = Math.max(0, Math.min(g.goal, +(g.start - val).toFixed(2)));
    if (progress > g.progress) {
      g.progress = progress;
      award(s, g.area, GATE_LOG_XP);
    }
    if (g.progress >= g.goal) clearGate(s, ctx, g);
  }

  const xp = award(s, "body", CHECKIN_XP);
  const diff = prev ? kg - prev.kg : 0;
  addLog(s, ctx, `Weekly Assessment: ${kg} kg${prev ? ` (${signed(diff)})` : ""}, ${Math.round(rate * 100)}% of goals done`, xp, "body");

  const lines = [`Weight: **${kg} kg**${prev ? ` (${signed(diff)} kg)` : ""}`, `Goals done this week: **${Math.round(rate * 100)}%**`, ...changes];
  if (plan.steps !== old.steps) lines.push(`Steps: ${old.steps.toLocaleString("en-US")} → **${plan.steps.toLocaleString("en-US")}**`);
  if (plan.kcal !== old.kcal) lines.push(`Calories: ${old.kcal.toLocaleString("en-US")} → **${plan.kcal.toLocaleString("en-US")}**`);
  if (plan.protein !== old.protein) lines.push(`Protein: ${old.protein} → **${plan.protein} g**`);
  if (plan.pages !== old.pages) lines.push(`Reading: ${old.pages} → **${plan.pages} pages**`);
  notice(ctx, { head: "SYSTEM", huge: "RECALIBRATED", sub: "Your program has been adjusted to your progress.", lines });
};

