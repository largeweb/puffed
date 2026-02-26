"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShare2 } from "react-icons/fi";
import Link from "next/link";

interface PersonalBest {
  label: string;
  value: string | number;
  detail?: string;
  icon: string;
  date?: string;
}

interface BestsResponse {
  bests?: PersonalBest[];
  message?: string;
  error?: string;
}

export default function PersonalBestsPage() {
  const router = useRouter();
  const [bests, setBests] = useState<PersonalBest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchBests = async () => {
      try {
        const res = await fetch("/api/personal-bests");
        const data: BestsResponse = await res.json();
        
        if (data.error) {
          router.push("/login");
          return;
        }
        
        setBests(data.bests || []);
        setMessage(data.message || null);
      } catch (error) {
        console.error("Error fetching personal bests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBests();
  }, [router]);

  const handleShare = async () => {
    const shareText = `My Puffed Personal Bests 🏆\n\n${bests.slice(0, 5).map(b => `${b.icon} ${b.label}: ${b.value}`).join('\n')}\n\nTrack your smokes at puffed.pages.dev`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Puffed Personal Bests",
          text: shareText,
        });
        setShareStatus("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied!");
      setTimeout(() => setShareStatus(null), 2000);
    } catch {
      setShareStatus("Failed");
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 bg-black/90 backdrop-blur-lg border-b border-gray-800 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              <FiArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥇</span>
              <h1 className="text-xl font-bold">Personal Bests</h1>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Share your bests"
          >
            {shareStatus ? (
              <span className="text-sm text-green-400">{shareStatus}</span>
            ) : (
              <FiShare2 size={20} />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
          </div>
        ) : message ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <span className="text-5xl mb-4 opacity-50">🥇</span>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Log Your First Smoke
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Trophy banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-amber-500/20 rounded-2xl p-6 mb-6 text-center border border-yellow-500/30"
            >
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Your Smoking Records
              </h2>
              <p className="text-sm text-gray-400 mt-2">
                {bests.length} personal achievements tracked
              </p>
            </motion.div>

            {/* Bests grid */}
            <div className="grid grid-cols-2 gap-3">
              {bests.map((best, index) => (
                <motion.div
                  key={best.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700 hover:border-yellow-500/50 transition-colors ${
                    index === 0 ? "col-span-2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{best.icon}</span>
                    {best.date && (
                      <span className="text-xs text-gray-500">{best.date}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-white truncate">
                    {best.value}
                  </div>
                  <div className="text-sm text-yellow-500 font-medium">
                    {best.label}
                  </div>
                  {best.detail && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {best.detail}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Motivational footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center"
            >
              <p className="text-gray-500 text-sm">
                Keep smoking to unlock more achievements! 🚬
              </p>
              <Link
                href="/achievements"
                className="inline-block mt-4 text-yellow-500 hover:text-yellow-400 text-sm font-medium"
              >
                View All Badges →
              </Link>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
