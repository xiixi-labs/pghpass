'use client';

import { useState } from 'react';
import { submitWaitlist } from '@/lib/api';

export function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;

    setStatus('loading');
    const result = await submitWaitlist(email.trim(), 'customer', comment.trim() || undefined);
    setStatus(result.success ? 'success' : 'error');
    setMessage(result.message);

    if (result.success) {
      setEmail('');
      setComment('');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 4" stroke="#1A8F4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className={`text-base font-medium ${variant === 'dark' ? 'text-dark-text' : 'text-ink'}`}>
          {message}
        </p>
      </div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === 'loading'}
          className={`flex-1 px-4 py-3 rounded-xl text-base outline-none transition-colors duration-200 ${
            isDark
              ? 'bg-dark-3 text-dark-text border border-dark-border placeholder:text-dark-text-tertiary focus:border-brand-gold'
              : 'bg-surface text-ink border border-rule placeholder:text-ink-4 focus:border-brand-gold'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-brand-gold text-surface font-semibold px-6 py-3 rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-60 shrink-0"
        >
          {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
        </button>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything you'd like us to know? (optional)"
        disabled={status === 'loading'}
        rows={2}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 resize-none ${
          isDark
            ? 'bg-dark-3 text-dark-text border border-dark-border placeholder:text-dark-text-tertiary focus:border-brand-gold'
            : 'bg-surface text-ink border border-rule placeholder:text-ink-4 focus:border-brand-gold'
        }`}
      />
      {status === 'error' && (
        <p className="text-brand-red text-sm">{message}</p>
      )}
    </form>
  );
}
