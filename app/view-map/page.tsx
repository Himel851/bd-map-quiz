import { FullMapViewer } from "../components/FullMapViewer";

export default function ViewMapPage() {
  return (
    <div className="animated-quiz-bg min-h-full flex flex-1 flex-col">
      <main className="flex flex-1 flex-col pb-8">
        <FullMapViewer />
      </main>
    </div>
  );
}
