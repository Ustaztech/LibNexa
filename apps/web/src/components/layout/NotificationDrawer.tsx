import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Bell, Shield, BookOpen, AlertCircle, Clock, Settings, Sparkles } from 'lucide-react';
import { NotificationItem } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({ emailEnabled: true, pushEnabled: true, reminderEnabled: true });
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getNotificationPreferences()
        .then((res) => {
          if (res.success && res.data) setPreferences(res.data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      showToast({ type: 'success', title: 'All Marked as Read' });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleSavePreferences = async (updated: typeof preferences) => {
    setPreferences(updated);
    try {
      await api.updateNotificationPreferences(updated);
      showToast({ type: 'success', title: 'Preferences Saved' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to update preferences', message: err.message });
    }
  };

  const handleTriggerDueReminders = async () => {
    setIsTriggeringReminders(true);
    try {
      const res = await api.triggerDueReminders();
      showToast({
        type: 'success',
        title: 'Reminders Dispatched',
        message: `Processed reminders for active loans (${res.processed} notifications queued).`,
      });
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Dispatch Failed', message: err.message });
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'BORROWING':
        return <BookOpen className="w-4 h-4 text-brand-cyan" />;
      case 'LOAN':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'RESERVATION':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'SYSTEM':
      case 'ACCOUNT':
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-brand-dark/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-brand-navy border-l border-white/10 shadow-elevated flex flex-col text-white">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-royal/30 flex items-center justify-center border border-brand-royal/40">
                <Bell className="w-4 h-4 text-brand-cyan" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base">Notifications</h2>
                <p className="text-[11px] text-white/60">
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className={`p-2 rounded-lg transition-colors ${
                  showPreferences ? 'bg-brand-royal text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Notification Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preferences View (Collapsible) */}
          {showPreferences && (
            <div className="p-4 bg-brand-dark/40 border-b border-white/10 text-xs space-y-3">
              <p className="font-semibold text-white/90">Notification Preferences</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) => handleSavePreferences({ ...preferences, emailEnabled: e.target.checked })}
                    className="rounded text-brand-teal focus:ring-brand-cyan"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.pushEnabled}
                    onChange={(e) => handleSavePreferences({ ...preferences, pushEnabled: e.target.checked })}
                    className="rounded text-brand-teal focus:ring-brand-cyan"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/70">Due Date Reminders</span>
                  <input
                    type="checkbox"
                    checked={preferences.reminderEnabled}
                    onChange={(e) => handleSavePreferences({ ...preferences, reminderEnabled: e.target.checked })}
                    className="rounded text-brand-teal focus:ring-brand-cyan"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Librarian / Admin Quick Trigger Bar */}
          {(role === 'LIBRARIAN' || role === 'ADMIN') && (
            <div className="p-3 bg-brand-royal/20 border-b border-white/10 flex items-center justify-between">
              <div className="text-[11px] text-white/80">
                <span className="font-semibold text-brand-cyan">Staff Tool:</span> Trigger due reminder scheduler
              </div>
              <button
                onClick={handleTriggerDueReminders}
                disabled={isTriggeringReminders}
                className="px-2.5 py-1 bg-brand-teal hover:bg-brand-teal/80 text-white text-[11px] font-semibold rounded-lg shadow disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                {isTriggeringReminders ? 'Running...' : 'Run Job'}
              </button>
            </div>
          )}

          {/* Quick Mark All as Read Action */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-white/5 flex justify-end">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-brand-cyan hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-white/50 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications received yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif.id}
                    onClick={() => isUnread && handleMarkAsRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-white/10 border-brand-cyan/40 shadow-sm'
                        : 'bg-white/5 border-white/5 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-black/30 border border-white/10 flex-shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white truncate">{notif.title}</h4>
                          <span className="text-[10px] text-white/50 whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-brand-cyan border border-white/5">
                            {notif.type}
                          </span>
                          <span className="text-[10px] text-white/40">
                            Channel: {notif.channel}
                          </span>
                          {isUnread && (
                            <span className="ml-auto inline-block w-2 h-2 rounded-full bg-brand-cyan shadow-teal-glow"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
