'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiAward, FiCheck, FiX, FiHelpCircle, FiTrendingUp, FiUsers } from 'react-icons/fi';

interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correct?: number;
  fact?: string;
}

interface UserAnswer {
  answerIndex: number;
  isCorrect: boolean;
  answeredAt: number;
}

interface TodayStats {
  totalAnswers: number;
  correctAnswers: number;
  correctRate: number;
}

interface UserStats {
  totalPlayed: number;
  totalCorrect: number;
  accuracy: number;
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  avatarUrl: string | null;
  totalPlayed: number;
  totalCorrect: number;
  accuracy: number;
}

interface TriviaData {
  question: TriviaQuestion;
  dateKey: string;
  userAnswer?: UserAnswer;
  todayStats: TodayStats;
  userStats?: UserStats;
  leaderboard: LeaderboardEntry[];
}

export default function TriviaPage() {
  const [data, setData] = useState<TriviaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; fact: string } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'play' | 'leaderboard'>('play');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        const uid = authData.user?.id || null;
        setUserId(uid);

        const url = uid ? `/api/trivia?userId=${uid}` : '/api/trivia';
        const res = await fetch(url);
        const triviaData = await res.json();
        setData(triviaData);

        if (triviaData.userAnswer) {
          setSelectedAnswer(triviaData.userAnswer.answerIndex);
          setResult({
            correct: triviaData.userAnswer.isCorrect,
            fact: triviaData.question.fact || ''
          });
        }
      } catch (error) {
        console.error('Failed to load trivia:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const submitAnswer = async (answerIndex: number) => {
    if (!userId || result) return;

    setSelectedAnswer(answerIndex);
    setSubmitting(true);

    try {
      const res = await fetch('/api/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answerIndex })
      });
      const resData = await res.json();

      if (res.ok) {
        setResult({
          correct: resData.correct,
          fact: resData.fact
        });
        if (data) {
          setData({
            ...data,
            question: {
              ...data.question,
              correct: resData.correctAnswer
            },
            todayStats: resData.todayStats
          });
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-purple-300">Loading trivia...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900 p-4">
        <p className="text-red-400">Failed to load trivia</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900">
      <header className="sticky top-0 z-10 bg-purple-900/90 backdrop-blur border-b border-purple-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-purple-800/50 rounded-lg transition-colors">
              <FiArrowLeft className="text-purple-300" />
            </Link>
            <div>
              <h1 className="font-bold text-white flex items-center gap-2">
                <FiHelpCircle className="text-purple-400" />
                Daily Trivia
              </h1>
              <p className="text-xs text-purple-400">{data.dateKey}</p>
            </div>
          </div>
          {data.userStats && (
            <div className="text-right">
              <p className="text-sm font-medium text-purple-200">{data.userStats.totalCorrect}/{data.userStats.totalPlayed}</p>
              <p className="text-xs text-purple-400">{data.userStats.accuracy}% accuracy</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex gap-2 bg-purple-800/30 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('play')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'play'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-purple-300 hover:text-white hover:bg-purple-700/50'
            }`}
          >
            <FiHelpCircle size={16} />
            Today&apos;s Question
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-purple-300 hover:text-white hover:bg-purple-700/50'
            }`}
          >
            <FiAward size={16} />
            Leaderboard
          </button>
        </div>

        {activeTab === 'play' ? (
          <>
            <div className="bg-gradient-to-br from-purple-800/50 to-indigo-800/50 rounded-2xl p-6 border border-purple-600/30 shadow-xl">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <FiHelpCircle className="text-white text-lg" />
                </div>
                <h2 className="text-lg font-medium text-white leading-relaxed">
                  {data.question.question}
                </h2>
              </div>

              <div className="space-y-3">
                {data.question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = data.question.correct === index;
                  const showResult = result !== null;

                  let buttonClass = 'w-full p-4 rounded-xl text-left transition-all border-2 ';
                  
                  if (showResult) {
                    if (isCorrect) {
                      buttonClass += 'bg-green-500/20 border-green-500 text-green-100';
                    } else if (isSelected && !result.correct) {
                      buttonClass += 'bg-red-500/20 border-red-500 text-red-100';
                    } else {
                      buttonClass += 'bg-purple-800/30 border-purple-700/30 text-purple-300 opacity-50';
                    }
                  } else if (isSelected) {
                    buttonClass += 'bg-purple-600 border-purple-500 text-white';
                  } else {
                    buttonClass += 'bg-purple-800/30 border-purple-700/50 text-purple-100 hover:bg-purple-700/50 hover:border-purple-600';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => !result && !submitting && submitAnswer(index)}
                      disabled={!!result || submitting || !userId}
                      className={buttonClass}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-purple-700/50 flex items-center justify-center text-sm font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                        </span>
                        {showResult && isCorrect && (
                          <FiCheck className="text-green-400 text-xl" />
                        )}
                        {showResult && isSelected && !result.correct && (
                          <FiX className="text-red-400 text-xl" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!userId && (
                <p className="mt-4 text-center text-purple-400 text-sm">
                  <Link href="/login" className="text-purple-300 underline hover:text-white">Log in</Link> to play!
                </p>
              )}
            </div>

            {result && (
              <div className={`rounded-2xl p-5 border ${
                result.correct 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.correct ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <FiCheck className="text-white text-xl" />
                      </div>
                      <span className="text-green-400 font-bold text-lg">Correct! 🎉</span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                        <FiX className="text-white text-xl" />
                      </div>
                      <span className="text-amber-400 font-bold text-lg">Not quite!</span>
                    </>
                  )}
                </div>
                <p className="text-purple-200 text-sm leading-relaxed">
                  <strong className="text-purple-100">Fun fact:</strong> {result.fact}
                </p>
              </div>
            )}

            <div className="bg-purple-800/30 rounded-xl p-4 border border-purple-700/30">
              <h3 className="text-purple-300 text-sm font-medium mb-3 flex items-center gap-2">
                <FiUsers size={14} />
                Today&apos;s Community Stats
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{data.todayStats.totalAnswers}</p>
                  <p className="text-xs text-purple-400">Played</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{data.todayStats.correctAnswers}</p>
                  <p className="text-xs text-purple-400">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-300">{data.todayStats.correctRate}%</p>
                  <p className="text-xs text-purple-400">Success Rate</p>
                </div>
              </div>
            </div>

            {result && (
              <div className="text-center py-4">
                <p className="text-purple-400 text-sm">
                  Come back tomorrow for a new question! 🧠
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-800/50 to-indigo-800/50 rounded-2xl p-4 border border-purple-600/30">
              <h3 className="text-purple-200 font-medium mb-4 flex items-center gap-2">
                <FiTrendingUp className="text-purple-400" />
                Trivia Masters
              </h3>

              {data.leaderboard.length === 0 ? (
                <p className="text-purple-400 text-center py-8">
                  No answers yet. Be the first! 🏆
                </p>
              ) : (
                <div className="space-y-3">
                  {data.leaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                        index === 2 ? 'bg-amber-600/10 border border-amber-600/30' :
                        'bg-purple-800/30 border border-purple-700/20'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-yellow-900' :
                        index === 1 ? 'bg-gray-400 text-gray-900' :
                        index === 2 ? 'bg-amber-600 text-amber-100' :
                        'bg-purple-700 text-purple-200'
                      }`}>
                        {index + 1}
                      </div>
                      <Link href={`/user/${entry.username}`} className="flex-1 hover:opacity-80 transition-opacity">
                        <p className="font-medium text-white">{entry.username}</p>
                        <p className="text-xs text-purple-400">
                          {entry.totalCorrect} correct • {entry.accuracy}% accuracy
                        </p>
                      </Link>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-200">{entry.totalCorrect}</p>
                        <p className="text-xs text-purple-400">/{entry.totalPlayed}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
