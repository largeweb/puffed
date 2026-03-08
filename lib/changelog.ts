// CHANGELOG DATA
// Update this file whenever shipping new features or fixes
// Format: { date, type, title, description, status }

export type UpdateType = 'feature' | 'fix' | 'improvement' | 'announcement';
export type UpdateStatus = 'live' | 'deploying' | 'coming-soon' | 'in-progress';

export interface Update {
  date: string; // YYYY-MM-DD
  type: UpdateType;
  title: string;
  description: string;
  status: UpdateStatus;
  icon?: string;
}

export const changelog: Update[] = [
  // ===== March 2026 =====
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Live Community Pulse 💚',
    description: 'See real-time platform activity! The Discover page now shows a live pulse indicator with today\'s smoke count and community engagement stats.',
    status: 'live',
    icon: '💚'
  },
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Streak Champions 🔥',
    description: 'Celebrating smokers who log in every day! The Sunday Coffee banner now shows users with the longest active check-in streaks.',
    status: 'live',
    icon: '🔥'
  },
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Welcome New Members 🎊',
    description: 'The Sunday Coffee banner now spotlights new users who joined this week! Help them feel at home by giving them a follow.',
    status: 'live',
    icon: '🎊'
  },
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Weekend Warriors ⚔️',
    description: 'Celebrating our most active weekend smokers! See who\'s been lighting up on Saturday and Sunday with the new Weekend Warriors leaderboard.',
    status: 'live',
    icon: '⚔️'
  },
  {
    date: '2026-03-08',
    type: 'fix',
    title: 'Smoke Council Now Public 🏛️',
    description: 'The Smoke Council is now viewable by everyone! No login required to see the weekly cabinet of distinguished smokers.',
    status: 'live',
    icon: '🏛️'
  },
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Sunday Coffee ☕',
    description: 'Special Sunday banner showing weekly highlights! See new members, top brands, MVPs, and community growth at a glance.',
    status: 'live',
    icon: '☕'
  },
  {
    date: '2026-03-08',
    type: 'improvement',
    title: 'Community Counter 🚀',
    description: 'See total community size in the Live Activity banner! Watch our community grow in real-time.',
    status: 'live',
    icon: '🚀'
  },
  {
    date: '2026-03-08',
    type: 'feature',
    title: 'Live Activity Pulse 🔴',
    description: 'See real-time community activity on Discover! Watch new signups, check-ins, and likes as they happen.',
    status: 'live',
    icon: '📡'
  },
  {
    date: '2026-03-07',
    type: 'feature',
    title: 'This Week on Puffed 📊',
    description: 'New weekly recap page! See stats, rising stars, top brands, and community MVPs.',
    status: 'live',
    icon: '📅'
  },
  {
    date: '2026-03-06',
    type: 'fix',
    title: 'User Profile Fix 🔧',
    description: 'Fixed server error when viewing user profiles. Badges now calculate dynamically.',
    status: 'live',
    icon: '🔧'
  },
  {
    date: '2026-03-05',
    type: 'feature',
    title: 'Updates Page 📋',
    description: 'See what\'s new! Browse all features, fixes, and improvements in one place.',
    status: 'live',
    icon: '📋'
  },
  {
    date: '2026-03-05',
    type: 'feature',
    title: 'Platform Pulse 📊',
    description: 'Real-time health monitor showing platform stats, health score, and trends vs yesterday.',
    status: 'live',
    icon: '📊'
  },
  {
    date: '2026-03-05',
    type: 'feature',
    title: 'The Porch 🪑',
    description: 'See who\'s smoking right now! Real-time feed of active smokers with status indicators.',
    status: 'live',
    icon: '🪑'
  },
  {
    date: '2026-03-05',
    type: 'feature',
    title: 'The Spark ⚡',
    description: 'First check-in of the day gets glory! Race to claim the daily spark.',
    status: 'live',
    icon: '⚡'
  },
  {
    date: '2026-03-04',
    type: 'fix',
    title: 'Deploy System Fixed',
    description: 'Resolved deployment issues. Cleaned up codebase and established new development guidelines.',
    status: 'live',
    icon: '🔧'
  },
  {
    date: '2026-03-02',
    type: 'feature',
    title: 'MVP Awards 🏅',
    description: 'Weekly recognition ceremony! See who\'s the MVP, best check-in, rising star, and more.',
    status: 'live',
    icon: '🏅'
  },
  {
    date: '2026-03-02',
    type: 'feature',
    title: 'Community Milestones 🏆',
    description: 'Track platform-wide goals together. Celebrate when we hit milestones!',
    status: 'live',
    icon: '🏆'
  },
  
  // ===== February 2026 =====
  {
    date: '2026-02-22',
    type: 'feature',
    title: 'Quick Reactions',
    description: 'Express yourself with emoji reactions on check-ins. Fast, fun engagement!',
    status: 'live',
    icon: '🎉'
  },
  {
    date: '2026-02-22',
    type: 'improvement',
    title: 'Engagement Boost',
    description: 'Added auto-follow suggestions, warm-up tools, and celebration notifications.',
    status: 'live',
    icon: '🚀'
  },
  {
    date: '2026-02-21',
    type: 'feature',
    title: 'Flavor Tags',
    description: 'Tag your check-ins with flavor notes like Cedar, Leather, Coffee, and more.',
    status: 'live',
    icon: '🏷️'
  },
  {
    date: '2026-02-21',
    type: 'feature',
    title: 'Browse by Flavor',
    description: 'Discover cigars by taste profile. Find others who share your flavor preferences.',
    status: 'live',
    icon: '☕'
  },
  {
    date: '2026-02-21',
    type: 'feature',
    title: 'Badge System 🎖️',
    description: '12 earnable badges from First Smoke to Legend. Track your progress!',
    status: 'live',
    icon: '🎖️'
  },
  {
    date: '2026-02-21',
    type: 'feature',
    title: 'Cigar Detail Pages',
    description: 'See all check-ins for a brand, average ratings, and popular products.',
    status: 'live',
    icon: '🚬'
  },
  {
    date: '2026-02-21',
    type: 'feature',
    title: 'Multi-Category Support',
    description: 'Now tracking Cigars 🚬, Cannabis 🌿, Hookah 💨, Vape 🌫️, and Snus 🫦!',
    status: 'live',
    icon: '🌿'
  },
  {
    date: '2026-02-20',
    type: 'feature',
    title: 'Social Features',
    description: 'Follow friends, like check-ins, leave comments. Build your smoke community!',
    status: 'live',
    icon: '👥'
  },
  {
    date: '2026-02-20',
    type: 'feature',
    title: 'Photo Uploads',
    description: 'Share photos of your smokes. Show off your setup!',
    status: 'live',
    icon: '📸'
  },
  {
    date: '2026-02-19',
    type: 'feature',
    title: 'Puffed Launch 🎉',
    description: 'The cigar social app is live! Track your smokes, rate cigars, and connect with fellow enthusiasts.',
    status: 'live',
    icon: '🎉'
  },
];

// Get updates grouped by month
export function getUpdatesByMonth(): Record<string, Update[]> {
  const grouped: Record<string, Update[]> = {};
  
  for (const update of changelog) {
    const date = new Date(update.date);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(update);
  }
  
  return grouped;
}

// Get recent updates (last N)
export function getRecentUpdates(count: number = 5): Update[] {
  return changelog.slice(0, count);
}

// Get updates by type
export function getUpdatesByType(type: UpdateType): Update[] {
  return changelog.filter(u => u.type === type);
}
