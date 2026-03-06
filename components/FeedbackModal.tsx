"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMessageSquare, FiHelpCircle, FiSend, FiCheck } from 'react-icons/fi';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'support' | 'feedback';
}

const categories = {
  support: [
    { id: 'bug', label: '🐛 Bug Report', description: 'Something isn\'t working right' },
    { id: 'account', label: '👤 Account Issue', description: 'Login, profile, or settings problem' },
    { id: 'other', label: '❓ Other', description: 'General question or issue' },
  ],
  feedback: [
    { id: 'feature', label: '💡 Feature Request', description: 'Suggest something new' },
    { id: 'improvement', label: '✨ Improvement', description: 'Make something better' },
    { id: 'content', label: '🚬 Cigar Data', description: 'Missing brand, wrong info, etc.' },
    { id: 'other', label: '💬 General', description: 'Anything else on your mind' },
  ],
};

export default function FeedbackModal({ isOpen, onClose, defaultType = 'feedback' }: FeedbackModalProps) {
  const [type, setType] = useState<'support' | 'feedback'>(defaultType);
  const [category, setCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setCategory('');
      setSubject('');
      setMessage('');
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: category || null,
          subject: subject.trim() || null,
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">
              {type === 'support' ? '🆘 Get Help' : '💬 Share Feedback'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {submitted ? (
            /* Success State */
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <FiCheck className="text-green-400" size={32} />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Thanks! 🙏</h3>
              <p className="text-gray-400">
                {type === 'support'
                  ? "We'll look into this and get back to you soon."
                  : "We read every piece of feedback. You're helping make Puffed better!"}
              </p>
            </div>
          ) : (
            /* Form */
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type Toggle */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => { setType('feedback'); setCategory(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                    type === 'feedback'
                      ? 'bg-amber-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FiMessageSquare size={18} />
                  Feedback
                </button>
                <button
                  onClick={() => { setType('support'); setCategory(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
                    type === 'support'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FiHelpCircle size={18} />
                  Support
                </button>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  What's this about?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories[type].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        category === cat.id
                          ? type === 'support'
                            ? 'bg-blue-500/20 border-blue-500/50 border'
                            : 'bg-amber-500/20 border-amber-500/50 border'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject (optional) */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Subject <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={type === 'support' ? "Brief description of the issue" : "What's your idea?"}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {type === 'support' ? 'Describe the issue' : 'Your feedback'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === 'support'
                      ? "Please include as much detail as possible - what were you trying to do? What happened instead?"
                      : "We'd love to hear your thoughts..."
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                  maxLength={2000}
                />
                <div className="text-xs text-gray-600 text-right mt-1">
                  {message.length}/2000
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  submitting || !message.trim()
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : type === 'support'
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    {type === 'support' ? 'Submit Request' : 'Send Feedback'}
                  </>
                )}
              </button>

              {/* Privacy note */}
              <p className="text-xs text-gray-600 text-center">
                {type === 'support'
                  ? "We'll respond via in-app notification if you're logged in."
                  : "Your feedback helps us build a better app for everyone."}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
