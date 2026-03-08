"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseSidebarReturn {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentUser: string | undefined;
  unreadCount: number;
  handleLogout: () => Promise<void>;
}

/**
 * Hook to manage sidebar state for pages
 * 
 * Usage:
 * ```tsx
 * const { sidebarOpen, setSidebarOpen, currentUser, unreadCount, handleLogout } = useSidebar();
 * 
 * return (
 *   <>
 *     <MobileSidebar
 *       isOpen={sidebarOpen}
 *       onClose={() => setSidebarOpen(false)}
 *       username={currentUser}
 *       unreadCount={unreadCount}
 *       onLogout={handleLogout}
 *     />
 *     <main>
 *       <button onClick={() => setSidebarOpen(true)}>
 *         <FiMenu />
 *       </button>
 *       ...
 *     </main>
 *   </>
 * );
 * ```
 */
export function useSidebar(): UseSidebarReturn {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data: { user?: { username: string } } = await res.json();
          setCurrentUser(data.user?.username);
          
          // Load notification count
          const notifRes = await fetch("/api/notifications/count");
          if (notifRes.ok) {
            const notifData: { count?: number } = await notifRes.json();
            setUnreadCount(notifData.count || 0);
          }
        }
      } catch {
        // Ignore errors - user just isn't logged in
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return {
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    unreadCount,
    handleLogout,
  };
}
