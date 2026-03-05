'use client';

import Link from 'next/link';
import { changelog, getUpdatesByMonth, Update } from '@/lib/changelog';

export default function UpdatesPage() {
  const updatesByMonth = getUpdatesByMonth();
  const months = Object.keys(updatesByMonth);
  
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'fix':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'improvement':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'announcement':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feature': return '✨ New Feature';
      case 'fix': return '🔧 Fix';
      case 'improvement': return '⬆️ Improvement';
      case 'announcement': return '📢 Announcement';
      default: return type;
    }
  };
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500 text-white';
      case 'deploying':
        return 'bg-yellow-500 text-black animate-pulse';
      case 'coming-soon':
        return 'bg-blue-500 text-white';
      case 'in-progress':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-zinc-500 text-white';
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Stats
  const totalFeatures = changelog.filter(u => u.type === 'feature').length;
  const totalFixes = changelog.filter(u => u.type === 'fix').length;
  const liveCount = changelog.filter(u => u.status === 'live').length;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900/20 via-zinc-900 to-zinc-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-400 mb-2">📋 Updates</h1>
          <p className="text-zinc-400">What&apos;s new in Puffed</p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{totalFeatures}</div>
            <div className="text-xs text-zinc-400">Features</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalFixes}</div>
            <div className="text-xs text-zinc-400">Fixes</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{liveCount}</div>
            <div className="text-xs text-zinc-400">Live Now</div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="bg-zinc-800/30 rounded-xl p-4 mb-6">
          <div className="text-sm text-zinc-400 mb-2">Status Guide:</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded text-xs bg-green-500 text-white">Live</span>
            <span className="px-2 py-1 rounded text-xs bg-yellow-500 text-black">Deploying</span>
            <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">Coming Soon</span>
            <span className="px-2 py-1 rounded text-xs bg-orange-500 text-white">In Progress</span>
          </div>
        </div>

        {/* Updates by Month */}
        {months.map((month) => (
          <div key={month} className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 sticky top-0 bg-zinc-900/90 py-2 backdrop-blur-sm">
              {month}
            </h2>
            
            <div className="space-y-4">
              {updatesByMonth[month].map((update, index) => (
                <div 
                  key={`${update.date}-${index}`}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="text-3xl flex-shrink-0">
                      {update.icon || '📦'}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white">{update.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(update.status)}`}>
                          {update.status}
                        </span>
                      </div>
                      
                      <p className="text-zinc-300 text-sm mb-2">{update.description}</p>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-0.5 rounded border ${getTypeStyle(update.type)}`}>
                          {getTypeLabel(update.type)}
                        </span>
                        <span className="text-zinc-500">{formatDate(update.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Footer */}
        <div className="bg-zinc-800/30 rounded-xl p-6 text-center">
          <p className="text-zinc-400 mb-2">
            Have feedback or feature requests?
          </p>
          <p className="text-sm text-zinc-500">
            We&apos;re always improving! Your input helps shape Puffed.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
