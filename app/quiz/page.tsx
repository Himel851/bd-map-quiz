import { GuessTheDistrictGame } from "../components/GuessTheDistrictGame";

export default function QuizPage() {
  return (
    <div className="min-h-full flex flex-1 flex-col bg-stone-100 dark:bg-stone-950">
      <main className="flex flex-1 flex-col pb-10">
        <GuessTheDistrictGame />
      </main>
    </div>
  );
}
