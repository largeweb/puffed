"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const EMOJIS = ['🔥', '💨', '👌', '🤤', '😍'];

interface Props {
  checkinId: string;
  compact?: boolean;
}

interface ReactionsData {
  reactions: Record<string, number>;
  myReactions: string[];
}

export default function QuickReactions({ checkinId, compact = false }: Props) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState<string | null>(null);

  useEffect(() => {
    loadReactions();
  }, [checkinId]);

  async function loadReactions() {
    try {
      const res = await fetch(`/api/reactions?checkinId=${checkinId}`);
      if (res.ok) {
        const data: ReactionsData = await res.json();
        setReactions(data.reactions || {});
        setMyReactions(data.myReactions || []);
      }
    } catch (err) {
      console.error("Load reactions error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReact(emoji: string) {
    if (reacting) return;
    setReacting(emoji);
    
    // Optimistic update
    const wasReacted = myReactions.includes(emoji);
    setMyReactions(prev => 
      wasReacted 
        ? prev.filter(e => e !== emoji)
        : [...prev, emoji]
    );
    setReactions(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + (wasReacted ? -1 : 1)
    }));

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId, emoji }),
      });
      
      if (!res.ok) {
        // Revert on error
        setMyReactions(prev => 
          wasReacted 
            ? [...prev, emoji]
            : prev.filter(e => e !== emoji)
        );
        setReactions(prev => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + (wasReacted ? 1 : -1)
        }));
      }
    } catch (err) {
      console.error("React error:", err);
      // Revert on error
      setMyReactions(prev => 
        wasReacted 
          ? [...prev, emoji]
          : prev.filter(e => e !== emoji)
      );
      setReactions(prev => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + (wasReacted ? 1 : -1)
      }));
    } finally {
      setReacting(null);
    }
  }

  if (loading) {
    return (
      <div className={`flex gap-1 ${compact ? 'h-6' : 'h-8'}`}>
        {EMOJIS.map(emoji => (
          <div 
            key={emoji}
            className={`${compact ? 'w-8 h-6' : 'w-10 h-8'} rounded-full bg-white/5 animate-pulse`}
          />
        ))}
      </div>
    );
  }

  // Get total reaction count
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map(emoji => {
        const count = reactions[emoji] || 0;
        const isReacted = myReactions.includes(emoji);
        const isReactingThis = reacting === emoji;
        
        // Only show emojis with reactions or if compact mode is off
        if (compact && count === 0 && !isReacted) return null;
        
        return (
          <motion.button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={reacting !== null}
            whileTap={{ scale: 0.9 }}
            animate={isReactingThis ? { scale: [1, 1.3, 1] } : {}}
            className={`
              flex items-center gap-0.5 rounded-full transition-all
              ${compact ? 'px-1.5 py-0.5 text-sm' : 'px-2 py-1 text-base'}
              ${isReacted 
                ? 'bg-amber-500/20 border border-amber-500/50' 
                : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }
              ${reacting && !isReactingThis ? 'opacity-50' : ''}
            `}
            title={`React with ${emoji}`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'} ${isReacted ? 'text-amber-400' : 'text-gray-400'}`}>
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
      
      {/* Show total if compact and no reactions visible */}
      {compact && totalReactions === 0 && (
        <div className="flex gap-0.5">
          {EMOJIS.slice(0, 3).map(emoji => (
            <motion.button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={reacting !== null}
              whileTap={{ scale: 0.9 }}
              className="text-lg opacity-40 hover:opacity-100 transition-opacity"
              title={`React with ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
          <span className="text-gray-500 text-xs ml-1">+2</span>
        </div>
      )}
    </div>
  );
}
