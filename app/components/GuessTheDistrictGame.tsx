"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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

type GuessTheDistrictGameProps = {
  initialMode?: GameMode;
};

export function GuessTheDistrictGame({ initialMode }: GuessTheDistrictGameProps) {
  const router = useRouter();
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
  const modeRouteBootedRef = useRef(false);

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

  useEffect(() => {
    if (!initialMode || !mounted || phase !== "menu" || modeRouteBootedRef.current)
      return;
    modeRouteBootedRef.current = true;
    startMode(initialMode);
  }, [initialMode, mounted, phase, startMode]);

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
              ? `Great! 🔥 ${nextStreak} streak — +${base} (time +${timeBonus})`
              : `Correct! +${base} (time bonus +${timeBonus})`,
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
        const answerName = round?.answer.nameBn ?? "Unknown";
        setToast(
          picked
            ? `Not quite — correct answer: ${answerName}`
            : `Time up! Correct answer: ${answerName}`,
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
          setToast("Time is over!");
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
    if (!pickedId || !round) return null;
    if (pickedId === TIMEOUT_ID) {
      return activeMode === "time_attack"
        ? "Global timer finished."
        : "Time up. The highlighted district is the correct answer.";
    }
    return pickedId === round.answer.id
      ? "Correct answer selected."
      : "Green = correct district, red = your selection.";
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="h-32 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
      </div>
    );
  }

  if (showAchievements) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
            Achievements
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Level {levelFromXp(progress.xp)} · Total XP{" "}
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
                    ? "border-blue-300 bg-blue-50/80 dark:border-blue-700 dark:bg-blue-950/40"
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
          className="rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700 cursor-pointer transition dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          Back to Menu
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 text-slate-100">
        <header className="text-center">
          <h1 className="text-xl font-bold text-slate-100">
            Run Complete
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {lastRun.mode === "classic" && "Classic Mode"}
            {lastRun.mode === "time_attack" && "Rapid Quiz"}
            {lastRun.mode === "daily" && "Today Challenge"}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">Score</div>
            <div className="font-mono text-lg font-bold">{lastRun.score}</div>
          </div>
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">Accuracy</div>
            <div className="font-mono text-lg font-bold">{acc}%</div>
          </div>
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">Correct / Wrong</div>
            <div className="font-mono text-lg font-bold">
              {lastRun.correct} / {lastRun.wrong}
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">Best Streak</div>
            <div className="font-mono text-lg font-bold text-slate-100">
              {lastRun.bestStreak}×
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">Fast Answers (&lt;3s)</div>
            <div className="font-mono text-lg font-bold">
              {lastRun.fastAnswers}
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 p-3 backdrop-blur-sm">
            <div className="text-slate-300">XP (This Run)</div>
            <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              +{lastRun.xpGained}
            </div>
          </div>
        </div>

        {lastRun.newAchievementIds.length > 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              New Achievement!
            </div>
            <ul className="mt-2 list-inside list-disc text-sm text-blue-800 dark:text-blue-300">
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
              if (initialMode) {
                router.push("/quiz");
                return;
              }
              setPhase("menu");
              refreshProgress();
            }}
            className="flex-1 rounded-xl border border-cyan-200/25 bg-slate-900/45 py-3 font-semibold text-slate-100 hover:bg-slate-800/70 cursor-pointer"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => {
              const m = lastRun.mode;
              setLastRun(null);
              startMode(m);
              refreshProgress();
            }}
            className="flex-1 rounded-xl bg-linear-to-r from-cyan-400 to-emerald-400 py-3 font-semibold text-slate-950 hover:brightness-110 cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (phase === "menu") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 text-slate-100">
        <header className="text-center">
          <p className="text-base font-bold text-cyan-200/90">
            BD Map Quiz
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-100">
            Which District?
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Choose a mode and start.
          </p>
        </header>

        <div className="rounded-2xl border border-cyan-200/25 bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-200">
              Level <span className="font-bold">{xpBar.level}</span>
            </span>
            <span className="font-mono text-xs text-slate-300">
              {xpBar.current}/{xpBar.need} XP
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700/70">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, (xpBar.current / xpBar.need) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-300">
            <span>Total XP: {progress.xp}</span>
            <span>Best Score: {progress.bestScore}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/quiz/classic")}
            className="rounded-2xl border border-cyan-200/25 bg-slate-900/55 px-5 py-5 text-left transition hover:bg-slate-800/70 cursor-pointer"
          >
            <div className="text-xl font-extrabold text-slate-100">
              Classic
            </div>
            <div className="mt-1 text-base text-slate-300">
              {CLASSIC_ROUNDS} questions · {QUESTION_TIME_MS / 1000}s each
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push("/quiz/rapid-quiz")}
            className="rounded-2xl border border-cyan-200/25 bg-slate-900/55 px-5 py-5 text-left transition hover:bg-slate-800/70 cursor-pointer"
          >
            <div className="text-xl font-extrabold text-slate-100">
              Rapid Quiz
            </div>
            <div className="mt-1 text-base text-slate-300">
              Score as much as possible in {TIME_ATTACK_MS / 1000}s
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push("/quiz/today-challenge")}
            className="rounded-2xl border border-cyan-200/25 bg-slate-900/55 px-5 py-5 text-left transition hover:bg-slate-800/70 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-extrabold text-slate-100">
                Today Challenge
              </span>
              {dailyDoneToday ? (
                <span className="rounded-full bg-cyan-300/20 px-2 py-0.5 text-xs font-medium text-cyan-100">
                  Completed
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-base text-slate-300">
              Same {DAILY_ROUNDS} daily questions · +50 XP bonus
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAchievements(true)}
          className="rounded-xl border border-cyan-200/25 bg-slate-900/55 py-3 text-center text-base font-bold text-slate-100 transition hover:bg-slate-800/70 cursor-pointer"
        >
          View Achievements & XP
        </button>

        <p className="text-center text-[11px] text-slate-400">
          Educational map only; boundaries may differ from official sources.
        </p>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <p className="text-center text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex mx-auto w-full max-w-3xl flex-col gap-6 px-4 py-8 text-slate-100 lg:px-8">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200/90">
          Bangladesh · Map Quiz
          {activeMode === "classic" && " · Classic"}
          {activeMode === "time_attack" && " · Rapid Quiz"}
          {activeMode === "daily" && " · Daily"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">
          Which District?
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {subtitle}
          </p>
        ) : null}
      </header>

      {questionProgress ? (
        <div className="text-center text-sm text-slate-300">
          Question {questionProgress.current} / {questionProgress.total}
        </div>
      ) : null}

      {activeMode === "time_attack" ? (
        <div className="text-center">
          <div
            className={`font-mono text-3xl font-bold tabular-nums ${
              timeLeftMs < 10_000
                ? "text-red-600"
                : "text-slate-100"
            }`}
          >
            {(timeLeftMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-slate-300">Time left</div>
        </div>
      ) : (
        <div className="px-1">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Question timer</span>
            <span>{Math.ceil(timerRatio * (QUESTION_TIME_MS / 1000))}s</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/70">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                timerRatio < 0.25 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${timerRatio * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-300">Score</div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {score}
          </div>
        </div>
        <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-300">Streak</div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {streak}×
          </div>
        </div>
        <div className="rounded-xl border border-cyan-200/20 bg-slate-900/55 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="text-xs text-slate-300">Level</div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {levelFromXp(progress.xp)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-cyan-200/20 bg-slate-900/55 shadow-xl backdrop-blur-sm">
            <BangladeshDistrictMapSvg
              fillById={fillById}
              defaultFill={FILL_DEFAULT}
              className="h-auto w-full max-h-[min(62vh,620px)]"
            />
          </div>
          <p className="text-center text-xs text-slate-300">
            Total played: <span className="font-mono">{progress.played}</span> · Keyboard{" "}
            <kbd className="rounded border border-cyan-200/30 bg-slate-800/80 px-1 text-slate-100">
              1
            </kbd>
            –
            <kbd className="rounded border border-cyan-200/30 bg-slate-800/80 px-1 text-slate-100">
              4
            </kbd>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {round.choices.map((d, idx) => {
            const locked = pickedId !== null;
            const isPicked = pickedId === d.id;
            const isAnswer = d.id === round.answer.id;
            let ring =
              "border-cyan-200/25 hover:border-cyan-300/60";
            if (locked) {
              if (isAnswer) {
                ring =
                  "border-cyan-300 bg-cyan-400/15";
              } else if (isPicked && !isAnswer) {
                ring =
                  "border-red-300 bg-red-400/10";
              } else {
                ring = "border-cyan-200/15 opacity-60";
              }
            }
            return (
              <button
                key={d.id}
                type="button"
                disabled={locked}
                onClick={() => onChoose(d)}
                className={`rounded-2xl border-2 bg-slate-900/55 px-4 py-4 text-left transition backdrop-blur-sm ${ring} disabled:cursor-default cursor-pointer`}
              >
                <span className="text-sm font-medium text-slate-300">
                  Option {idx + 1} · {DIVISION_LABEL_BN[d.division]}
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-slate-100">
                  {d.nameBn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {toast ? (
        <p
          className={`text-center text-sm font-medium ${
            pickedId === round.answer.id
              ? "text-blue-700 dark:text-blue-300"
              : "text-red-700 dark:text-red-300"
          }`}
        >
          {toast}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (initialMode) {
            router.push("/quiz");
            return;
          }
          setPhase("menu");
          setRound(null);
          setActiveMode(null);
        }}
        className="text-center text-sm text-stone-500 underline cursor-pointer"
      >
        Back to Menu (leave run)
      </button>
    </div>
  );
}
