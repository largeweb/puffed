import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface WeekendStats {
  checkins: number;
  likes: number;
  reactions: number;
  comments: number;
  newUsers: number;
}

interface ChallengeResponse {
  active: boolean;
  challenge: {
    type: 'checkins' | 'engagement' | 'reactions' | 'community';
    title: string;
    description: string;
    emoji: string;
    current: number;
    goal: number;
    progress: number;
    completed: boolean;
    reward: string;
  } | null;
  weekendStats: WeekendStats;
  timeRemaining: string;
}

function getWeekendTimeRemaining(): { isWeekend: boolean; remaining: string } {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Weekend is Friday 6PM to Sunday 11:59PM
  const isFridayEvening = day === 5 && hour >= 18;
  const isSaturday = day === 6;
  const isSunday = day === 0;
  const isWeekend = isFridayEvening || isSaturday || isSunday;

  if (!isWeekend) {
    return { isWeekend: false, remaining: 'Starts Friday 6PM' };
  }

  // Calculate time until Monday midnight
  let hoursRemaining = 0;
  if (day === 5) {
    hoursRemaining = (24 - hour) + 48; // Rest of Friday + Sat + Sun
  } else if (day === 6) {
    hoursRemaining = (24 - hour) + 24; // Rest of Saturday + Sunday
  } else if (day === 0) {
    hoursRemaining = 24 - hour; // Rest of Sunday
  }

  if (hoursRemaining > 24) {
    const days = Math.floor(hoursRemaining / 24);
    const hours = hoursRemaining % 24;
    return { isWeekend: true, remaining: `${days}d ${hours}h left` };
  }
  return { isWeekend: true, remaining: `${hoursRemaining}h left` };
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;

    const { isWeekend, remaining } = getWeekendTimeRemaining();

    // Get Friday 6PM timestamp
    const now = new Date();
    const day = now.getDay();
    const fridayStart = new Date(now);
    
    if (day === 0) {
      fridayStart.setDate(now.getDate() - 2);
    } else if (day === 6) {
      fridayStart.setDate(now.getDate() - 1);
    } else if (day === 5) {
      // Today is Friday
    } else {
      // It's weekday, get last Friday
      fridayStart.setDate(now.getDate() - ((day + 2) % 7));
    }
    fridayStart.setHours(18, 0, 0, 0);
    const weekendStartTs = Math.floor(fridayStart.getTime() / 1000);

    // Get weekend stats
    const statsResult = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM checkins WHERE created_at >= ?) as checkins,
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as likes,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as reactions,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as comments,
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as newUsers
    `).bind(weekendStartTs, weekendStartTs, weekendStartTs, weekendStartTs, weekendStartTs).first<WeekendStats>();

    const weekendStats: WeekendStats = {
      checkins: statsResult?.checkins || 0,
      likes: statsResult?.likes || 0,
      reactions: statsResult?.reactions || 0,
      comments: statsResult?.comments || 0,
      newUsers: statsResult?.newUsers || 0,
    };

    // Get total platform stats for goal calculation
    const totalResult = await db.prepare(`
      SELECT COUNT(*) as total FROM checkins
    `).first<{ total: number }>();
    const totalCheckins = totalResult?.total || 0;

    // Dynamic challenge based on current stats
    // Goal: Reach a nice round number milestone
    const nextMilestone = Math.ceil((totalCheckins + 1) / 10) * 10;
    const checkinsNeeded = nextMilestone - totalCheckins;
    
    // Calculate engagement goal (aim for 5-10 interactions this weekend)
    const engagementTotal = weekendStats.likes + weekendStats.reactions + weekendStats.comments;
    const engagementGoal = 10;

    // Pick challenge type based on what's lagging
    let challenge: ChallengeResponse['challenge'] = null;

    if (isWeekend) {
      if (engagementTotal < engagementGoal) {
        // Engagement challenge - encourage likes/reactions
        challenge = {
          type: 'engagement',
          title: 'Weekend Vibes Challenge',
          description: `Spread the love! ${engagementGoal} likes, reactions, or comments this weekend.`,
          emoji: '💜',
          current: engagementTotal,
          goal: engagementGoal,
          progress: Math.min(100, Math.round((engagementTotal / engagementGoal) * 100)),
          completed: engagementTotal >= engagementGoal,
          reward: 'Community Love Badge 💝',
        };
      } else if (checkinsNeeded <= 5) {
        // Milestone challenge - close to a round number
        challenge = {
          type: 'checkins',
          title: `Road to ${nextMilestone}!`,
          description: `Just ${checkinsNeeded} more check-ins to hit ${nextMilestone} total!`,
          emoji: '🎯',
          current: totalCheckins,
          goal: nextMilestone,
          progress: Math.round(((totalCheckins % 10) / 10) * 100),
          completed: false,
          reward: 'Milestone Celebration 🎉',
        };
      } else {
        // Default: reactions challenge
        challenge = {
          type: 'reactions',
          title: 'React & Connect',
          description: 'Drop some reactions on fellow smokers\' posts!',
          emoji: '🔥',
          current: weekendStats.reactions,
          goal: 5,
          progress: Math.min(100, Math.round((weekendStats.reactions / 5) * 100)),
          completed: weekendStats.reactions >= 5,
          reward: 'Reaction King Crown 👑',
        };
      }
    }

    const response: ChallengeResponse = {
      active: isWeekend,
      challenge,
      weekendStats,
      timeRemaining: remaining,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Weekend challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekend challenge', active: false, challenge: null, weekendStats: { checkins: 0, likes: 0, reactions: 0, comments: 0, newUsers: 0 }, timeRemaining: '' },
      { status: 500 }
    );
  }
}
