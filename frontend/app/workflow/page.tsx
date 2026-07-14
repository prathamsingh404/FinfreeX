'use client';

import React from 'react';
import Stepper, { Step } from '@/components/reactbits/Stepper/Stepper';
import Particles from '@/components/reactbits/Particles';
import ShinyText from '@/components/reactbits/ShinyText';
import GradientText from '@/components/reactbits/GradientText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';

export default function WorkflowPage() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">


      {/* Background Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <Particles
          particleCount={150}
          particleSpread={20}
          speed={0.1}
          particleColors={['#10B981', '#34D399', '#FF6B57']}
          alphaParticles={true}
          particleBaseSize={60}
          sizeRandomness={0.7}
          cameraDistance={30}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-pulse"></span>
            <ShinyText text="SYSTEM ARCHITECTURE & ROADMAP" speed={3} color="#34D399" shineColor="#ffffff" className="text-[10px] tracking-wide font-medium" />
          </div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tighter mb-6">
            How <GradientText colors={['#34D399', '#FF6B57', '#34D399', '#34D399']} animationSpeed={5}>FinfreeX</GradientText> is Built.
          </h1>
          <p className="text-soft text-lg max-w-2xl mx-auto font-light leading-relaxed">
            From raw data ingestion to multi-agent reasoning. Explore our development workflow and technical foundation.
          </p>
        </div>

        {/* Stepper Section */}
        <section className="mb-24">
          <Stepper
            initialStep={1}
            onStepChange={(step) => console.log(`Step changed to: ${step}`)}
            onFinalStepCompleted={() => console.log("All steps completed!")}
            backButtonText="Previous Phase"
            nextButtonText="Next Phase"
          >
            <Step>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald/[0.15] flex items-center justify-center text-emerald-bright border border-emerald/25">
                        <iconify-icon icon="solar:globus-linear" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-foreground tracking-tight">Phase 1: Foundation (Month 1–2)</h2>
                        <p className="text-sm text-emerald-bright/80">The Core Analyst Agent</p>
                    </div>
                </div>
                <div className="space-y-4 text-soft leading-relaxed font-light">
                    <p>Building the first agent that interacts with the real-world financial data. We focus on reliable data extraction and initial reasoning.</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <span className="text-emerald-bright mt-1"><iconify-icon icon="solar:check-circle-linear"></iconify-icon></span>
                            <span className="text-foreground">SEC Filings (EDGAR) Integration</span>
                        </li>
                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                            <span className="text-emerald-bright mt-1"><iconify-icon icon="solar:check-circle-linear"></iconify-icon></span>
                            <span className="text-foreground">Claude 3.5 Sonnet Reasoning</span>
                        </li>
                    </ul>
                </div>
              </div>
            </Step>

            <Step>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-coral/[0.15] flex items-center justify-center text-coral border border-coral/25">
                        <iconify-icon icon="solar:users-group-two-rounded-linear" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-foreground tracking-tight">Phase 2: Expansion (Month 3–4)</h2>
                        <p className="text-sm text-coral/80">Multi-Agent Swarm</p>
                    </div>
                </div>
                <div className="space-y-4 text-soft leading-relaxed font-light">
                    <p>Adding specialized agents for distinct financial tasks. Agents now communicate and cross-reference findings.</p>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 mt-6 border-l-4 border-l-coral/50">
                        <h4 className="text-foreground font-medium mb-3">Workflow Ingestion</h4>
                        <p className="text-sm">"Add a second agent for earnings call transcripts. Make them compare notes. Store outputs in Postgres. Build a basic Streamlit page."</p>
                    </div>
                </div>
              </div>
            </Step>

            <Step>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald/[0.15] flex items-center justify-center text-emerald-bright border border-emerald/25">
                        <iconify-icon icon="solar:graph-up-linear" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-foreground tracking-tight">Phase 3: Validation (Month 5–6)</h2>
                        <p className="text-sm text-emerald-bright/80">Historical Backtesting</p>
                    </div>
                </div>
                <div className="space-y-4 text-soft leading-relaxed font-light">
                    <p>Before any agent idea touches real money, it must be validated. We run our AI signals against decades of market data.</p>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        <div className="text-center p-3 rounded-lg bg-emerald/[0.05] border border-emerald/10">
                            <div className="text-xl font-bold text-emerald-bright">99.9%</div>
                            <div className="text-[10px] text-soft uppercase tracking-widest mt-1">Data Coverage</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-emerald/[0.05] border border-emerald/10">
                            <div className="text-xl font-bold text-emerald-bright">Backtrader</div>
                            <div className="text-[10px] text-soft uppercase tracking-widest mt-1">Engine</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-emerald/[0.05] border border-emerald/10">
                            <div className="text-xl font-bold text-emerald-bright">Zipline</div>
                            <div className="text-[10px] text-soft uppercase tracking-widest mt-1">Refined</div>
                        </div>
                    </div>
                </div>
              </div>
            </Step>

            <Step>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber/[0.15] flex items-center justify-center text-amber border border-amber/25">
                        <iconify-icon icon="solar:shield-warning-linear" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-foreground tracking-tight">Phase 4: Risk Control (Month 7–9)</h2>
                        <p className="text-sm text-amber/80">The Hard-Coded Guardrails</p>
                    </div>
                </div>
                <div className="space-y-4 text-soft leading-relaxed font-light">
                    <p>Not everything is AI. Risk management requires strict, non-hallucinating rules. We implement position limits and drawdown protection.</p>
                    <div className="bg-amber/[0.1] p-5 rounded-2xl border border-amber/20 italic text-sm text-foreground">
                        "Not AI — just <code className="text-coral">if portfolio_value &lt; starting_value * 0.92: liquidate_all()</code>"
                    </div>
                </div>
              </div>
            </Step>

            <Step>
              <div className="py-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-coral/[0.15] flex items-center justify-center text-coral border border-coral/25">
                        <iconify-icon icon="solar:rocket-linear" width="28"></iconify-icon>
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-foreground tracking-tight">Phase 5: Launch (Month 10–12)</h2>
                        <p className="text-sm text-coral/80">Live Paper Trading</p>
                    </div>
                </div>
                <div className="space-y-4 text-soft leading-relaxed font-light">
                    <p>The final milestone. Real market execution using the Alpaca API with simulated capital. Monitoring latency and execution slippage.</p>
                    <div className="flex items-center gap-4 mt-6">
                        <div className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-foreground font-medium flex items-center gap-2">
                            <iconify-icon icon="solar:play-circle-linear" className="text-coral"></iconify-icon>
                            Alpaca API Integrated
                        </div>
                        <div className="text-xs text-muted tracking-widest uppercase">Target: 2026 Production</div>
                    </div>
                </div>
              </div>
            </Step>
          </Stepper>
        </section>

        {/* Tech Stack Section */}
        <section>
          <div className="flex items-center gap-3 mb-12">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Technical Stack</h2>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SpotlightCard className="p-8 rounded-3xl glass-panel relative overflow-hidden" spotlightColor="rgba(52, 211, 153, 0.15)">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <iconify-icon icon="logos:python" style={{fontSize: "100px"}}></iconify-icon>
              </div>
              <h3 className="text-lg font-medium mb-4 text-emerald-bright">Core Engine</h3>
              <ul className="space-y-2 text-sm text-soft">
                <li className="text-foreground">Python 3.11+</li>
                <li className="text-foreground">LangGraph / CrewAI</li>
                <li className="text-foreground">Claude 3.5 API</li>
                <li className="text-foreground">PostgreSQL / Redis</li>
              </ul>
            </SpotlightCard>

            <SpotlightCard className="p-8 rounded-3xl glass-panel relative overflow-hidden" spotlightColor="rgba(255, 107, 87, 0.15)">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <iconify-icon icon="solar:database-linear" style={{fontSize: "100px"}}></iconify-icon>
              </div>
              <h3 className="text-lg font-medium mb-4 text-coral">Intelligence</h3>
              <ul className="space-y-2 text-sm text-soft">
                <li className="text-foreground">Chroma Vector DB</li>
                <li className="text-foreground">SEC EDGAR API</li>
                <li className="text-foreground">Polygon.io Market Data</li>
                <li className="text-foreground">YFinance (Free Tier)</li>
              </ul>
            </SpotlightCard>

            <SpotlightCard className="p-8 rounded-3xl glass-panel relative overflow-hidden" spotlightColor="rgba(52, 211, 153, 0.15)">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <iconify-icon icon="solar:chart-2-linear" style={{fontSize: "100px"}}></iconify-icon>
              </div>
              <h3 className="text-lg font-medium mb-4 text-emerald-bright">Execution</h3>
              <ul className="space-y-2 text-sm text-soft">
                <li className="text-foreground">Alpaca Trading API</li>
                <li className="text-foreground">Backtrader Engine</li>
                <li className="text-foreground">Celery Task Queue</li>
                <li className="text-foreground">Docker Orchestration</li>
              </ul>
            </SpotlightCard>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/5 bg-background/80 backdrop-blur-md py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted text-xs tracking-widest uppercase">
          Build. Validate. Execute. © 2026 FinfreeX Systems.
        </div>
      </footer>
    </main>
  );
}
