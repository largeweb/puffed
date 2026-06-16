"use client";

import { useEffect, useState } from "react";
import { FiSmile, FiUsers, FiHeart, FiCoffee, FiStar, FiZap, FiMoon, FiSun } from "react-icons/fi";

interface MoodCount {
  mood: string;
  count: number;
  percentage: number;
}

interface CommunityMoodResponse {
  moods: MoodCount[];
  totalCheckins: number;
  dominantMood: string;
  timeframe: string;
}

const moodConfig: Record<string, { icon: typeof FiSmile; color: string; emoji: string }> = {
  relaxed: { icon: FiMoon, color: "text-blue-400", emoji: "😌" },
  social: { icon: FiUsers, color: "text-pink-400", emoji: "🎉" },
  celebratory: { icon: FiStar, color: "text-yellow-400", emoji: "🥳" },
  thoughtful: { icon: FiCoffee, color: "text-purple-400", emoji: "🤔" },
  stressed: { icon: FiZap, color: "text-orange-400", emoji: "😤" },
  creative: { icon: FiSun, color: "text-green-400", emoji: "🎨" },
  tired: { icon: FiMoon, color: "text-gray-400", emoji: "😴" },
  focused: { icon: FiZap, color: "text-cyan-400", emoji: "🎯" },
  bored: { icon: FiSmile, color: "text-gray-500", emoji: "😐" },
  adventurous: { icon: FiHeart, color: "text-red-400", emoji: "🔥" },
};

export default function CommunityMood() {
  const [data, setData] = useState<CommunityMoodResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/community-mood")
      .then((res) => res.json() as Promise<CommunityMoodResponse>)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-4 animate-pulse">
        <div className="h-16 bg-white/10 rounded-lg" />
      </div>
    );
  }

  if (!data || data.totalCheckins === 0) {
    return null;
  }

  const dominantConfig = moodConfig[data.dominantMood] || moodConfig.relaxed;
  const topMoods = data.moods.slice(0, 4);

  return (
    <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-4 border border-indigo-500/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{dominantConfig.emoji}</span>
        <div>
          <h3 className="text-white font-semibold text-sm">Community Mood Ring</h3>
          <p className="text-indigo-300 text-xs">
            {data.totalCheckins} check-ins in the last 24h
          </p>
        </div>
      </div>

      {/* Mood Bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-black/30">
        {topMoods.map((mood) => {
          const config = moodConfig[mood.mood] || moodConfig.relaxed;
          return (
            <div
              key={mood.mood}
              className={`${config.color.replace("text-", "bg-")} transition-all`}
              style={{ width: `${mood.percentage}%` }}
              title={`${mood.mood}: ${mood.percentage}%`}
            />
          );
        })}
      </div>

      {/* Mood Legend */}
      <div className="flex flex-wrap gap-2">
        {topMoods.map((mood) => {
          const config = moodConfig[mood.mood] || moodConfig.relaxed;
          return (
            <div key={mood.mood} className="flex items-center gap-1 text-xs">
              <span>{config.emoji}</span>
              <span className="text-white/70 capitalize">{mood.mood}</span>
              <span className="text-white/50">({mood.percentage}%)</span>
            </div>
          );
        })}
      </div>

      <p className="text-indigo-200/60 text-xs mt-3 italic">
        The community is feeling {data.dominantMood} tonight ✨
      </p>
    </div>
  );
}
