"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUserPlus, FiCopy, FiCheck, FiShare2, FiMail, FiMessageCircle, FiTwitter } from "react-icons/fi";

interface InviteFriendsProps {
  username: string;
  className?: string;
}

export default function InviteFriends({ username, className = "" }: InviteFriendsProps) {
  const [copied, setCopied] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Generate referral link with username
  const referralLink = `https://puffed.one/join?ref=${encodeURIComponent(username)}`;
  const shareText = `Join me on Puffed - the cigar social app! Track your smokes, share reviews, and connect with fellow enthusiasts. 🚬`;

  useEffect(() => {
    // Check if Web Share API is available
    setShareAvailable(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (shareAvailable) {
      try {
        await navigator.share({
          title: "Join Puffed",
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or error - silently ignore
      }
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleSmsShare = () => {
    const smsBody = `${shareText} ${referralLink}`;
    window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
  };

  const handleEmailShare = () => {
    const subject = "Join me on Puffed!";
    const body = `Hey!\n\n${shareText}\n\nCheck it out: ${referralLink}\n\nSee you there! 🚬`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-xl p-4 ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <FiUserPlus className="text-amber-400" size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold">Invite Friends</h3>
            <p className="text-sm text-gray-400">Share Puffed with your smoke buddies</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-amber-400"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3">
              {/* Referral link display */}
              <div className="bg-black/30 rounded-lg p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-transparent text-gray-300 text-sm outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    copied
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  }`}
                >
                  {copied ? (
                    <>
                      <FiCheck size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex gap-2 flex-wrap">
                {shareAvailable && (
                  <button
                    onClick={handleNativeShare}
                    className="flex-1 min-w-[100px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <FiShare2 size={16} />
                    Share
                  </button>
                )}
                <button
                  onClick={handleSmsShare}
                  className="flex-1 min-w-[80px] bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <FiMessageCircle size={16} />
                  Text
                </button>
                <button
                  onClick={handleEmailShare}
                  className="flex-1 min-w-[80px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <FiMail size={16} />
                  Email
                </button>
                <button
                  onClick={handleTwitterShare}
                  className="flex-1 min-w-[80px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <FiTwitter size={16} />
                  Tweet
                </button>
              </div>

              {/* Encouragement text */}
              <p className="text-xs text-gray-500 text-center pt-1">
                🔥 The more friends you invite, the better the community gets!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
