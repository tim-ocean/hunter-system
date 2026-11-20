import * as Haptics from "expo-haptics";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { dayKey } from "../engine/dates";
import { migrate, newState, rollover, run, type Ctx } from "../engine/game";
import type { GameState, SystemNotice } from "../engine/types";
import { storage } from "./storage";

const KEY = "hunter-system.v1";

type Action = (s: GameState, ctx: Ctx) => void;

interface GameApi {
  state: GameState | null;
  /** Today's key, refreshed when the app returns to the foreground or the date changes. */
  today: string;
  act: (action: Action) => void;
  accept: (name: string) => void;
  restore: (json: string) => boolean;
  reset: () => void;
  notice: SystemNotice | null;
  dismissNotice: () => void;
  toasts: { id: number; text: string }[];
}

const GameContext = createContext<GameApi | null>(null);

function load(): GameState | null {
  try {
    const raw = storage.get(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(load);
  const ref = useRef(state);
  const [today, setToday] = useState(() => dayKey(new Date()));
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);

  const commit = useCallback((next: GameState | null) => {
    ref.current = next;
    setState(next);
    try {
      if (next) storage.set(KEY, JSON.stringify(next));
      else storage.remove(KEY);
    } catch {
      // Storage failures leave the in-memory game running; the next write retries.
    }
  }, []);

  const act = useCallback(
    (action: Action) => {
      if (!ref.current) return;
      const r = run(ref.current, action);
      commit(r.state);
      for (const e of r.events) {
        if (e.kind === "toast") {
          const id = ++toastId.current;
          setToasts((t) => [...t.slice(-2), { id, text: e.text }]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          setNotices((n) => [...n, e.notice]);
          Haptics.notificationAsync(
            e.notice.tone === "red" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        }
      }
    },
    [commit],
  );

  // Check for a missed day at launch, on return to the foreground, and at midnight.
  useEffect(() => {
    const tick = () => {
      const k = dayKey(new Date());
      setToday(k);
      if (ref.current && ref.current.lastSeen !== k) act(rollover);
    };
    tick();
    const sub = AppState.addEventListener("change", (s) => s === "active" && tick());
    const timer = setInterval(tick, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [act]);

  const api = useMemo<GameApi>(
    () => ({
      state,
      today,
      act,
      accept: (name) => commit(newState(name.trim() || "Hunter")),
      restore: (json) => {
        try {
          const s = migrate(JSON.parse(json));
          if (!s) return false;
          commit(s);
          return true;
        } catch {
          return false;
        }
      },
      reset: () => commit(null),
      notice: notices[0] ?? null,
      dismissNotice: () => setNotices((n) => n.slice(1)),
      toasts,
    }),
    [state, today, act, commit, notices, toasts],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame() {
  const g = useContext(GameContext);
  if (!g) throw new Error("useGame must be used inside GameProvider");
  return g;
}

/** For screens that only render once a player exists. */
export function usePlayer() {
  const g = useGame();
  if (!g.state) throw new Error("usePlayer needs an accepted player");
  return { ...g, state: g.state };
}
