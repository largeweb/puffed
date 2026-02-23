"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiShare2, FiDownload, FiTwitter, FiCopy, FiCheck, FiHome, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";

interface User {
  id: string;
  username: string;
}

export default function SharePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json() as { user: User };
      setUser(data.user);
    } catch (error) {
      console.error(error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = user ? `${window.location.origin}/api/share-card?u=${user.username}` : "";
  const profileUrl = user ? `${window.location.origin}/user/${user.username}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }
    
    try {
      await navigator.share({
        title: `${user?.username}'s Smoke Week on Puffed`,
        text: `Check out my weekly smoking stats on Puffed! 🚬`,
        url: profileUrl,
      });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        handleCopyLink();
      }
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out my weekly smoking stats on Puffed! 🚬🔥\n\n${profileUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleDownload = async () => {
    if (!user) return;
    
    try {
      const res = await fetch(shareUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `puffed-week-${user.username}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
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

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <FiHome size={24} />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiShare2 className="text-amber-500" />
            Share Your Week
          </h1>
          <div className="w-6" />
        </motion.div>

        {/* Card Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="aspect-[1200/630] rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <img
              src={shareUrl}
              alt="Your weekly stats card"
              className="w-full h-full object-cover"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          </div>
          
          {/* Refresh button */}
          <button
            onClick={() => {
              setImageLoading(true);
              const img = document.querySelector('img[alt="Your weekly stats card"]') as HTMLImageElement;
              if (img) {
                img.src = `${shareUrl}&t=${Date.now()}`;
              }
            }}
            className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <FiRefreshCw size={18} />
          </button>
        </motion.div>

        {/* Share Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-gray-400 mb-6"
        >
          Show off your smoking journey! Share your weekly stats with friends.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <FiShare2 size={20} />
            Share
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-semibold"
          >
            <FiDownload size={20} />
            Download
          </button>
          
          <button
            onClick={handleTwitterShare}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] transition-colors font-semibold"
          >
            <FiTwitter size={20} />
            Tweet
          </button>
          
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-semibold"
          >
            {copied ? (
              <>
                <FiCheck size={20} className="text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <FiCopy size={20} />
                Copy Link
              </>
            )}
          </button>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-4"
        >
          <h3 className="font-semibold mb-2 text-amber-500">💡 Sharing Tips</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Share to your Instagram story with the download button</li>
            <li>• Post to Twitter to flex your smoking journey</li>
            <li>• Send to friends who might want to join Puffed</li>
            <li>• Your card updates weekly with fresh stats</li>
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
