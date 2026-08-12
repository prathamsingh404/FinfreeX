'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageShell from '@/components/PageShell';
import { Card, SectionTitle, Btn, Badge } from '@/components/ui/kit';
import { useAuth } from '@/context/AuthContext';
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  sendTelegramTest,
  NotificationSettings,
} from '@/lib/api';

const DEFAULT_SETTINGS: NotificationSettings = {
  telegram_bot_token: '',
  telegram_chat_id: '',
  digest_frequency: 'daily',
  alert_on_price_trigger: true,
};

export default function TelegramConnectPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const isConnected = Boolean(settings.telegram_bot_token.trim() && settings.telegram_chat_id.trim());

  const loadSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchNotificationSettings();
      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch {
      // Fallback to default blank settings
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await saveNotificationSettings(settings);
      setSettings(updated);
      setFeedback({ tone: 'success', text: 'Telegram notification settings saved successfully!' });
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err.message || 'Failed to save Telegram settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      // First save settings to ensure backend has latest token/chat ID
      await saveNotificationSettings(settings);
      const res = await sendTelegramTest();
      if (res.success) {
        setFeedback({
          tone: 'success',
          text: '🎉 Test message delivered to your Telegram chat! Check your Telegram app.',
        });
      } else {
        throw new Error('Test message failed.');
      }
    } catch (err: any) {
      setFeedback({
        tone: 'error',
        text: err.message || 'Could not deliver test message. Please verify your Bot Token and Chat ID.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageShell
      title="Telegram Integration"
      subtitle="Deliver real-time price trigger alerts, multi-agent AI reports, and market summaries to Telegram."
      category="Notifications"
      icon="solar:letter-bold-duotone"
    >
      <div className="max-w-4xl mx-auto space-y-8 py-2">
        {/* Connection Status Banner */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-bright/10 text-emerald-bright border border-emerald-bright/30' : 'bg-surface-2 text-muted border border-border'
            }`}>
              <iconify-icon icon="logos:telegram" width="24"></iconify-icon>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Telegram Delivery Engine</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isConnected ? 'bg-emerald-bright/10 text-emerald-bright border-emerald-bright/30' : 'bg-surface-2 text-muted border-border'
                }`}>
                  {isConnected ? 'Connected & Active' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-soft mt-1">
                {isConnected
                  ? 'Your bot is configured and ready to stream real-time market notifications.'
                  : 'Connect your bot to receive instant alerts when target stock prices are hit.'}
              </p>
            </div>
          </div>

          {isConnected && (
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-hover border border-border text-xs font-semibold text-foreground transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {testing ? (
                <iconify-icon icon="solar:restart-linear" className="animate-spin" width="14"></iconify-icon>
              ) : (
                <iconify-icon icon="solar:plain-bold" class="text-primary" width="14"></iconify-icon>
              )}
              Test Connection
            </button>
          )}
        </div>

        {/* Setup Instructions & Configuration Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Setup Guide */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider font-mono">
              3-Step Setup Guide
            </h4>

            <div className="space-y-3">
              <div className="rounded-xl bg-surface border border-border p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    1
                  </span>
                  Create Telegram Bot
                </div>
                <p className="text-[11px] text-soft leading-relaxed pl-7">
                  Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline">@BotFather</a> in Telegram, send <code className="text-foreground bg-surface-2 px-1 rounded">/newbot</code>, and copy your HTTP API Token.
                </p>
              </div>

              <div className="rounded-xl bg-surface border border-border p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  Get Your Chat ID
                </div>
                <p className="text-[11px] text-soft leading-relaxed pl-7">
                  Send <code className="text-foreground bg-surface-2 px-1 rounded">/start</code> to your bot or check your numeric ID using <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-primary hover:underline">@userinfobot</a>.
                </p>
              </div>

              <div className="rounded-xl bg-surface border border-border p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                  Save & Test
                </div>
                <p className="text-[11px] text-soft leading-relaxed pl-7">
                  Paste credentials in the form, click Save & Test. You will receive an instant test confirmation message.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Credentials Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border">
              <SectionTitle
                title="Bot Configuration Credentials"
                subtitle="Stored securely and scoped to your authenticated FinfreeX account"
                icon="solar:lock-keyhole-minimalistic-bold-duotone"
              />

              <form onSubmit={handleSave} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Telegram Bot Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={settings.telegram_bot_token}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, telegram_bot_token: e.target.value }))
                      }
                      className="w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 pr-10 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-foreground cursor-pointer"
                    >
                      <iconify-icon
                        icon={showToken ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                        width="16"
                      ></iconify-icon>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 987654321"
                    value={settings.telegram_chat_id}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, telegram_chat_id: e.target.value }))
                    }
                    className="w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 text-xs font-mono text-foreground placeholder:text-muted outline-none focus:border-primary"
                  />
                </div>

                {/* Preference Toggles */}
                <div className="pt-3 space-y-3 border-t border-border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                    Alert Delivery Options
                  </span>

                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-2 border border-border">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Instant Price Trigger Notifications
                      </span>
                      <span className="text-[11px] text-soft">
                        Send message immediately when a price threshold is crossed.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.alert_on_price_trigger}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, alert_on_price_trigger: e.target.checked }))
                      }
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-2 border border-border">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Portfolio Digest Frequency
                      </span>
                      <span className="text-[11px] text-soft">
                        Scheduled briefing of your portfolio performance & top market movers.
                      </span>
                    </div>
                    <select
                      value={settings.digest_frequency}
                      onChange={(e: any) =>
                        setSettings((s) => ({ ...s, digest_frequency: e.target.value }))
                      }
                      className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                    >
                      <option value="off">Off</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Btn
                    variant="primary"
                    type="submit"
                    disabled={saving}
                    className="flex-1 justify-center py-2.5"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Btn>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || !settings.telegram_bot_token || !settings.telegram_chat_id}
                    className="px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-hover border border-border text-xs font-semibold text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    {testing ? (
                      <iconify-icon icon="solar:restart-linear" className="animate-spin" width="16"></iconify-icon>
                    ) : (
                      <iconify-icon icon="solar:plain-bold" class="text-primary" width="16"></iconify-icon>
                    )}
                    Save & Send Test Message
                  </button>
                </div>
              </form>

              {/* Feedback Message */}
              {feedback && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-3 fade-up ${
                    feedback.tone === 'success'
                      ? 'bg-emerald-bright/10 text-emerald-bright border border-emerald-bright/30'
                      : 'bg-coral/10 text-coral border border-coral/30'
                  }`}
                >
                  <iconify-icon
                    icon={
                      feedback.tone === 'success'
                        ? 'solar:check-circle-bold'
                        : 'solar:danger-triangle-bold'
                    }
                    width="18"
                    className="shrink-0 mt-0.5"
                  ></iconify-icon>
                  <span className="leading-relaxed font-medium">{feedback.text}</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
