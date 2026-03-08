"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiUser, FiStar, FiHome, FiUserPlus, FiUserCheck, FiHash, FiTrendingUp, FiMenu } from "react-icons/fi";
import { GiCigarette } from "react-icons/gi";
import Link from "next/link";
import MobileSidebar from "@/app/components/MobileSidebar";
import { useSidebar } from "@/hooks/useSidebar";

interface SearchResult {
  type: 'user' | 'cigar';
  // User fields
  username?: string;
  bio?: string;
  checkin_count?: number;
  follower_count?: number;
  is_following?: boolean;
  // Cigar fields
  brand?: string;
  product?: string;
  avg_rating?: number;
  total_checkins?: number;
  last_checkin_image?: string;
}

interface SearchResponse {
  users?: SearchResult[];
  cigars?: SearchResult[];
  error?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "users" | "cigars">("all");
  const [users, setUsers] = useState<SearchResult[]>([]);
  const [cigars, setCigars] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string, type: string) => {
    if (!q || q.length < 2) {
      setUsers([]);
      setCigars([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setUsers(data.users || []);
        setCigars(data.cigars || []);
        
        // Initialize following states
        const states: Record<string, boolean> = {};
        (data.users || []).forEach(u => {
          if (u.username) states[u.username] = u.is_following || false;
        });
        setFollowingStates(states);
        setSearched(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery, filter);
  }, [debouncedQuery, filter, search]);

  const handleFollow = async (username: string) => {
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        const data: { following: boolean } = await res.json();
        setFollowingStates(prev => ({ ...prev, [username]: data.following }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const showUsers = filter === "all" || filter === "users";
  const showCigars = filter === "all" || filter === "cigars";

  return (
    <>
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={currentUser}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-stone-900 to-black text-amber-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-900/90 backdrop-blur-sm border-b border-amber-900/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-amber-400 hover:text-amber-300 p-1">
            <FiMenu size={24} />
          </button>
          <h1 className="text-xl font-bold text-amber-100">Search</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400/60" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cigars, brands, or users..."
            className="w-full pl-12 pr-4 py-3 bg-stone-800/50 border border-amber-900/30 rounded-xl text-amber-50 placeholder-amber-400/40 focus:outline-none focus:border-amber-500/50"
            autoFocus
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["all", "cigars", "users"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-amber-600 text-white"
                  : "bg-stone-800/50 text-amber-200 hover:bg-stone-700/50"
              }`}
            >
              {f === "all" && <FiSearch size={16} />}
              {f === "cigars" && <GiCigarette size={16} />}
              {f === "users" && <FiUser size={16} />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <div className="space-y-6">
            {/* Users Section */}
            {showUsers && users.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                  <FiUser /> Users
                </h2>
                <div className="space-y-2">
                  {users.map((user) => (
                    <motion.div
                      key={user.username}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-stone-800/40 rounded-xl border border-amber-900/20"
                    >
                      <Link href={`/user/${user.username}`} className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center">
                            <span className="text-amber-100 font-bold">
                              {user.username?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-amber-100">@{user.username}</p>
                            {user.bio && (
                              <p className="text-sm text-amber-200/60 line-clamp-1">{user.bio}</p>
                            )}
                            <p className="text-xs text-amber-400/50">
                              {user.checkin_count} check-ins · {user.follower_count} followers
                            </p>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleFollow(user.username!)}
                        className={`p-2 rounded-lg transition-colors ${
                          followingStates[user.username!]
                            ? "bg-amber-600/20 text-amber-400"
                            : "bg-amber-600 text-white hover:bg-amber-500"
                        }`}
                      >
                        {followingStates[user.username!] ? (
                          <FiUserCheck size={18} />
                        ) : (
                          <FiUserPlus size={18} />
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Cigars Section */}
            {showCigars && cigars.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                  <GiCigarette /> Cigars
                </h2>
                <div className="space-y-2">
                  {cigars.map((cigar, idx) => (
                    <Link
                      key={`${cigar.brand}-${cigar.product}-${idx}`}
                      href={`/cigar/${encodeURIComponent(cigar.brand || '')}`}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 bg-stone-800/40 rounded-xl border border-amber-900/20 hover:border-amber-700/40 transition-colors"
                      >
                        {cigar.last_checkin_image ? (
                          <img
                            src={cigar.last_checkin_image}
                            alt={cigar.brand}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-800 to-amber-950 rounded-lg flex items-center justify-center">
                            <GiCigarette className="text-amber-400/60" size={20} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-amber-100">{cigar.brand}</p>
                          {cigar.product && (
                            <p className="text-sm text-amber-200/70">{cigar.product}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-amber-400/50 mt-1">
                            {cigar.avg_rating && (
                              <span className="flex items-center gap-1">
                                <FiStar className="text-amber-400" size={12} />
                                {cigar.avg_rating}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <FiHash size={12} />
                              {cigar.total_checkins} check-in{cigar.total_checkins !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {showUsers && users.length === 0 && showCigars && cigars.length === 0 && (
              <div className="text-center py-12">
                <FiSearch className="mx-auto text-amber-400/30 mb-3" size={48} />
                <p className="text-amber-200/60">No results found for "{query}"</p>
                <p className="text-sm text-amber-400/40 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !searched && (
          <div className="text-center py-12">
            <FiSearch className="mx-auto text-amber-400/30 mb-3" size={48} />
            <p className="text-amber-200/60">Search for cigars or users</p>
            <p className="text-sm text-amber-400/40 mt-1">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
