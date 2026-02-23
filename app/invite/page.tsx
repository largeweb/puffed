"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

interface InviteData {
  referralCode: string;
  inviteUrl: string;
  stats: {
    totalReferrals: number;
    referredUsers: {
      username: string;
      created_at: number;
      checkin_count: number;
    }[];
  };
}

export default function InvitePage() {
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invite")
      .then(res => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = data.inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Puffed!",
          text: "Track your smokes and discover great cigars with me 🚬",
          url: data.inviteUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to invite friends</p>
          <Link href="/login" className="text-amber-500 hover:underline">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen pb-24 pt-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="p-2 -ml-2 text-gray-400 hover:text-white">
          ← Back
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👥</span>
          </div>
          <h1 className="text-2xl font-bold">Invite Friends</h1>
          <p className="text-gray-400 mt-2">
            Share your link and grow the smoke crew
          </p>
        </div>

        {/* Invite Link Card */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <p className="text-sm text-gray-400 mb-3">Your personal invite link</p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
            <input
              type="text"
              readOnly
              value={data.inviteUrl}
              className="flex-1 bg-transparent text-sm text-white truncate outline-none"
            />
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={copyLink}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {copied ? "✓ Copied!" : "📋 Copy Link"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium btn-glow"
            >
              📤 Share
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400">{data.stats.totalReferrals}</div>
            <p className="text-green-200/80 mt-1">
              {data.stats.totalReferrals === 1 ? "Friend Joined" : "Friends Joined"}
            </p>
          </div>
        </div>

        {/* Referred Users */}
        {data.stats.referredUsers.length > 0 && (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold mb-4">Your Crew</h3>
            <div className="space-y-3">
              {data.stats.referredUsers.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <Link href={`/user/${user.username}`} className="text-amber-400 hover:underline">
                    @{user.username}
                  </Link>
                  <span className="text-sm text-gray-400">
                    {user.checkin_count} smoke{user.checkin_count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.stats.totalReferrals === 0 && (
          <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-gray-400 mb-2">No friends joined yet</p>
            <p className="text-sm text-gray-500">
              Share your link and be the first to grow your crew!
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-200/80">
            💡 <strong>Tip:</strong> Share your link when you&apos;re smoking with friends — it&apos;s more fun to track together!
          </p>
        </div>
      </motion.div>
    </main>
  );
}
