"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiShare2, FiLink, FiTwitter, FiX } from "react-icons/fi";
import { FaXTwitter, FaFacebook, FaWhatsapp, FaReddit } from "react-icons/fa6";

interface ShareMenuProps {
  url: string;
  text: string;
  title: string;
  className?: string;
  iconOnly?: boolean;
  prominent?: boolean; // Show as a more visible CTA
}

export default function ShareMenu({ url, text, title, className = "", iconOnly = false, prominent = false }: ShareMenuProps) {
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

  const shareToFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, "_blank", "width=550,height=420");
    setIsOpen(false);
  };

  const shareToWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    window.open(waUrl, "_blank");
    setIsOpen(false);
  };

  const shareToReddit = () => {
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(redditUrl, "_blank", "width=550,height=420");
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
          prominent
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium"
            : "text-gray-400 hover:text-green-400 hover:bg-green-500/10"
        } ${className}`}
      >
        <FiShare2 size={16} />
        {!iconOnly && <span className="text-sm">{prominent ? "Share This!" : "Share"}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 w-52 glass rounded-xl overflow-hidden shadow-xl z-50"
          >
            {/* Quick share row */}
            <div className="flex items-center justify-around px-3 py-3 border-b border-white/5">
              <button
                onClick={shareToTwitter}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                title="Share on X"
              >
                <FaXTwitter size={20} className="text-white" />
              </button>
              <button
                onClick={shareToFacebook}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                title="Share on Facebook"
              >
                <FaFacebook size={20} className="text-blue-500" />
              </button>
              <button
                onClick={shareToWhatsApp}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                title="Share on WhatsApp"
              >
                <FaWhatsapp size={20} className="text-green-500" />
              </button>
              <button
                onClick={shareToReddit}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                title="Share on Reddit"
              >
                <FaReddit size={20} className="text-orange-500" />
              </button>
            </div>

            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
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
                <FiShare2 size={18} className="text-amber-400" />
                <span className="text-sm">More options...</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
