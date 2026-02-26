"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FiArrowLeft, 
  FiTrendingUp, 
  FiAward, 
  FiTarget,
  FiUsers,
  FiCalendar,
  FiZap
} from "react-icons/fi";

interface MidweekData {
  isWednesday: boolean;
  weekProgress: number;
  userStats: {
    smokesThisWeek: number;
    smokesToday: number;
    weeklyGoalProgress: number;
    avgWeeklySmokes: number;
  } | null;
  communityStats: {
    smokesThisWeek: number;
    smokesToday: number;
    activeSmokersThisWeek: number;
    topBrandThisWeek: string | null;
  };
  midweekChampions: {
    username: string;
    smokesThisWeek: number;
    todaySmokes: number;
  }[];
  motivationalMessage: string;
  humpDayStreak: number;
}

export default function MidweekMomentumPage() {
  const router = useRouter();
  const [data, setData] = useState<MidweekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMidweekData();
  }, []);

  const fetchMidweekData = async () => {
    try {
      const response = await fetch("/api/midweek-momentum");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Failed to load midweek data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">🐪 Loading Hump Day vibes...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{error || "Something went wrong"}</p>
          <Link href="/dashboard" className="text-amber-400 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-amber-700/30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-amber-300 hover:text-white transition"
          >
            <FiArrowLeft />
            Back
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🐪 Midweek Momentum
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Hump Day Banner */}
        <div className={`rounded-xl p-6 text-center ${
          data.isWednesday 
            ? "bg-gradient-to-r from-amber-600 to-orange-600 animate-pulse" 
            : "bg-amber-800/50"
        }`}>
          <div className="text-5xl mb-3">🐪</div>
          {data.isWednesday ? (
            <>
              <h2 className="text-2xl font-bold mb-2">IT'S HUMP DAY!</h2>
              <p className="text-lg text-amber-100">{data.motivationalMessage}</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2">Midweek Momentum</h2>
              <p className="text-amber-200">Come back on Wednesday for the full Hump Day experience!</p>
            </>
          )}
        </div>

        {/* Week Progress Bar */}
        <div className="bg-amber-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-amber-300 flex items-center gap-1">
              <FiCalendar className="w-4 h-4" />
              Week Progress
            </span>
            <span className="text-sm font-medium">{data.weekProgress}%</span>
          </div>
          <div className="h-4 bg-amber-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${data.weekProgress}%` }}
            >
              {data.weekProgress >= 40 && data.weekProgress <= 60 && (
                <span className="text-xs">🐪</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-amber-400 mt-1">
            <span>Mon</span>
            <span className={data.isWednesday ? "font-bold text-amber-200" : ""}>Wed</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Personal Stats (if logged in) */}
        {data.userStats && (
          <div className="bg-amber-800/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiTarget className="text-amber-400" />
              Your Week So Far
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-amber-900/40 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-300">{data.userStats.smokesThisWeek}</div>
                <div className="text-xs text-amber-400">Smokes This Week</div>
              </div>
              <div className="bg-amber-900/40 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-300">{data.userStats.smokesToday}</div>
                <div className="text-xs text-amber-400">Today</div>
              </div>
            </div>

            {/* Weekly Goal Progress */}
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-amber-300">Weekly Goal Progress</span>
                <span className="font-medium">{data.userStats.weeklyGoalProgress}%</span>
              </div>
              <div className="h-3 bg-amber-900/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    data.userStats.weeklyGoalProgress >= 100 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                      : "bg-gradient-to-r from-amber-500 to-orange-500"
                  }`}
                  style={{ width: `${Math.min(100, data.userStats.weeklyGoalProgress)}%` }}
                />
              </div>
              <p className="text-xs text-amber-400 mt-1">
                {data.userStats.weeklyGoalProgress >= 100 
                  ? "🎉 Weekly goal achieved!" 
                  : `Based on your avg of ${data.userStats.avgWeeklySmokes}/week`}
              </p>
            </div>

            {/* Hump Day Streak */}
            {data.humpDayStreak > 0 && (
              <div className="mt-4 bg-gradient-to-r from-amber-600/30 to-orange-600/30 rounded-lg p-3 flex items-center gap-3">
                <div className="text-3xl">🔥</div>
                <div>
                  <div className="font-semibold text-amber-200">
                    {data.humpDayStreak} Week Hump Day Streak!
                  </div>
                  <div className="text-xs text-amber-400">
                    You've smoked every Wednesday for {data.humpDayStreak} weeks straight
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Community Stats */}
        <div className="bg-amber-800/30 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUsers className="text-amber-400" />
            Community This Week
          </h3>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-amber-900/40 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-300">{data.communityStats.smokesThisWeek}</div>
              <div className="text-xs text-amber-400">Total Smokes</div>
            </div>
            <div className="bg-amber-900/40 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-orange-300">{data.communityStats.smokesToday}</div>
              <div className="text-xs text-amber-400">Today</div>
            </div>
            <div className="bg-amber-900/40 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-300">{data.communityStats.activeSmokersThisWeek}</div>
              <div className="text-xs text-amber-400">Active Smokers</div>
            </div>
          </div>

          {data.communityStats.topBrandThisWeek && (
            <div className="bg-amber-900/40 rounded-lg p-3 flex items-center gap-3">
              <div className="text-2xl">🏆</div>
              <div>
                <div className="text-xs text-amber-400">Top Brand This Week</div>
                <div className="font-semibold text-amber-200">{data.communityStats.topBrandThisWeek}</div>
              </div>
            </div>
          )}
        </div>

        {/* Midweek Champions */}
        {data.midweekChampions.length > 0 && (
          <div className="bg-amber-800/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiAward className="text-amber-400" />
              Midweek Champions
            </h3>
            
            <div className="space-y-2">
              {data.midweekChampions.map((champion, index) => (
                <Link
                  key={champion.username}
                  href={`/profile/${champion.username}`}
                  className="flex items-center justify-between bg-amber-900/40 hover:bg-amber-900/60 rounded-lg p-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                    </div>
                    <div>
                      <div className="font-medium">@{champion.username}</div>
                      {champion.todaySmokes > 0 && (
                        <div className="text-xs text-amber-400">
                          {champion.todaySmokes} today
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-300">{champion.smokesThisWeek}</div>
                    <div className="text-xs text-amber-400">this week</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {data.isWednesday && (
          <Link
            href="/checkin"
            className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-4 px-6 rounded-xl text-center transition flex items-center justify-center gap-2"
          >
            <FiZap className="w-5 h-5" />
            Log Your Hump Day Smoke! 🐪
          </Link>
        )}

        {/* Fun Fact */}
        <div className="text-center text-sm text-amber-400 py-4">
          <p>🐪 Fun fact: "Hump Day" refers to getting over the midweek hump!</p>
          <p className="mt-1">Celebrate with a smoke and keep the momentum going.</p>
        </div>
      </div>
    </div>
  );
}
