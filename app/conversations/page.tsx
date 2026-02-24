"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiArrowLeft, FiMessageCircle, FiHeart, FiStar, FiClock, FiUsers, FiTrendingUp, FiHome } from "react-icons/fi";
import type { HotConversation, HotConversationsResponse } from "@/app/api/hot-conversations/route";

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function ConversationCard({ conversation }: { conversation: HotConversation }) {
  const timeAgo = getTimeAgo(conversation.latest_comment_at);
  const totalEngagement = conversation.comment_count + conversation.like_count + conversation.reaction_count;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="glass rounded-xl overflow-hidden"
    >
      <Link href={`/checkin/${conversation.checkin_id}`} className="block">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          {conversation.image_url ? (
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
              <img 
                src={conversation.image_url} 
                alt={conversation.brand}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <span className="text-3xl">🚬</span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white truncate">
                  {conversation.brand}
                  {conversation.product && (
                    <span className="text-gray-400 font-normal"> • {conversation.product}</span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">
                  by <span className="text-amber-500">@{conversation.checkin_username}</span>
                </p>
              </div>
              {conversation.rating && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                  <FiStar size={12} />
                  <span>{conversation.rating}</span>
                </div>
              )}
            </div>

            {/* Latest comment preview */}
            <div className="mt-2 p-2 rounded-lg bg-white/5 border-l-2 border-cyan-500/50">
              <p className="text-sm text-gray-300 line-clamp-2">
                &ldquo;{conversation.latest_comment}&rdquo;
              </p>
              <p className="text-xs text-gray-500 mt-1">
                — @{conversation.latest_comment_username} • {timeAgo}
              </p>
            </div>

            {/* Engagement stats */}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <FiMessageCircle size={14} className="text-cyan-400" />
                {conversation.comment_count} {conversation.comment_count === 1 ? 'comment' : 'comments'}
              </span>
              <span className="flex items-center gap-1">
                <FiHeart size={14} className="text-red-400" />
                {conversation.like_count}
              </span>
              {conversation.reaction_count > 0 && (
                <span className="text-yellow-400">
                  +{conversation.reaction_count} reactions
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<HotConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<number>(72); // hours

  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      try {
        const res = await fetch(`/api/hot-conversations?hours=${timeFilter}&limit=30`);
        if (res.ok) {
          const data: HotConversationsResponse = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, [timeFilter]);

  const totalComments = conversations.reduce((sum, c) => sum + c.comment_count, 0);

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-full">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <FiMessageCircle className="text-cyan-400" />
                Hot Conversations
              </h1>
              <p className="text-xs text-gray-400">
                {conversations.length} active threads • {totalComments} comments
              </p>
            </div>
          </div>
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full text-gray-400">
            <FiHome size={20} />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Time filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { label: "24h", value: 24 },
            { label: "3 days", value: 72 },
            { label: "Week", value: 168 },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                timeFilter === option.value
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <FiTrendingUp className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-cyan-400 font-medium">Join the discussion!</p>
              <p className="text-xs text-gray-400">
                See what the community is talking about and share your thoughts
              </p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-white/10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                    <div className="h-12 bg-white/5 rounded mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && conversations.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <FiMessageCircle size={32} className="text-cyan-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-500 mb-6">
              Be the first to start a conversation!
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
            >
              <FiUsers size={18} />
              Explore & Comment
            </Link>
          </motion.div>
        )}

        {/* Conversations list */}
        {!loading && conversations.length > 0 && (
          <div className="space-y-4">
            {conversations.map((conversation, index) => (
              <motion.div
                key={conversation.checkin_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ConversationCard conversation={conversation} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        {!loading && conversations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-500 text-sm mb-4">
              Don&apos;t see your topic? Start a new conversation!
            </p>
            <Link
              href="/checkin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              Log a Smoke & Start Talking
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
