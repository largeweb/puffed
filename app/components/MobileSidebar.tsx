"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FiX, FiCompass, FiSearch, FiUsers, FiRss, FiLayers, FiBookmark, 
  FiZap, FiBarChart2, FiCalendar, FiAward, FiActivity, FiCamera,
  FiShare2, FiBell, FiSettings, FiLogOut, FiHome, FiTarget
} from "react-icons/fi";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  unreadCount?: number;
  onLogout: () => void;
}

const navGroups = [
  {
    title: "Discover",
    items: [
      { href: "/dashboard", icon: <FiHome size={20} />, label: "Home", color: "text-amber-400" },
      { href: "/discover", icon: <FiCompass size={20} />, label: "Discover Feed", color: "text-white" },
      { href: "/search", icon: <FiSearch size={20} />, label: "Search", color: "text-white" },
      { href: "/gallery", icon: <FiCamera size={20} />, label: "Photo Gallery", color: "text-pink-400" },
    ]
  },
  {
    title: "Social",
    items: [
      { href: "/people", icon: <FiUsers size={20} />, label: "Find People", color: "text-pink-400" },
      { href: "/twins", icon: <span>👯</span>, label: "Smoke Time Twins", color: "text-cyan-400" },
      { href: "/following", icon: <FiRss size={20} />, label: "Following Feed", color: "text-cyan-400" },
      { href: "/leaderboard", icon: <FiAward size={20} />, label: "Leaderboard", color: "text-amber-500" },
      { href: "/council", icon: <span>🏛️</span>, label: "Smoke Council", color: "text-amber-400" },
      { href: "/weekly-recap", icon: <span>📊</span>, label: "Weekly Recap", color: "text-purple-400" },
      { href: "/smoke-score", icon: <span>🎯</span>, label: "Smoke Score", color: "text-cyan-400" },
      { href: "/invite", icon: <FiShare2 size={20} />, label: "Invite Friends", color: "text-green-400" },
    ]
  },
  {
    title: "Tools",
    items: [
      { href: "/weather", icon: <span>🌤️</span>, label: "Smoke Weather", color: "text-cyan-400" },
      { href: "/tier-list", icon: <span>🎮</span>, label: "Brand Tier List", color: "text-pink-400" },
      { href: "/tonight", icon: <span>🌙</span>, label: "Tonight's Pick", color: "text-indigo-400" },
      { href: "/mood-match", icon: <span>🎯</span>, label: "Mood Match", color: "text-pink-400" },
      { href: "/pairing-guide", icon: <span>🥃</span>, label: "Pairing Guide", color: "text-purple-400" },
      { href: "/compare", icon: <FiLayers size={20} />, label: "Compare Brands", color: "text-green-400" },
      { href: "/wishlist", icon: <FiBookmark size={20} />, label: "Want to Try", color: "text-pink-400" },
      { href: "/suggest", icon: <FiZap size={20} />, label: "What to Smoke?", color: "text-purple-400" },
      { href: "/roulette", icon: <span>🎰</span>, label: "Smoke Roulette", color: "text-fuchsia-400" },
      { href: "/arcade", icon: <span>🕹️</span>, label: "Smoke Arcade", color: "text-cyan-400" },
      { href: "/march-madness", icon: <span>🏀</span>, label: "March Madness", color: "text-orange-400" },
      { href: "/slots", icon: <span>💰</span>, label: "Cigar Slots", color: "text-yellow-400" },
    ]
  },
  {
    title: "Your Stats",
    items: [
      { href: "/morning-brief", icon: <span>📰</span>, label: "Morning Brief", color: "text-amber-400" },
      { href: "/weekend-kickoff", icon: <span>🎊</span>, label: "Weekend Kickoff", color: "text-green-400" },
      { href: "/mystats", icon: <FiBarChart2 size={20} />, label: "My Stats", color: "text-cyan-400" },
      { href: "/smoke-oclock", icon: <span>🕐</span>, label: "Smoke O'Clock", color: "text-amber-400" },
      { href: "/records", icon: <span>🏆</span>, label: "Personal Records", color: "text-yellow-400" },
      { href: "/personal-bests", icon: <span>🥇</span>, label: "Personal Bests", color: "text-yellow-400" },
      { href: "/milestones", icon: <FiTarget size={20} />, label: "Milestones", color: "text-orange-400" },
      { href: "/awards", icon: <span>🏅</span>, label: "Weekly Awards", color: "text-amber-400" },
      { href: "/personality", icon: <span>🔮</span>, label: "Smoke Personality", color: "text-purple-400" },
      { href: "/horoscope", icon: <span>⭐</span>, label: "Smoke Horoscope", color: "text-yellow-400" },
      { href: "/fortune", icon: <span>✨</span>, label: "Smoke Fortune", color: "text-violet-400" },
      { href: "/oracle", icon: <span>👁️</span>, label: "The Oracle", color: "text-violet-400" },
      { href: "/flavor-dna", icon: <span>🧬</span>, label: "Flavor DNA", color: "text-purple-400" },
      { href: "/calendar", icon: <FiCalendar size={20} />, label: "Smoke Calendar", color: "text-emerald-400" },
    ]
  },
  {
    title: "Community",
    items: [
      { href: "/conversations", icon: <span>💬</span>, label: "Hot Conversations", color: "text-cyan-400" },
      { href: "/friday-night-live", icon: <span>🔴</span>, label: "Friday Night Live", color: "text-rose-400" },
      { href: "/last-puff", icon: <span>🌙</span>, label: "Last Puff Club", color: "text-purple-400" },
      { href: "/pulse", icon: <FiActivity size={20} />, label: "Platform Pulse", color: "text-pink-500" },
      { href: "/weekend-recap", icon: <span>📊</span>, label: "Weekend Recap", color: "text-violet-400" },
      { href: "/radio", icon: <span>📻</span>, label: "Smoke Radio", color: "text-fuchsia-400" },
      { href: "/observatory", icon: <span>🔭</span>, label: "The Observatory", color: "text-purple-400" },
      { href: "/saturday-night", icon: <span>💜</span>, label: "Saturday Night Social", color: "text-fuchsia-400" },
      { href: "/bonfire", icon: <span>🔥</span>, label: "The Bonfire", color: "text-orange-400" },
      { href: "/patio", icon: <span>🪴</span>, label: "The Patio", color: "text-emerald-400" },
      { href: "/rooftop", icon: <span>🌃</span>, label: "The Rooftop", color: "text-indigo-400" },
      { href: "/late-show", icon: <span>🎬</span>, label: "The Late Show", color: "text-amber-400" },
      { href: "/after-party", icon: <span>🎊</span>, label: "The After Party", color: "text-fuchsia-400" },
      { href: "/last-call", icon: <span>🍻</span>, label: "Last Call", color: "text-amber-400" },
      { href: "/witching-hour", icon: <span>🔮</span>, label: "Witching Hour", color: "text-purple-400" },
      { href: "/insomniacs", icon: <span>🌀</span>, label: "Insomniac's Club", color: "text-pink-400" },
      { href: "/sunday-sanctuary", icon: <span>🕊️</span>, label: "Sunday Sanctuary", color: "text-purple-400" },
      { href: "/sunday-sunrise", icon: <span>🌅</span>, label: "Sunday Sunrise", color: "text-amber-400" },
      { href: "/sunday-paper", icon: <span>📰</span>, label: "Sunday Paper", color: "text-stone-400" },
      { href: "/brunch", icon: <span>🥂</span>, label: "Sunday Brunch", color: "text-rose-400" },
      { href: "/new-month", icon: <span>🗓️</span>, label: "New Month Reset", color: "text-teal-400" },
      { href: "/poker-night", icon: <span>🃏</span>, label: "Poker Night", color: "text-emerald-400" },
      { href: "/speakeasy", icon: <span>🗝️</span>, label: "The Speakeasy", color: "text-amber-400" },
      { href: "/graveyard-shift", icon: <span>💀</span>, label: "Graveyard Shift", color: "text-gray-400" },
      { href: "/saturday-cartoons", icon: <span>📺</span>, label: "Saturday Cartoons", color: "text-yellow-400" },
      { href: "/backyard-bbq", icon: <span>🍖</span>, label: "Backyard BBQ", color: "text-amber-400" },
      { href: "/hammock", icon: <span>🏖️</span>, label: "The Hammock", color: "text-teal-400" },
      { href: "/the-deck", icon: <span>🪑</span>, label: "The Deck", color: "text-amber-400" },
      { href: "/sports-den", icon: <span>🏈</span>, label: "The Sports Den", color: "text-green-400" },
      { href: "/weekend-scoreboard", icon: <span>🏆</span>, label: "Weekend Scoreboard", color: "text-amber-400" },
      { href: "/wake-bake", icon: <span>🌞</span>, label: "Wake & Bake", color: "text-orange-400" },
      { href: "/cinema", icon: <span>🎬</span>, label: "Smoke Cinema", color: "text-amber-400" },
      { href: "/share", icon: <span>📸</span>, label: "Share Your Week", color: "text-amber-400" },
    ]
  },
];

export default function MobileSidebar({ isOpen, onClose, username, unreadCount = 0, onLogout }: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 md:hidden"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-[#0d0d0d] border-r border-white/10 z-50 flex flex-col md:hidden"
            style={{ height: '100dvh' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0d0d0d] p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-lg">🚬</span>
                </div>
                <div>
                  <h2 className="font-semibold">Puffed</h2>
                  {username && <p className="text-xs text-gray-400">@{username}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Nav Groups - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              {navGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all ${item.color}`}
                      >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Settings & Account */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Account
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/notifications"
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-white"
                  >
                    <FiBell size={20} />
                    <span className="text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-white"
                  >
                    <FiSettings size={20} />
                    <span className="text-sm">Settings</span>
                  </Link>
                  <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-all text-red-400"
                  >
                    <FiLogOut size={20} />
                    <span className="text-sm">Log Out</span>
                  </button>
                </div>
              </div>

              {/* Bottom safe area spacer for iOS PWA */}
              <div className="h-20 flex-shrink-0" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
