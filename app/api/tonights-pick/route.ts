import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { cookies } from "next/headers";

export const runtime = "edge";

interface BrandData {
  brand: string;
  brandSlug: string;
  cigar: string | null;
  avgRating: number;
  checkinCount: number;
  flavors: string[];
}

interface PickResponse {
  suggestion: {
    brand: string;
    brandSlug: string;
    cigar?: string;
    avgRating: number;
    checkinCount: number;
    topFlavors: string[];
    reason: string;
  } | null;
  timeContext: string;
  greeting: string;
  icon: string;
}

function getTimeContext(): { greeting: string; context: string; icon: string; reasons: string[] } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Morning Pick",
      context: "Start your day right",
      icon: "☀️",
      reasons: [
        "Perfect for a morning moment",
        "Great with your morning coffee",
        "A smooth start to the day"
      ]
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Afternoon Suggestion",
      context: "Midday break worthy",
      icon: "🌤️",
      reasons: [
        "Ideal for an afternoon pause",
        "Perfect midday smoke",
        "A refined afternoon choice"
      ]
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: "Tonight's Pick",
      context: "Evening relaxation awaits",
      icon: "🌙",
      reasons: [
        "Perfect for unwinding",
        "Great evening companion",
        "Ideal for after-dinner enjoyment"
      ]
    };
  } else {
    return {
      greeting: "Night Cap",
      context: "End the day in style",
      icon: "🌃",
      reasons: [
        "The perfect nightcap",
        "A satisfying end to your day",
        "Late-night luxury"
      ]
    };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(): Promise<NextResponse<PickResponse | { error: string }>> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ctx = getRequestContext();
    const db = ctx.env.DB;

    // Get user from session
    const sessionRow = await db.prepare(
      "SELECT user_id FROM sessions WHERE id = ?"
    ).bind(session).first<{ user_id: string }>();

    if (!sessionRow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = sessionRow.user_id;
    const timeInfo = getTimeContext();

    // Get user's check-ins with brands, ratings, and flavors
    const checkinsResult = await db.prepare(`
      SELECT brand, cigar, rating, flavor_notes
      FROM checkins
      WHERE user_id = ? AND rating IS NOT NULL
      ORDER BY rating DESC, created_at DESC
    `).bind(userId).all<{ 
      brand: string; 
      cigar: string | null; 
      rating: number;
      flavor_notes: string | null;
    }>();

    const checkins = checkinsResult.results || [];

    if (checkins.length === 0) {
      // No check-ins yet - return null suggestion
      return NextResponse.json({
        suggestion: null,
        timeContext: timeInfo.context,
        greeting: timeInfo.greeting,
        icon: timeInfo.icon
      });
    }

    // Aggregate by brand
    const brandMap = new Map<string, BrandData>();
    
    for (const checkin of checkins) {
      const existing = brandMap.get(checkin.brand);
      const flavors: string[] = [];
      
      if (checkin.flavor_notes) {
        try {
          const parsed = JSON.parse(checkin.flavor_notes);
          if (Array.isArray(parsed)) {
            flavors.push(...parsed);
          }
        } catch {
          // Invalid JSON, skip
        }
      }

      if (existing) {
        existing.avgRating = ((existing.avgRating * existing.checkinCount) + checkin.rating) / (existing.checkinCount + 1);
        existing.checkinCount++;
        // Merge flavors
        for (const f of flavors) {
          if (!existing.flavors.includes(f)) {
            existing.flavors.push(f);
          }
        }
      } else {
        brandMap.set(checkin.brand, {
          brand: checkin.brand,
          brandSlug: slugify(checkin.brand),
          cigar: checkin.cigar,
          avgRating: checkin.rating,
          checkinCount: 1,
          flavors
        });
      }
    }

    // Score brands: prioritize high rating + multiple check-ins
    const brands = Array.from(brandMap.values())
      .map(b => ({
        ...b,
        score: b.avgRating * 0.7 + Math.min(b.checkinCount, 5) * 0.3
      }))
      .sort((a, b) => b.score - a.score);

    // Pick a suggestion (use day of year for variety while being deterministic per day)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    const pickIndex = dayOfYear % Math.min(brands.length, 3); // Rotate among top 3
    const pick = brands[pickIndex] || brands[0];

    // Select a reason
    const reasonIndex = dayOfYear % timeInfo.reasons.length;
    const baseReason = timeInfo.reasons[reasonIndex];
    
    // Personalize reason based on data
    let reason = baseReason;
    if (pick.checkinCount >= 3) {
      reason = `One of your favorites — ${baseReason.toLowerCase()}`;
    } else if (pick.avgRating >= 4.5) {
      reason = `Top-rated choice — ${baseReason.toLowerCase()}`;
    }

    return NextResponse.json({
      suggestion: {
        brand: pick.brand,
        brandSlug: pick.brandSlug,
        cigar: pick.cigar || undefined,
        avgRating: pick.avgRating,
        checkinCount: pick.checkinCount,
        topFlavors: pick.flavors.slice(0, 4),
        reason
      },
      timeContext: timeInfo.context,
      greeting: timeInfo.greeting,
      icon: timeInfo.icon
    });
  } catch (error) {
    console.error("Tonight's pick error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
