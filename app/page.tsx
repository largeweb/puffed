"use client";

import { motion } from "framer-motion";
import { FiCamera, FiAward, FiMapPin, FiUsers, FiStar, FiClock } from "react-icons/fi";
import { useState } from "react";

// Smoke particle component
function SmokeParticle({ delay, left }: { delay: number; left: string }) {
  return (
    <motion.div
      className="absolute w-4 h-4 rounded-full bg-gray-400/20 blur-xl"
      style={{ left, bottom: "30%" }}
      initial={{ opacity: 0, y: 0, scale: 1 }}
      animate={{ 
        opacity: [0, 0.4, 0],
        y: -150,
        scale: [1, 2, 2.5],
      }}
      transition={{
        duration: 5,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// Feature card
function FeatureCard({ icon: Icon, title, description, delay }: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Hook up to D1 database
    console.log("Email submitted:", email);
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20">
        {/* Smoke particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <SmokeParticle delay={0} left="20%" />
          <SmokeParticle delay={1} left="50%" />
          <SmokeParticle delay={2} left="75%" />
          <SmokeParticle delay={0.5} left="35%" />
          <SmokeParticle delay={1.5} left="60%" />
        </div>

        {/* Ember glow behind logo */}
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-amber-500/10 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mb-6"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center ember-glow">
            <span className="text-4xl md:text-5xl">🚬</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold text-center mb-4 z-10"
        >
          <span className="text-white">Puffed</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-gray-400 text-center mb-2 z-10"
        >
          Track Your Smoke
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-lg text-gray-500 text-center max-w-md mb-10 z-10 px-4"
        >
          The social app for cigar and tobacco enthusiasts. Log, rate, discover, and share.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="z-10 w-full max-w-sm px-4"
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all text-base"
              />
              <button
                type="submit"
                className="w-full px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base btn-glow transition-all active:scale-95"
              >
                Join the Waitlist
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 px-6 rounded-xl bg-green-500/20 border border-green-500/30"
            >
              <p className="text-green-400 font-medium">🎉 You&apos;re on the list!</p>
              <p className="text-gray-400 text-sm mt-1">We&apos;ll notify you when we launch.</p>
            </motion.div>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-gray-600 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 rounded-full bg-gray-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Track your journey, discover new favorites, and connect with fellow enthusiasts.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={FiCamera}
            title="Smoke Journal"
            description="Log every cigar with photos, tasting notes, and ratings. Build your personal collection history."
            delay={0}
          />
          <FeatureCard
            icon={FiAward}
            title="Badges & Stats"
            description="Unlock achievements for trying new brands, regions, and styles. Track your smoking stats."
            delay={0.1}
          />
          <FeatureCard
            icon={FiMapPin}
            title="Lounge Finder"
            description="Discover cigar lounges, tobacco shops, and smoking-friendly venues near you."
            delay={0.2}
          />
          <FeatureCard
            icon={FiUsers}
            title="Social Feed"
            description="See what friends are smoking. Share your experiences and get recommendations."
            delay={0.3}
          />
          <FeatureCard
            icon={FiStar}
            title="Smart Recs"
            description="Get personalized recommendations based on your taste profile and ratings."
            delay={0.4}
          />
          <FeatureCard
            icon={FiClock}
            title="Humidor Tracker"
            description="Manage your collection with aging timers, humidity logs, and inventory counts."
            delay={0.5}
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent to-black/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              { num: "1", title: "Check In", desc: "Scan or search for your cigar and log your smoke session" },
              { num: "2", title: "Rate & Review", desc: "Rate flavor, draw, burn, and aroma. Add tasting notes." },
              { num: "3", title: "Discover", desc: "Get recommendations and find new favorites based on your taste" },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-5"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl font-bold shrink-0">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                  <p className="text-gray-400">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Track Your Journey?
          </h2>
          <p className="text-gray-400 mb-8">
            Join the waitlist and be the first to know when we launch.
          </p>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all text-base"
              />
              <button
                type="submit"
                className="w-full px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base btn-glow transition-all active:scale-95"
              >
                Join the Waitlist
              </button>
            </form>
          ) : (
            <div className="py-4 px-6 rounded-xl bg-green-500/20 border border-green-500/30">
              <p className="text-green-400 font-medium">🎉 You&apos;re on the list!</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚬</span>
            <span className="font-semibold">Puffed</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Puffed. For tobacco enthusiasts 21+.
          </p>
        </div>
      </footer>
    </main>
  );
}
