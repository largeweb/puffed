import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// Trivia questions pool - smoking culture, history, brands
const triviaQuestions = [
  {
    id: 1,
    question: "Which country is the world's largest producer of tobacco?",
    options: ["Brazil", "China", "India", "United States"],
    correct: 1,
    fact: "China produces about 40% of the world's tobacco, far more than any other country."
  },
  {
    id: 2,
    question: "What does 'Connecticut Shade' refer to in cigar terminology?",
    options: ["A smoking lounge", "A wrapper leaf type", "A cigar shape", "A flavor profile"],
    correct: 1,
    fact: "Connecticut Shade is a premium wrapper leaf grown under shade tents in the Connecticut River Valley, known for its smooth, mild flavor."
  },
  {
    id: 3,
    question: "Which Cuban cigar brand is named after a famous Shakespeare play?",
    options: ["Cohiba", "Romeo y Julieta", "Montecristo", "Partagás"],
    correct: 1,
    fact: "Romeo y Julieta was founded in 1875 and named after Shakespeare's famous romantic tragedy."
  },
  {
    id: 4,
    question: "What is the proper name for the cap on the end of a cigar that you cut?",
    options: ["The foot", "The head", "The binder", "The corona"],
    correct: 1,
    fact: "The head is the capped end you put in your mouth. The foot is the open end you light."
  },
  {
    id: 5,
    question: "Approximately how long does it take to hand-roll a premium cigar?",
    options: ["1-2 minutes", "5-10 minutes", "15-30 minutes", "1 hour"],
    correct: 1,
    fact: "A skilled torcedor (cigar roller) takes about 5-10 minutes per cigar, and the best can roll up to 100 cigars per day."
  },
  {
    id: 6,
    question: "What is a 'Churchill' in cigar sizing?",
    options: ["A small cigar", "A 7 inch x 47 ring gauge", "A brand name", "A wrapper type"],
    correct: 1,
    fact: "The Churchill size (7\" x 47 ring gauge) was named after Winston Churchill, who famously smoked about 10 cigars a day."
  },
  {
    id: 7,
    question: "Which year did Cohiba, the famous Cuban brand, first appear?",
    options: ["1492", "1845", "1966", "1992"],
    correct: 2,
    fact: "Cohiba was created in 1966 originally as a private brand for Fidel Castro and high-ranking officials."
  },
  {
    id: 8,
    question: "What is the 'ring gauge' of a cigar?",
    options: ["Its weight", "Its diameter in 64ths of an inch", "Its length", "Its wrapper color"],
    correct: 1,
    fact: "A 50 ring gauge cigar is 50/64 of an inch in diameter, or about 0.78 inches."
  },
  {
    id: 9,
    question: "What country invented cigarettes in their modern form?",
    options: ["United States", "France", "Spain", "England"],
    correct: 2,
    fact: "The modern cigarette was invented in Spain around 1830, where workers wrapped tobacco in paper."
  },
  {
    id: 10,
    question: "What is 'plume' on a cigar?",
    options: ["Mold damage", "Crystallized oils", "A flavor note", "A brand name"],
    correct: 1,
    fact: "Plume (or bloom) is a white crystalline substance that forms on well-aged cigars - it's a sign of proper aging and can be gently brushed off."
  },
  {
    id: 11,
    question: "Which smoking method originated in India and uses water filtration?",
    options: ["Pipe smoking", "Hookah/Shisha", "Vaping", "Snuff"],
    correct: 1,
    fact: "The hookah originated in India around the 15th century and spread throughout the Middle East and beyond."
  },
  {
    id: 12,
    question: "What is a 'maduro' wrapper?",
    options: ["A light-colored wrapper", "A dark, fermented wrapper", "A flavored wrapper", "A synthetic wrapper"],
    correct: 1,
    fact: "Maduro means 'mature' in Spanish. These dark wrappers are fermented longer, creating rich, sweet flavors."
  },
  {
    id: 13,
    question: "How many tobacco leaves does it typically take to make one cigar?",
    options: ["1-2", "3-4", "5-10", "15-20"],
    correct: 1,
    fact: "A typical premium cigar uses 3-4 leaves: 2-3 filler leaves, one binder leaf, and one wrapper leaf."
  },
  {
    id: 14,
    question: "What is retrohaling?",
    options: ["Inhaling smoke into lungs", "Exhaling smoke through the nose", "Holding smoke in mouth", "Blowing smoke rings"],
    correct: 1,
    fact: "Retrohaling involves pushing smoke out through your nasal passages, allowing you to taste more subtle flavors."
  },
  {
    id: 15,
    question: "Which spirit is traditionally paired with cigars?",
    options: ["Vodka", "Rum", "Tequila", "Gin"],
    correct: 1,
    fact: "Rum and cigars share Caribbean heritage. The sweetness of aged rum complements the flavors of many cigars."
  },
  {
    id: 16,
    question: "What temperature should a humidor be maintained at?",
    options: ["50-60°F", "65-72°F", "75-85°F", "90-100°F"],
    correct: 1,
    fact: "The ideal humidor temperature is 65-72°F (18-22°C) with 65-72% humidity - the '70/70 rule'."
  },
  {
    id: 17,
    question: "What is a 'torpedo' cigar shape?",
    options: ["Flat on both ends", "Pointed at the head", "Round like a ball", "Square shaped"],
    correct: 1,
    fact: "A torpedo (or belicoso) has a pointed, tapered head that focuses the smoke and flavor."
  },
  {
    id: 18,
    question: "Which Native American tribe introduced tobacco to European explorers?",
    options: ["Cherokee", "Taíno", "Apache", "Sioux"],
    correct: 1,
    fact: "The Taíno people of the Caribbean introduced tobacco to Columbus in 1492, calling it 'tabaco'."
  },
  {
    id: 19,
    question: "What does 'habano' mean on a cigar?",
    options: ["Made in Honduras", "Made in Cuba", "Machine made", "Organic tobacco"],
    correct: 1,
    fact: "Habano indicates Cuban origin - Havana (La Habana) is the capital and historic cigar-making center of Cuba."
  },
  {
    id: 20,
    question: "How long can a properly stored cigar last?",
    options: ["6 months", "2 years", "10 years", "Indefinitely with proper care"],
    correct: 3,
    fact: "With proper humidor storage, premium cigars can last indefinitely and often improve with age like fine wine."
  },
  {
    id: 21,
    question: "What is the 'third' of a cigar?",
    options: ["The ash", "The final portion before it gets bitter", "The wrapper", "A serving size"],
    correct: 1,
    fact: "Many smokers divide a cigar into thirds - the flavors typically intensify and change as you smoke through each third."
  },
  {
    id: 22,
    question: "Which country is known for Cameroon wrapper tobacco?",
    options: ["Cuba", "Cameroon/CAR", "Connecticut", "Nicaragua"],
    correct: 1,
    fact: "Cameroon wrappers are actually grown in the Central African Republic, named after the nearby country. They're known for their toothy texture and subtle sweetness."
  },
  {
    id: 23,
    question: "What year did the US embargo on Cuban cigars begin?",
    options: ["1945", "1962", "1975", "1990"],
    correct: 1,
    fact: "The Cuban embargo began in 1962 under President Kennedy, who allegedly had his press secretary stock up on Cuban cigars the night before signing it."
  },
  {
    id: 24,
    question: "What is 'cold draw' when smoking a cigar?",
    options: ["Smoking outside", "Tasting the unlit cigar", "Using ice", "A cutting technique"],
    correct: 1,
    fact: "The cold draw is when you taste the unlit cigar after cutting it - you can preview flavors before lighting."
  },
  {
    id: 25,
    question: "How many cigarettes are in a standard US pack?",
    options: ["10", "15", "20", "25"],
    correct: 2,
    fact: "The US standard is 20 cigarettes per pack, though this varies by country - Australian packs have 20-50."
  },
  {
    id: 26,
    question: "What is sidestream smoke?",
    options: ["Smoke inhaled by the smoker", "Smoke from the burning end", "Flavored smoke", "Filtered smoke"],
    correct: 1,
    fact: "Sidestream smoke rises from the lit end of a cigarette or cigar between puffs."
  },
  {
    id: 27,
    question: "Which famous author was known for his love of pipes?",
    options: ["Ernest Hemingway", "J.R.R. Tolkien", "F. Scott Fitzgerald", "Mark Twain"],
    correct: 1,
    fact: "Tolkien was rarely seen without his pipe. He famously said, 'Every morning I wake up thinking, what a splendid morning, I should smoke a pipe.'"
  },
  {
    id: 28,
    question: "What is a 'toro' cigar?",
    options: ["A brand", "A 6x50 size", "A Cuban cigar", "A flavored cigar"],
    correct: 1,
    fact: "Toro (meaning 'bull' in Spanish) is a popular size measuring 6 inches by 50 ring gauge - a great middle-ground size."
  },
  {
    id: 29,
    question: "What is 'ammonia' in cigar aging?",
    options: ["An additive", "A natural byproduct that dissipates", "A flavor", "A wrapper type"],
    correct: 1,
    fact: "Fresh cigars contain ammonia from fermentation. Proper aging (3-6 months minimum) allows it to dissipate for smoother flavor."
  },
  {
    id: 30,
    question: "Which famous detective was known for smoking a calabash pipe?",
    options: ["Hercule Poirot", "Sherlock Holmes", "Philip Marlowe", "Sam Spade"],
    correct: 1,
    fact: "While Arthur Conan Doyle actually described Holmes with a clay pipe, the calabash became iconic through stage and film adaptations."
  }
];

function getDailyQuestion(): typeof triviaQuestions[0] {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = (dayOfYear + today.getFullYear()) % triviaQuestions.length;
  return triviaQuestions[index];
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const question = getDailyQuestion();
    const todayKey = getTodayKey();
    
    let userAnswer = null;
    if (userId) {
      const result = await db.prepare(`
        SELECT answer_index, is_correct, answered_at 
        FROM trivia_answers 
        WHERE user_id = ? AND date_key = ?
      `).bind(userId, todayKey).first() as { answer_index: number; is_correct: number; answered_at: number } | null;
      
      if (result) {
        userAnswer = {
          answerIndex: result.answer_index,
          isCorrect: result.is_correct === 1,
          answeredAt: result.answered_at
        };
      }
    }
    
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_answers,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
      FROM trivia_answers
      WHERE date_key = ?
    `).bind(todayKey).first() as { total_answers: number; correct_answers: number } | null;
    
    const totalAnswers = statsResult?.total_answers || 0;
    const correctAnswers = statsResult?.correct_answers || 0;
    
    let userStats = null;
    if (userId) {
      const userStatsResult = await db.prepare(`
        SELECT 
          COUNT(*) as total_played,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct
        FROM trivia_answers
        WHERE user_id = ?
      `).bind(userId).first() as { total_played: number; total_correct: number } | null;
      
      if (userStatsResult) {
        userStats = {
          totalPlayed: userStatsResult.total_played,
          totalCorrect: userStatsResult.total_correct,
          accuracy: userStatsResult.total_played > 0 
            ? Math.round((userStatsResult.total_correct / userStatsResult.total_played) * 100)
            : 0
        };
      }
    }
    
    const leaderboardResult = await db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.avatar_url,
        COUNT(*) as total_played,
        SUM(CASE WHEN ta.is_correct = 1 THEN 1 ELSE 0 END) as total_correct
      FROM trivia_answers ta
      JOIN users u ON ta.user_id = u.id
      GROUP BY ta.user_id
      ORDER BY total_correct DESC, total_played ASC
      LIMIT 10
    `).all() as unknown as { results: Array<{ id: number; username: string; avatar_url: string | null; total_played: number; total_correct: number }> };
    
    const leaderboard = leaderboardResult.results.map((row) => ({
      userId: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
      totalPlayed: row.total_played,
      totalCorrect: row.total_correct,
      accuracy: Math.round((row.total_correct / row.total_played) * 100)
    }));
    
    const response: Record<string, unknown> = {
      question: {
        id: question.id,
        question: question.question,
        options: question.options
      },
      dateKey: todayKey,
      todayStats: {
        totalAnswers,
        correctAnswers,
        correctRate: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
      },
      leaderboard
    };
    
    if (userAnswer) {
      response.userAnswer = userAnswer;
      response.question = {
        ...response.question as object,
        correct: question.correct,
        fact: question.fact
      };
    }
    
    if (userStats) {
      response.userStats = userStats;
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Trivia GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch trivia' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const body = await request.json();
    const { userId, answerIndex } = body;
    
    if (!userId || answerIndex === undefined) {
      return NextResponse.json({ error: 'userId and answerIndex required' }, { status: 400 });
    }
    
    const question = getDailyQuestion();
    const todayKey = getTodayKey();
    const now = Math.floor(Date.now() / 1000);
    
    const existing = await db.prepare(`
      SELECT id FROM trivia_answers WHERE user_id = ? AND date_key = ?
    `).bind(userId, todayKey).first();
    
    if (existing) {
      return NextResponse.json({ error: 'Already answered today' }, { status: 400 });
    }
    
    const isCorrect = answerIndex === question.correct;
    
    await db.prepare(`
      INSERT INTO trivia_answers (user_id, date_key, question_id, answer_index, is_correct, answered_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, todayKey, question.id, answerIndex, isCorrect ? 1 : 0, now).run();
    
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_answers,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
      FROM trivia_answers
      WHERE date_key = ?
    `).bind(todayKey).first() as { total_answers: number; correct_answers: number } | null;
    
    return NextResponse.json({
      correct: isCorrect,
      correctAnswer: question.correct,
      fact: question.fact,
      todayStats: {
        totalAnswers: statsResult?.total_answers || 0,
        correctAnswers: statsResult?.correct_answers || 0,
        correctRate: statsResult?.total_answers 
          ? Math.round(((statsResult?.correct_answers || 0) / statsResult.total_answers) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Trivia POST error:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
