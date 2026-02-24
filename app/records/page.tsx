"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiShare2, FiAward, FiExternalLink } from "react-icons/fi";

interface PersonalRecord {
  id: string;
  title: string;
  emoji: string;
  value: string;
  details?: string;
  date?: string;
  checkinId?: string;
}

interface RecordsResponse {
  records: PersonalRecord[];
  username: string;
  totalCheckins: number;
}

const RECORD_COLORS: Record<string, string> = {
  'longest-streak': 'from-orange-500 to-red-500',
  'most-liked': 'from-pink-500 to-rose-500',
  'most-commented': 'from-green-500 to-emerald-500',
  'most-active-day': 'from-blue-500 to-cyan-500',
  'five-star-count': 'from-yellow-500 to-amber-500',
  'earliest-smoke': 'from-amber-400 to-orange-400',
  'latest-smoke': 'from-indigo-500 to-purple-500',
  'brands-explored': 'from-cyan-500 to-teal-500',
  'most-loyal': 'from-violet-500 to-purple-500',
  'photos-uploaded': 'from-rose-400 to-pink-500',
  'avg-rating': 'from-slate-400 to-zinc-500',
};

export default function RecordsPage() {
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadRecords() {
      try {
        const res = await fetch("/api/personal-records");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json: RecordsResponse = await res.json();
        setData(json);
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, [router]);

  const handleShare = async () => {
    if (!data) return;
    
    const topRecords = data.records.slice(0, 4).map(r => `${r.emoji} ${r.title}: ${r.value}`).join('\n');
    const shareText = `🏆 My Puffed Records\n\n${topRecords}\n\nTrack your smokes at puffed.pages.dev`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Personal Records - Puffed",
          text: shareText,
          url: `${window.location.origin}/records`,
        });
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Failed to load records</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold flex items-center gap-2">
                <FiAward className="text-amber-500" />
                Personal Records
              </h1>
              <p className="text-xs text-gray-400">Your all-time bests</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-all text-sm"
          >
            <FiShare2 size={16} />
            Share
            {shareStatus && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-black px-2 py-1 rounded whitespace-nowrap">
                {shareStatus}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Hero Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 text-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        >
          <p className="text-5xl mb-2">🏆</p>
          <h2 className="text-xl font-bold mb-1">{data.username}&apos;s Records</h2>
          <p className="text-gray-400 text-sm">
            {data.totalCheckins} total check-ins • {data.records.length} records
          </p>
        </motion.div>

        {/* Records Grid */}
        {data.records.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.records.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass rounded-2xl overflow-hidden group"
              >
                {/* Gradient Header */}
                <div className={`h-2 bg-gradient-to-r ${RECORD_COLORS[record.id] || 'from-gray-500 to-gray-600'}`} />
                
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{record.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-300">{record.title}</h3>
                        <p className="text-xl font-bold">{record.value}</p>
                      </div>
                    </div>
                    {record.checkinId && (
                      <Link
                        href={`/checkin/${record.checkinId}`}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100"
                        title="View check-in"
                      >
                        <FiExternalLink size={16} />
                      </Link>
                    )}
                  </div>
                  
                  {(record.details || record.date) && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                      {record.details && (
                        <p className="text-xs text-gray-400">{record.details}</p>
                      )}
                      {record.date && (
                        <p className="text-xs text-gray-500">{record.date}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 glass rounded-2xl"
          >
            <p className="text-4xl mb-4">🚬</p>
            <p className="text-gray-400 mb-2">No records yet!</p>
            <p className="text-sm text-gray-500 mb-6">Start logging smokes to build your records</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold"
            >
              Log Your First Smoke
            </Link>
          </motion.div>
        )}

        {/* Tips Section */}
        {data.records.length > 0 && data.records.length < 10 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">💡</span>
              Unlock More Records
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {!data.records.find(r => r.id === 'most-liked') && (
                <li className="flex items-center gap-2">
                  <span className="text-pink-400">❤️</span>
                  Get likes on your check-ins by adding photos and reviews
                </li>
              )}
              {!data.records.find(r => r.id === 'five-star-count') && (
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⭐</span>
                  Log a 5-star smoke when you find something amazing
                </li>
              )}
              {!data.records.find(r => r.id === 'earliest-smoke') && (
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">🌅</span>
                  Log an early morning smoke to unlock the Early Bird record
                </li>
              )}
              {!data.records.find(r => r.id === 'latest-smoke') && (
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">🌙</span>
                  Log a late night smoke to unlock the Night Owl record
                </li>
              )}
            </ul>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            href="/mystats"
            className="glass rounded-xl p-4 text-center hover:bg-white/5 transition-all group"
          >
            <span className="text-2xl">📊</span>
            <p className="text-sm font-medium mt-2 group-hover:text-amber-500 transition-colors">My Stats</p>
          </Link>
          <Link
            href="/leaderboard"
            className="glass rounded-xl p-4 text-center hover:bg-white/5 transition-all group"
          >
            <span className="text-2xl">🏅</span>
            <p className="text-sm font-medium mt-2 group-hover:text-amber-500 transition-colors">Leaderboard</p>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
