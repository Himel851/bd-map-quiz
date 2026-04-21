import { GuessTheDistrictGame } from "../../components/GuessTheDistrictGame";

export default function TodayChallengeQuizPage() {
  return (
    <div className="animated-quiz-bg min-h-full flex flex-1 flex-col">
      <main className="flex flex-1 flex-col pb-10">
        <GuessTheDistrictGame initialMode="daily" />
      </main>
    </div>
  );
}
