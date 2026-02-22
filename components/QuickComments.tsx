"use client";

import { useState } from "react";

interface QuickCommentsProps {
  onSelect: (comment: string) => void;
  disabled?: boolean;
}

const QUICK_COMMENTS = [
  { emoji: "🔥", text: "Fire choice!" },
  { emoji: "💨", text: "How was the draw?" },
  { emoji: "📝", text: "Adding to my list!" },
  { emoji: "👀", text: "Gotta try this one" },
  { emoji: "💯", text: "Classic!" },
  { emoji: "🤔", text: "How long did it smoke?" },
];

export default function QuickComments({ onSelect, disabled }: QuickCommentsProps) {
  const [used, setUsed] = useState<string | null>(null);

  const handleClick = (comment: typeof QUICK_COMMENTS[0]) => {
    if (disabled || used) return;
    setUsed(comment.text);
    onSelect(`${comment.emoji} ${comment.text}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <span className="text-xs text-gray-500 w-full mb-1">Quick reply:</span>
      {QUICK_COMMENTS.map((comment) => (
        <button
          key={comment.text}
          onClick={() => handleClick(comment)}
          disabled={disabled || used === comment.text}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${used === comment.text 
              ? 'bg-green-600/30 text-green-400 cursor-default' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-amber-600/30 hover:text-amber-400 active:scale-95'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {comment.emoji} {comment.text}
        </button>
      ))}
    </div>
  );
}
