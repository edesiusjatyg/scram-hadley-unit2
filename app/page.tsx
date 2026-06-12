import GameShell from '../components/GameShell';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-[#0a0a0a]">
      <div className="w-full h-[calc(100vh-2rem)] max-w-7xl mx-auto relative">
        <GameShell />
      </div>
    </main>
  );
}
