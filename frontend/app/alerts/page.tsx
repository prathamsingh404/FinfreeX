'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/PageShell'
import { Panel, Badge, Btn, StatTile, KpiRow, EmptyState, Note, DefRow, cx } from '@/components/ui/kit'
import { Segmented, SearchInput, Switch, Reveal } from '@/components/ui/controls'
import { useAuth } from '@/context/AuthContext'
import {
  fetchAlerts, createAlert, deleteAlert, type PriceAlert,
  fetchNotificationSettings, saveNotificationSettings, sendTelegramTest,
  type NotificationSettings,
} from '@/lib/api'

/* Alerts and their delivery channel belong on one screen: an alert nobody
   receives is not an alert. The Telegram panel sits beside the list and says
   plainly whether it is connected. */

const DIGESTS = [
  { value: 'off', label: 'Off' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const

const EMPTY_SETTINGS: NotificationSettings = {
  telegram_bot_token: '',
  telegram_chat_id: '',
  digest_frequency: 'daily',
  alert_on_price_trigger: true,
}

export default function AlertsPage() {
  const { user } = useAuth()

  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // New alert form
  const [symbol, setSymbol] = useState('')
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE')
  const [target, setTarget] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Telegram
  const [settings, setSettings] = useState<NotificationSettings>(EMPTY_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [testing, setTesting] = useState(false)
  const [telegramMessage, setTelegramMessage] = useState<{ tone: 'up' | 'down'; text: string } | null>(null)
  const [showToken, setShowToken] = useState(false)

  const loadAlerts = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchAlerts()
      setAlerts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setLoadError(err.message || 'Could not load your alerts.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await fetchNotificationSettings()
        if (!cancelled) setSettings({ ...EMPTY_SETTINGS, ...s })
      } catch {
        /* Falls back to blanks — the panel then reads as "not connected" */
      } finally {
        if (!cancelled) setSettingsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const value = Number(target)
    if (!symbol.trim()) return setFormError('Enter a symbol to watch.')
    if (!Number.isFinite(value) || value <= 0) return setFormError('Enter a target price above zero.')

    setCreating(true)
    try {
      const created = await createAlert({
        symbol: symbol.trim().toUpperCase(),
        exchange,
        condition,
        target_value: value,
      })
      setAlerts((prev) => [created, ...prev])
      setSymbol('')
      setTarget('')
    } catch (err: any) {
      setFormError(err.message || 'The alert could not be created.')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    const previous = alerts
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    try {
      await deleteAlert(id)
    } catch (err: any) {
      setAlerts(previous)
      setLoadError(err.message || 'The alert could not be deleted.')
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    setTelegramMessage(null)
    try {
      const saved = await saveNotificationSettings(settings)
      setSettings({ ...EMPTY_SETTINGS, ...saved })
      setTelegramMessage({ tone: 'up', text: 'Telegram settings saved.' })
    } catch (err: any) {
      setTelegramMessage({ tone: 'down', text: err.message || 'The settings could not be saved.' })
    } finally {
      setSavingSettings(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTelegramMessage(null)
    try {
      await sendTelegramTest()
      setTelegramMessage({ tone: 'up', text: 'Test message sent. Check your Telegram chat.' })
    } catch (err: any) {
      setTelegramMessage({
        tone: 'down',
        text: err.message?.includes('400')
          ? 'Telegram rejected the message. Check the bot token and chat ID, then save again.'
          : err.message || 'The test message could not be delivered.',
      })
    } finally {
      setTesting(false)
    }
  }

  const connected = Boolean(settings.telegram_bot_token && settings.telegram_chat_id)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? alerts.filter((a) => a.symbol.toLowerCase().includes(q)) : alerts
  }, [alerts, query])

  const above = alerts.filter((a) => a.condition === 'ABOVE').length
  const triggered = alerts.filter((a) => a.triggered_at).length

  if (!user) {
    return (
      <PageShell category="Analysis" title="Alerts" subtitle="Get told when a price crosses a level you care about." icon="solar:bell-linear" backdrop="tape">
        <Panel label="Alerts">
          <EmptyState
            icon="solar:lock-keyhole-linear"
            title="Sign in to set alerts"
            body="Alerts are tied to your account so they keep running while the page is closed."
            action={<Link href="/auth"><Btn icon="solar:login-3-linear">Sign in</Btn></Link>}
          />
        </Panel>
      </PageShell>
    )
  }

  return (
    <PageShell
      category="Analysis"
      title="Alerts"
      subtitle="Price levels the server watches for you, delivered to Telegram."
      icon="solar:bell-linear"
      backdrop="tape"
      actions={
        <Badge tone={connected ? 'up' : 'warn'}>
          {connected ? 'Telegram connected' : 'Telegram not connected'}
        </Badge>
      }
    >
      <KpiRow cols={4} className="mb-3">
        <StatTile label="Active alerts" value={alerts.length} hint="Watched by the server" />
        <StatTile label="Above target" value={above} tone="up" hint="Fire on a rise" />
        <StatTile label="Below target" value={alerts.length - above} tone="down" hint="Fire on a fall" />
        <StatTile label="Already triggered" value={triggered} hint="Fired at least once" />
      </KpiRow>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <Reveal>
            <Panel label="New alert" pad>
              <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1.4fr_auto_1fr_auto_auto] gap-2 items-end">
                <label className="min-w-0">
                  <span className="eyebrow">Symbol</span>
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="RELIANCE"
                    className="input mt-1.5"
                  />
                </label>
                <label className="min-w-0">
                  <span className="eyebrow">Exchange</span>
                  <select value={exchange} onChange={(e) => setExchange(e.target.value)} className="select mt-1.5 w-auto">
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                    <option value="NASDAQ">NASDAQ</option>
                    <option value="NYSE">NYSE</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="eyebrow">Target price</span>
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    inputMode="decimal"
                    placeholder="2500"
                    className="input mt-1.5 tabular-nums"
                  />
                </label>
                <div>
                  <span className="eyebrow block mb-1.5">Fires when</span>
                  <Segmented<'ABOVE' | 'BELOW'>
                    options={[{ value: 'ABOVE', label: 'Rises above' }, { value: 'BELOW', label: 'Falls below' }]}
                    value={condition}
                    onChange={setCondition}
                  />
                </div>
                <Btn type="submit" disabled={creating} icon={creating ? undefined : 'solar:add-circle-linear'}>
                  {creating ? 'Creating…' : 'Create alert'}
                </Btn>
              </form>
              {formError && (
                <p className="text-xs val-down mt-2">{formError}</p>
              )}
              {!connected && (
                <p className="text-xs text-muted mt-2">
                  Alerts will still trigger, but nothing will be delivered until Telegram is connected.
                </p>
              )}
            </Panel>
          </Reveal>

          <Panel
            label="Watching"
            meta={`${shown.length} of ${alerts.length}`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Filter by symbol" className="w-40" />}
          >
            {loadError && (
              <div className="p-3">
                <Note icon="solar:danger-triangle-linear">{loadError}</Note>
              </div>
            )}
            {loading ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
              </div>
            ) : shown.length === 0 ? (
              <EmptyState
                icon="solar:bell-linear"
                title={alerts.length ? 'No alert matches that filter' : 'No alerts yet'}
                body={
                  alerts.length
                    ? 'Clear the filter to see the rest.'
                    : 'Add a symbol and a price above. The server checks it while you are away.'
                }
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {shown.map((a) => (
                  <div key={a.id} className="p-3 flex items-center gap-3 hover-fill group">
                    <span
                      className={cx(
                        'w-8 h-8 rounded flex items-center justify-center shrink-0',
                        a.condition === 'ABOVE' ? 'bg-up-wash val-up' : 'bg-down-wash val-down',
                      )}
                    >
                      <iconify-icon
                        icon={a.condition === 'ABOVE' ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
                        width="15"
                      ></iconify-icon>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{a.symbol}</span>
                        <span className="chip">{a.exchange}</span>
                        {a.triggered_at && <Badge tone="warn">Triggered</Badge>}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Fires when the price {a.condition === 'ABOVE' ? 'rises above' : 'falls below'}{' '}
                        <span className="tabular-nums text-foreground">{a.target_value}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(a.id)}
                      aria-label={`Delete the ${a.symbol} alert`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-down transition-opacity cursor-pointer shrink-0"
                    >
                      <iconify-icon icon="solar:trash-bin-minimalistic-linear" width="16"></iconify-icon>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Telegram ─────────────────────────────────────── */}
        <Reveal delay={80} variant="right" className="flex flex-col gap-3">
          <Panel
            label="Telegram delivery"
            meta={
              <div className="flex items-center gap-2">
                <span>{connected ? 'Connected' : 'Not connected'}</span>
                <Link href="/telegram" className="text-primary hover:underline text-xs ml-1">
                  Full Setup →
                </Link>
              </div>
            }
            pad
          >
            <ol className="space-y-2 mb-4">
              {[
                ['Open @BotFather in Telegram', 'Send /newbot and follow the prompts. It replies with a bot token.'],
                ['Message your new bot', 'Send it any message so it is allowed to reply to you.'],
                ['Open @userinfobot', 'It replies with your chat ID — a number.'],
                ['Paste both below and save', 'Then send a test message to confirm it works.'],
              ].map(([title, detail], i) => (
                <li key={title} className="flex gap-2.5">
                  <span className="w-5 h-5 shrink-0 rounded-full border border-border bg-surface-2 flex items-center justify-center text-micro font-semibold tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm text-foreground leading-snug">{title}</div>
                    <div className="text-xs text-muted mt-0.5 leading-relaxed">{detail}</div>
                  </div>
                </li>
              ))}
            </ol>

            <label className="block mb-2">
              <span className="eyebrow">Bot token</span>
              <div className="relative mt-1.5">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={settings.telegram_bot_token}
                  onChange={(e) => setSettings((s) => ({ ...s, telegram_bot_token: e.target.value }))}
                  placeholder="123456:ABC-DEF..."
                  className="input pr-8 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? 'Hide bot token' : 'Show bot token'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                >
                  <iconify-icon icon={showToken ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width="14"></iconify-icon>
                </button>
              </div>
            </label>

            <label className="block mb-3">
              <span className="eyebrow">Chat ID</span>
              <input
                value={settings.telegram_chat_id}
                onChange={(e) => setSettings((s) => ({ ...s, telegram_chat_id: e.target.value }))}
                placeholder="987654321"
                className="input mt-1.5 font-mono tabular-nums"
                autoComplete="off"
              />
            </label>

            <div className="pt-3 border-t border-border mb-3">
              <span className="eyebrow block mb-1.5">Digest frequency</span>
              <Segmented<NotificationSettings['digest_frequency']>
                options={DIGESTS}
                value={settings.digest_frequency}
                onChange={(v) => setSettings((s) => ({ ...s, digest_frequency: v }))}
                size="sm"
              />
              <div className="mt-3">
                <Switch
                  checked={settings.alert_on_price_trigger}
                  onChange={(v) => setSettings((s) => ({ ...s, alert_on_price_trigger: v }))}
                  label="Message me the moment an alert triggers"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Btn onClick={saveSettings} disabled={savingSettings || !settingsLoaded}>
                {savingSettings ? 'Saving…' : 'Save'}
              </Btn>
              <Btn variant="subtle" onClick={test} disabled={testing || !connected} icon="solar:plain-linear">
                {testing ? 'Sending…' : 'Send test message'}
              </Btn>
            </div>

            {telegramMessage && (
              <p className={cx('text-xs mt-2.5 leading-relaxed', telegramMessage.tone === 'up' ? 'val-up' : 'val-down')}>
                {telegramMessage.text}
              </p>
            )}
          </Panel>

          <Panel label="Delivery status" pad>
            <DefRow label="Channel" value={connected ? 'Telegram' : 'None'} tone={connected ? 'up' : 'down'} />
            <DefRow label="Trigger messages" value={settings.alert_on_price_trigger ? 'On' : 'Off'} />
            <DefRow label="Digest" value={settings.digest_frequency === 'off' ? 'Off' : settings.digest_frequency} />
            <DefRow label="Alerts watched" value={String(alerts.length)} />
          </Panel>

          <Note>
            The bot token is stored against your account and used only to send you messages. Anyone holding it can post as your bot, so treat it like a password.
          </Note>
        </Reveal>
      </div>
    </PageShell>
  )
}
