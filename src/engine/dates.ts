// Days are stored as local "YYYY-MM-DD" keys so a quest day always ends at the
// player's own midnight, wherever they are.

export const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export const weekdayOf = (k: string) => parseKey(k).getDay();

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
