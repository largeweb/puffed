import { NextResponse } from "next/server";

export const runtime = "edge";

// Curated cigar tips and facts
const CIGAR_TIPS = [
  {
    id: "storage-temp",
    category: "storage",
    emoji: "🌡️",
    tip: "Keep your humidor at 70°F and 70% humidity",
    detail: "The 70/70 rule is the gold standard for cigar storage. Too dry and they'll crack, too moist and they'll get moldy.",
  },
  {
    id: "cutting-101",
    category: "preparation",
    emoji: "✂️",
    tip: "Cut just above the cap line",
    detail: "A proper cut preserves the wrapper. Cut too deep and your cigar will unravel during your smoke.",
  },
  {
    id: "lighting-time",
    category: "preparation",
    emoji: "🔥",
    tip: "Toast the foot before lighting",
    detail: "Hold the flame just below the foot and rotate slowly. This ensures an even burn from the start.",
  },
  {
    id: "puff-rate",
    category: "smoking",
    emoji: "💨",
    tip: "Take a puff every 30-60 seconds",
    detail: "Smoking too fast overheats the cigar and causes harsh, bitter flavors. Relax and enjoy the moment.",
  },
  {
    id: "retrohale",
    category: "technique",
    emoji: "👃",
    tip: "Try retrohaling for more flavor",
    detail: "Push smoke out through your nose to unlock hidden flavors. Start with small amounts to get used to it.",
  },
  {
    id: "ash-length",
    category: "smoking",
    emoji: "⚪",
    tip: "Let the ash build naturally",
    detail: "A good cigar should hold an inch of ash. This helps regulate temperature and indicates quality construction.",
  },
  {
    id: "pairing-coffee",
    category: "pairing",
    emoji: "☕",
    tip: "Coffee is a classic pairing",
    detail: "The bitterness of coffee complements cigars beautifully. Try espresso with fuller-bodied smokes.",
  },
  {
    id: "pairing-whiskey",
    category: "pairing",
    emoji: "🥃",
    tip: "Match intensity with your drink",
    detail: "Light cigars pair well with lighter spirits. Bold maduros? Reach for bourbon or aged rum.",
  },
  {
    id: "touch-test",
    category: "selection",
    emoji: "🤏",
    tip: "Gently squeeze before you buy",
    detail: "A cigar should feel firm but give slightly. Hard spots mean poor construction, soft spots mean underfilled.",
  },
  {
    id: "wrapper-color",
    category: "knowledge",
    emoji: "🎨",
    tip: "Darker wrappers usually mean bolder flavor",
    detail: "Maduro (dark) wrappers are sweet and bold. Claro (light) wrappers are milder. But the filler matters too!",
  },
  {
    id: "ring-gauge",
    category: "knowledge",
    emoji: "📏",
    tip: "Ring gauge affects flavor delivery",
    detail: "Larger ring gauges (50+) burn cooler and highlight filler flavors. Smaller gauges (40-) emphasize wrapper.",
  },
  {
    id: "rest-period",
    category: "storage",
    emoji: "😴",
    tip: "Let new cigars rest before smoking",
    detail: "After shipping, cigars need 1-2 weeks in your humidor to reacclimate. Patience pays off!",
  },
  {
    id: "time-of-day",
    category: "smoking",
    emoji: "🌅",
    tip: "Save fuller cigars for after meals",
    detail: "Mild cigars work anytime. Save that full-bodied stick for after dinner when your palate is ready.",
  },
  {
    id: "rotation-tip",
    category: "storage",
    emoji: "🔄",
    tip: "Rotate your cigars monthly",
    detail: "The bottom of your humidor is more humid. Rotating ensures even seasoning throughout your collection.",
  },
  {
    id: "burn-correction",
    category: "technique",
    emoji: "🛠️",
    tip: "Touch up uneven burns gently",
    detail: "If your burn goes uneven, lightly toast the lagging side. Don't over-correct or you'll overheat it.",
  },
  {
    id: "brand-exploration",
    category: "selection",
    emoji: "🧭",
    tip: "Try new brands regularly",
    detail: "Your palate evolves over time. That brand you didn't like last year? Give it another shot.",
  },
  {
    id: "smoke-duration",
    category: "knowledge",
    emoji: "⏱️",
    tip: "Plan your smoke time",
    detail: "Robusto: ~45 min. Toro: ~60 min. Churchill: ~90 min. Don't start what you can't finish!",
  },
  {
    id: "humidity-packs",
    category: "storage",
    emoji: "💧",
    tip: "Boveda packs are foolproof",
    detail: "Two-way humidity packs maintain perfect conditions without any fuss. Great for beginners.",
  },
  {
    id: "morning-smoke",
    category: "smoking",
    emoji: "🌄",
    tip: "Connecticut wrappers shine in the morning",
    detail: "Their milder, creamy profile is perfect for a fresh palate. Save the maduros for later.",
  },
  {
    id: "flavor-notes",
    category: "technique",
    emoji: "📝",
    tip: "Keep notes on what you smoke",
    detail: "Write down flavors, pairings, and ratings. Your future self will thank you when picking cigars.",
  },
  {
    id: "purge-technique",
    category: "technique",
    emoji: "🌬️",
    tip: "Purge harsh smokes gently",
    detail: "If your cigar gets harsh, blow gently through it while holding the flame to the foot. Clears stale smoke.",
  },
  {
    id: "cedar-sheets",
    category: "storage",
    emoji: "🌲",
    tip: "Spanish cedar is your friend",
    detail: "Cedar helps regulate humidity and adds subtle flavor. Keep those cedar sheets from your cigar boxes!",
  },
  {
    id: "nubbing",
    category: "smoking",
    emoji: "🔚",
    tip: "Don't be afraid to nub it",
    detail: "If you're enjoying it, smoke it down! Some of the best flavors develop in the final third.",
  },
  {
    id: "seasonal-smoking",
    category: "smoking",
    emoji: "🍂",
    tip: "Adjust cigars to the season",
    detail: "Full-bodied cigars feel right in winter. Light up something milder when it's hot outside.",
  },
];

function getTodaysTip(): typeof CIGAR_TIPS[number] {
  const now = new Date();
  // Use day of year as seed for deterministic daily selection
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const tipIndex = dayOfYear % CIGAR_TIPS.length;
  return CIGAR_TIPS[tipIndex];
}

export interface DailyTipResponse {
  tip: {
    id: string;
    category: string;
    emoji: string;
    tip: string;
    detail: string;
  };
  dayOfYear: number;
}

export async function GET(): Promise<Response> {
  const tip = getTodaysTip();
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  return NextResponse.json({
    tip,
    dayOfYear,
  } as DailyTipResponse);
}
