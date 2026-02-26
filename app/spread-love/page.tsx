"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHeart,
  FiArrowLeft,
  FiStar,
  FiUser,
  FiRefreshCw,
  FiCheck,
  FiZap,
} from "react-icons/fi";

interface LovedCheckin {
  id: string;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  image_url: string | null;
}

export default function SpreadLovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spreading, setSpreading] = useState(false);
  const [checkin, setCheckin] = useState<LovedCheckin | null>(null);
  const [lovesSpreadToday, setLovesSpreadToday] = useState(0);
  const [message, setMessage] = useState("");
  const [justLoved, setJustLoved] = useState(false);
  const [allLoved, setAllLoved] = useState(false);

  const fetchRandomCheckin = async () => {
    setLoading(true);
    setJustLoved(false);
    try {
      const res = await fetch("/api/spread-love");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json() as { lovedCheckin?: LovedCheckin; message?: string; lovesSpreadToday?: number };
      if (data.lovedCheckin) {
        setCheckin(data.lovedCheckin);
        setAllLoved(false);
      } else {
        setCheckin(null);
        setAllLoved(true);
        setMessage(data.message || "No more check-ins to love!");
      }
      setLovesSpreadToday(data.lovesSpreadToday || 0);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const spreadLove = async () => {
    if (!checkin || spreading) return;
    setSpreading(true);
    try {
      const res = await fetch("/api/spread-love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: checkin.id }),
      });
      const data = await res.json() as { success?: boolean; lovesSpreadToday?: number; message?: string; error?: string };
      if (data.success) {
        setJustLoved(true);
        setLovesSpreadToday(data.lovesSpreadToday || 0);
        setMessage(data.message || "");
        // Auto-fetch next after a moment
        setTimeout(() => {
          fetchRandomCheckin();
        }, 1500);
      } else {
        setMessage(data.error || "Failed to spread love");
      }
    } catch (err) {
      console.error("Failed to spread love:", err);
    } finally {
      setSpreading(false);
    }
  };

  useEffect(() => {
    fetchRandomCheckin();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-900 via-rose-800 to-red-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-pink-800/90 to-rose-800/90 backdrop-blur-sm border-b border-pink-600/30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-pink-700/50 rounded-lg transition">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <FiHeart className="text-pink-300" /> Spread the Love
            </h1>
            <p className="text-xs text-pink-200/70">One tap to brighten someone's day</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-pink-300">{lovesSpreadToday}</div>
            <div className="text-xs text-pink-200/70">loves today</div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Explanation Card */}
        <div className="bg-white/10 rounded-xl p-4 border border-pink-400/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <FiZap className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold text-pink-100">Random Acts of Kindness</h3>
              <p className="text-sm text-pink-200/70 mt-1">
                Like a random check-in you haven't seen yet. It takes one second and makes someone's day!
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-pink-400/20">
            <div className="animate-spin w-12 h-12 mx-auto mb-4 border-4 border-pink-400/30 border-t-pink-400 rounded-full"></div>
            <p className="text-pink-200/70">Finding someone to love...</p>
          </div>
        )}

        {/* All Loved State */}
        {!loading && allLoved && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-8 text-center border border-yellow-400/30">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-yellow-200 mb-2">Love Legend!</h2>
            <p className="text-yellow-100/80">{message}</p>
            <p className="text-sm text-yellow-200/60 mt-4">
              You've liked every single check-in on the platform. That's incredible!
            </p>
          </div>
        )}

        {/* Check-in Card */}
        {!loading && checkin && (
          <div className={`bg-white/10 rounded-2xl overflow-hidden border transition-all duration-300 ${
            justLoved ? "border-pink-400 shadow-lg shadow-pink-500/30" : "border-pink-400/20"
          }`}>
            {/* Image */}
            {checkin.image_url && (
              <div className="relative aspect-video bg-black/30">
                <img
                  src={checkin.image_url}
                  alt={checkin.brand}
                  className="w-full h-full object-cover"
                />
                {justLoved && (
                  <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                    <div className="animate-bounce text-6xl">💕</div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* User */}
              <Link href={`/user/${checkin.username}`} className="flex items-center gap-2 hover:opacity-80">
                <div className="w-8 h-8 bg-pink-600/30 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4" />
                </div>
                <span className="font-medium">{checkin.username}</span>
              </Link>

              {/* Brand & Rating */}
              <div>
                <h3 className="text-xl font-bold text-pink-100">{checkin.brand}</h3>
                {checkin.product && (
                  <p className="text-sm text-pink-200/70">{checkin.product}</p>
                )}
                {checkin.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`w-4 h-4 ${
                          i < checkin.rating ? "text-yellow-400 fill-yellow-400" : "text-pink-400/30"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {!justLoved ? (
                  <>
                    <button
                      onClick={spreadLove}
                      disabled={spreading}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {spreading ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                          Spreading...
                        </>
                      ) : (
                        <>
                          <FiHeart className="w-5 h-5" /> Spread Love
                        </>
                      )}
                    </button>
                    <button
                      onClick={fetchRandomCheckin}
                      disabled={spreading}
                      className="py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl transition"
                      title="Skip to next"
                    >
                      <FiRefreshCw className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex-1 py-3 px-4 bg-green-500/20 border border-green-400/30 rounded-xl font-bold text-lg flex items-center justify-center gap-2 text-green-300">
                    <FiCheck className="w-5 h-5" /> Love Sent!
                  </div>
                )}
              </div>

              {/* View Check-in Link */}
              <Link
                href={`/checkin/${checkin.id}`}
                className="block text-center text-sm text-pink-300/70 hover:text-pink-200 transition"
              >
                View full check-in →
              </Link>
            </div>
          </div>
        )}

        {/* Stats Banner */}
        {lovesSpreadToday > 0 && (
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl p-4 text-center border border-pink-400/20">
            <p className="text-sm text-pink-200/70">
              You've spread <span className="font-bold text-pink-300">{lovesSpreadToday}</span> love{lovesSpreadToday === 1 ? "" : "s"} today!
            </p>
            {lovesSpreadToday >= 5 && (
              <p className="text-xs text-yellow-300/80 mt-1">⭐ Love Machine! Keep it going!</p>
            )}
            {lovesSpreadToday >= 10 && (
              <p className="text-xs text-yellow-300/80 mt-1">🏆 You're on fire! 10+ loves!</p>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="text-center text-sm text-pink-200/50 py-4">
          <p>Tip: Spread 5+ loves daily to earn the "Love Ambassador" badge! 💕</p>
        </div>
      </div>
    </main>
  );
}
