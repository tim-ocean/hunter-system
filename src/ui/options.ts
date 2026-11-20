import { AREAS, AREA_KEYS, RANKS, RANK_XP } from "../engine/rules";
import type { Area, Rank } from "../engine/types";

export const AREA_OPTIONS = AREA_KEYS.map((a): [Area, string] => [a, AREAS[a].name]);
export const RANK_OPTIONS = RANKS.map((r): [Rank, string] => [r, `${r} · ${RANK_XP[r]}`]);
