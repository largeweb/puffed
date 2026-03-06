"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FiArrowLeft, FiMessageSquare, FiHelpCircle, FiRefreshCw, 
  FiCheck, FiClock, FiInbox, FiTrash2, FiEdit3
} from "react-icons/fi";

interface AdminMessage {
  id: string;
  user_id: string | null;
  username: string | null;
  type: 'support' | 'feedback';
  category: string | null;
  subject: string | null;
  message: string;
  status: 'open' | 'in-progress' | 'completed';
  admin_notes: string | null;
  created_at: number;
  updated_at: number;
}

interface MessageCounts {
  open: number;
  'in-progress': number;
  completed: number;
  total: number;
}

const ADMIN_KEY = "puffed-admin-2026";

const statusColors = {
  open: 'bg-red-500/20 text-red-400 border-red-500/30',
  'in-progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const statusIcons = {
  open: <FiInbox size={14} />,
  'in-progress': <FiClock size={14} />,
  completed: <FiCheck size={14} />,
};

const categoryLabels: Record<string, string> = {
  bug: '🐛 Bug',
  account: '👤 Account',
  feature: '💡 Feature',
  improvement: '✨ Improvement',
  content: '🚬 Cigar Data',
  other: '💬 Other',
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [counts, setCounts] = useState<MessageCounts>({ open: 0, 'in-progress': 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'completed'>('open');
  const [typeFilter, setTypeFilter] = useState<'all' | 'support' | 'feedback'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ key: ADMIN_KEY });
      if (filter !== 'all') params.append('status', filter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const res = await fetch(`/api/admin-messages?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMessages(data.messages || []);
      setCounts(data.counts || { open: 0, 'in-progress': 0, completed: 0, total: 0 });
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [filter, typeFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin-messages/${id}?key=${ADMIN_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchMessages();
    } catch {
      setError('Failed to update status');
    }
  };

  const updateNotes = async (id: string) => {
    try {
      await fetch(`/api/admin-messages/${id}?key=${ADMIN_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: editNotes }),
      });
      setEditingId(null);
      setEditNotes('');
      fetchMessages();
    } catch {
      setError('Failed to update notes');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin-messages/${id}?key=${ADMIN_KEY}`, {
        method: 'DELETE',
      });
      fetchMessages();
    } catch {
      setError('Failed to delete');
    }
  };

  const formatDate = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 -ml-2 rounded-lg hover:bg-white/5">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-semibold">Support & Feedback</h1>
              <p className="text-xs text-gray-400">
                {counts.open} open • {counts['in-progress']} in progress • {counts.total} total
              </p>
            </div>
          </div>
          <button
            onClick={fetchMessages}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <FiRefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {(['all', 'open', 'in-progress', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === s 
                    ? s === 'open' ? 'bg-red-500 text-white' 
                      : s === 'in-progress' ? 'bg-yellow-500 text-black'
                      : s === 'completed' ? 'bg-green-500 text-black'
                      : 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== 'all' && ` (${counts[s]})`}
              </button>
            ))}
          </div>
          
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {(['all', 'support', 'feedback'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  typeFilter === t
                    ? t === 'support' ? 'bg-blue-500 text-white'
                      : t === 'feedback' ? 'bg-amber-500 text-black'
                      : 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'support' && <FiHelpCircle size={14} />}
                {t === 'feedback' && <FiMessageSquare size={14} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">No messages found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`glass rounded-xl p-4 border-l-4 ${
                  msg.type === 'support' ? 'border-l-blue-500' : 'border-l-amber-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[msg.status]}`}>
                      <span className="flex items-center gap-1">
                        {statusIcons[msg.status]}
                        {msg.status}
                      </span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      msg.type === 'support' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {msg.type === 'support' ? '🆘 Support' : '💬 Feedback'}
                    </span>
                    {msg.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-gray-300">
                        {categoryLabels[msg.category] || msg.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(msg.created_at)}
                  </span>
                </div>

                {/* User */}
                {msg.username && (
                  <div className="text-sm text-gray-400 mb-2">
                    From: <Link href={`/user/${msg.username}`} className="text-amber-400 hover:underline">@{msg.username}</Link>
                  </div>
                )}

                {/* Subject */}
                {msg.subject && (
                  <h3 className="font-medium mb-2">{msg.subject}</h3>
                )}

                {/* Message */}
                <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">{msg.message}</p>

                {/* Admin Notes */}
                {editingId === msg.id ? (
                  <div className="mb-4">
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add admin notes..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateNotes(msg.id)}
                        className="px-3 py-1 bg-green-500 text-black rounded-lg text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditNotes(''); }}
                        className="px-3 py-1 bg-white/10 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : msg.admin_notes ? (
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="text-xs text-purple-400 mb-1">Admin Notes:</div>
                    <p className="text-sm text-gray-300">{msg.admin_notes}</p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.status !== 'completed' && (
                    <>
                      {msg.status === 'open' && (
                        <button
                          onClick={() => updateStatus(msg.id, 'in-progress')}
                          className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                        >
                          Mark In Progress
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(msg.id, 'completed')}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                      >
                        Mark Completed
                      </button>
                    </>
                  )}
                  {msg.status === 'completed' && (
                    <button
                      onClick={() => updateStatus(msg.id, 'open')}
                      className="px-3 py-1.5 bg-white/10 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingId(msg.id); setEditNotes(msg.admin_notes || ''); }}
                    className="px-3 py-1.5 bg-white/10 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-1"
                  >
                    <FiEdit3 size={14} />
                    Notes
                  </button>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <FiTrash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
