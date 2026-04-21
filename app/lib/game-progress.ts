import { DISTRICTS, type District } from "../data/bd-districts";

export type GameMode = "classic" | "time_attack" | "daily";

export const STORAGE_PROGRESS = "guess-district-bd-progress-v1";

export const CLASSIC_ROUNDS = 10;
export const DAILY_ROUNDS = 10;
export const TIME_ATTACK_MS = 60_000;
export const QUESTION_TIME_MS = 12_000;

/** Achievement ids — stable for storage */
export const ACHIEVEMENTS: Record<
  string,
  { id: string; titleBn: string; descBn: string }
> = {
  first_correct: {
    id: "first_correct",
    titleBn: "প্রথম জয়",
    descBn: "প্রথমবার সঠিক উত্তর দিয়েছো",
  },
  streak_5: {
    id: "streak_5",
    titleBn: "জ্বলন্ত ধারা",
    descBn: "এক রানে ৫ স্ট্রিক",
  },
  perfect_classic: {
    id: "perfect_classic",
    titleBn: "পারফেক্ট ক্লাসিক",
    descBn: "ক্লাসিক মোডে ১০/১০ সঠিক",
  },
  daily_complete: {
    id: "daily_complete",
    titleBn: "দৈনিক যোদ্ধা",
    descBn: "আজকের চ্যালেঞ্জ শেষ করেছো",
  },
  time_attack_12: {
    id: "time_attack_12",
    titleBn: "ঝড়ের গতি",
    descBn: "৬০ সেকেন্ডে ১২+ সঠিক উত্তর",
  },
  speed_five: {
    id: "speed_five",
    titleBn: "বজ্রপাত",
    descBn: "এক রানে ৫ বার ৩ সেকেন্ডের কমে সঠিক",
  },
  level_5: {
    id: "level_5",
    titleBn: "অভিজ্ঞ ভ্রমণকারী",
    descBn: "লেভেল ৫ পৌঁছেছো",
  },
  level_10: {
    id: "level_10",
    titleBn: "মানচিত্র মাস্টার",
    descBn: "লেভেল ১০ পৌঁছেছো",
  },
};

export type ProgressState = {
  xp: number;
  played: number;
  bestScore: number;
  achievements: string[];
  daily: { date: string; completed: boolean; bestScore: number };
};

export function defaultProgress(): ProgressState {
  return {
    xp: 0,
    played: 0,
    bestScore: 0,
    achievements: [],
    daily: { date: "", completed: false, bestScore: 0 },
  };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS);
    if (!raw) return migrateLegacyProgress();
    const p = JSON.parse(raw) as Partial<ProgressState>;
    const base = defaultProgress();
    return {
      xp: typeof p.xp === "number" ? p.xp : base.xp,
      played: typeof p.played === "number" ? p.played : base.played,
      bestScore: typeof p.bestScore === "number" ? p.bestScore : base.bestScore,
      achievements: Array.isArray(p.achievements) ? p.achievements : [],
      daily:
        p.daily &&
        typeof p.daily === "object" &&
        typeof (p.daily as ProgressState["daily"]).date === "string"
          ? (p.daily as ProgressState["daily"])
          : base.daily,
    };
  } catch {
    return migrateLegacyProgress();
  }
}

function migrateLegacyProgress(): ProgressState {
  const base = defaultProgress();
  try {
    const b = localStorage.getItem("guess-district-bd-best");
    const p = localStorage.getItem("guess-district-bd-played");
    if (b) base.bestScore = Math.max(base.bestScore, parseInt(b, 10) || 0);
    if (p) base.played = Math.max(base.played, parseInt(p, 10) || 0);
  } catch {
    /* ignore */
  }
  return base;
}

export function saveProgress(p: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(p));
    localStorage.setItem("guess-district-bd-best", String(p.bestScore));
    localStorage.setItem("guess-district-bd-played", String(p.played));
  } catch {
    /* ignore */
  }
}

export function levelFromXp(totalXp: number): number {
  return Math.min(99, 1 + Math.floor(totalXp / 150));
}

export function xpIntoCurrentLevel(totalXp: number): {
  level: number;
  current: number;
  need: number;
} {
  const level = levelFromXp(totalXp);
  const start = (level - 1) * 150;
  const nextStart = level * 150;
  return {
    level,
    current: totalXp - start,
    need: nextStart - start,
  };
}

/** Deterministic PRNG for daily challenge */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type RoundPick = { answer: District; choices: District[] };

export function pickRoundRng(rng: () => number): RoundPick {
  const answer = DISTRICTS[Math.floor(rng() * DISTRICTS.length)]!;
  const sameDivision = DISTRICTS.filter(
    (d) => d.division === answer.division && d.id !== answer.id,
  );
  const wrong = shuffleSeeded(sameDivision, rng).slice(0, 3);
  const choices = shuffleSeeded([answer, ...wrong], rng);
  return { answer, choices };
}

/** Pre-build daily sequence: one answer district index per round (then choices generated fresh per round with seeded rng step) */
export function createDailyRoundSequence(dateKey: string): RoundPick[] {
  const seed = hashSeed(`bd-daily-${dateKey}`);
  const rng = mulberry32(seed);
  const rounds: RoundPick[] = [];
  for (let i = 0; i < DAILY_ROUNDS; i++) {
    rounds.push(pickRoundRng(rng));
  }
  return rounds;
}

export function computeTimeBonusMs(
  elapsedMs: number,
  limitMs: number,
): number {
  if (limitMs <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  return Math.round(ratio * 10);
}

export function addAchievement(
  progress: ProgressState,
  id: string,
): { progress: ProgressState; isNew: boolean } {
  if (progress.achievements.includes(id)) {
    return { progress, isNew: false };
  }
  return {
    progress: {
      ...progress,
      achievements: [...progress.achievements, id],
    },
    isNew: true,
  };
}

export function checkLevelAchievements(
  progress: ProgressState,
): { progress: ProgressState; newIds: string[] } {
  const lvl = levelFromXp(progress.xp);
  const newIds: string[] = [];
  let p = progress;
  if (lvl >= 5 && !p.achievements.includes("level_5")) {
    const r = addAchievement(p, "level_5");
    p = r.progress;
    if (r.isNew) newIds.push("level_5");
  }
  if (lvl >= 10 && !p.achievements.includes("level_10")) {
    const r = addAchievement(p, "level_10");
    p = r.progress;
    if (r.isNew) newIds.push("level_10");
  }
  return { progress: p, newIds };
}

export type RunTotals = {
  correct: number;
  wrong: number;
  bestStreak: number;
  fastAnswers: number;
  xpGainedMidRun: number;
};

/** End-of-run bonus XP + achievements (call once when run finishes). */
export function applyRunEndBonuses(
  progress: ProgressState,
  mode: GameMode,
  totals: RunTotals,
  finalScore: number,
  today: string,
  /** প্রথমবার আজকের চ্যালেঞ্জ পারফেক্ট হলে +৫০ XP (আগে আজ সম্পন্ন ছিল না) */
  grantDailyXpBonus: boolean,
): { progress: ProgressState; bonusXp: number; newAchievementIds: string[] } {
  let p = {
    ...progress,
    bestScore: Math.max(progress.bestScore, finalScore),
  };
  let bonusXp = 0;
  const newAchievementIds: string[] = [];

  if (mode === "classic" && totals.correct === CLASSIC_ROUNDS) {
    bonusXp += 40;
    p = { ...p, xp: p.xp + 40 };
    const r = addAchievement(p, "perfect_classic");
    p = r.progress;
    if (r.isNew) newAchievementIds.push("perfect_classic");
  }

  if (mode === "daily" && totals.correct === DAILY_ROUNDS) {
    if (grantDailyXpBonus) {
      bonusXp += 50;
      p = { ...p, xp: p.xp + 50 };
    }
    p = {
      ...p,
      daily: {
        date: today,
        completed: true,
        bestScore: Math.max(p.daily.bestScore, finalScore),
      },
    };
    const r = addAchievement(p, "daily_complete");
    p = r.progress;
    if (r.isNew) newAchievementIds.push("daily_complete");
  }

  if (mode === "time_attack" && totals.correct >= 12) {
    bonusXp += 35;
    p = { ...p, xp: p.xp + 35 };
    const r = addAchievement(p, "time_attack_12");
    p = r.progress;
    if (r.isNew) newAchievementIds.push("time_attack_12");
  }

  if (totals.fastAnswers >= 5) {
    bonusXp += 25;
    p = { ...p, xp: p.xp + 25 };
    const r = addAchievement(p, "speed_five");
    p = r.progress;
    if (r.isNew) newAchievementIds.push("speed_five");
  }

  const lvl = checkLevelAchievements(p);
  p = lvl.progress;
  for (const id of lvl.newIds) {
    if (!newAchievementIds.includes(id)) newAchievementIds.push(id);
  }

  saveProgress(p);
  return { progress: p, bonusXp, newAchievementIds };
}
