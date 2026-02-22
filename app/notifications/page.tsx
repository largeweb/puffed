"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiHeart, FiUserPlus, FiMessageCircle, FiCheck, FiBell, FiStar } from "react-icons/fi";
import Link from "next/link";
import type { Notification, NotificationsResponse, MeResponse } from "@/lib/types";

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function NotificationIcon({ type, emoji }: { type: string; emoji?: string }) {
  switch (type) {
    case 'like':
      return <FiHeart className="text-red-400" />;
    case 'follow':
      return <FiUserPlus className="text-blue-400" />;
    case 'comment':
      return <FiMessageCircle className="text-amber-400" />;
    case 'featured':
      return <FiStar className="text-yellow-400" />;
    case 'reaction':
      return <span className="text-xl">{emoji || '🔥'}</span>;
    default:
      return <FiBell className="text-gray-400" />;
  }
}

function NotificationCard({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: string) => void }) {
  const date = new Date(notification.created_at * 1000);
  const timeAgo = getTimeAgo(date);

  const getMessage = () => {
    switch (notification.type) {
      case 'like':
        return (
          <>
            <Link href={`/user/${notification.from_username}`} className="font-semibold hover:text-amber-500">
              @{notification.from_username}
            </Link>
            {" liked your check-in"}
            {notification.checkin_brand && (
              <span className="text-gray-400"> on {notification.checkin_brand}</span>
            )}
          </>
        );
      case 'follow':
        return (
          <>
            <Link href={`/user/${notification.from_username}`} className="font-semibold hover:text-amber-500">
              @{notification.from_username}
            </Link>
            {" started following you"}
          </>
        );
      case 'comment':
        return (
          <>
            <Link href={`/user/${notification.from_username}`} className="font-semibold hover:text-amber-500">
              @{notification.from_username}
            </Link>
            {" commented on your check-in"}
            {notification.comment_text && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">"{notification.comment_text}"</p>
            )}
          </>
        );
      case 'featured':
        return (
          <>
            <span className="font-semibold text-yellow-400">⭐ Your check-in was featured!</span>
            {notification.checkin_brand && (
              <span className="text-gray-400"> Your {notification.checkin_brand} check-in is today's Featured Smoke on Discover!</span>
            )}
          </>
        );
      case 'reaction':
        return (
          <>
            <Link href={`/user/${notification.from_username}`} className="font-semibold hover:text-amber-500">
              @{notification.from_username}
            </Link>
            {" reacted "}
            <span className="text-lg">{notification.reaction_emoji || '🔥'}</span>
            {" to your check-in"}
            {notification.checkin_brand && (
              <span className="text-gray-400"> on {notification.checkin_brand}</span>
            )}
          </>
        );
      default:
        return "New notification";
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`glass rounded-xl p-4 cursor-pointer transition-all ${
        !notification.read ? 'border-l-4 border-amber-500 bg-amber-500/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
          <NotificationIcon type={notification.type} emoji={notification.reaction_emoji} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{getMessage()}</p>
          <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        // Check auth
        const authRes = await fetch("/api/auth/me");
        const authData: MeResponse = await authRes.json();
        
        if (!authData.user) {
          router.push("/login");
          return;
        }

        // Load notifications
        const notifRes = await fetch("/api/notifications");
        const notifData: NotificationsResponse = await notifRes.json();
        setNotifications(notifData.notifications || []);
      } catch (error) {
        console.error("Load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Mark read error:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Mark all read error:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-amber-500">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-all disabled:opacity-50"
            >
              <FiCheck size={16} />
              Mark all read
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-400"
          >
            <FiBell size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No notifications yet</p>
            <p className="text-sm mt-1">When someone likes, follows, or comments, you'll see it here</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NotificationCard
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
