import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface WeatherData {
  temp_f: number;
  temp_c: number;
  condition: string;
  icon: string;
  humidity: number;
  wind_mph: number;
  feels_like_f: number;
  is_day: boolean;
  location: string;
}

interface SmokingCondition {
  score: number; // 0-100
  rating: "perfect" | "great" | "good" | "fair" | "poor" | "indoor";
  label: string;
  suggestion: string;
  emoji: string;
}

interface CigarSuggestion {
  type: string;
  strength: string;
  reason: string;
  examples: string[];
}

function getSmokingCondition(weather: WeatherData): SmokingCondition {
  let score = 100;
  const issues: string[] = [];

  // Temperature scoring (ideal: 60-80°F)
  if (weather.temp_f < 32) {
    score -= 60;
    issues.push("freezing");
  } else if (weather.temp_f < 45) {
    score -= 35;
    issues.push("cold");
  } else if (weather.temp_f < 55) {
    score -= 15;
    issues.push("chilly");
  } else if (weather.temp_f > 95) {
    score -= 40;
    issues.push("too hot");
  } else if (weather.temp_f > 85) {
    score -= 15;
    issues.push("warm");
  }

  // Humidity scoring (ideal: 40-70%)
  if (weather.humidity > 85) {
    score -= 25;
    issues.push("humid");
  } else if (weather.humidity < 20) {
    score -= 10;
    issues.push("dry");
  }

  // Wind scoring (ideal: < 10 mph)
  if (weather.wind_mph > 20) {
    score -= 35;
    issues.push("very windy");
  } else if (weather.wind_mph > 15) {
    score -= 20;
    issues.push("windy");
  } else if (weather.wind_mph > 10) {
    score -= 10;
    issues.push("breezy");
  }

  // Weather condition scoring
  const condition = weather.condition.toLowerCase();
  if (condition.includes("rain") || condition.includes("shower")) {
    score -= 50;
    issues.push("rainy");
  } else if (condition.includes("snow")) {
    score -= 45;
    issues.push("snowy");
  } else if (condition.includes("thunder") || condition.includes("storm")) {
    score -= 60;
    issues.push("stormy");
  } else if (condition.includes("fog") || condition.includes("mist")) {
    score -= 15;
    issues.push("foggy");
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 85) {
    return {
      score,
      rating: "perfect",
      label: "Perfect Conditions",
      suggestion: "Ideal weather for a premium smoke outdoors!",
      emoji: "🌟",
    };
  } else if (score >= 70) {
    return {
      score,
      rating: "great",
      label: "Great Conditions",
      suggestion: "Excellent day for outdoor smoking.",
      emoji: "☀️",
    };
  } else if (score >= 55) {
    return {
      score,
      rating: "good",
      label: "Good Conditions",
      suggestion: issues.length > 0 
        ? `A bit ${issues.join(" and ")}, but still enjoyable.`
        : "Decent conditions for a smoke.",
      emoji: "👍",
    };
  } else if (score >= 40) {
    return {
      score,
      rating: "fair",
      label: "Fair Conditions",
      suggestion: `${issues.join(", ")} - consider a covered patio.`,
      emoji: "🤔",
    };
  } else if (score >= 20) {
    return {
      score,
      rating: "poor",
      label: "Challenging Conditions",
      suggestion: "Maybe find a sheltered spot or wait it out.",
      emoji: "😬",
    };
  } else {
    return {
      score,
      rating: "indoor",
      label: "Indoor Weather",
      suggestion: "Best to enjoy your smoke inside today.",
      emoji: "🏠",
    };
  }
}

function getCigarSuggestion(weather: WeatherData): CigarSuggestion {
  const temp = weather.temp_f;
  const condition = weather.condition.toLowerCase();
  const isEvening = !weather.is_day;

  // Cold weather = fuller bodied, warming cigars
  if (temp < 50) {
    return {
      type: "Full-bodied, warming",
      strength: "Medium-Full to Full",
      reason: "Rich, warming flavors for cold weather",
      examples: ["Padrón 1926", "Liga Privada No. 9", "My Father Le Bijou"],
    };
  }

  // Hot weather = lighter, refreshing
  if (temp > 85) {
    return {
      type: "Light, refreshing",
      strength: "Mild to Medium",
      reason: "Won't overwhelm in the heat",
      examples: ["Ashton Classic", "Macanudo Café", "Arturo Fuente Hemingway"],
    };
  }

  // Rainy/gloomy = comforting, medium-bodied
  if (condition.includes("rain") || condition.includes("cloud") || condition.includes("overcast")) {
    return {
      type: "Comforting, rich",
      strength: "Medium to Medium-Full",
      reason: "Cozy vibes for dreary weather",
      examples: ["Oliva Serie V", "Rocky Patel Decade", "Perdomo Champagne"],
    };
  }

  // Evening = more complex, contemplative
  if (isEvening) {
    return {
      type: "Complex, contemplative",
      strength: "Medium-Full",
      reason: "Perfect for winding down",
      examples: ["Davidoff Nicaragua", "Fuente Fuente OpusX", "Padron 1964"],
    };
  }

  // Perfect weather = go premium!
  return {
    type: "Premium, celebratory",
    strength: "Your Choice",
    reason: "Perfect weather deserves a special cigar!",
    examples: ["Cohiba", "Montecristo", "Your top-shelf pick"],
  };
}

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieHeader = request.headers.get("cookie");
  const sessionId = parseSessionCookie(cookieHeader);
  
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = getRequestContext();
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?")
    .bind(sessionId, now)
    .first<{ user_id: string }>();
    
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get location from query or use default
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location") || "New York";

  try {
    // Fetch weather from wttr.in (free, no API key needed)
    const weatherRes = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
      { next: { revalidate: 1800 } } // Cache for 30 mins
    );

    if (!weatherRes.ok) {
      throw new Error("Weather fetch failed");
    }

    const weatherJson = await weatherRes.json() as {
      current_condition: Array<{
        temp_F: string;
        temp_C: string;
        weatherDesc: Array<{ value: string }>;
        weatherIconUrl?: Array<{ value: string }>;
        humidity: string;
        windspeedMiles: string;
        FeelsLikeF: string;
        weatherCode: string;
      }>;
      nearest_area?: Array<{
        areaName?: Array<{ value: string }>;
      }>;
      weather?: Array<{
        hourly?: Array<{
          time: string;
          tempF: string;
          weatherDesc: Array<{ value: string }>;
          chanceofrain: string;
        }>;
      }>;
    };
    const current = weatherJson.current_condition[0];
    const area = weatherJson.nearest_area?.[0];

    const weather: WeatherData = {
      temp_f: parseInt(current.temp_F),
      temp_c: parseInt(current.temp_C),
      condition: current.weatherDesc[0]?.value || "Unknown",
      icon: current.weatherIconUrl?.[0]?.value || "",
      humidity: parseInt(current.humidity),
      wind_mph: parseInt(current.windspeedMiles),
      feels_like_f: parseInt(current.FeelsLikeF),
      is_day: current.weatherCode !== "113" ? true : new Date().getHours() >= 6 && new Date().getHours() < 20,
      location: area?.areaName?.[0]?.value || location,
    };

    const smokingCondition = getSmokingCondition(weather);
    const cigarSuggestion = getCigarSuggestion(weather);

    // Get forecast for later today
    const hourly = weatherJson.weather?.[0]?.hourly || [];
    const currentHour = new Date().getHours();
    const laterForecasts = hourly.filter((h: { time: string }) => {
      const hour = parseInt(h.time) / 100;
      return hour > currentHour && hour <= 22;
    }).slice(0, 3);

    const forecast = laterForecasts.map((h: { 
      time: string; 
      tempF: string; 
      weatherDesc: Array<{ value: string }>; 
      chanceofrain: string 
    }) => ({
      time: `${Math.floor(parseInt(h.time) / 100)}:00`,
      temp_f: parseInt(h.tempF),
      condition: h.weatherDesc[0]?.value || "",
      rain_chance: parseInt(h.chanceofrain) || 0,
    }));

    return NextResponse.json({
      weather,
      smoking: smokingCondition,
      suggestion: cigarSuggestion,
      forecast,
      cached_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    
    // Return fallback data
    return NextResponse.json({
      weather: {
        temp_f: 65,
        temp_c: 18,
        condition: "Unknown",
        humidity: 50,
        wind_mph: 5,
        feels_like_f: 65,
        is_day: true,
        location: location,
      },
      smoking: {
        score: 70,
        rating: "good",
        label: "Weather Unavailable",
        suggestion: "Couldn't fetch weather, but it's probably fine!",
        emoji: "🤷",
      },
      suggestion: {
        type: "Your favorite",
        strength: "Your Choice",
        reason: "Go with what you're feeling today",
        examples: ["Whatever sounds good!"],
      },
      forecast: [],
      error: "Weather data unavailable",
    });
  }
}
