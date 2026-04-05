'use client';

import { useState, useEffect, useRef } from 'react';
import { submitWaitlist } from '@/lib/api';

type Step = 'idle' | 'loading' | 'fade-out' | 'comment' | 'sending' | 'fade-done' | 'done' | 'error';

export function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Smooth transition helper
  const transitionTo = (nextStep: Step) => {
    setVisible(false);
    setTimeout(() => {
      setStep(nextStep);
      setVisible(true);
    }, 400);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || step === 'loading') return;
    setStep('loading');

    const result = await submitWaitlist(email.trim(), 'customer');

    if (result.success) {
      transitionTo('comment');
    } else {
      setStep('error');
      setErrorMsg(result.message);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) {
      transitionTo('done');
      return;
    }
    setStep('sending');
    await submitWaitlist(email.trim(), 'customer', comment.trim());
    transitionTo('done');
  };

  const handleSkip = () => transitionTo('done');

  const transitionStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  };

  // ── Step 1: Email capture ─────────────────────────────────────────────────
  if (step === 'idle' || step === 'loading' || step === 'error') {
    return (
      <div ref={containerRef} style={transitionStyle}>
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
            <p className="text-brand-red text-sm text-center">{errorMsg}</p>
          )}
        </form>
      </div>
    );
  }

  // ── Step 2: Optional comment ──────────────────────────────────────────────
  if (step === 'comment' || step === 'sending') {
    return (
      <div ref={containerRef} style={transitionStyle} className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="text-center space-y-2">
          <p className={`font-serif text-[26px] md:text-[30px] tracking-[-0.02em] ${isDark ? 'text-dark-text' : 'text-ink'}`}>
            You&rsquo;re on the list.
          </p>
          <p className={`text-sm ${isDark ? 'text-dark-text-secondary' : 'text-ink-3'}`}>
            We&rsquo;ll let you know when PGH Pass is ready.
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className={`text-xs font-semibold tracking-[0.04em] uppercase ${isDark ? 'text-dark-text-tertiary' : 'text-ink-4'}`}>
            Anything you&rsquo;d like us to know?
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Thoughts, questions, your neighborhood..."
            disabled={step === 'sending'}
            rows={3}
            className={textareaClass}
          />
        </div>

        <div className="flex items-center gap-5 w-full">
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
    <div ref={containerRef} style={transitionStyle} className="text-center py-4 space-y-2">
      <p className={`font-serif text-[26px] md:text-[30px] tracking-[-0.02em] ${isDark ? 'text-dark-text' : 'text-ink'}`}>
        Thank you.
      </p>
      <p className={`text-sm ${isDark ? 'text-dark-text-secondary' : 'text-ink-3'}`}>
        We&rsquo;ll be in touch when PGH Pass launches.
      </p>
    </div>
  );
}
