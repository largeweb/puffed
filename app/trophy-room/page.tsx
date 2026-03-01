"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TrophyData {
  username: string;
  memberSince: number;
  stats: {
    totalCheckins: number;
    totalLikesGiven: number;
    totalLikesReceived: number;
    totalComments: number;
    totalFollowers: number;
    totalFollowing: number;
    uniqueBrands: number;
    uniqueFlavors: number;
    avgRating: number;
    photosUploaded: number;
    bestStreak: number;
    currentStreak: number;
    longestSession: number | null;
    earlyBirdCount: number;
    nightOwlCount: number;
    weekendCount: number;
    firstCheckin: number | null;
    firstBrandPioneered: string | null;
    platformAvgCheckins: number;
    platformAvgRating: number;
    percentileRank: number;
    badgesEarned: number;
    badgesTotal: number;
    recentBadges: Array<{
      id: string;
      name: string;
      emoji: string;
      earnedAt: number | null;
    }>;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

export default function TrophyRoomPage() {
  const router = useRouter();
  const [data, setData] = useState<TrophyData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"showcase" | "badges" | "records">("showcase");

  useEffect(() => {
    Promise.all([
      fetch("/api/trophy-room").then((r) => r.json() as Promise<TrophyData & { error?: string }>),
      fetch("/api/badges").then((r) => r.json() as Promise<{ badges: Badge[] }>),
    ])
      .then(([trophyData, badgesData]) => {
        if (trophyData.error) {
          router.push("/login");
          return;
        }
        setData(trophyData);
        setBadges(badgesData.badges || []);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-800 to-amber-900 flex items-center justify-center">
        <div className="text-amber-200 text-xl animate-pulse">Loading Trophy Room...</div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, username, memberSince } = data;
  const earnedBadges = badges.filter((b) => b.earned);
  const inProgressBadges = badges.filter((b) => !b.earned && (b.progress || 0) > 0).slice(0, 6);
  
  const memberDays = Math.floor((Date.now() / 1000 - memberSince) / 86400);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-800 to-amber-900 relative overflow-hidden">
      {/* Trophy shelf background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-300 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-950 to-transparent" />
      </div>
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/dashboard" className="text-amber-300 hover:text-amber-200 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 mb-2">
            🏆 Trophy Room
          </h1>
          <p className="text-amber-200">
            @{username}&apos;s Hall of Achievement
          </p>
          <p className="text-amber-400/60 text-sm mt-1">
            Member for {memberDays} days
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { id: "showcase", label: "🏆 Showcase", icon: "🏆" },
            { id: "badges", label: "🎖️ Badges", icon: "🎖️" },
            { id: "records", label: "📊 Records", icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg shadow-amber-500/30"
                  : "bg-amber-800/50 text-amber-300 hover:bg-amber-700/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Showcase Tab */}
        {activeTab === "showcase" && (
          <div className="space-y-6">
            {/* Trophy Summary Card */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-300">Trophy Case</h2>
                  <p className="text-amber-300/70">Your proudest achievements</p>
                </div>
                <div className="text-5xl">🏆</div>
              </div>
              
              {/* Main stats showcase */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-amber-900/40 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-300">{stats.totalCheckins}</div>
                  <div className="text-amber-300/70 text-sm">Total Smokes</div>
                </div>
                <div className="bg-amber-900/40 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-300">{stats.bestStreak}</div>
                  <div className="text-amber-300/70 text-sm">Best Streak 🔥</div>
                </div>
                <div className="bg-amber-900/40 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-300">{stats.uniqueBrands}</div>
                  <div className="text-amber-300/70 text-sm">Brands Explored</div>
                </div>
                <div className="bg-amber-900/40 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-300">{earnedBadges.length}</div>
                  <div className="text-amber-300/70 text-sm">Badges Earned</div>
                </div>
              </div>

              {/* Percentile rank */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-4 text-center">
                <div className="text-lg text-amber-200">
                  You&apos;re in the <span className="text-2xl font-bold text-yellow-300">top {100 - stats.percentileRank}%</span> of smokers on Puffed!
                </div>
              </div>
            </div>

            {/* Recent Earned Badges */}
            {earnedBadges.length > 0 && (
              <div className="bg-amber-800/30 border border-amber-600/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-amber-200 mb-4">🎖️ Latest Achievements</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {earnedBadges.slice(0, 6).map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl p-3 text-center border border-yellow-500/30 hover:border-yellow-400/50 transition-all hover:scale-105"
                    >
                      <div className="text-3xl mb-1">{badge.emoji}</div>
                      <div className="text-xs text-amber-200 font-medium truncate">{badge.name}</div>
                    </div>
                  ))}
                </div>
                <Link
                  href="#"
                  onClick={(e) => { e.preventDefault(); setActiveTab("badges"); }}
                  className="text-amber-400 hover:text-amber-300 text-sm mt-4 inline-block"
                >
                  View all {earnedBadges.length} badges →
                </Link>
              </div>
            )}

            {/* Social Stats */}
            <div className="bg-amber-800/30 border border-amber-600/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-200 mb-4">💕 Social Impact</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{stats.totalLikesReceived}</div>
                  <div className="text-amber-300/70 text-sm">Likes Received</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{stats.totalLikesGiven}</div>
                  <div className="text-amber-300/70 text-sm">Likes Given</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.totalFollowers}</div>
                  <div className="text-amber-300/70 text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.totalFollowing}</div>
                  <div className="text-amber-300/70 text-sm">Following</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === "badges" && (
          <div className="space-y-6">
            {/* Earned Badges */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-yellow-300">🏅 Earned Badges</h3>
                <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
                  {earnedBadges.length} / {badges.length}
                </span>
              </div>
              
              {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gradient-to-br from-yellow-500/30 to-amber-500/30 rounded-xl p-4 text-center border border-yellow-500/40 hover:border-yellow-400/60 transition-all group"
                    >
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{badge.emoji}</div>
                      <div className="text-sm font-bold text-yellow-200">{badge.name}</div>
                      <div className="text-xs text-amber-300/60 mt-1">{badge.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-amber-400/60 py-8">
                  No badges earned yet. Start smoking to unlock achievements!
                </div>
              )}
            </div>

            {/* In Progress */}
            {inProgressBadges.length > 0 && (
              <div className="bg-amber-800/30 border border-amber-600/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-amber-200 mb-4">🎯 In Progress</h3>
                <div className="space-y-3">
                  {inProgressBadges.map((badge) => {
                    const progress = badge.progress || 0;
                    const target = badge.target || 1;
                    const percent = Math.min(100, Math.round((progress / target) * 100));
                    
                    return (
                      <div key={badge.id} className="bg-amber-900/40 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl opacity-50">{badge.emoji}</span>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-amber-200 font-medium">{badge.name}</span>
                              <span className="text-amber-400/60 text-sm">{progress}/{target}</span>
                            </div>
                            <div className="text-xs text-amber-300/50">{badge.description}</div>
                          </div>
                        </div>
                        <div className="h-2 bg-amber-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked badges preview */}
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-400/60 mb-4">🔒 Locked Badges</h3>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {badges
                  .filter((b) => !b.earned && !(b.progress && b.progress > 0))
                  .slice(0, 16)
                  .map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-amber-900/40 rounded-lg p-2 text-center opacity-40 hover:opacity-60 transition-opacity"
                      title={`${badge.name}: ${badge.description}`}
                    >
                      <div className="text-2xl grayscale">{badge.emoji}</div>
                    </div>
                  ))}
              </div>
              <p className="text-amber-500/50 text-sm mt-4 text-center">
                {badges.filter((b) => !b.earned).length} more badges to unlock!
              </p>
            </div>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === "records" && (
          <div className="space-y-6">
            {/* Personal Records */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-300 mb-4">📈 Personal Records</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-900/40 rounded-xl p-4">
                  <div className="text-amber-400/60 text-sm mb-1">Best Streak</div>
                  <div className="text-3xl font-bold text-yellow-300">{stats.bestStreak} days 🔥</div>
                </div>
                <div className="bg-amber-900/40 rounded-xl p-4">
                  <div className="text-amber-400/60 text-sm mb-1">Current Streak</div>
                  <div className="text-3xl font-bold text-yellow-300">{stats.currentStreak} days</div>
                </div>
                {stats.longestSession && (
                  <div className="bg-amber-900/40 rounded-xl p-4">
                    <div className="text-amber-400/60 text-sm mb-1">Longest Session</div>
                    <div className="text-3xl font-bold text-yellow-300">{stats.longestSession} min ⏱️</div>
                  </div>
                )}
                <div className="bg-amber-900/40 rounded-xl p-4">
                  <div className="text-amber-400/60 text-sm mb-1">Average Rating</div>
                  <div className="text-3xl font-bold text-yellow-300">{stats.avgRating || "—"} ⭐</div>
                </div>
              </div>
            </div>

            {/* Time-based achievements */}
            <div className="bg-amber-800/30 border border-amber-600/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-200 mb-4">🕐 Time Achievements</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-amber-900/40 rounded-xl p-4">
                  <div className="text-3xl mb-1">🌅</div>
                  <div className="text-2xl font-bold text-amber-200">{stats.earlyBirdCount}</div>
                  <div className="text-amber-400/60 text-sm">Early Bird</div>
                </div>
                <div className="text-center bg-amber-900/40 rounded-xl p-4">
                  <div className="text-3xl mb-1">🦉</div>
                  <div className="text-2xl font-bold text-amber-200">{stats.nightOwlCount}</div>
                  <div className="text-amber-400/60 text-sm">Night Owl</div>
                </div>
                <div className="text-center bg-amber-900/40 rounded-xl p-4">
                  <div className="text-3xl mb-1">🎉</div>
                  <div className="text-2xl font-bold text-amber-200">{stats.weekendCount}</div>
                  <div className="text-amber-400/60 text-sm">Weekend</div>
                </div>
              </div>
            </div>

            {/* Platform Comparison */}
            <div className="bg-amber-800/30 border border-amber-600/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-200 mb-4">📊 vs. Platform Average</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-amber-300">Check-ins</span>
                    <span className="text-amber-400/60">
                      You: {stats.totalCheckins} | Avg: {stats.platformAvgCheckins}
                    </span>
                  </div>
                  <div className="h-3 bg-amber-900 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${Math.min(100, (stats.totalCheckins / Math.max(1, stats.platformAvgCheckins * 2)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-amber-300">Average Rating</span>
                    <span className="text-amber-400/60">
                      You: {stats.avgRating || "—"} | Avg: {stats.platformAvgRating}
                    </span>
                  </div>
                  <div className="h-3 bg-amber-900 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${((stats.avgRating || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-400 mb-4">🎯 Milestones</h3>
              <div className="space-y-3">
                {stats.firstCheckin && (
                  <div className="flex items-center gap-3 text-amber-300">
                    <span className="text-2xl">🌱</span>
                    <div>
                      <div className="font-medium">First Smoke</div>
                      <div className="text-amber-400/60 text-sm">
                        {new Date(stats.firstCheckin * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
                {stats.firstBrandPioneered && (
                  <div className="flex items-center gap-3 text-amber-300">
                    <span className="text-2xl">🏴‍☠️</span>
                    <div>
                      <div className="font-medium">First Brand Pioneered</div>
                      <div className="text-amber-400/60 text-sm">{stats.firstBrandPioneered}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-amber-300">
                  <span className="text-2xl">📸</span>
                  <div>
                    <div className="font-medium">Photos Uploaded</div>
                    <div className="text-amber-400/60 text-sm">{stats.photosUploaded} photos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/achievements"
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            View All Achievements →
          </Link>
          <Link
            href="/leaderboard"
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            View Leaderboards →
          </Link>
        </div>
      </div>
    </div>
  );
}
