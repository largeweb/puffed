'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FiArrowLeft, FiClock, FiCalendar, FiStar, FiHeart, 
  FiImage, FiTrendingUp, FiAward, FiShuffle 
} from 'react-icons/fi'

interface ThrowbackCheckin {
  id: number
  brand: string
  product: string | null
  rating: number
  review: string | null
  image_url: string | null
  category: string
  created_at: string
  likes: number
  username?: string
  user_id?: number
  avatar_url?: string | null
}

interface ThrowbackData {
  type: 'personal' | 'community'
  isThursday: boolean
  message: string
  throwbacks?: ThrowbackCheckin[] | {
    weekAgo: ThrowbackCheckin[]
    monthAgo: ThrowbackCheckin[]
    yearAgo: ThrowbackCheckin[]
    random: ThrowbackCheckin[]
  }
  stats?: {
    totalCheckins: number
    firstCheckin: string | null
    daysSinceFirst: number
    brandsTried: number
    avgRating: string | null
  }
}

export default function ThrowbackPage() {
  const router = useRouter()
  const [data, setData] = useState<ThrowbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'personal' | 'community'>('personal')

  useEffect(() => {
    fetchThrowbacks()
  }, [viewMode])

  const fetchThrowbacks = async () => {
    try {
      const url = viewMode === 'community' 
        ? '/api/throwback-thursday'
        : '/api/throwback-thursday?user_id=me'
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to load throwbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`
    if (days < 365) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`
    return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`
  }

  const renderCheckinCard = (checkin: ThrowbackCheckin, showUser = false) => (
    <Link 
      href={`/checkin/${checkin.id}`}
      key={checkin.id}
      className="block bg-gray-800/50 rounded-xl overflow-hidden border border-purple-500/20 hover:border-purple-400/40 transition-all hover:scale-[1.02]"
    >
      {checkin.image_url && (
        <div className="aspect-video relative">
          <img 
            src={checkin.image_url} 
            alt={checkin.brand}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg text-xs text-purple-300">
            {getTimeAgo(checkin.created_at)}
          </div>
        </div>
      )}
      <div className="p-4">
        {showUser && checkin.username && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs">
              {checkin.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-400">{checkin.username}</span>
          </div>
        )}
        <h3 className="font-bold text-white">{checkin.brand}</h3>
        {checkin.product && (
          <p className="text-sm text-gray-400">{checkin.product}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <FiStar 
                key={i} 
                className={`w-4 h-4 ${i < checkin.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <FiHeart className="w-4 h-4" /> {checkin.likes}
            </span>
          </div>
        </div>
        {checkin.review && (
          <p className="mt-2 text-sm text-gray-300 line-clamp-2 italic">"{checkin.review}"</p>
        )}
        {!checkin.image_url && (
          <p className="text-xs text-purple-400 mt-2">{formatDate(checkin.created_at)}</p>
        )}
      </div>
    </Link>
  )

  const renderSection = (title: string, icon: React.ReactNode, checkins: ThrowbackCheckin[], showUser = false) => {
    if (checkins.length === 0) return null
    
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checkins.map(c => renderCheckinCard(c, showUser))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 flex items-center justify-center">
        <div className="animate-pulse text-purple-400">Loading memories...</div>
      </div>
    )
  }

  const isThursday = data?.isThursday
  const personalThrowbacks = data?.type === 'personal' && data.throwbacks && 'weekAgo' in data.throwbacks
    ? data.throwbacks
    : null
  const communityThrowbacks = data?.type === 'community' && Array.isArray(data.throwbacks)
    ? data.throwbacks
    : null

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className={`p-4 ${isThursday ? 'bg-gradient-to-b from-purple-900/50 to-gray-900' : 'bg-gradient-to-b from-indigo-900/30 to-gray-900'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <FiArrowLeft className="w-6 h-6" />
            </button>
            <Link href="/dashboard" className="text-purple-400 text-sm">Dashboard</Link>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">
              {isThursday ? '🔙' : '📸'}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isThursday ? 'Throwback Thursday' : 'Memory Lane'}
            </h1>
            <p className="text-gray-400 mt-1">{data?.message}</p>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setViewMode('personal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'personal'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              My Memories
            </button>
            <button
              onClick={() => setViewMode('community')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'community'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Community
            </button>
          </div>

          {/* Personal Stats Banner */}
          {viewMode === 'personal' && data?.stats && data.stats.totalCheckins > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20 mb-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{data.stats.daysSinceFirst}</div>
                  <div className="text-xs text-gray-400">Days Smoking</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{data.stats.totalCheckins}</div>
                  <div className="text-xs text-gray-400">Total Smokes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{data.stats.brandsTried}</div>
                  <div className="text-xs text-gray-400">Brands Tried</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-pink-400">{data.stats.avgRating || '-'}</div>
                  <div className="text-xs text-gray-400">Avg Rating</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {viewMode === 'personal' && personalThrowbacks && (
          <>
            {renderSection('This Week Last Year', <FiCalendar className="text-pink-400" />, personalThrowbacks.yearAgo)}
            {renderSection('One Month Ago', <FiClock className="text-blue-400" />, personalThrowbacks.monthAgo)}
            {renderSection('Last Week', <FiTrendingUp className="text-green-400" />, personalThrowbacks.weekAgo)}
            {renderSection('Random Memories', <FiShuffle className="text-purple-400" />, personalThrowbacks.random)}
            
            {personalThrowbacks.weekAgo.length === 0 && 
             personalThrowbacks.monthAgo.length === 0 && 
             personalThrowbacks.yearAgo.length === 0 &&
             personalThrowbacks.random.length === 0 && (
              <div className="text-center py-12">
                <FiImage className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No memories yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Keep logging smokes to build your memory bank!
                </p>
                <Link 
                  href="/checkin/new"
                  className="inline-block mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                >
                  Log a Smoke
                </Link>
              </div>
            )}
          </>
        )}

        {viewMode === 'community' && communityThrowbacks && (
          <>
            {communityThrowbacks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {communityThrowbacks.map(c => renderCheckinCard(c, true))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiImage className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No community throwbacks yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Check back as the community grows!
                </p>
              </div>
            )}
          </>
        )}

        {/* Thursday Special Message */}
        {isThursday && (
          <div className="mt-8 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/20 text-center">
            <p className="text-purple-300">
              🎉 Happy Throwback Thursday! Share your favorite smoking memories with the community.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
