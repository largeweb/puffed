"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiStar,
  FiCalendar,
  FiTrendingUp,
  FiAward,
  FiSun,
  FiMusic,
} from "react-icons/fi";

interface WeekendData {
  countdown: string;
  isWeekend: boolean;
  weekendCheckins: Array<{
    id: string;
    brand: string;
    product: string;
    rating: number;
    username: string;
    avatar_url: string;
    created_at: number;
  }>;
  weekendLeaders: Array<{
    id: string;
    username: string;
    avatar_url: string;
    weekend_count: number;
    avg_rating: number;
  }>;
  platformStats: {
    totalWeekendSmokes: number;
    weekendSmokers: number;
    avgWeekendRating: number;
    topBrand: string | null;
  };
  personalStats: {
    totalWeekendSmokes: number;
    avgRating: number;
    thisWeekendCount: number;
  } | null;
  suggestion: {
    brand: string;
    product: string;
    avgRating: number;
    reason: string;
  } | null;
  quote: string;
}

export default function WeekendKickoffPage() {
  const router = useRouter();
  const [data, setData] = useState<WeekendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("puffed_user_id");
    if (!userId) {
      router.push("/login");
      return;
    }
    loadWeekendData(userId);
  }, [router]);

  const loadWeekendData = async (userId: string) => {
    try {
      const res = await fetch("/api/weekend-kickoff", {
        headers: { Authorization: `Bearer ${userId}` },
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load weekend data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-pink-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-pink-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-orange-500/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-orange-300 hover:text-orange-200 flex items-center gap-2"
            >
              <FiArrowLeft /> Back
            </Link>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
              🎊 Weekend Kickoff
            </h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Countdown Banner */}
        <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-2xl p-6 border border-orange-500/30 text-center">
          <div className="text-4xl mb-2">🎊</div>
          <h2 className="text-2xl font-bold text-orange-300 mb-2">
            {data?.countdown}
          </h2>
          <p className="text-orange-200/70 italic">&quot;{data?.quote}&quot;</p>
        </div>

        {/* Your Weekend Stats */}
        {data?.personalStats && (
          <div className="bg-black/30 rounded-2xl p-5 border border-orange-500/20">
            <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
              <FiStar className="text-yellow-400" /> Your Weekend
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {data.personalStats.thisWeekendCount}
                </div>
                <div className="text-xs text-orange-300/70">This Weekend</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {data.personalStats.totalWeekendSmokes}
                </div>
                <div className="text-xs text-orange-300/70">All-Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {data.personalStats.avgRating > 0
                    ? data.personalStats.avgRating.toFixed(1)
                    : "-"}
                </div>
                <div className="text-xs text-orange-300/70">Avg Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekend Suggestion */}
        {data?.suggestion && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-5 border border-green-500/30">
            <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
              <FiTrendingUp /> Weekend Pick for You
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{data.suggestion.brand}</div>
                <div className="text-green-300/70 text-sm">{data.suggestion.reason}</div>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <FiStar className="fill-current" />
                <span>{data.suggestion.avgRating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Weekend Leaderboard */}
        {data?.weekendLeaders && data.weekendLeaders.length > 0 && (
          <div className="bg-black/30 rounded-2xl p-5 border border-orange-500/20">
            <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
              <FiAward className="text-yellow-400" /> Weekend Warriors
            </h3>
            <div className="space-y-3">
              {data.weekendLeaders.map((leader, index) => (
                <div
                  key={leader.id}
                  className="flex items-center justify-between bg-black/20 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center text-sm">
                      {leader.avatar_url ? (
                        <img
                          src={leader.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        leader.username.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="text-white">{leader.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-300 font-medium">
                      {leader.weekend_count} smoke{leader.weekend_count !== 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-orange-300/50">
                      ★ {leader.avg_rating?.toFixed(1) || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Weekend's Smokes */}
        {data?.weekendCheckins && data.weekendCheckins.length > 0 && (
          <div className="bg-black/30 rounded-2xl p-5 border border-orange-500/20">
            <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
              <FiCalendar /> This Weekend&apos;s Smokes
            </h3>
            <div className="space-y-3">
              {data.weekendCheckins.slice(0, 5).map((checkin) => (
                <Link
                  key={checkin.id}
                  href={`/checkin/${checkin.id}`}
                  className="flex items-center justify-between bg-black/20 rounded-xl p-3 hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500/30 flex items-center justify-center text-sm">
                      {checkin.avatar_url ? (
                        <img
                          src={checkin.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        checkin.username.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-white text-sm">{checkin.brand}</div>
                      <div className="text-orange-300/50 text-xs">@{checkin.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400 text-sm">
                    <FiStar className="fill-current" />
                    <span>{checkin.rating}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Platform Weekend Stats */}
        <div className="bg-black/30 rounded-2xl p-5 border border-orange-500/20">
          <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
            <FiSun /> Weekend Vibes (All-Time)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data?.platformStats.totalWeekendSmokes || 0}
              </div>
              <div className="text-xs text-orange-300/70">Weekend Smokes</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data?.platformStats.weekendSmokers || 0}
              </div>
              <div className="text-xs text-orange-300/70">Weekend Smokers</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data?.platformStats.avgWeekendRating
                  ? data.platformStats.avgWeekendRating.toFixed(1)
                  : "-"}
              </div>
              <div className="text-xs text-orange-300/70">Avg Rating</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white truncate">
                {data?.platformStats.topBrand || "-"}
              </div>
              <div className="text-xs text-orange-300/70">Top Brand</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/log"
          className="block w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 rounded-xl text-center hover:from-orange-400 hover:to-pink-400 transition-all"
        >
          🔥 Log Your Weekend Smoke
        </Link>

        {/* Footer Links */}
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/happy-hour" className="text-orange-300/70 hover:text-orange-300">
            🍻 Happy Hour
          </Link>
          <Link href="/nightcap" className="text-orange-300/70 hover:text-orange-300">
            🌙 Nightcap Club
          </Link>
          <Link href="/goodnight" className="text-orange-300/70 hover:text-orange-300">
            😴 Goodnight
          </Link>
        </div>
      </div>
    </div>
  );
}
