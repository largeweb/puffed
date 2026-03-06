"use client";

import { useState } from 'react';
import { FiMessageSquare, FiHelpCircle } from 'react-icons/fi';
import FeedbackModal from './FeedbackModal';

interface FeedbackButtonProps {
  type?: 'support' | 'feedback' | 'both';
  variant?: 'icon' | 'text' | 'full';
  className?: string;
}

export default function FeedbackButton({ 
  type = 'both', 
  variant = 'full',
  className = '' 
}: FeedbackButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'support' | 'feedback'>('feedback');

  const openModal = (t: 'support' | 'feedback') => {
    setModalType(t);
    setModalOpen(true);
  };

  if (type === 'both' && variant === 'full') {
    return (
      <>
        <div className={`flex gap-2 ${className}`}>
          <button
            onClick={() => openModal('feedback')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 rounded-xl transition-all text-sm"
          >
            <FiMessageSquare size={16} className="text-amber-400" />
            <span>Feedback</span>
          </button>
          <button
            onClick={() => openModal('support')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all text-sm"
          >
            <FiHelpCircle size={16} className="text-blue-400" />
            <span>Support</span>
          </button>
        </div>
        <FeedbackModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          defaultType={modalType}
        />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => openModal(type === 'support' ? 'support' : 'feedback')}
          className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${className}`}
          title={type === 'support' ? 'Get Help' : 'Send Feedback'}
        >
          {type === 'support' ? (
            <FiHelpCircle size={20} className="text-blue-400" />
          ) : (
            <FiMessageSquare size={20} className="text-amber-400" />
          )}
        </button>
        <FeedbackModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          defaultType={type === 'support' ? 'support' : 'feedback'}
        />
      </>
    );
  }

  // text or single button variant
  return (
    <>
      <button
        onClick={() => openModal(type === 'support' ? 'support' : 'feedback')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
          type === 'support'
            ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20'
            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
        } ${className}`}
      >
        {type === 'support' ? (
          <>
            <FiHelpCircle size={18} />
            <span>Get Help</span>
          </>
        ) : (
          <>
            <FiMessageSquare size={18} />
            <span>Send Feedback</span>
          </>
        )}
      </button>
      <FeedbackModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        defaultType={type === 'support' ? 'support' : 'feedback'}
      />
    </>
  );
}
