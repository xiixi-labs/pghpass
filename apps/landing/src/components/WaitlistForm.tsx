'use client';

import { useState } from 'react';
import { submitWaitlist } from '@/lib/api';

type Step = 'idle' | 'loading' | 'comment' | 'sending' | 'done' | 'error';

export function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isDark = variant === 'dark';

  const inputClass = `flex-1 px-4 py-3 rounded-xl text-base outline-none transition-colors duration-200 ${
    isDark
      ? 'bg-dark-3 text-dark-text border border-dark-border placeholder:text-dark-text-tertiary focus:border-brand-gold'
      : 'bg-surface text-ink border border-rule placeholder:text-ink-4 focus:border-brand-gold'
  }`;

  const textareaClass = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors duration-200 resize-none ${
    isDark
      ? 'bg-dark-3 text-dark-text border border-dark-border placeholder:text-dark-text-tertiary focus:border-brand-gold'
      : 'bg-surface text-ink border border-rule placeholder:text-ink-4 focus:border-brand-gold'
  }`;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || step === 'loading') return;
    setStep('loading');

    const result = await submitWaitlist(email.trim(), 'customer');

    if (result.success) {
      setStep('comment');
    } else {
      setStep('error');
      setErrorMsg(result.message);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) {
      setStep('done');
      return;
    }
    setStep('sending');
    await submitWaitlist(email.trim(), 'customer', comment.trim());
    setStep('done');
  };

  const handleSkip = () => setStep('done');

  // ── Step 1: Email capture ─────────────────────────────────────────────────
  if (step === 'idle' || step === 'loading' || step === 'error') {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-3 w-full max-w-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={step === 'loading'}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={step === 'loading'}
            className="bg-brand-gold text-surface font-semibold px-6 py-3 rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-60 shrink-0"
          >
            {step === 'loading' ? 'Joining...' : 'Join Waitlist'}
          </button>
        </div>
        {step === 'error' && (
          <p className="text-brand-red text-sm">{errorMsg}</p>
        )}
      </form>
    );
  }

  // ── Step 2: Optional comment ──────────────────────────────────────────────
  if (step === 'comment' || step === 'sending') {
    return (
      <div className="flex flex-col gap-4 w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="#1A8F4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className={`text-base font-semibold ${isDark ? 'text-dark-text' : 'text-ink'}`}>
            You&rsquo;re on the list!
          </p>
        </div>

        <p className={`text-sm ${isDark ? 'text-dark-text-secondary' : 'text-ink-3'}`}>
          Anything you&rsquo;d like us to know?
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts, questions, or neighborhood..."
          disabled={step === 'sending'}
          rows={3}
          className={textareaClass}
          autoFocus
        />

        <div className="flex items-center gap-4">
          <button
            onClick={handleSendComment}
            disabled={step === 'sending'}
            className="bg-brand-gold text-surface font-semibold px-6 py-3 rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-60"
          >
            {step === 'sending' ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={step === 'sending'}
            className={`text-sm transition-colors duration-200 ${
              isDark
                ? 'text-dark-text-tertiary hover:text-dark-text'
                : 'text-ink-4 hover:text-ink-2'
            }`}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Done ──────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4" stroke="#1A8F4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className={`text-base font-medium ${isDark ? 'text-dark-text' : 'text-ink'}`}>
        Thanks — we&rsquo;ll be in touch when PGH Pass launches.
      </p>
    </div>
  );
}
