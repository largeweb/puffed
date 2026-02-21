"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheck, FiUser } from "react-icons/fi";
import Link from "next/link";

interface Profile {
  username: string;
  bio: string | null;
  created_at: number;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data: { user: Profile } = await res.json();
        setProfile(data.user);
        setBio(data.user?.bio || "");
      } catch (error) {
        console.error("Load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
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

  const joinDate = profile ? new Date(profile.created_at * 1000).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }) : '';

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-all">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="font-semibold">Settings</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              saved
                ? "bg-green-500/20 text-green-400"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {saved ? (
              <>
                <FiCheck size={16} />
                <span>Saved</span>
              </>
            ) : (
              <span>{saving ? "Saving..." : "Save"}</span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 mb-6"
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FiUser className="text-amber-500" />
            Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                @{profile?.username}
              </div>
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Bio <span className="text-gray-500">({bio.length}/150)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                placeholder="Tell people about yourself..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Member Since</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                {joinDate}
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Profile Link */}
        <Link
          href={`/user/${profile?.username}`}
          className="block text-center text-amber-500 hover:underline"
        >
          View your public profile →
        </Link>
      </div>
    </main>
  );
}
