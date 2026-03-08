"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import MobileSidebar from "@/app/components/MobileSidebar";

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
  requireAuth?: boolean;
  className?: string;
}

interface UserData {
  username: string;
}

/**
 * PageWrapper - Consistent page layout with MobileSidebar
 * 
 * Use this on all authenticated pages to ensure consistent navigation.
 * 
 * Props:
 * - title: Page title shown in header
 * - showBackButton: Show back arrow instead of menu (default: false)
 * - backHref: Custom back URL (default: /dashboard)
 * - requireAuth: Redirect to login if not authenticated (default: false)
 * - className: Additional classes for main content
 */
export default function PageWrapper({
  children,
  title,
  showBackButton = false,
  backHref = "/dashboard",
  requireAuth = false,
  className = "",
}: PageWrapperProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data: { user?: UserData } = await res.json();
          if (data.user) {
            setUser(data.user);
            // Fetch unread notifications
            const notifRes = await fetch("/api/notifications/count");
            if (notifRes.ok) {
              const notifData: { count?: number } = await notifRes.json();
              setUnreadCount(notifData.count || 0);
            }
          } else if (requireAuth) {
            router.push("/login");
          }
        } else if (requireAuth) {
          router.push("/login");
        }
      } catch {
        if (requireAuth) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requireAuth, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading && requireAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={user?.username}
        unreadCount={unreadCount}
        onLogout={handleLogout}
      />

      {/* Header with hamburger menu */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => showBackButton ? router.push(backHref) : setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={showBackButton ? "Go back" : "Open menu"}
          >
            {showBackButton ? (
              <span className="text-xl">←</span>
            ) : (
              <FiMenu size={24} className="text-white" />
            )}
          </button>
          
          {title && (
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          )}
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main content */}
      <main className={`min-h-screen ${className}`}>
        {children}
      </main>
    </>
  );
}
