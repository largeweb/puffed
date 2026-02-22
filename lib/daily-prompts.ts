// Daily Prompts - Rotating questions/challenges to drive engagement

export interface DailyPrompt {
  id: string;
  prompt: string;
  emoji: string;
  category?: 'question' | 'challenge' | 'recommendation' | 'memory';
}

// 30 prompts to rotate through (one per day of month)
export const DAILY_PROMPTS: DailyPrompt[] = [
  // Questions
  { id: 'morning-smoke', prompt: "What's your go-to morning smoke?", emoji: '☀️', category: 'question' },
  { id: 'relaxation', prompt: "What do you smoke to unwind?", emoji: '😌', category: 'question' },
  { id: 'celebration', prompt: "What's your celebration cigar?", emoji: '🎉', category: 'question' },
  { id: 'first-cigar', prompt: "Do you remember your first cigar?", emoji: '💭', category: 'memory' },
  { id: 'favorite-pairing', prompt: "What drink pairs best with your smoke?", emoji: '🥃', category: 'question' },
  { id: 'hidden-gem', prompt: "What's an underrated smoke more people should try?", emoji: '💎', category: 'recommendation' },
  { id: 'perfect-setting', prompt: "Where's your favorite spot to smoke?", emoji: '🏡', category: 'question' },
  { id: 'gift', prompt: "What smoke would you gift to a friend?", emoji: '🎁', category: 'recommendation' },
  { id: 'weather-smoke', prompt: "What's perfect for today's weather?", emoji: '🌤️', category: 'question' },
  { id: 'weekend-ritual', prompt: "What's your weekend smoking ritual?", emoji: '📅', category: 'question' },
  
  // Challenges
  { id: 'try-new', prompt: "Challenge: Try something new today!", emoji: '🆕', category: 'challenge' },
  { id: 'flavor-focus', prompt: "Challenge: Focus on one flavor note today", emoji: '👅', category: 'challenge' },
  { id: 'share-moment', prompt: "Share a photo of your smoking moment", emoji: '📸', category: 'challenge' },
  { id: 'slow-down', prompt: "Challenge: Take an extra-slow smoke today", emoji: '🐢', category: 'challenge' },
  { id: 'outside-comfort', prompt: "Try something outside your usual style", emoji: '🎯', category: 'challenge' },
  
  // More questions
  { id: 'best-ever', prompt: "What's the best smoke you've ever had?", emoji: '🏆', category: 'question' },
  { id: 'daily-driver', prompt: "What's your everyday go-to?", emoji: '🚗', category: 'question' },
  { id: 'special-occasion', prompt: "Saving anything for a special occasion?", emoji: '⭐', category: 'question' },
  { id: 'disappointment', prompt: "Ever been disappointed by a hyped smoke?", emoji: '😕', category: 'question' },
  { id: 'flavor-preference', prompt: "Sweet, spicy, or earthy - what's your profile?", emoji: '🌶️', category: 'question' },
  { id: 'smoke-buddy', prompt: "Who do you like smoking with?", emoji: '👥', category: 'question' },
  { id: 'music-pairing', prompt: "What music goes with your smoke?", emoji: '🎵', category: 'question' },
  { id: 'seasonal', prompt: "Do you smoke differently by season?", emoji: '🍂', category: 'question' },
  { id: 'collection', prompt: "Show off something from your collection!", emoji: '📦', category: 'challenge' },
  { id: 'recent-discovery', prompt: "What have you discovered recently?", emoji: '🔍', category: 'question' },
  
  // Recommendations
  { id: 'beginner-rec', prompt: "What would you recommend to a beginner?", emoji: '🌱', category: 'recommendation' },
  { id: 'bold-rec', prompt: "Recommend something bold and full-bodied", emoji: '💪', category: 'recommendation' },
  { id: 'mild-rec', prompt: "What's your favorite mild smoke?", emoji: '☁️', category: 'recommendation' },
  { id: 'value-pick', prompt: "Best bang for your buck?", emoji: '💰', category: 'recommendation' },
  { id: 'splurge', prompt: "Worth the splurge?", emoji: '💸', category: 'recommendation' },
];

/**
 * Get today's daily prompt based on the date
 * Uses day of year to cycle through prompts
 */
export function getTodaysPrompt(): DailyPrompt {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Cycle through prompts based on day of year
  const promptIndex = dayOfYear % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[promptIndex];
}

/**
 * Get the prompt for a specific date string (YYYY-MM-DD)
 */
export function getPromptForDate(dateStr: string): DailyPrompt {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const promptIndex = dayOfYear % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[promptIndex];
}
