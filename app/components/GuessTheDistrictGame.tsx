"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BangladeshDistrictMapSvg } from "../data/bd-svg-paths";
import {
  DIVISION_LABEL_BN,
  type District,
} from "../data/bd-districts";
import {
  ACHIEVEMENTS,
  CLASSIC_ROUNDS,
  applyRunEndBonuses,
  computeTimeBonusMs,
  createDailyRoundSequence,
  DAILY_ROUNDS,
  defaultProgress,
  levelFromXp,
  loadProgress,
  pickRoundRng,
  QUESTION_TIME_MS,
  saveProgress,
  TIME_ATTACK_MS,
  todayKey,
  xpIntoCurrentLevel,
  type GameMode,
  type ProgressState,
  type RoundPick,
  addAchievement,
  checkLevelAchievements,
  type RunTotals,
} from "../lib/game-progress";

const FILL_DIV_HINT = "#93c5fd";
const FILL_CORRECT = "#34d399";
const FILL_WRONG = "#f87171";
const FILL_DEFAULT = "#CECECE";

const SUBTITLE_BEFORE_PICK =
  "মানচিত্রে নীল রঙে যে একটা জেলা হাইলাইট আছে, সেটির নাম বেছে নাও। চারটি বিকল্প একই বিভাগের — বিভাগের নাম বাটনে লেখা আছে।";

const TIMEOUT_ID = "__time_up__";

type Phase = "menu" | "playing" | "stats";

type RunStats = {
  mode: GameMode;
  score: number;
  correct: number;
  wrong: number;
  totalAnswered: number;
  bestStreak: number;
  fastAnswers: number;
  xpGained: number;
  newAchievementIds: string[];
};

function randomRng() {
  return Math.random;
}

export function GuessTheDistrictGame() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("menu");
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [showAchievements, setShowAchievements] = useState(false);

  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [round, setRound] = useState<RoundPick | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [dailySequence, setDailySequence] = useState<RoundPick[] | null>(
    null,
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState(TIME_ATTACK_MS);
  const timeAttackEndRef = useRef<number | null>(null);
  const questionStartRef = useRef<number>(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [questionBarNow, setQuestionBarNow] = useState(0);
  const dailyBonusEligibleRef = useRef(false);
  const resultHandledRef = useRef(false);
  const timeAttackGlobalDoneRef = useRef(false);

  const scoreRef = useRef(0);
  const roundIndexRef = useRef(0);
  const activeModeRef = useRef<GameMode | null>(null);

  const runStatsRef = useRef({
    correct: 0,
    wrong: 0,
    bestStreak: 0,
    fastAnswers: 0,
    xpGained: 0,
    newAchievementIds: [] as string[],
  });

  const [lastRun, setLastRun] = useState<RunStats | null>(null);
  const dailySequenceRef = useRef<RoundPick[] | null>(null);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);
  useEffect(() => {
    dailySequenceRef.current = dailySequence;
  }, [dailySequence]);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      const loaded = loadProgress();
      const t = todayKey();
      const merged =
        loaded.daily.date !== t
          ? {
              ...loaded,
              daily: {
                date: t,
                completed: false,
                bestScore: loaded.daily.bestScore,
              },
            }
          : loaded;
      setProgress(merged);
    });
  }, []);

  const refreshProgress = useCallback(() => {
    setProgress(loadProgress());
  }, []);

  const endRun = useCallback(() => {
    const mode = activeModeRef.current;
    const finalScore = scoreRef.current;
    const rs = runStatsRef.current;
    if (!mode) return;

    const totals: RunTotals = {
      correct: rs.correct,
      wrong: rs.wrong,
      bestStreak: rs.bestStreak,
      fastAnswers: rs.fastAnswers,
      xpGainedMidRun: rs.xpGained,
    };
    const grantDaily =
      dailyBonusEligibleRef.current &&
      mode === "daily" &&
      totals.correct === DAILY_ROUNDS;

    setProgress((prev) => {
      const out = applyRunEndBonuses(
        prev,
        mode,
        totals,
        finalScore,
        todayKey(),
        grantDaily,
      );
      setLastRun({
        mode,
        score: finalScore,
        correct: rs.correct,
        wrong: rs.wrong,
        totalAnswered: rs.correct + rs.wrong,
        bestStreak: rs.bestStreak,
        fastAnswers: rs.fastAnswers,
        xpGained: rs.xpGained + out.bonusXp,
        newAchievementIds: [
          ...new Set([...rs.newAchievementIds, ...out.newAchievementIds]),
        ],
      });
      return out.progress;
    });

    setPhase("stats");
    setRound(null);
    setPickedId(null);
    setActiveMode(null);
    setDailySequence(null);
    timeAttackEndRef.current = null;
    timeAttackGlobalDoneRef.current = false;
  }, []);

  const startMode = useCallback((mode: GameMode) => {
    const p = loadProgress();
    const t = todayKey();
    dailyBonusEligibleRef.current = !(
      mode === "daily" &&
      p.daily.date === t &&
      p.daily.completed
    );

    runStatsRef.current = {
      correct: 0,
      wrong: 0,
      bestStreak: 0,
      fastAnswers: 0,
      xpGained: 0,
      newAchievementIds: [],
    };
    resultHandledRef.current = false;
    timeAttackGlobalDoneRef.current = false;

    setActiveMode(mode);
    setPhase("playing");
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setPickedId(null);
    setToast(null);
    setRoundIndex(0);
    roundIndexRef.current = 0;
    const qStart = Date.now();
    questionStartRef.current = qStart;
    setQuestionStartedAt(qStart);
    setQuestionBarNow(qStart);

    if (mode === "daily") {
      const seq = createDailyRoundSequence(t);
      setDailySequence(seq);
      setRound(seq[0]!);
    } else {
      setDailySequence(null);
      setRound(pickRoundRng(randomRng()));
    }

    if (mode === "time_attack") {
      timeAttackEndRef.current = Date.now() + TIME_ATTACK_MS;
      setTimeLeftMs(TIME_ATTACK_MS);
    } else {
      timeAttackEndRef.current = null;
    }
  }, []);

  const advanceOrEnd = useCallback(() => {
    const mode = activeModeRef.current;
    if (!mode) return;

    const idx = roundIndexRef.current;
    const nextIdx = idx + 1;

    if (mode === "classic" && nextIdx >= CLASSIC_ROUNDS) {
      endRun();
      return;
    }
    if (mode === "daily" && nextIdx >= DAILY_ROUNDS) {
      endRun();
      return;
    }

    resultHandledRef.current = false;
    setRoundIndex(nextIdx);
    roundIndexRef.current = nextIdx;
    setPickedId(null);
    setToast(null);
    const qStart = Date.now();
    questionStartRef.current = qStart;
    setQuestionStartedAt(qStart);
    setQuestionBarNow(qStart);

    if (mode === "daily") {
      const seq = dailySequenceRef.current;
      setRound(seq?.[nextIdx] ?? pickRoundRng(randomRng()));
    } else {
      setRound(pickRoundRng(randomRng()));
    }
  }, [endRun]);

  const processResult = useCallback(
    (correct: boolean, picked: District | null, elapsedMs: number) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;

      const rs = runStatsRef.current;
      const mode = activeModeRef.current!;

      const bumpPlayed = () => {
        setProgress((p) => {
          const next = { ...p, played: p.played + 1 };
          saveProgress(next);
          return next;
        });
      };

      if (correct) {
        rs.correct += 1;
        const timeBonus = computeTimeBonusMs(elapsedMs, QUESTION_TIME_MS);
        setStreak((prev) => {
          const nextStreak = prev + 1;
          rs.bestStreak = Math.max(rs.bestStreak, nextStreak);
          const streakBonus = Math.min(15, nextStreak * 2);
          const base = 10 + streakBonus + timeBonus;
          setScore((s) => {
            const ns = s + base;
            scoreRef.current = ns;
            return ns;
          });

          if (elapsedMs < 3000) rs.fastAnswers += 1;

          setToast(
            nextStreak >= 3
              ? `দারুণ! 🔥 ${nextStreak} ধারাবাহিক — +${base} (সময় +${timeBonus})`
              : `সঠিক! +${base} (সময় বোনাস +${timeBonus})`,
          );

          const xpAdd = 12 + timeBonus + Math.min(8, nextStreak);
          rs.xpGained += xpAdd;

          setProgress((p) => {
            let next = { ...p, xp: p.xp + xpAdd, played: p.played + 1 };
            if (!p.achievements.includes("first_correct")) {
              next = addAchievement(next, "first_correct").progress;
              rs.newAchievementIds.push("first_correct");
            }
            if (nextStreak >= 5) {
              const ar = addAchievement(next, "streak_5");
              next = ar.progress;
              if (ar.isNew && !rs.newAchievementIds.includes("streak_5"))
                rs.newAchievementIds.push("streak_5");
            }
            const lvl = checkLevelAchievements(next);
            next = lvl.progress;
            for (const id of lvl.newIds) {
              if (!rs.newAchievementIds.includes(id))
                rs.newAchievementIds.push(id);
            }
            saveProgress(next);
            return next;
          });

          return nextStreak;
        });
      } else {
        rs.wrong += 1;
        setStreak(0);
        bumpPlayed();
        const name = round?.answer.nameBn ?? "";
        setToast(
          picked
            ? `হুম — সঠিক জবাব: ${name}`
            : `সময় শেষ! সঠিক জবাব: ${name}`,
        );
      }

      const taEnd = timeAttackEndRef.current;
      const timeUp =
        mode === "time_attack" && taEnd && Date.now() >= taEnd;

      if (timeUp) {
        window.setTimeout(() => endRun(), 1200);
        return;
      }

      window.setTimeout(() => advanceOrEnd(), 2200);
    },
    [round?.answer.nameBn, advanceOrEnd, endRun],
  );

  const onChoose = useCallback(
    (d: District) => {
      if (!round || pickedId || !activeMode) return;
      const elapsed = Date.now() - questionStartRef.current;
      const correct = d.id === round.answer.id;
      setPickedId(d.id);
      processResult(correct, d, elapsed);
    },
    [round, pickedId, activeMode, processResult],
  );

  useEffect(() => {
    if (
      phase !== "playing" ||
      !round ||
      pickedId !== null ||
      activeMode === "time_attack"
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      setPickedId(TIMEOUT_ID);
      const elapsed = Date.now() - questionStartRef.current;
      processResult(false, null, elapsed);
    }, QUESTION_TIME_MS);
    return () => clearTimeout(t);
  }, [phase, round, pickedId, activeMode, processResult]);

  useEffect(() => {
    if (phase !== "playing" || activeMode !== "time_attack" || !round) return;
    const id = window.setInterval(() => {
      const end = timeAttackEndRef.current;
      if (!end) return;
      const left = Math.max(0, end - Date.now());
      setTimeLeftMs(left);
      if (left <= 0 && !timeAttackGlobalDoneRef.current) {
        timeAttackGlobalDoneRef.current = true;
        if (!resultHandledRef.current) {
          setPickedId(TIMEOUT_ID);
          runStatsRef.current.wrong += 1;
          setToast("মোট সময় শেষ!");
          setStreak(0);
          setProgress((p) => {
            const next = { ...p, played: p.played + 1 };
            saveProgress(next);
            return next;
          });
          resultHandledRef.current = true;
          window.setTimeout(() => endRun(), 1600);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, activeMode, round, endRun]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "playing" || !round || pickedId) return;
      const n = e.key;
      if (n < "1" || n > "4") return;
      const i = parseInt(n, 10) - 1;
      const d = round.choices[i];
      if (d) onChoose(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, round, pickedId, onChoose]);

  const fillById = useMemo(() => {
    const fill: Record<string, string> = {};
    if (!round) return fill;
    const answerPath = round.answer.svgPathId;
    if (!pickedId) {
      fill[answerPath] = FILL_DIV_HINT;
      return fill;
    }
    const picked =
      pickedId === TIMEOUT_ID
        ? null
        : round.choices.find((c) => c.id === pickedId);
    const pickedPath = picked?.svgPathId;
    fill[answerPath] = FILL_CORRECT;
    if (pickedPath && pickedPath !== answerPath) fill[pickedPath] = FILL_WRONG;
    return fill;
  }, [round, pickedId]);

  const subtitle = useMemo(() => {
    if (!pickedId || !round) return SUBTITLE_BEFORE_PICK;
    if (pickedId === TIMEOUT_ID) {
      return activeMode === "time_attack"
        ? "মোট সময় শেষ।"
        : "সময় শেষ। সবুজ জেলাটি সঠিক উত্তর।";
    }
    return pickedId === round.answer.id
      ? "সবুজ জেলাটাই সঠিক উত্তর।"
      : "সবুজ = সঠিক জেলা, লাল = তোমার বাছাই (ভুল হলে)।";
  }, [pickedId, round, activeMode]);

  const questionProgress = useMemo(() => {
    if (!activeMode || activeMode === "time_attack") return null;
    const total = activeMode === "daily" ? DAILY_ROUNDS : CLASSIC_ROUNDS;
    return { current: roundIndex + 1, total };
  }, [activeMode, roundIndex]);

  const timerRatio = useMemo(() => {
    if (phase !== "playing" || !round || pickedId) return 1;
    if (activeMode === "time_attack") return 1;
    if (!questionStartedAt) return 1;
    const elapsed = questionBarNow - questionStartedAt;
    return Math.max(0, 1 - elapsed / QUESTION_TIME_MS);
  }, [
    phase,
    round,
    pickedId,
    activeMode,
    questionStartedAt,
    questionBarNow,
  ]);

  useEffect(() => {
    if (phase !== "playing" || pickedId || activeMode === "time_attack") return;
    const tick = () => setQuestionBarNow(Date.now());
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [phase, pickedId, activeMode, round, questionStartedAt]);

  const xpBar = xpIntoCurrentLevel(progress.xp);
  const dailyKey = todayKey();
  const dailyDoneToday =
    progress.daily.date === dailyKey && progress.daily.completed;

  if (!mounted) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <div className="h-32 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      </div>
    );
  }

  if (showAchievements) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
            অর্জনসমূহ
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            লেভেল {levelFromXp(progress.xp)} · মোট XP{" "}
            <span className="font-mono">{progress.xp}</span>
          </p>
        </header>
        <ul className="space-y-3">
          {Object.values(ACHIEVEMENTS).map((a) => {
            const got = progress.achievements.includes(a.id);
            return (
              <li
                key={a.id}
                className={`rounded-xl border px-4 py-3 ${
                  got
                    ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/40"
                    : "border-stone-200 opacity-60 dark:border-stone-700"
                }`}
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  {got ? "✓ " : "○ "}
                  {a.titleBn}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400">
                  {a.descBn}
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setShowAchievements(false);
            refreshProgress();
          }}
          className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-black hover:border-black cursor-pointer transition"
        >
          মেনুতে ফিরো
        </button>
      </div>
    );
  }

  if (phase === "stats" && lastRun) {
    const acc =
      lastRun.totalAnswered > 0
        ? Math.round((lastRun.correct / lastRun.totalAnswered) * 100)
        : 0;
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
            রান শেষ!
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {lastRun.mode === "classic" && "ক্লাসিক মোড"}
            {lastRun.mode === "time_attack" && "টাইম অট্যাক"}
            {lastRun.mode === "daily" && "আজকের চ্যালেঞ্জ"}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">স্কোর</div>
            <div className="font-mono text-lg font-bold">{lastRun.score}</div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">নির্ভুলতা</div>
            <div className="font-mono text-lg font-bold">{acc}%</div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">সঠিক / ভুল</div>
            <div className="font-mono text-lg font-bold">
              {lastRun.correct} / {lastRun.wrong}
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">সেরা স্ট্রিক</div>
            <div className="font-mono text-lg font-bold text-amber-600">
              {lastRun.bestStreak}×
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">দ্রুত উত্তর (&lt;৩সে)</div>
            <div className="font-mono text-lg font-bold">
              {lastRun.fastAnswers}
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-stone-500">XP (এই রান)</div>
            <div className="font-mono text-lg font-bold text-emerald-600">
              +{lastRun.xpGained}
            </div>
          </div>
        </div>

        {lastRun.newAchievementIds.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              নতুন অর্জন!
            </div>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-800 dark:text-amber-300">
              {lastRun.newAchievementIds.map((id) => (
                <li key={id}>{ACHIEVEMENTS[id]?.titleBn ?? id}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setLastRun(null);
              setPhase("menu");
              refreshProgress();
            }}
            className="flex-1 rounded-xl border border-stone-300 py-3 font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            মেনু
          </button>
          <button
            type="button"
            onClick={() => {
              const m = lastRun.mode;
              setLastRun(null);
              startMode(m);
              refreshProgress();
            }}
            className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            আবার খেলো
          </button>
        </div>
      </div>
    );
  }

  if (phase === "menu") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            🇧🇩 সহজ মানচিত্র গেম
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            কোন জেলা? 🎯
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            যে কারও জন্য সহজ — মোড বেছে শুরু করো
          </p>
        </header>

        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-700 dark:text-stone-300">
              ⭐ লেভেল <span className="font-bold">{xpBar.level}</span>
            </span>
            <span className="font-mono text-xs text-stone-500">
              {xpBar.current}/{xpBar.need} XP
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, (xpBar.current / xpBar.need) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-stone-500">
            <span>মোট XP: {progress.xp}</span>
            <span>সেরা স্কোর: {progress.bestScore}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => startMode("classic")}
            className="animate-soft-bounce rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-5 py-5 text-left transition hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 cursor-pointer"
          >
            <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
              🎮 ক্লাসিক
            </div>
            <div className="mt-1 text-base text-stone-700 dark:text-stone-300">
              {CLASSIC_ROUNDS} প্রশ্ন · প্রতি প্রশ্নে {QUESTION_TIME_MS / 1000} সেকেন্ড
            </div>
          </button>
          <button
            type="button"
            onClick={() => startMode("time_attack")}
            className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-5 text-left transition hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 cursor-pointer"
          >
            <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
              ⏱️ টাইম অট্যাক
            </div>
            <div className="mt-1 text-base text-stone-700 dark:text-stone-300">
              {TIME_ATTACK_MS / 1000} সেকেন্ডে যত বেশি পারো
            </div>
          </button>
          <button
            type="button"
            onClick={() => startMode("daily")}
            className="rounded-2xl border-2 border-sky-400 bg-sky-50 px-5 py-5 text-left transition hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
                📅 আজকের চ্যালেঞ্জ
              </span>
              {dailyDoneToday ? (
                <span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-800 dark:text-sky-100">
                  ✅ শেষ
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-base text-stone-700 dark:text-stone-300">
              প্রতিদিন একই {DAILY_ROUNDS} প্রশ্ন · +৫০ XP বোনাস
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAchievements(true)}
          className="rounded-xl border border-emerald-400 bg-emerald-50 py-3 text-center text-base font-bold text-emerald-800 transition hover:bg-black hover:border-black dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
        >
          🏆 অর্জন ও XP দেখো
        </button>

        <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">
          মানচিত্র শিক্ষামূলক; সরকারি সীমানার সাথে পার্থক্য থাকতে পারে।
        </p>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
        <p className="text-center text-stone-500">লোড হচ্ছে…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          বাংলাদেশ · মানচিত্র কুইজ
          {activeMode === "classic" && " · ক্লাসিক"}
          {activeMode === "time_attack" && " · টাইম অট্যাক"}
          {activeMode === "daily" && " · দৈনিক"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          কোন জেলা?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {subtitle}
        </p>
      </header>

      {questionProgress ? (
        <div className="text-center text-sm text-stone-600 dark:text-stone-400">
          প্রশ্ন {questionProgress.current} / {questionProgress.total}
        </div>
      ) : null}

      {activeMode === "time_attack" ? (
        <div className="text-center">
          <div
            className={`font-mono text-3xl font-bold tabular-nums ${
              timeLeftMs < 10_000
                ? "text-red-600"
                : "text-stone-900 dark:text-stone-100"
            }`}
          >
            {(timeLeftMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-stone-500">বাকি সময়</div>
        </div>
      ) : (
        <div className="px-1">
          <div className="mb-1 flex justify-between text-xs text-stone-500">
            <span>প্রশ্নের সময়</span>
            <span>{Math.ceil(timerRatio * (QUESTION_TIME_MS / 1000))}s</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                timerRatio < 0.25 ? "bg-red-500" : "bg-sky-500"
              }`}
              style={{ width: `${timerRatio * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
          <div className="text-xs text-stone-500 dark:text-stone-400">স্কোর</div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {score}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
          <div className="text-xs text-stone-500 dark:text-stone-400">স্ট্রিক</div>
          <div className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400">
            {streak}×
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white/80 px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
          <div className="text-xs text-stone-500 dark:text-stone-400">লেভেল</div>
          <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {levelFromXp(progress.xp)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-xl dark:border-stone-700 dark:bg-stone-950">
        <BangladeshDistrictMapSvg
          fillById={fillById}
          defaultFill={FILL_DEFAULT}
          className="h-auto w-full max-h-[min(52vh,420px)]"
        />
      </div>

      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        মোট খেলা: <span className="font-mono">{progress.played}</span> · কিবোর্ড{" "}
        <kbd className="rounded border border-stone-300 bg-stone-100 px-1 dark:border-stone-600 dark:bg-stone-800">
          1
        </kbd>
        –
        <kbd className="rounded border border-stone-300 bg-stone-100 px-1 dark:border-stone-600 dark:bg-stone-800">
          4
        </kbd>
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {round.choices.map((d, idx) => {
          const locked = pickedId !== null;
          const isPicked = pickedId === d.id;
          const isAnswer = d.id === round.answer.id;
          let ring =
            "border-stone-200 dark:border-stone-600 hover:border-emerald-400 dark:hover:border-emerald-500";
          if (locked) {
            if (isAnswer) {
              ring =
                "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-400";
            } else if (isPicked && !isAnswer) {
              ring =
                "border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-500";
            } else {
              ring = "border-stone-200 opacity-60 dark:border-stone-700";
            }
          }
          return (
            <button
              key={d.id}
              type="button"
              disabled={locked}
              onClick={() => onChoose(d)}
              className={`rounded-2xl border-2 bg-white px-4 py-4 text-left transition dark:bg-stone-900 ${ring} disabled:cursor-default`}
            >
              <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                বিকল্প {idx + 1} · {DIVISION_LABEL_BN[d.division]}
              </span>
              <span className="mt-1 block text-2xl font-extrabold text-stone-900 dark:text-stone-50">
                {d.nameBn}
              </span>
            </button>
          );
        })}
      </div>

      {toast ? (
        <p
          className={`text-center text-sm font-medium ${
            pickedId === round.answer.id
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-700 dark:text-red-300"
          }`}
        >
          {toast}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setPhase("menu");
          setRound(null);
          setActiveMode(null);
        }}
        className="text-center text-sm text-stone-500 underline cursor-pointer"
      >
        মেনুতে ফিরো (রান ছেড়ে দাও)
      </button>
    </div>
  );
}
