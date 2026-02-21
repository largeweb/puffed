import Link from "next/link";

export default function CheckinNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-6xl">🚬</p>
      <h1 className="text-2xl font-bold text-white">Check-in Not Found</h1>
      <p className="text-gray-400">This smoke session doesn&apos;t exist or was deleted.</p>
      <Link 
        href="/discover" 
        className="mt-4 px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-all"
      >
        ← Back to Discover
      </Link>
    </main>
  );
}
