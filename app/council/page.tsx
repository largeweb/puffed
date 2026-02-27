'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiAward, FiStar, FiMoon, FiSun, FiCoffee, FiZap, FiHeart, FiTrendingUp, FiCamera, FiMessageCircle, FiUsers } from 'react-icons/fi';

interface CouncilMember {
  id: string;
  username: string;
  avatar_url: string | null;
  title: string;
  description: string;
  emoji: string;
  stat: string;
  statValue: number | string;
  color: string;
}

interface CouncilData {
  council: CouncilMember[];
  yourPosition: {
    title: string;
    description: string;
    emoji: string;
    stat: string;
    statValue: number | string;
    color: string;
  } | null;
  totalVoters: number;
  lastUpdated: string;
}

const POSITION_COLORS: Record<string, string> = {
  'President': 'from-amber-500 to-yellow-600',
  'Vice President': 'from-purple-500 to-indigo-600',
  'Secretary of Flavor': 'from-pink-500 to-rose-600',
  'Night Chancellor': 'from-indigo-600 to-purple-800',
  'Dawn Commander': 'from-orange-400 to-amber-500',
  'Minister of Quality': 'from-emerald-500 to-green-600',
  'Social Ambassador': 'from-cyan-500 to-blue-500',
  'Chronicler General': 'from-slate-500 to-gray-600',
  'Weekend Warrior': 'from-fuchsia-500 to-pink-600',
  'Brand Explorer': 'from-teal-500 to-cyan-600',
};

function CouncilCard({ member, rank }: { member: CouncilMember; rank: number }) {
  const gradient = POSITION_COLORS[member.title] || 'from-gray-500 to-gray-600';
  
  return (
    <div className={`
      relative overflow-hidden rounded-xl border border-white/10
      bg-gradient-to-br ${gradient}
      p-4 sm:p-5
    `}>
      {/* Rank badge */}
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white font-bold text-sm">
        #{rank}
      </div>
      
      {/* Member info */}
      <div className="flex items-start gap-4">
        <div className="relative">
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={member.username}
              width={64}
              height={64}
              className="rounded-full border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center text-2xl border-2 border-white/30">
              {member.emoji}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 text-2xl">{member.emoji}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg truncate">{member.title}</h3>
          <Link 
            href={`/user/${member.username}`}
            className="text-white/80 hover:text-white text-sm font-medium"
          >
            @{member.username}
          </Link>
          <p className="text-white/70 text-xs mt-1">{member.description}</p>
        </div>
      </div>
      
      {/* Stat */}
      <div className="mt-4 pt-3 border-t border-white/20">
        <div className="flex justify-between items-center">
          <span className="text-white/70 text-sm">{member.stat}</span>
          <span className="text-white font-bold">{member.statValue}</span>
        </div>
      </div>
    </div>
  );
}

export default function SmokeCouncilPage() {
  const router = useRouter();
  const [data, setData] = useState<CouncilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCouncil();
  }, []);

  const fetchCouncil = async () => {
    try {
      const res = await fetch('/api/smoke-council');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to load council');
      const json = await res.json() as CouncilData;
      setData(json);
    } catch (err) {
      setError('Failed to load the Smoke Council');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-4xl">🏛️</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
        <div className="max-w-lg mx-auto text-center py-12">
          <p className="text-red-400">{error || 'Something went wrong'}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-amber-500">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition">
            <FiArrowLeft className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">🏛️ The Smoke Council</h1>
            <p className="text-gray-400 text-xs">Weekly Cabinet of Distinguished Smokers</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Intro card */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-500/30">
          <p className="text-amber-100 text-sm leading-relaxed">
            🗳️ <strong>The Smoke Council</strong> recognizes the most distinguished members of our community. 
            Positions are earned through your smoking habits and awarded weekly. May the smoke be ever in your favor!
          </p>
          <p className="text-amber-500/70 text-xs mt-2">
            {data.totalVoters} citizens • Updated {data.lastUpdated}
          </p>
        </div>

        {/* Your Position */}
        {data.yourPosition && (
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-4 border border-indigo-500/30">
            <h2 className="text-indigo-300 font-semibold text-sm mb-3 flex items-center gap-2">
              <FiAward /> Your Position
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{data.yourPosition.emoji}</span>
              <div>
                <h3 className="text-white font-bold">{data.yourPosition.title}</h3>
                <p className="text-gray-400 text-sm">{data.yourPosition.description}</p>
                <p className="text-indigo-400 text-xs mt-1">
                  {data.yourPosition.stat}: {data.yourPosition.statValue}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Council Members */}
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">👑</span> The Cabinet
          </h2>
          <div className="grid gap-4">
            {data.council.map((member, index) => (
              <CouncilCard key={member.id} member={member} rank={index + 1} />
            ))}
          </div>
        </div>

        {/* How positions are earned */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FiStar className="text-amber-500" /> How Positions Are Earned
          </h2>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <span>🎖️</span>
              <span><strong className="text-white">President</strong> — Most total check-ins this week</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🥈</span>
              <span><strong className="text-white">Vice President</strong> — Second most active</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🎨</span>
              <span><strong className="text-white">Secretary of Flavor</strong> — Most unique flavors logged</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🌙</span>
              <span><strong className="text-white">Night Chancellor</strong> — Most late night smokes (12-4 AM)</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🌅</span>
              <span><strong className="text-white">Dawn Commander</strong> — Most early morning smokes (4-7 AM)</span>
            </div>
            <div className="flex items-start gap-2">
              <span>⭐</span>
              <span><strong className="text-white">Minister of Quality</strong> — Highest average rating</span>
            </div>
            <div className="flex items-start gap-2">
              <span>💬</span>
              <span><strong className="text-white">Social Ambassador</strong> — Most likes &amp; comments given</span>
            </div>
            <div className="flex items-start gap-2">
              <span>📸</span>
              <span><strong className="text-white">Chronicler General</strong> — Most photos shared</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🎉</span>
              <span><strong className="text-white">Weekend Warrior</strong> — Most weekend check-ins</span>
            </div>
            <div className="flex items-start gap-2">
              <span>🧭</span>
              <span><strong className="text-white">Brand Explorer</strong> — Most unique brands tried</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-4">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full hover:scale-105 transition"
          >
            <FiZap /> Log a Smoke to Climb the Ranks
          </Link>
        </div>
      </div>
    </div>
  );
}
