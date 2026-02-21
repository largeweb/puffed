"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiShare2, FiLink, FiTwitter, FiX } from "react-icons/fi";
import { FaXTwitter } from "react-icons/fa6";

interface ShareMenuProps {
  url: string;
  text: string;
  title: string;
  className?: string;
  iconOnly?: boolean;
}

export default function ShareMenu({ url, text, title, className = "", iconOnly = false }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setIsOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setIsOpen(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all ${className}`}
      >
        <FiShare2 size={16} />
        {!iconOnly && <span className="text-sm">Share</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 w-48 glass rounded-xl overflow-hidden shadow-xl z-50"
          >
            {/* Twitter/X */}
            <button
              onClick={shareToTwitter}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
            >
              <FaXTwitter size={18} className="text-white" />
              <span className="text-sm">Share on X</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-t border-white/5"
            >
              <FiLink size={18} className="text-gray-400" />
              <span className="text-sm">{copied ? "✓ Copied!" : "Copy link"}</span>
            </button>

            {/* Native Share (mobile) */}
            {hasNativeShare && (
              <button
                onClick={nativeShare}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-t border-white/5"
              >
                <FiShare2 size={18} className="text-gray-400" />
                <span className="text-sm">More options...</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
