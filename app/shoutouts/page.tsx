"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  FiHome, FiRefreshCw, FiSend, FiHeart, FiAward,
  FiChevronDown, FiCheck, FiX
} from "react-icons/fi";

interface Category {
  id: string;
  emoji: string;
  label: string;
}

interface ShoutoutGiven {
  id: number;
  toUsername: string;
  category: string;
  message?: string;
  createdAt: number;
}

interface ShoutoutReceived {
  id: number;
  fromUsername: string;
  category: string;
  message?: string;
  createdAt: number;
}

interface FeedItem {
  id: number;
  fromUsername: string;
  toUsername: string;
  category: string;
  message?: string;
  createdAt: number;
}

interface Leader {
  username: string;
  count: number;
  categories: string[];
}

interface EligibleUser {
  id: string;
  username: string;
}

interface ShoutoutsData {
  currentUser: string;
  remainingShoutouts: number;
  givenThisWeek: ShoutoutGiven[];
  receivedThisWeek: ShoutoutReceived[];
  feed: FeedItem[];
  leaders: Leader[];
  eligibleUsers: EligibleUser[];
  categories: Category[];
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ShoutoutsPage() {
  const [data, setData] = useState<ShoutoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "received" | "feed" | "leaders">("send");
  
  // Send form state
  const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/shoutouts");
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      const result = await res.json() as ShoutoutsData;
      setData(result);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async () => {
    if (!selectedUser || !selectedCategory) return;
    
    setSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const res = await fetch("/api/shoutouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: selectedUser.id,
          category: selectedCategory.id,
          message: message.trim() || undefined,
        }),
      });
      
      const result = await res.json() as { success?: boolean; message?: string; error?: string };
      
      if (result.success) {
        setSuccessMessage(result.message || "Shoutout sent!");
        setSelectedUser(null);
        setSelectedCategory(null);
        setMessage("");
        fetchData();
      } else {
        setErrorMessage(result.error || "Failed to send shoutout");
      }
    } catch {
      setErrorMessage("Failed to send shoutout");
    } finally {
      setSending(false);
    }
  };

  const getCategoryInfo = (categoryId: string): Category => {
    return data?.categories.find(c => c.id === categoryId) || { id: categoryId, emoji: "🎉", label: categoryId };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-950 via-purple-950 to-fuchsia-950 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-5xl"
        >
          📣
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-950 via-purple-950 to-fuchsia-950 flex items-center justify-center">
        <p className="text-gray-400">Failed to load shoutouts</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-950 via-purple-950 to-fuchsia-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-pink-900/95 to-fuchsia-900/95 backdrop-blur-sm border-b border-pink-500/20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 text-pink-300 hover:text-pink-100 transition-colors">
            <FiHome className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-pink-100 flex items-center gap-2">
            📣 Friday Shoutouts
          </h1>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 -mr-2 text-pink-300 hover:text-pink-100 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4"
        >
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-5xl mb-3"
          >
            📣
          </motion.div>
          <h2 className="text-xl font-bold text-pink-100 mb-2">Give Props to Your Crew!</h2>
          <p className="text-pink-300/70 text-sm">
            {data.remainingShoutouts} shoutout{data.remainingShoutouts !== 1 ? "s" : ""} remaining this week
          </p>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-2"
            >
              <FiCheck className="text-green-400" />
              <span className="text-green-300 text-sm">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-400">
                <FiX />
              </button>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-2"
            >
              <FiX className="text-red-400" />
              <span className="text-red-300 text-sm">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400">
                <FiX />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/50 rounded-xl p-1">
          {[
            { id: "send", label: "Send", emoji: "🎁" },
            { id: "received", label: "Received", emoji: "💝" },
            { id: "feed", label: "Feed", emoji: "📢" },
            { id: "leaders", label: "Top", emoji: "👑" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-pink-600/50 text-pink-100"
                  : "text-gray-500 hover:text-pink-300"
              }`}
            >
              <span className="block text-base mb-0.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Send Tab */}
        <AnimatePresence mode="wait">
          {activeTab === "send" && (
            <motion.div
              key="send"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {data.remainingShoutouts === 0 ? (
                <div className="text-center py-8 bg-gray-900/30 rounded-xl">
                  <span className="text-4xl mb-3 block">🎉</span>
                  <p className="text-pink-300">You&apos;ve used all your shoutouts!</p>
                  <p className="text-sm text-gray-500 mt-1">More available next Monday</p>
                </div>
              ) : (
                <>
                  {/* User Selector */}
                  <div className="relative">
                    <label className="text-xs text-pink-300/70 mb-1 block">Who deserves a shoutout?</label>
                    <button
                      onClick={() => { setShowUserDropdown(!showUserDropdown); setShowCategoryDropdown(false); }}
                      className="w-full p-3 bg-gray-900/50 border border-pink-500/20 rounded-xl text-left flex items-center justify-between hover:border-pink-500/40 transition-colors"
                    >
                      <span className={selectedUser ? "text-pink-100" : "text-gray-500"}>
                        {selectedUser ? `@${selectedUser.username}` : "Select a user..."}
                      </span>
                      <FiChevronDown className={`text-pink-400 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showUserDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-20 w-full mt-1 bg-gray-900 border border-pink-500/30 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                        >
                          {data.eligibleUsers.map(user => (
                            <button
                              key={user.id}
                              onClick={() => { setSelectedUser(user); setShowUserDropdown(false); }}
                              className="w-full px-4 py-2 text-left hover:bg-pink-500/20 text-pink-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              @{user.username}
                            </button>
                          ))}
                          {data.eligibleUsers.length === 0 && (
                            <p className="px-4 py-3 text-gray-500 text-sm">No users to shout out yet</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Category Selector */}
                  <div className="relative">
                    <label className="text-xs text-pink-300/70 mb-1 block">What for?</label>
                    <button
                      onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowUserDropdown(false); }}
                      className="w-full p-3 bg-gray-900/50 border border-pink-500/20 rounded-xl text-left flex items-center justify-between hover:border-pink-500/40 transition-colors"
                    >
                      <span className={selectedCategory ? "text-pink-100" : "text-gray-500"}>
                        {selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.label}` : "Select a category..."}
                      </span>
                      <FiChevronDown className={`text-pink-400 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showCategoryDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-20 w-full mt-1 bg-gray-900 border border-pink-500/30 rounded-xl shadow-xl"
                        >
                          {data.categories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); }}
                              className="w-full px-4 py-2 text-left hover:bg-pink-500/20 text-pink-200 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-2"
                            >
                              <span>{cat.emoji}</span>
                              <span>{cat.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label className="text-xs text-pink-300/70 mb-1 block">Add a message (optional)</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="You're awesome because..."
                      maxLength={200}
                      rows={2}
                      className="w-full p-3 bg-gray-900/50 border border-pink-500/20 rounded-xl text-pink-100 placeholder-gray-600 resize-none focus:border-pink-500/40 focus:outline-none"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!selectedUser || !selectedCategory || sending}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:from-pink-400 hover:to-fuchsia-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                        <FiSend />
                      </motion.div>
                    ) : (
                      <>
                        <FiSend /> Send Shoutout
                      </>
                    )}
                  </button>

                  {/* Given This Week */}
                  {data.givenThisWeek.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-pink-300/70 mb-3">Your Shoutouts This Week</h3>
                      <div className="space-y-2">
                        {data.givenThisWeek.map(shoutout => {
                          const cat = getCategoryInfo(shoutout.category);
                          return (
                            <div key={shoutout.id} className="p-3 bg-gray-900/30 rounded-xl border border-pink-500/10">
                              <div className="flex items-center gap-2">
                                <span>{cat.emoji}</span>
                                <Link href={`/user/${shoutout.toUsername}`} className="text-pink-200 hover:text-pink-100">
                                  @{shoutout.toUsername}
                                </Link>
                                <span className="text-gray-600 text-xs ml-auto">{timeAgo(shoutout.createdAt)}</span>
                              </div>
                              {shoutout.message && (
                                <p className="text-sm text-gray-400 mt-1 pl-6">&ldquo;{shoutout.message}&rdquo;</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Received Tab */}
          {activeTab === "received" && (
            <motion.div
              key="received"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.receivedThisWeek.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl">
                  <span className="text-4xl mb-3 block">💝</span>
                  <p className="text-pink-300">No shoutouts yet this week</p>
                  <p className="text-sm text-gray-500 mt-1">Keep being awesome!</p>
                </div>
              ) : (
                <>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-pink-300">{data.receivedThisWeek.length}</p>
                    <p className="text-sm text-gray-500">shoutout{data.receivedThisWeek.length !== 1 ? "s" : ""} received this week!</p>
                  </div>
                  {data.receivedThisWeek.map(shoutout => {
                    const cat = getCategoryInfo(shoutout.category);
                    return (
                      <motion.div
                        key={shoutout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gradient-to-r from-pink-900/30 to-fuchsia-900/30 rounded-xl border border-pink-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cat.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link href={`/user/${shoutout.fromUsername}`} className="font-medium text-pink-200 hover:text-pink-100">
                                @{shoutout.fromUsername}
                              </Link>
                              <span className="text-gray-500 text-sm">→ you</span>
                            </div>
                            <p className="text-sm text-pink-400/70">{cat.label}</p>
                          </div>
                          <span className="text-xs text-gray-600">{timeAgo(shoutout.createdAt)}</span>
                        </div>
                        {shoutout.message && (
                          <p className="mt-2 text-sm text-gray-300 bg-gray-900/30 rounded-lg p-2">
                            &ldquo;{shoutout.message}&rdquo;
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {/* Feed Tab */}
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {data.feed.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl">
                  <span className="text-4xl mb-3 block">📢</span>
                  <p className="text-pink-300">No shoutouts yet this week</p>
                  <p className="text-sm text-gray-500 mt-1">Be the first to spread some love!</p>
                </div>
              ) : (
                data.feed.map((item, idx) => {
                  const cat = getCategoryInfo(item.category);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 bg-gray-900/30 rounded-xl border border-gray-800/50"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Link href={`/user/${item.fromUsername}`} className="text-pink-300 hover:text-pink-200">
                          @{item.fromUsername}
                        </Link>
                        <span className="text-gray-600">shouted out</span>
                        <Link href={`/user/${item.toUsername}`} className="text-pink-300 hover:text-pink-200">
                          @{item.toUsername}
                        </Link>
                        <span className="text-gray-600">for</span>
                        <span>{cat.emoji} {cat.label}</span>
                      </div>
                      {item.message && (
                        <p className="text-xs text-gray-500 mt-1">&ldquo;{item.message}&rdquo;</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">{timeAgo(item.createdAt)}</p>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* Leaders Tab */}
          {activeTab === "leaders" && (
            <motion.div
              key="leaders"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <div className="text-center py-4">
                <span className="text-4xl">👑</span>
                <h3 className="text-lg font-bold text-pink-100 mt-2">Most Shouted Out</h3>
                <p className="text-sm text-gray-500">This week&apos;s community stars</p>
              </div>

              {data.leaders.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/30 rounded-xl">
                  <p className="text-gray-400">No shoutouts yet this week</p>
                </div>
              ) : (
                data.leaders.map((leader, idx) => (
                  <motion.div
                    key={leader.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-xl border ${
                      idx === 0 
                        ? "bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-500/50" 
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-700/30 to-gray-800/30 border-gray-500/40"
                        : idx === 2
                        ? "bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-700/30"
                        : "bg-gray-900/30 border-gray-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-8 text-center">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <Link href={`/user/${leader.username}`} className="font-medium text-pink-100 hover:text-pink-50">
                          @{leader.username}
                        </Link>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {leader.categories.map(catId => {
                            const cat = getCategoryInfo(catId);
                            return (
                              <span key={catId} className="text-xs bg-pink-900/30 px-2 py-0.5 rounded-full text-pink-300">
                                {cat.emoji}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-pink-300">{leader.count}</p>
                        <p className="text-xs text-gray-500">shoutouts</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-xs text-pink-300/40 pt-6 pb-8">
          Shoutouts reset every Monday • 3 per week
        </p>
      </div>
    </main>
  );
}
