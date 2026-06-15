// Daily smoke tips - rotates based on day of year
export const DAILY_TIPS = [
  { tip: "Store cigars at 65-70% humidity for optimal freshness", category: "storage", emoji: "💧" },
  { tip: "Let your cigar rest 15 min after cutting before lighting", category: "technique", emoji: "⏱️" },
  { tip: "Toast the foot of your cigar before taking the first puff", category: "technique", emoji: "🔥" },
  { tip: "Rotate your cigar while smoking for an even burn", category: "technique", emoji: "🔄" },
  { tip: "A good cigar deserves at least 45 minutes of your time", category: "mindset", emoji: "🧘" },
  { tip: "Ash can insulate the ember — don't tap too often", category: "technique", emoji: "🪨" },
  { tip: "Pair a maduro with coffee for a classic combo", category: "pairing", emoji: "☕" },
  { tip: "Connecticut wrappers are milder — great for beginners", category: "education", emoji: "📚" },
  { tip: "Try smoking outdoors — fresh air enhances the experience", category: "setting", emoji: "🌳" },
  { tip: "Keep your lighter flame away from the wrapper leaf", category: "technique", emoji: "🔥" },
  { tip: "A slow draw brings out more flavor complexity", category: "technique", emoji: "🌬️" },
  { tip: "Log your smoke right after — details fade fast!", category: "app", emoji: "📝" },
  { tip: "Rate based on your own taste, not the price tag", category: "mindset", emoji: "⭐" },
  { tip: "Try a new brand this week — expand your palate", category: "discovery", emoji: "🗺️" },
  { tip: "Bourbon and cigars: a match made in heaven", category: "pairing", emoji: "🥃" },
  { tip: "The final third often has the most intense flavors", category: "education", emoji: "🎯" },
  { tip: "Rest time between cigars helps reset your palate", category: "technique", emoji: "😌" },
  { tip: "Share your review — help others discover great smokes", category: "community", emoji: "🤝" },
  { tip: "Photo tip: natural lighting makes your cigar shots pop", category: "app", emoji: "📸" },
  { tip: "Follow other smokers to build your discovery feed", category: "app", emoji: "👥" },
  { tip: "Flavor notes can change throughout the smoke", category: "education", emoji: "🎭" },
  { tip: "The ring gauge affects the heat and flavor intensity", category: "education", emoji: "📏" },
  { tip: "Cuban cigars aren't always better — explore the world", category: "discovery", emoji: "🌍" },
  { tip: "Wind affects your burn — find a sheltered spot", category: "setting", emoji: "💨" },
  { tip: "A V-cut exposes more surface for bolder flavor", category: "technique", emoji: "✂️" },
  { tip: "Nicaragua produces some of the world's best tobacco", category: "education", emoji: "🇳🇮" },
  { tip: "Your mood affects how you taste — smoke when relaxed", category: "mindset", emoji: "😊" },
  { tip: "Revisit a cigar you didn't like — tastes evolve", category: "discovery", emoji: "🔁" },
  { tip: "A punch cut is gentler for cigars with delicate wrappers", category: "technique", emoji: "🥊" },
  { tip: "Sunday = perfect day for a longer vitola", category: "timing", emoji: "🌅" },
  { tip: "Write detailed reviews — future you will thank you", category: "app", emoji: "📖" },
];

// Get tip for today (deterministic, same for all users)
export function getTodaysTip(): typeof DAILY_TIPS[0] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}
