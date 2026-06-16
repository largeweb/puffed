'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FLAVOR_TAGS } from '@/lib/flavors';

export default function TastyTuesday() {
  const [isVisible, setIsVisible] = useState(false);
  const [flavorIndex, setFlavorIndex] = useState(0);
  
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only show on Tuesday (day 2)
    if (dayOfWeek === 2) {
      setIsVisible(true);
      // Use the week number to pick a consistent flavor for the whole day
      const weekOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      setFlavorIndex(weekOfYear % FLAVOR_TAGS.length);
    }
  }, []);
  
  if (!isVisible) return null;
  
  const todaysFlavor = FLAVOR_TAGS[flavorIndex];
  
  return (
    <Link href={`/flavor/${todaysFlavor.id}`} className="block">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-bounce">{todaysFlavor.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">🗓️ TASTY TUESDAY</span>
            </div>
            <h3 className="font-bold text-lg mt-1">Explore {todaysFlavor.label} Today!</h3>
            <p className="text-white/90 text-sm">
              Try something new with {todaysFlavor.label.toLowerCase()} notes
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-full p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {FLAVOR_TAGS.slice(0, 8).map((flavor) => (
            <span 
              key={flavor.id}
              className={`text-xs px-2 py-0.5 rounded-full ${
                flavor.id === todaysFlavor.id 
                  ? 'bg-white text-orange-600 font-bold' 
                  : 'bg-white/10'
              }`}
            >
              {flavor.emoji}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
