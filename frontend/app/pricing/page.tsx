'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Starter',
      desc: 'Essential market data & basic portfolio tracking.',
      monthlyPrice: 0,
      annualPrice: 0,
      badge: null,
      cta: 'Get Started Free',
      isPrimary: false,
      features: [
        '1 Connected Portfolio & Watchlist',
        'Real-time Stock Quotes & Charts',
        'Daily Market News & Sentiment Feed',
        '5 AI Research Assistant Queries / mo',
        'Stock Screener & Fundamentals',
        'End-of-day Data Sync',
      ],
    },
    {
      name: 'Pro Analyst',
      desc: 'Full multi-agent AI research suite for active investors.',
      monthlyPrice: 500,
      annualPrice: 400,
      badge: 'Most Popular',
      cta: 'Start 14-Day Free Trial',
      isPrimary: true,
      features: [
        '5 Connected Portfolios & Watchlists',
        'Full Multi-Agent Network (6 Specialist Analysts)',
        'Super-Investor Personas (Buffett, Jhunjhunwala, Graham, Burry)',
        'Unlimited AI Research Queries',
        'Interactive Technical Charts (EMA, RSI, Bollinger)',
        'Instant Telegram Price Alerts & Daily Digest',
        'Paper Trading & Strategy Backtesting Engine',
        'Priority AI Response Speed',
      ],
    },
    {
      name: 'FinfreeX Max',
      desc: 'Deep reasoning AI models, options heatmaps & API access.',
      monthlyPrice: 800,
      annualPrice: 640,
      badge: 'Ultimate Power',
      cta: 'Upgrade to Max',
      isPrimary: false,
      isMax: true,
      features: [
        'Everything in Pro Analyst +',
        'Unlimited Portfolios & Custom Workspaces',
        'NVIDIA Nemotron-3.5 30B Deep Reasoning AI',
        'Live Options Chain & Derivatives Heatmap',
        'Institutional Sector Rotation Matrix',
        'Full REST API & Webhook Integration',
        'Custom Quant Factor Models & ESG Scoring',
        '24/7 Priority Support & Dedicated Agent Access',
      ],
    },
  ];

  const faqs = [
    {
      q: 'Can I switch between Pro and Max plans anytime?',
      a: 'Yes! You can upgrade, downgrade, or cancel your subscription at any time directly from your account settings. Plan upgrades apply instantly.',
    },
    {
      q: 'Is there a free trial for the Pro Analyst plan?',
      a: 'Yes, we offer a 14-day free trial on the Pro Analyst plan so you can experience full multi-agent AI research with no obligation.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major Credit/Debit Cards, UPI (GPay, PhonePe, Paytm), Net Banking, and Wallet payments in INR (₹).',
    },
    {
      q: 'How does the annual discount work?',
      a: 'When you choose Annual billing, you save 20% on Pro Analyst (₹400/mo billed ₹4,800/yr) and Max (₹640/mo billed ₹7,680/yr) plans.',
    },
  ];

  return (
    <PageShell
      title="Pricing Plans"
      subtitle="Institutional-grade AI intelligence at retail pricing. Simple, transparent, cancel anytime."
      category="Pricing"
      icon="solar:tag-price-bold-duotone"
    >
      <div className="max-w-6xl mx-auto space-y-14 py-2">
        {/* Billing Cycle Toggle */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-soft hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-soft hover:text-foreground'
              }`}
            >
              Annual Billing
              <span className="bg-emerald-bright/20 text-emerald-bright border border-emerald-bright/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.name}
                className={`rounded-3xl p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPrimary
                    ? 'bg-surface border-2 border-primary shadow-2xl shadow-primary/15 scale-105 z-10'
                    : plan.isMax
                    ? 'bg-gradient-to-b from-surface to-surface-2 border border-border-strong hover:border-primary/50 shadow-xl'
                    : 'bg-surface/70 border border-border hover:border-border-strong shadow-lg'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className={`absolute -top-3.5 right-6 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md ${
                      plan.isPrimary
                        ? 'bg-primary text-white'
                        : 'bg-emerald-bright text-background'
                    }`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-1.5">{plan.name}</h3>
                    <p className="text-xs text-soft leading-relaxed min-h-[36px]">{plan.desc}</p>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-foreground font-mono">
                        ₹{price}
                      </span>
                      <span className="text-xs text-muted font-medium">/month</span>
                    </div>
                    {billingCycle === 'annual' && price > 0 && (
                      <span className="text-[11px] text-emerald-bright font-medium block mt-1">
                        Billed ₹{price * 12}/year (Save ₹{(plan.monthlyPrice - plan.annualPrice) * 12})
                      </span>
                    )}
                  </div>

                  <div className="h-px bg-border/60 my-6" />

                  {/* Feature list */}
                  <div className="space-y-3.5 mb-8">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted block">
                      What&apos;s Included
                    </span>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-foreground leading-snug">
                        <iconify-icon
                          icon="solar:check-circle-bold"
                          class={
                            plan.isMax
                              ? 'text-primary shrink-0 mt-0.5'
                              : 'text-emerald-bright shrink-0 mt-0.5'
                          }
                          width="16"
                        ></iconify-icon>
                        <span className={feature.startsWith('Everything') ? 'font-bold text-foreground' : ''}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer mt-4 ${
                    plan.isPrimary
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
                      : plan.isMax
                      ? 'bg-surface-2 hover:bg-primary hover:text-white border border-primary/40 text-foreground'
                      : 'bg-surface-2 hover:bg-hover border border-border text-foreground'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Banner */}
        <div className="rounded-3xl bg-surface border border-border p-8 text-center space-y-3 shadow-lg">
          <h3 className="text-base font-bold text-foreground">Need custom API volume or fund deployment?</h3>
          <p className="text-xs text-soft max-w-2xl mx-auto leading-relaxed">
            We provide dedicated API infrastructure, custom quantitative factor models, and private cloud setups for family offices, funds, and wealth managers.
          </p>
          <div className="pt-2">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-surface-2 hover:bg-hover text-xs font-semibold text-foreground transition-all"
            >
              <iconify-icon icon="solar:chat-square-call-linear" width="16"></iconify-icon>
              Contact Enterprise Sales
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-xs text-soft mt-1">Everything you need to know about FinfreeX plans and pricing.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-surface border border-border p-6 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <iconify-icon icon="solar:question-circle-linear" class="text-primary shrink-0" width="16"></iconify-icon>
                  {faq.q}
                </h4>
                <p className="text-xs text-soft leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
