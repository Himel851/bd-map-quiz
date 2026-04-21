import { GuessTheDistrictGame } from "./components/GuessTheDistrictGame";

export default function Home() {
  return (
    <div className="min-h-full flex flex-1 flex-col bg-gradient-to-b from-emerald-50 via-stone-50 to-amber-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <main className="flex flex-1 flex-col items-center pb-10">
        <GuessTheDistrictGame />
      </main>
    </div>
  );
}
