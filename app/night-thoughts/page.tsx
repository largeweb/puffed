"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMoon, FiSend, FiArrowLeft, FiClock, FiLock } from "react-icons/fi";

interface NightThought {
  id: string;
  username: string;
  thought: string;
  createdAt: number;
  timeAgo: string;
}

export default function NightThoughtsPage() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState<NightThought[]>([]);
  const [newThought, setNewThought] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loungeOpen, setLoungeOpen] = useState(false);
  const [currentHour, setCurrentHour] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchThoughts = useCallback(async () => {
    try {
      const res = await fetch("/api/night-thoughts");
      const data = await res.json() as { message?: string; thoughts?: NightThought[] };
      
      if (data.message && (!data.thoughts || data.thoughts.length === 0)) {
        setLoungeOpen(false);
      } else {
        setLoungeOpen(true);
        setThoughts(data.thoughts || []);
      }
    } catch (err) {
      console.error("Failed to fetch thoughts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkLoungeStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/late-night-lounge");
      const data = await res.json();
      setLoungeOpen(data.loungeOpen);
      setCurrentHour(data.currentHour);
    } catch (err) {
      console.error("Failed to check lounge status:", err);
    }
  }, []);

  useEffect(() => {
    checkLoungeStatus();
    fetchThoughts();
    
    // Refresh thoughts every 30 seconds
    const interval = setInterval(fetchThoughts, 30000);
    return () => clearInterval(interval);
  }, [checkLoungeStatus, fetchThoughts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThought.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/night-thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: newThought.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post thought");
      }

      setNewThought("");
      fetchThoughts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  // Closed state
  if (!loading && !loungeOpen) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="max-w-lg mx-auto p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <FiArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌙</div>
            <h1 className="text-2xl font-bold text-white mb-2">Night Thoughts</h1>
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <FiLock className="text-lg" />
              <span>Opens at 10 PM</span>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-300 mb-4">
                The Night Thoughts lounge is only open during late-night hours.
              </p>
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiClock />
                  Open: 10 PM - 4 AM EST
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Come back tonight to share your late-night smoking reflections with fellow night owls. 🦉
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-gray-950">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <Link href="/dashboard" className="flex items-center gap-2 text-purple-300 hover:text-white mb-6 transition-colors">
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/50 rounded-full border border-purple-700/50 mb-4">
            <FiMoon className="text-purple-400 animate-pulse" />
            <span className="text-purple-300 text-sm">Lounge Open</span>
            <span className="text-purple-500 text-xs">{currentHour}:00</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Night Thoughts 🌙
          </h1>
          <p className="text-purple-300/80">
            Late-night reflections from fellow smokers
          </p>
        </div>

        {/* Post Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-purple-900/30 rounded-xl border border-purple-700/50 p-4">
            <textarea
              value={newThought}
              onChange={(e) => setNewThought(e.target.value)}
              placeholder="What's on your mind at this hour? ✨"
              className="w-full bg-transparent text-white placeholder-purple-400/50 resize-none focus:outline-none"
              rows={3}
              maxLength={280}
            />
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-700/30">
              <span className="text-purple-500 text-sm">
                {newThought.length}/280
              </span>
              <button
                type="submit"
                disabled={!newThought.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-500 text-white rounded-lg transition-colors"
              >
                <FiSend className="text-sm" />
                {submitting ? "Posting..." : "Share"}
              </button>
            </div>
            
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
        </form>

        {/* Thoughts Feed */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">🌙</div>
            <p className="text-purple-400 mt-4">Loading thoughts...</p>
          </div>
        ) : thoughts.length === 0 ? (
          <div className="text-center py-12 bg-purple-900/20 rounded-xl border border-purple-800/30">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-lg text-white mb-2">Be the first tonight</h3>
            <p className="text-purple-400 text-sm">
              Share what&apos;s on your mind during these quiet hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {thoughts.map((thought) => (
              <div
                key={thought.id}
                className="bg-purple-900/20 rounded-xl border border-purple-800/30 p-4 hover:border-purple-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/user/${thought.username}`}
                    className="font-medium text-purple-300 hover:text-white transition-colors"
                  >
                    @{thought.username}
                  </Link>
                  <span className="text-purple-500 text-xs">
                    {thought.timeAgo}
                  </span>
                </div>
                <p className="text-white/90 leading-relaxed">
                  {thought.thought}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="text-center mt-8 pt-8 border-t border-purple-800/30">
          <p className="text-purple-500 text-sm">
            Thoughts disappear after 12 hours. Speak freely.
          </p>
        </div>
      </div>
    </main>
  );
}
