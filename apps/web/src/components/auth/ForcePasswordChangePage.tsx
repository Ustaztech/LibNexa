import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export const ForcePasswordChangePage: React.FC = () => {
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', title: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      await refreshUser();
      showToast({ type: 'success', title: 'Password updated', message: 'Your new password is active.' });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Password update failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-bg dark:bg-brand-dark flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-brand-navy p-8 shadow-elevated"
      >
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-brand-royal dark:text-brand-cyan" />
          <h1 className="font-heading text-2xl font-bold text-brand-dark dark:text-white">Change your temporary password</h1>
          <p className="mt-2 text-sm text-brand-mutedText dark:text-white/60">
            Set a new password before continuing to the library portal.
          </p>
        </div>

        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-xs font-semibold text-brand-dark dark:text-white">
            Temporary Password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-xl border border-brand-navy/10 bg-brand-bg px-4 py-3 text-sm text-brand-dark focus:outline-none focus:border-brand-royal dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-brand-dark dark:text-white">
            New Password (minimum 8 characters)
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-brand-navy/10 bg-brand-bg px-4 py-3 text-sm text-brand-dark focus:outline-none focus:border-brand-royal dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-brand-dark dark:text-white">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-brand-navy/10 bg-brand-bg px-4 py-3 text-sm text-brand-dark focus:outline-none focus:border-brand-royal dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </main>
  );
};
