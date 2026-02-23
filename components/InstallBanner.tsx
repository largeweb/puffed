"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiX, FiSmartphone } from "react-icons/fi";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return; // Already installed as PWA
    }

    // Check if dismissed recently (24 hours)
    const dismissed = localStorage.getItem("puffed_install_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return; // Dismissed within 24 hours
      }
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show banner after a delay (since there's no install prompt API)
    if (isIOSDevice) {
      // Check if running in Safari (not already in standalone mode or other browser)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // For Android/Desktop Chrome, listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000); // Show after 2s
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setShowBanner(false);
      }
    } catch (error) {
      console.error("Install error:", error);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("puffed_install_dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && !showIOSGuide && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-4 shadow-xl border border-amber-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-black/20 rounded-xl">
                  <FiSmartphone className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm">Install Puffed</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Add to home screen for quick access & a better experience
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleInstall}
                      disabled={installing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-black/30 hover:bg-black/40 rounded-lg text-white text-sm font-medium transition-all"
                    >
                      {installing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <FiDownload size={14} />
                      )}
                      {isIOS ? "How to Install" : "Install"}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 text-white/70 hover:text-white text-sm transition-all"
                    >
                      Not now
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-lg hover:bg-black/20 text-white/70 hover:text-white transition-all"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Guide Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#1a1a1a] rounded-t-3xl p-6 pb-10"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 bg-white/20 rounded-full" />
              </div>
              
              <h3 className="text-xl font-bold text-center mb-6">
                Install Puffed on iPhone
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Tap the Share button</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Look for <span className="inline-flex items-center px-2 py-0.5 bg-white/10 rounded text-xs">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M15 8a1 1 0 01-1 1h-1v1a1 1 0 11-2 0V9H9a1 1 0 010-2h2V6a1 1 0 112 0v1h1a1 1 0 011 1z"/>
                          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd"/>
                        </svg>
                        Share
                      </span> at the bottom of Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Scroll down & tap "Add to Home Screen"</p>
                    <p className="text-sm text-gray-400 mt-1">
                      You might need to scroll the share sheet
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Tap "Add"</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Puffed will appear on your home screen! 🎉
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
