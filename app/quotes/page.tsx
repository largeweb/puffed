'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiShare2, FiRefreshCw, FiHeart, FiMessageSquare, FiBookOpen } from 'react-icons/fi';

interface Quote {
  id: number;
  text: string;
  author: string;
  category: string;
}

// Curated collection of quotes about smoking, cigars, relaxation, and the good life
const QUOTES: Quote[] = [
  // Cigar Wisdom
  { id: 1, text: "A good cigar is like a beautiful woman: you should caress it gently, slowly, appreciate every curve and subtlety.", author: "Zino Davidoff", category: "cigar" },
  { id: 2, text: "Smoking is like everything else: if you do it, do it well.", author: "Unknown", category: "cigar" },
  { id: 3, text: "Sometimes a cigar is just a cigar.", author: "Sigmund Freud", category: "cigar" },
  { id: 4, text: "A cigar ought not to be smoked solely with the mouth, but with the hand, the eyes, and with the spirit.", author: "Zino Davidoff", category: "cigar" },
  { id: 5, text: "If I cannot smoke in heaven, then I shall not go.", author: "Mark Twain", category: "cigar" },
  { id: 6, text: "The cigar is the perfect complement to an elegant lifestyle.", author: "George Sand", category: "cigar" },
  { id: 7, text: "Cigars serve as a type of camaraderie, a shared experience.", author: "Unknown", category: "cigar" },
  { id: 8, text: "There's something about having a cigar. It forces you to slow down.", author: "Unknown", category: "cigar" },
  
  // Relaxation & Mindfulness
  { id: 9, text: "The time you enjoy wasting is not wasted time.", author: "Bertrand Russell", category: "relaxation" },
  { id: 10, text: "Rest is not idleness, and to lie sometimes on the grass under trees on a summer's day is by no means a waste of time.", author: "John Lubbock", category: "relaxation" },
  { id: 11, text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott", category: "relaxation" },
  { id: 12, text: "Take time to do what makes your soul happy.", author: "Unknown", category: "relaxation" },
  { id: 13, text: "Relax. Nothing is under control.", author: "Adi Da", category: "relaxation" },
  { id: 14, text: "The greatest weapon against stress is our ability to choose one thought over another.", author: "William James", category: "relaxation" },
  
  // The Good Life
  { id: 15, text: "Life is too short to drink bad wine... or smoke bad cigars.", author: "Unknown", category: "life" },
  { id: 16, text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln", category: "life" },
  { id: 17, text: "The purpose of life is to live it, to taste experience to the utmost.", author: "Eleanor Roosevelt", category: "life" },
  { id: 18, text: "Life should be savored, not rushed through.", author: "Unknown", category: "life" },
  { id: 19, text: "Do what you love and the rest will follow.", author: "Unknown", category: "life" },
  { id: 20, text: "It is not the length of life, but the depth.", author: "Ralph Waldo Emerson", category: "life" },
  
  // Community & Friendship
  { id: 21, text: "A friend is someone who knows all about you and still loves you.", author: "Elbert Hubbard", category: "community" },
  { id: 22, text: "Good friends and good smoke make for great times.", author: "Unknown", category: "community" },
  { id: 23, text: "We don't meet people by accident. They are meant to cross our path for a reason.", author: "Unknown", category: "community" },
  { id: 24, text: "The best conversations happen over a shared smoke.", author: "Unknown", category: "community" },
  { id: 25, text: "Alone we can do so little; together we can do so much.", author: "Helen Keller", category: "community" },
  
  // Friday & Weekend Vibes
  { id: 26, text: "It's Friday! Time to make stories for Monday.", author: "Unknown", category: "friday" },
  { id: 27, text: "Friday is my second favorite F word.", author: "Unknown", category: "friday" },
  { id: 28, text: "The weekend is here. Time to be a hero and rescue some good smokes.", author: "Unknown", category: "friday" },
  { id: 29, text: "Weekends don't count unless you spend them doing something completely pointless.", author: "Bill Watterson", category: "friday" },
  { id: 30, text: "It's always 5 o'clock somewhere.", author: "Jimmy Buffett", category: "friday" },
  
  // Philosophical
  { id: 31, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "philosophy" },
  { id: 32, text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", category: "philosophy" },
  { id: 33, text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "philosophy" },
  { id: 34, text: "The journey is the reward.", author: "Steve Jobs", category: "philosophy" },
  { id: 35, text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", category: "philosophy" },
  
  // Humor
  { id: 36, text: "I smoke in moderation. Only one cigar at a time.", author: "Mark Twain", category: "humor" },
  { id: 37, text: "My doctor told me to stop smoking. So I put the cigar in my mouth.", author: "Unknown", category: "humor" },
  { id: 38, text: "A day without a smoke is like... just kidding, I have no idea.", author: "Unknown", category: "humor" },
  { id: 39, text: "I tried to stop smoking. Worst five minutes of my life.", author: "Unknown", category: "humor" },
  { id: 40, text: "Smoke 'em if you got 'em.", author: "Military Saying", category: "humor" },
];

// Get deterministic quote of the day based on date
function getQuoteOfTheDay(): Quote {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % QUOTES.length;
  return QUOTES[index];
}

// Get random quote from a specific category
function getRandomQuote(category?: string): Quote {
  const filtered = category ? QUOTES.filter(q => q.category === category) : QUOTES;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  cigar: { label: 'Cigar Wisdom', emoji: '🚬', color: 'from-amber-500 to-orange-500' },
  relaxation: { label: 'Relaxation', emoji: '😌', color: 'from-blue-500 to-cyan-500' },
  life: { label: 'The Good Life', emoji: '✨', color: 'from-purple-500 to-pink-500' },
  community: { label: 'Community', emoji: '👥', color: 'from-green-500 to-emerald-500' },
  friday: { label: 'Weekend Vibes', emoji: '🎉', color: 'from-yellow-500 to-orange-500' },
  philosophy: { label: 'Wisdom', emoji: '🧠', color: 'from-indigo-500 to-purple-500' },
  humor: { label: 'Humor', emoji: '😂', color: 'from-rose-500 to-red-500' },
};

export default function QuotesPage() {
  const router = useRouter();
  const [quoteOfDay, setQuoteOfDay] = useState<Quote | null>(null);
  const [randomQuote, setRandomQuote] = useState<Quote | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setQuoteOfDay(getQuoteOfTheDay());
    setRandomQuote(getRandomQuote());
  }, []);

  const refreshQuote = (category?: string) => {
    setRandomQuote(getRandomQuote(category || undefined));
    setLiked(false);
    setShared(false);
  };

  const shareQuote = async (quote: Quote) => {
    const text = `"${quote.text}" — ${quote.author}\n\n🚬 via Puffed`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setShared(true);
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isFriday = new Date().getDay() === 5;
  const isWeekend = [0, 6].includes(new Date().getDay());

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-white">
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-lg">Smoke Quotes 💬</h1>
          <Link href="/dashboard" className="p-2 -mr-2 text-slate-400 hover:text-white">
            <FiBookOpen size={20} />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quote of the Day */}
        {quoteOfDay && (
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📜</span>
              <h2 className="font-bold text-amber-300">Quote of the Day</h2>
              <span className="ml-auto text-xs text-amber-400/70">{dayOfWeek}</span>
            </div>
            
            <blockquote className="text-xl text-white leading-relaxed mb-4">
              "{quoteOfDay.text}"
            </blockquote>
            
            <div className="flex items-center justify-between">
              <p className="text-amber-300 font-medium">— {quoteOfDay.author}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => shareQuote(quoteOfDay)}
                  className="p-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                >
                  <FiShare2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${CATEGORY_LABELS[quoteOfDay.category]?.color || 'from-slate-500 to-slate-600'} text-white`}>
                {CATEGORY_LABELS[quoteOfDay.category]?.emoji} {CATEGORY_LABELS[quoteOfDay.category]?.label}
              </span>
            </div>
          </div>
        )}

        {/* Weekend/Friday Special */}
        {(isFriday || isWeekend) && (
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/30">
            <p className="text-yellow-300 text-center">
              {isFriday ? "🎉 Happy Friday! Weekend vibes incoming..." : "🌴 Weekend mode activated!"}
            </p>
          </div>
        )}

        {/* Category Filters */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-300">Browse by Category</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedCategory(key === selectedCategory ? null : key);
                  refreshQuote(key === selectedCategory ? undefined : key);
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  selectedCategory === key
                    ? `bg-gradient-to-r ${color} text-white`
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Random Quote Card */}
        {randomQuote && (
          <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-300">
                {selectedCategory ? CATEGORY_LABELS[selectedCategory]?.label : 'Random Quote'}
              </h3>
              <button
                onClick={() => refreshQuote(selectedCategory || undefined)}
                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
              >
                <FiRefreshCw size={18} />
              </button>
            </div>
            
            <blockquote className="text-lg text-white leading-relaxed mb-4">
              "{randomQuote.text}"
            </blockquote>
            
            <div className="flex items-center justify-between">
              <p className="text-slate-400">— {randomQuote.author}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2 rounded-lg transition ${
                    liked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  <FiHeart size={18} fill={liked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => shareQuote(randomQuote)}
                  className={`p-2 rounded-lg transition ${
                    shared ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  <FiShare2 size={18} />
                </button>
              </div>
            </div>
            
            {shared && (
              <p className="text-green-400 text-sm mt-2 text-center">Copied to clipboard!</p>
            )}
          </div>
        )}

        {/* All Quotes by Category */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-200">📚 Full Collection</h3>
          
          {Object.entries(CATEGORY_LABELS).map(([categoryKey, { label, emoji, color }]) => (
            <details key={categoryKey} className="group bg-slate-800/40 rounded-xl overflow-hidden">
              <summary className={`cursor-pointer px-4 py-3 bg-gradient-to-r ${color} text-white font-medium flex items-center justify-between`}>
                <span>{emoji} {label}</span>
                <span className="text-white/70 text-sm">
                  {QUOTES.filter(q => q.category === categoryKey).length} quotes
                </span>
              </summary>
              <div className="p-4 space-y-3">
                {QUOTES.filter(q => q.category === categoryKey).map(quote => (
                  <div key={quote.id} className="p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-200 text-sm">"{quote.text}"</p>
                    <p className="text-slate-500 text-xs mt-1">— {quote.author}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>

        {/* Submit Quote CTA */}
        <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-slate-700">
          <FiMessageSquare className="mx-auto text-slate-400 mb-2" size={24} />
          <p className="text-slate-300 text-sm">Have a great quote to share?</p>
          <p className="text-slate-500 text-xs mt-1">Feature coming soon!</p>
        </div>

        {/* Back to Dashboard */}
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="block text-center py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
