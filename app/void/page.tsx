"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiHome } from "react-icons/fi";

interface VoidSoul {
  username: string;
  brand?: string;
  minutesAgo: number;
}

interface VoidData {
  souls: VoidSoul[];
  totalSoulsEver: number;
  yourVoidVisits: number;
  deepestHour: number;
  isVoidTime: boolean;
  currentHour: number;
  zenMessage: string;
}

export default function VoidPage() {
  const router = useRouter();
  const [data, setData] = useState<VoidData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/void");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const result = (await res.json()) as VoidData;
      setData(result);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes for new zen message
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-2 h-2 bg-white/30 rounded-full"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/30">
        <p>The void could not be reached</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white/70 flex flex-col">
      {/* Minimal header - just a way home */}
      <header className="absolute top-4 left-4 z-10">
        <Link
          href="/dashboard"
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <FiHome className="w-4 h-4 text-white/30" />
        </Link>
      </header>

      {/* The Void */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Subtle breathing background */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.02, 0.04, 0.02],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-gradient-radial from-white/5 to-transparent"
          style={{
            background: "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />

        {/* Central void symbol */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="mb-12"
        >
          <div className="text-6xl">🕳️</div>
        </motion.div>

        {/* Zen message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="text-center text-white/40 text-lg font-light max-w-xs mb-16 leading-relaxed"
        >
          {data.zenMessage}
        </motion.p>

        {/* Void time status */}
        {data.isVoidTime ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            {/* Souls in the void */}
            {data.souls.length > 0 && (
              <div className="mb-8">
                <p className="text-white/20 text-xs uppercase tracking-widest mb-4">
                  Also here
                </p>
                <div className="space-y-2">
                  {data.souls.slice(0, 5).map((soul, index) => (
                    <motion.div
                      key={soul.username}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 + index * 0.3 }}
                    >
                      <Link
                        href={`/user/${soul.username}`}
                        className="text-white/30 text-sm hover:text-white/50 transition-colors"
                      >
                        {soul.username}
                        {soul.brand && (
                          <span className="text-white/15 ml-2">• {soul.brand}</span>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {data.souls.length === 0 && (
              <p className="text-white/20 text-sm mb-8">You are alone in the void</p>
            )}

            <Link
              href="/checkin"
              className="inline-block px-6 py-2 border border-white/10 rounded-full text-white/30 text-sm hover:border-white/20 hover:text-white/50 transition-colors"
            >
              Leave a trace
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <p className="text-white/20 text-sm mb-2">
              The void opens at midnight
            </p>
            <p className="text-white/10 text-xs">
              Return between 12 AM – 4 AM
            </p>
          </motion.div>
        )}

        {/* Minimal stats - bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <div className="flex items-center justify-center gap-8 text-white/10 text-xs">
            <div>
              <span className="text-white/20">{data.yourVoidVisits}</span>
              <span className="ml-1">visits</span>
            </div>
            <div>
              <span className="text-white/20">{data.totalSoulsEver}</span>
              <span className="ml-1">souls</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
