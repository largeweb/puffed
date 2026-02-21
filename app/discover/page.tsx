"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FiSearch, FiStar, FiClock, FiWind, FiDroplet, FiSmile, FiUser, FiHome } from "react-icons/fi";
import Link from "next/link";
import type { Checkin, DiscoverResponse } from "@/lib/types";

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function CheckinCard({ checkin }: { checkin: Checkin }) {
  const date = new Date(checkin.created_at * 1000);
  const timeAgo = getTimeAgo(date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      {/* User info */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <FiUser size={14} />
        <span>@{checkin.username}</span>
        <span>•</span>
        <span>{timeAgo}</span>
      </div>

      {/* Image */}
      {checkin.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img 
            src={checkin.image_url} 
            alt={checkin.brand}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{checkin.brand}</h3>
          {checkin.product && <p className="text-gray-400 text-sm">{checkin.product}</p>}
        </div>
        {checkin.rating && (
          <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
            <FiStar className="text-amber-500" fill="currentColor" />
            <span className="text-amber-500 font-semibold">{checkin.rating}</span>
          </div>
        )}
      </div>

      {checkin.review && (
        <p className="text-gray-300 text-sm mb-3">{checkin.review}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        {checkin.draw_rating && (
          <span className="flex items-center gap-1">
            <FiWind /> Draw: {checkin.draw_rating}/5
          </span>
        )}
        {checkin.burn_rating && (
          <span className="flex items-center gap-1">
            <FiDroplet /> Burn: {checkin.burn_rating}/5
          </span>
        )}
        {checkin.aroma_rating && (
          <span className="flex items-center gap-1">
            <FiSmile /> Aroma: {checkin.aroma_rating}/5
          </span>
        )}
        {checkin.smoke_time_mins && (
          <span className="flex items-center gap-1">
            <FiClock /> {checkin.smoke_time_mins} min
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function DiscoverPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed(query = "") {
    try {
      setSearching(true);
      const url = query 
        ? `/api/discover?q=${encodeURIComponent(query)}`
        : "/api/discover";
      const res = await fetch(url);
      const data: DiscoverResponse = await res.json();
      setCheckins(data.checkins || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFeed(searchQuery);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg">🚬</span>
              </div>
              <div>
                <h1 className="font-semibold">Discover</h1>
                <p className="text-xs text-gray-400">See what everyone's smoking</p>
              </div>
            </div>
            <Link 
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiHome size={20} />
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands, products, reviews..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {searching ? (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full"
            />
          </div>
        ) : checkins.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400"
          >
            <p className="text-4xl mb-3">🔍</p>
            <p>No smokes found</p>
            {searchQuery && <p className="text-sm">Try a different search</p>}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin, index) => (
              <motion.div
                key={checkin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CheckinCard checkin={checkin} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
