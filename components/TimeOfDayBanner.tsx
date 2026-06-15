'use client';

import Link from 'next/link';

interface TimeConfig {
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;
  cta: string;
}

function getTimeConfig(): TimeConfig {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    // Morning (6am - 12pm)
    return {
      emoji: '☀️',
      title: 'Morning Ritual',
      subtitle: 'Start your day with something smooth',
      gradient: 'from-orange-500 to-yellow-500',
      cta: 'Log your morning smoke'
    };
  } else if (hour >= 12 && hour < 17) {
    // Afternoon (12pm - 5pm)
    return {
      emoji: '🌤️',
      title: 'Afternoon Break',
      subtitle: 'Take a moment to unwind and recharge',
      gradient: 'from-blue-500 to-cyan-500',
      cta: 'Enjoy a midday treat'
    };
  } else if (hour >= 17 && hour < 21) {
    // Evening (5pm - 9pm)
    return {
      emoji: '🌅',
      title: 'Evening Relax',
      subtitle: 'Wind down with your favorite smoke',
      gradient: 'from-purple-500 to-pink-500',
      cta: 'Perfect time to indulge'
    };
  } else {
    // Night (9pm - 6am)
    return {
      emoji: '🌙',
      title: 'Night Cap',
      subtitle: 'A perfect end to your day',
      gradient: 'from-indigo-600 to-purple-700',
      cta: 'Log your nightcap'
    };
  }
}

export default function TimeOfDayBanner() {
  const config = getTimeConfig();
  
  return (
    <Link href="/checkin" className="block">
      <div className={`bg-gradient-to-r ${config.gradient} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.emoji}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{config.title}</h3>
            <p className="text-white/90 text-sm">{config.subtitle}</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{config.cta}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
