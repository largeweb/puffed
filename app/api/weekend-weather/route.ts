import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface WeekendWeather {
  isWeekend: boolean;
  hoursRemaining: number;
  
  // Current conditions
  currentCondition: string;
  currentEmoji: string;
  currentTemp: number; // Engagement "temperature" 0-100
  currentDescription: string;
  
  // Forecast
  forecast: {
    period: string;
    condition: string;
    emoji: string;
    prediction: string;
  }[];
  
  // "Winds" - trending brands
  windDirection: string;
  windSpeed: string;
  trendingBrands: { brand: string; velocity: number }[];
  
  // "Humidity" - social engagement
  humidity: number;
  socialActivity: string;
  
  // "Pressure" - activity intensity
  pressure: string;
  activityLevel: string;
  
  // Active smokers right now
  activeSmokers: number;
  recentSmokers: string[];
  
  // Weekend stats
  weekendStats: {
    totalCheckins: number;
    totalSmokers: number;
    peakHour: number;
    avgRating: number;
  };
  
  // Fun weather alerts
  alerts: {
    type: string;
    emoji: string;
    message: string;
  }[];
}

function getWeekendWindow(): { start: number; end: number; isWeekend: boolean } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  const friday = new Date(now);
  const daysUntilFriday = (dayOfWeek + 2) % 7;
  friday.setDate(friday.getDate() - daysUntilFriday);
  friday.setHours(17, 0, 0, 0);
  
  if (now < friday) {
    friday.setDate(friday.getDate() - 7);
  }
  
  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  
  const start = Math.floor(friday.getTime() / 1000);
  const end = Math.floor(sunday.getTime() / 1000);
  const nowTs = Math.floor(now.getTime() / 1000);
  
  return {
    start,
    end,
    isWeekend: nowTs >= start && nowTs <= end
  };
}

function getConditionFromActivity(checkinsPerHour: number, hour: number): { condition: string; emoji: string; temp: number } {
  // Adjust expectations based on time of day
  const isNight = hour >= 22 || hour < 6;
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;
  
  let adjustedRate = checkinsPerHour;
  if (isNight) adjustedRate *= 3; // Night activity counts more
  if (isMorning) adjustedRate *= 1.5; // Morning activity somewhat boosted
  
  if (adjustedRate >= 5) {
    return { condition: "Heavy Smoke Clouds", emoji: "🌫️", temp: 95 };
  } else if (adjustedRate >= 3) {
    return { condition: "Smoky Skies", emoji: "☁️", temp: 80 };
  } else if (adjustedRate >= 2) {
    return { condition: "Partly Smoky", emoji: "⛅", temp: 70 };
  } else if (adjustedRate >= 1) {
    return { condition: "Light Haze", emoji: "🌤️", temp: 60 };
  } else if (adjustedRate >= 0.5) {
    return { condition: "Clear with Wisps", emoji: "☀️", temp: 50 };
  } else if (adjustedRate > 0) {
    return { condition: "Mostly Clear", emoji: "🌅", temp: 40 };
  } else {
    return { condition: "Clear Skies", emoji: "✨", temp: 30 };
  }
}

function getTimeDescription(hour: number): string {
  if (hour >= 5 && hour < 8) return "Dawn Patrol conditions";
  if (hour >= 8 && hour < 12) return "Morning session weather";
  if (hour >= 12 && hour < 14) return "Lunch break atmosphere";
  if (hour >= 14 && hour < 17) return "Afternoon vibes";
  if (hour >= 17 && hour < 20) return "Happy hour conditions";
  if (hour >= 20 && hour < 23) return "Evening session climate";
  if (hour >= 23 || hour < 2) return "Late night atmosphere";
  return "Deep night conditions";
}

export async function GET() {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    
    const { start, end, isWeekend } = getWeekendWindow();
    const now = Math.floor(Date.now() / 1000);
    const currentHour = new Date().getHours();
    const hoursRemaining = isWeekend ? Math.max(0, Math.floor((end - now) / 3600)) : 0;
    
    // Get recent activity (last 2 hours)
    const recentWindow = now - 7200;
    const recentResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
    `).bind(recentWindow).first();
    
    const recentCheckins = (recentResult?.count as number) || 0;
    const checkinsPerHour = recentCheckins / 2;
    
    // Get current condition
    const { condition, emoji, temp } = getConditionFromActivity(checkinsPerHour, currentHour);
    
    // Get active smokers (last 30 min)
    const activeWindow = now - 1800;
    const activeResult = await db.prepare(`
      SELECT DISTINCT u.username
      FROM checkins c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(activeWindow).all();
    
    const recentSmokers = (activeResult.results || []).map((r: Record<string, unknown>) => r.username as string);
    
    // Trending brands (wind)
    const trendingResult = await db.prepare(`
      SELECT brand, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ?
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 3
    `).bind(start).all();
    
    const trendingBrands = (trendingResult.results || []).map((r: Record<string, unknown>) => ({
      brand: r.brand as string,
      velocity: r.count as number
    }));
    
    const windDirection = trendingBrands.length > 0 
      ? `${trendingBrands[0].brand} trending`
      : "Variable";
    const windSpeed = trendingBrands.length > 0
      ? `${trendingBrands[0].velocity} check-ins`
      : "Calm";
    
    // Social engagement (humidity)
    const socialResult = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM likes WHERE created_at >= ?) as likes,
        (SELECT COUNT(*) FROM comments WHERE created_at >= ?) as comments,
        (SELECT COUNT(*) FROM reactions WHERE created_at >= ?) as reactions
    `).bind(start, start, start).first();
    
    const totalSocial = ((socialResult?.likes as number) || 0) + 
                        ((socialResult?.comments as number) || 0) + 
                        ((socialResult?.reactions as number) || 0);
    const humidity = Math.min(100, Math.round(totalSocial * 2));
    
    let socialActivity = "Dry";
    if (humidity >= 80) socialActivity = "Tropical engagement storm!";
    else if (humidity >= 60) socialActivity = "High social moisture";
    else if (humidity >= 40) socialActivity = "Comfortable engagement";
    else if (humidity >= 20) socialActivity = "Light interaction mist";
    
    // Activity pressure
    const weekendCheckinsResult = await db.prepare(`
      SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as smokers, AVG(rating) as avg_rating
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
    `).bind(start, end).first();
    
    const totalCheckins = (weekendCheckinsResult?.count as number) || 0;
    const totalSmokers = (weekendCheckinsResult?.smokers as number) || 0;
    const avgRating = (weekendCheckinsResult?.avg_rating as number) || 0;
    
    // Calculate pressure based on activity vs expected
    const weekendHoursElapsed = Math.max(1, (now - start) / 3600);
    const activityRate = totalCheckins / weekendHoursElapsed;
    
    let pressure = "Normal";
    let activityLevel = "Steady activity";
    if (activityRate >= 2) {
      pressure = "High Pressure";
      activityLevel = "Intense smoking activity!";
    } else if (activityRate >= 1) {
      pressure = "Rising";
      activityLevel = "Building momentum";
    } else if (activityRate >= 0.5) {
      pressure = "Stable";
      activityLevel = "Consistent vibes";
    } else {
      pressure = "Low Pressure";
      activityLevel = "Relaxed weekend pace";
    }
    
    // Peak hour
    const peakResult = await db.prepare(`
      SELECT (created_at % 86400) / 3600 as hour, COUNT(*) as count
      FROM checkins
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).bind(start, end).first();
    
    const peakHour = (peakResult?.hour as number) || 12;
    
    // Generate forecast
    const forecast: { period: string; condition: string; emoji: string; prediction: string }[] = [];
    
    if (isWeekend) {
      // Morning forecast
      if (currentHour < 12) {
        forecast.push({
          period: "This Morning",
          condition: totalSmokers > 2 ? "Scattered Smokes" : "Light Activity",
          emoji: totalSmokers > 2 ? "🌤️" : "☀️",
          prediction: totalSmokers > 2 
            ? "Expect increasing smoke activity as more wake up"
            : "Early birds getting their sessions in"
        });
      }
      
      // Afternoon
      if (currentHour < 17) {
        forecast.push({
          period: "This Afternoon",
          condition: "Peak Smoke Potential",
          emoji: "⛅",
          prediction: "Prime conditions for extended sessions"
        });
      }
      
      // Evening
      if (currentHour < 22) {
        forecast.push({
          period: "Tonight",
          condition: "Heavy Smoke Expected",
          emoji: "☁️",
          prediction: "Night owls will emerge for late sessions"
        });
      }
      
      // Rest of weekend
      if (hoursRemaining > 12) {
        forecast.push({
          period: "Rest of Weekend",
          condition: "Good Smoking Weather",
          emoji: "🌫️",
          prediction: `${hoursRemaining} hours of weekend remaining`
        });
      }
    } else {
      forecast.push({
        period: "Weekend",
        condition: "Waiting...",
        emoji: "⏳",
        prediction: "Check back when the weekend starts!"
      });
    }
    
    // Generate alerts
    const alerts: { type: string; emoji: string; message: string }[] = [];
    
    if (recentSmokers.length >= 3) {
      alerts.push({
        type: "ACTIVITY WATCH",
        emoji: "🔥",
        message: "Multiple smokers active right now!"
      });
    }
    
    if (humidity >= 70) {
      alerts.push({
        type: "SOCIAL STORM",
        emoji: "💬",
        message: "High engagement detected - join the conversation!"
      });
    }
    
    if (hoursRemaining > 0 && hoursRemaining <= 6) {
      alerts.push({
        type: "WEEKEND WARNING",
        emoji: "⚠️",
        message: `Only ${hoursRemaining} hours of weekend remaining!`
      });
    }
    
    if (currentHour >= 4 && currentHour < 7) {
      alerts.push({
        type: "DAWN PATROL",
        emoji: "🌅",
        message: "Early bird conditions perfect for first smoke"
      });
    }
    
    if (currentHour >= 22 || currentHour < 2) {
      alerts.push({
        type: "NIGHT OWL ADVISORY",
        emoji: "🦉",
        message: "Late night smoking conditions optimal"
      });
    }
    
    const data: WeekendWeather = {
      isWeekend,
      hoursRemaining,
      currentCondition: condition,
      currentEmoji: emoji,
      currentTemp: temp,
      currentDescription: getTimeDescription(currentHour),
      forecast,
      windDirection,
      windSpeed,
      trendingBrands,
      humidity,
      socialActivity,
      pressure,
      activityLevel,
      activeSmokers: recentSmokers.length,
      recentSmokers,
      weekendStats: {
        totalCheckins,
        totalSmokers,
        peakHour,
        avgRating
      },
      alerts
    };
    
    return Response.json(data);
  } catch (error) {
    console.error("Weekend weather error:", error);
    return Response.json({ error: "Failed to load weekend weather" }, { status: 500 });
  }
}
