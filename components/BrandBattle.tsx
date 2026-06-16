"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiZap, FiUsers, FiClock, FiCheck } from "react-icons/fi";
import type { BrandBattleResponse } from "@/app/api/brand-battle/route";

export default function BrandBattle() {
  const [battle, setBattle] = useState<BrandBattleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [showVoters, setShowVoters] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    fetchBattle();
  }, []);

  const fetchBattle = async () => {
    try {
      const res = await fetch("/api/brand-battle");
      if (res.ok) {
        const data: BrandBattleResponse = await res.json();
        setBattle(data);
      }
    } catch (err) {
      console.error("Failed to load battle:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (brand: string) => {
    if (voting || !battle) return;
    setVoting(brand);
    try {
      const res = await fetch("/api/brand-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand }),
      });
      if (res.ok) {
        // Optimistic update
        const wasVotedA = battle.userVote === battle.brandA;
        const wasVotedB = battle.userVote === battle.brandB;
        const isVotingA = brand === battle.brandA;
        
        setBattle(prev => {
          if (!prev) return prev;
          let newVotesA = prev.votesA;
          let newVotesB = prev.votesB;
          
          if (wasVotedA && !isVotingA) {
            newVotesA--;
            newVotesB++;
          } else if (wasVotedB && isVotingA) {
            newVotesA++;
            newVotesB--;
          } else if (!prev.userVote) {
            if (isVotingA) newVotesA++;
            else newVotesB++;
          }
          
          return {
            ...prev,
            userVote: brand,
            votesA: newVotesA,
            votesB: newVotesB,
            totalVotes: newVotesA + newVotesB,
          };
        });
      }
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setVoting(null);
    }
  };

  const getTimeRemaining = () => {
    if (!battle?.endsAt) return "";
    const now = Math.floor(Date.now() / 1000);
    const remaining = battle.endsAt - now;
    if (remaining <= 0) return "Ending soon";
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-zinc-700 rounded w-1/3 mb-4" />
        <div className="flex gap-4">
          <div className="flex-1 h-24 bg-zinc-700 rounded-xl" />
          <div className="flex-1 h-24 bg-zinc-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!battle || battle.error) return null;

  const percentA = battle.totalVotes > 0 ? Math.round((battle.votesA / battle.totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiZap className="text-yellow-400 text-lg" />
          <span className="font-bold text-white">Brand Battle</span>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
            Week {battle.weekNumber}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <FiClock className="text-xs" />
          {getTimeRemaining()}
        </div>
      </div>

      {/* Battle Arena */}
      <div className="flex gap-3 mb-4">
        {/* Brand A */}
        <motion.button
          onClick={() => handleVote(battle.brandA)}
          disabled={voting !== null}
          whileTap={{ scale: 0.98 }}
          className={`flex-1 relative rounded-xl p-4 transition-all border-2 ${
            battle.userVote === battle.brandA
              ? "border-amber-500 bg-amber-500/20"
              : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
          }`}
        >
          {battle.userVote === battle.brandA && (
            <div className="absolute top-2 right-2">
              <FiCheck className="text-amber-400" />
            </div>
          )}
          <p className="font-bold text-white text-lg mb-1">{battle.brandA}</p>
          <div className="flex items-center gap-1 text-sm text-zinc-400">
            <FiUsers className="text-xs" />
            <span>{battle.votesA} votes</span>
          </div>
          {voting === battle.brandA && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.button>

        {/* VS Badge */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center font-bold text-white text-sm shadow-lg">
            VS
          </div>
        </div>

        {/* Brand B */}
        <motion.button
          onClick={() => handleVote(battle.brandB)}
          disabled={voting !== null}
          whileTap={{ scale: 0.98 }}
          className={`flex-1 relative rounded-xl p-4 transition-all border-2 ${
            battle.userVote === battle.brandB
              ? "border-amber-500 bg-amber-500/20"
              : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
          }`}
        >
          {battle.userVote === battle.brandB && (
            <div className="absolute top-2 right-2">
              <FiCheck className="text-amber-400" />
            </div>
          )}
          <p className="font-bold text-white text-lg mb-1">{battle.brandB}</p>
          <div className="flex items-center gap-1 text-sm text-zinc-400">
            <FiUsers className="text-xs" />
            <span>{battle.votesB} votes</span>
          </div>
          {voting === battle.brandB && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.button>
      </div>

      {/* Progress Bar */}
      {battle.totalVotes > 0 && (
        <div className="relative h-3 bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: `${percentA}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-orange-500"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white drop-shadow-md">
              {percentA}% — {percentB}%
            </span>
          </div>
        </div>
      )}

      {/* Vote CTA */}
      {!battle.userVote && (
        <p className="text-center text-sm text-zinc-400 mt-3">
          Tap to cast your vote! 🗳️
        </p>
      )}

      {/* Total votes */}
      {battle.totalVotes > 0 && (
        <p className="text-center text-xs text-zinc-500 mt-2">
          {battle.totalVotes} total votes this week
        </p>
      )}
    </motion.div>
  );
}
