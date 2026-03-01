"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiHome, FiAward, FiStar, FiTrendingUp, FiHeart, 
  FiZap, FiUsers, FiMessageCircle, FiCalendar, FiTarget
} from "react-icons/fi";

interface WeeklyMVP {
  username: string;
  score: number;
  checkins: number;
  likesGiven: number;
  likesReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  followsGiven: number;
}

interface BestCheckin {
  checkinId: number;
  username: string;
  brand: string;
  product: string | null;
  rating: number;
  review: string | null;
  photoUrl: string | null;
  likes: number;
  comments: number;
  engagementScore: number;
}

interface RisingStar {
  username: string;
  thisWeekCheckins: number;
  lastWeekCheckins: number;
  growthPercent: number;
}

interface SocialButterfly {
  username: string;
  likesGiven: number;
  commentsGiven: number;
  followsGiven: number;
  totalGiven: number;
}

interface StreakChampion {
  username: string;
  currentStreak: number;
}

interface HonorableMention {
  username: string;
  achievement: string;
  icon: string;
}

interface MVPData {
  weekOf: string;
  mvp: WeeklyMVP | null;
  bestCheckin: BestCheckin | null;
  risingStar: RisingStar | null;
  socialButterfly: SocialButterfly | null;
  streakChampion: StreakChampion | null;
  honorableMentions: HonorableMention[];
  weeklyStats: {
    totalCheckins: number;
    totalLikes: number;
    totalComments: number;
    newUsers: number;
    avgRating: number;
  };
}

function AwardCard({ 
  title, 
  icon, 
  winner, 
  subtitle,
  color,
  delay 
}: { 
  title: string; 
  icon: string; 
  winner: string | null; 
  subtitle: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 shadow-xl relative overflow-hidden`}
    >
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ delay: delay + 0.5, duration: 1, ease: "easeInOut" }}
      />
      
      {/* Trophy glow */}
      <div className="absolute top-2 right-2 text-4xl opacity-20">🏆</div>
      
      <div className="relative z-10">
        <div className="text-3xl mb-2">{icon}</div>
        <h3 className="text-lg font-bold text-white/90 mb-1">{title}</h3>
        
        {winner ? (
          <>
            <Link 
              href={`/user/${winner}`}
              className="text-2xl font-black text-white hover:underline block mb-1"
            >
              @{winner}
            </Link>
            <p className="text-white/70 text-sm">{subtitle}</p>
          </>
        ) : (
          <p className="text-white/50 text-sm italic">No winner this week yet</p>
        )}
      </div>
    </motion.div>
  );
}

function ConfettiPiece({ delay }: { delay: number }) {
  const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F97316", "#10B981"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const size = 8 + Math.random() * 8;
  
  return (
    <motion.div
      className="absolute top-0 rounded-sm"
      style={{ 
        left: `${left}%`, 
        width: size, 
        height: size, 
        backgroundColor: color 
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{ 
        y: "100vh", 
        opacity: 0, 
        rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
      }}
      transition={{ 
        delay, 
        duration: 3 + Math.random() * 2,
        ease: "easeIn"
      }}
    />
  );
}

export default function MVPAwardsPage() {
  const [data, setData] = useState<MVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetch("/api/mvp-awards")
      .then(res => res.json() as Promise<MVPData>)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data && !revealed) {
      const timer = setTimeout(() => {
        setRevealed(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data, revealed]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🏆
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 flex items-center justify-center">
        <p className="text-white/70">Failed to load awards</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 relative overflow-hidden">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <ConfettiPiece key={i} delay={i * 0.05} />
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-10 left-10 text-8xl opacity-10"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🏆
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-10 text-8xl opacity-10"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          🥇
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-20 text-6xl opacity-10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ⭐
        </motion.div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors">
            <FiHome size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏅</span>
            <span className="text-white font-bold">MVP Awards</span>
          </div>
          <div className="w-6" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🏆
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-2">
            Weekly MVP Awards
          </h1>
          <p className="text-amber-200 text-lg flex items-center justify-center gap-2">
            <FiCalendar />
            {data.weekOf}
          </p>
        </motion.div>

        {/* Week Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/30 rounded-xl p-4 mb-8 backdrop-blur-sm"
        >
          <h3 className="text-white/60 text-sm uppercase tracking-wider mb-3 text-center">
            This Week&apos;s Numbers
          </h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{data.weeklyStats.totalCheckins}</div>
              <div className="text-white/50 text-xs">Check-ins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-400">{data.weeklyStats.totalLikes}</div>
              <div className="text-white/50 text-xs">Likes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{data.weeklyStats.totalComments}</div>
              <div className="text-white/50 text-xs">Comments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{data.weeklyStats.newUsers}</div>
              <div className="text-white/50 text-xs">New Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {data.weeklyStats.avgRating ? data.weeklyStats.avgRating.toFixed(1) : "–"}★
              </div>
              <div className="text-white/50 text-xs">Avg Rating</div>
            </div>
          </div>
        </motion.div>

        {/* Main Awards Grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* MVP */}
          <AwardCard
            title="🏆 MVP of the Week"
            icon="👑"
            winner={data.mvp?.username || null}
            subtitle={data.mvp ? `${data.mvp.score} points • ${data.mvp.checkins} smokes` : ""}
            color="from-amber-500 to-yellow-600"
            delay={0.3}
          />
          
          {/* Best Check-in */}
          <AwardCard
            title="⭐ Best Check-in"
            icon="🌟"
            winner={data.bestCheckin?.username || null}
            subtitle={data.bestCheckin ? `${data.bestCheckin.brand} • ${data.bestCheckin.rating}★` : ""}
            color="from-purple-500 to-pink-600"
            delay={0.5}
          />
          
          {/* Rising Star */}
          <AwardCard
            title="📈 Rising Star"
            icon="🚀"
            winner={data.risingStar?.username || null}
            subtitle={data.risingStar ? `+${data.risingStar.growthPercent}% growth this week` : ""}
            color="from-green-500 to-emerald-600"
            delay={0.7}
          />
          
          {/* Social Butterfly */}
          <AwardCard
            title="🦋 Social Butterfly"
            icon="💕"
            winner={data.socialButterfly?.username || null}
            subtitle={data.socialButterfly ? `${data.socialButterfly.likesGiven} likes, ${data.socialButterfly.commentsGiven} comments` : ""}
            color="from-pink-500 to-rose-600"
            delay={0.9}
          />
        </div>

        {/* Streak Champion - Full Width */}
        {data.streakChampion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-8 text-center relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ delay: 1.6, duration: 1, ease: "easeInOut" }}
            />
            <div className="relative z-10">
              <div className="text-4xl mb-2">🔥</div>
              <h3 className="text-lg font-bold text-white/90">Streak Champion</h3>
              <Link 
                href={`/user/${data.streakChampion.username}`}
                className="text-3xl font-black text-white hover:underline"
              >
                @{data.streakChampion.username}
              </Link>
              <p className="text-white/70 mt-1">
                {data.streakChampion.currentStreak} day streak 🔥
              </p>
            </div>
          </motion.div>
        )}

        {/* Honorable Mentions */}
        {data.honorableMentions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-black/30 rounded-xl p-6 mb-8 backdrop-blur-sm"
          >
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <FiAward className="text-amber-400" />
              Honorable Mentions
            </h3>
            <div className="grid gap-3">
              {data.honorableMentions.map((mention, i) => (
                <motion.div
                  key={mention.username}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 + i * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-3"
                >
                  <span className="text-2xl">{mention.icon}</span>
                  <div>
                    <Link 
                      href={`/user/${mention.username}`}
                      className="text-white font-semibold hover:underline"
                    >
                      @{mention.username}
                    </Link>
                    <p className="text-white/60 text-sm">{mention.achievement}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Best Check-in Detail */}
        {data.bestCheckin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="bg-black/30 rounded-xl p-6 backdrop-blur-sm"
          >
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <FiStar className="text-yellow-400" />
              Check-in of the Week
            </h3>
            <Link 
              href={`/checkin/${data.bestCheckin.checkinId}`}
              className="block bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start gap-4">
                {data.bestCheckin.photoUrl && (
                  <img 
                    src={data.bestCheckin.photoUrl} 
                    alt={data.bestCheckin.brand}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {data.bestCheckin.brand}
                    {data.bestCheckin.product && (
                      <span className="text-white/60"> • {data.bestCheckin.product}</span>
                    )}
                  </p>
                  <p className="text-amber-400 font-bold">
                    {"★".repeat(Math.round(data.bestCheckin.rating))} {data.bestCheckin.rating.toFixed(1)}
                  </p>
                  {data.bestCheckin.review && (
                    <p className="text-white/70 text-sm mt-1 line-clamp-2">
                      &ldquo;{data.bestCheckin.review}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                    <span className="flex items-center gap-1">
                      <FiHeart className="text-pink-400" /> {data.bestCheckin.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageCircle className="text-blue-400" /> {data.bestCheckin.comments}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
          className="text-center mt-8"
        >
          <p className="text-white/60 mb-4">
            Awards update every Sunday. Keep smoking to earn your spot! 🏆
          </p>
          <Link
            href="/checkin/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition-transform"
          >
            <FiZap /> Log a Smoke
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
