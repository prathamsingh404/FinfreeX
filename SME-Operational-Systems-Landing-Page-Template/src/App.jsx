import React, { useState, useEffect, useRef } from "react";
import {
  navLinks,
  channels,
  flowSteps,
  problems,
  mechanismSteps,
  systems,
  methodSteps,
  useCases,
  metrics,
  trust,
} from "./data";

/* ─────────────────────────────────────────────
   SENY SYMBOL
───────────────────────────────────────────── */
function SenySymbol({ size = 3.5, light = false }) {
  const main = light ? "#F6F6F4" : "#1F2326";
  const accent = light ? "#A8B09C" : "#3F4A3A";
  const sw = size * 2.6;
  const lw = size * 4.4;
  return (
    <span className="s-symbol" style={{ "--sg": `${size}px` }}>
      <span className="s-row">
        <span className="s-bar" style={{ width: sw, height: size, background: main }} />
        <span className="s-bar" style={{ width: lw, height: size, background: main }} />
      </span>
      <span className="s-row">
        <span className="s-bar" style={{ width: sw, height: size, background: accent }} />
        <span className="s-bar" style={{ width: lw, height: size, background: accent }} />
      </span>
      <span className="s-row">
        <span className="s-bar" style={{ width: sw, height: size, background: main }} />
        <span className="s-bar" style={{ width: lw, height: size, background: main }} />
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────
   REVEAL ON SCROLL
───────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: 0.05 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────
   HEADER
───────────────────────────────────────────── */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <a href="#" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SenySymbol size={3.2} light={false} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.6px" }}>Seny</span>
      </a>
      <nav className="header-nav">
        {navLinks.map((l) => (
          <a key={l.label} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
      <a href="#contact" className="btn btn-primary">
        Operational review
      </a>
    </header>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-grid" />
      <div className="hero-inner">
        <div>
          <div className="hero-eyebrow">
            <SenySymbol size={2.5} light={true} />
            Seny · Operational Systems for SMEs
          </div>
          <h1 className="hero-title">
            Stop losing revenue between messages, calls, forms, and{" "}
            <em>follow-ups.</em>
          </h1>
          <p className="hero-desc">
            Seny installs simple operational systems for service businesses
            that need better response, cleaner workflows, stronger follow-up,
            and clearer evidence.
          </p>
          <div className="hero-actions">
            <a href="#contact" className="btn btn-light-on-dark btn-lg">
              Request an operational review
              <iconify-icon icon="solar:arrow-right-linear" />
            </a>
            <a href="#problem" className="btn btn-ghost-dark btn-lg">
              See what we fix
            </a>
          </div>
          <div className="hero-support">
            Built in Valencia · Designed for SMEs across Spain, Europe, and North America
          </div>
        </div>
        <OperationalPanel />
      </div>
    </section>
  );
}

function OperationalPanel() {
  return (
    <div className="op-panel">
      <div className="op-panel-header">
        <div className="op-panel-title">Operational map · Live view</div>
        <div className="op-panel-status">Capturing</div>
      </div>

      <div className="op-flow">
        <div>
          <div className="op-col-label">Incoming · scattered</div>
          {channels.map((c) => (
            <div key={c.label} className="op-channel">
              <iconify-icon icon={c.icon} />
              <span>{c.label}</span>
              <span className="op-channel-bar" />
            </div>
          ))}
        </div>

        <div className="op-arrow">
          <svg viewBox="0 0 28 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 8 Q 14 8 14 40 Q 14 72 26 72"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M2 28 Q 14 28 14 40 Q 14 52 26 52"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M2 48 Q 14 48 14 40 Q 14 32 26 32"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        <div>
          <div className="op-col-label">Operating flow · aligned</div>
          {flowSteps.map((s, i) => (
            <div key={s} className="op-step">
              <span className="op-step-num">0{i + 1}</span>
              <span>{s}</span>
              <span className="op-step-bar" />
            </div>
          ))}
        </div>
      </div>

      <div className="op-panel-footer">
        <div className="op-mini">
          <span className="op-mini-label">Owned</span>
          <span className="op-mini-value">100%</span>
        </div>
        <div className="op-mini">
          <span className="op-mini-label">Routed</span>
          <span className="op-mini-value">&lt; 5m</span>
        </div>
        <div className="op-mini">
          <span className="op-mini-label">Measured</span>
          <span className="op-mini-value">Every step</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROBLEM
───────────────────────────────────────────── */
function Problem() {
  return (
    <section className="section section-alt" id="problem">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">What we fix</div>
          <h2 className="sec-title">
            Revenue does not disappear at once. It leaks through small
            operational gaps.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            We are not losing money because we are lazy. We are losing money
            because the operation is scattered. Seny makes the leakage
            visible — then fixable.
          </p>
        </div>
        <div className="g4 reveal">
          {problems.map((p) => (
            <div key={p.title} className="problem-card">
              <div className="problem-icon">
                <iconify-icon icon={p.icon} />
              </div>
              <h3 className="problem-title">{p.title}</h3>
              <p className="problem-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MECHANISM
───────────────────────────────────────────── */
function Mechanism() {
  return (
    <section className="section">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">The mechanism</div>
          <h2 className="sec-title">
            We do not add more tools.
            <br />
            We install a simple operating layer.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            Tools are not the system. The system is how work moves, who owns
            it, what happens next, and what gets measured.
          </p>
        </div>

        <div className="mechanism-flow reveal">
          <div className="mech-list">
            {mechanismSteps.map((s, i) => (
              <div key={s} className="mech-item">
                <span className="mech-item-num">0{i + 1}</span>
                <span className="mech-item-bar" />
                <span className="mech-item-text">{s}</span>
              </div>
            ))}
          </div>

          <div className="mech-visual">
            <div style={{ position: "relative" }}>
              <div className="mech-stage-label">Before · scattered inputs</div>
              <div className="mech-bars-scattered">
                <span className="b" /><span className="b" /><span className="b" />
                <span className="b" /><span className="b" /><span className="b" />
                <span className="b" /><span className="b" /><span className="b" />
              </div>
              <div className="mech-stage-label">After · aligned operating rows</div>
              <div className="mech-bars-aligned">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="mech-row">
                    <span className="a1" />
                    <span className="a2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SYSTEMS
───────────────────────────────────────────── */
function Systems() {
  return (
    <section className="section section-alt" id="systems">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">Systems</div>
          <h2 className="sec-title">
            Three systems. One operating principle: less leakage, more clarity.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            Each system is calibrated to a specific kind of business and a
            specific kind of leakage. We install only what the operation needs.
          </p>
        </div>

        <div className="g3 reveal">
          {systems.map((s) => (
            <article key={s.title} className="system-card">
              <div className="system-card-icon">
                <iconify-icon icon={s.icon} />
              </div>
              <div className="system-card-tag">{s.tag}</div>
              <h3 className="system-card-title">{s.title}</h3>
              <p className="system-card-for">{s.for}</p>

              <div className="system-card-section">
                <div className="system-card-section-label">What it fixes</div>
                <p className="system-card-section-text">{s.fixes}</p>
              </div>
              <div className="system-card-section">
                <div className="system-card-section-label">What changes</div>
                <p className="system-card-section-text">{s.changes}</p>
              </div>

              <a href="#contact" className="system-card-link">
                Explore system
                <iconify-icon icon="solar:arrow-right-linear" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   METHOD
───────────────────────────────────────────── */
function Method() {
  return (
    <section className="section" id="method">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">The method</div>
          <h2 className="sec-title">
            From leakage to operating system in four steps.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            A clear path. Low risk on day one. Measurable change within weeks.
          </p>
        </div>

        <div className="method-grid reveal">
          {methodSteps.map((m) => (
            <div key={m.n} className="method-card">
              <div className="method-num">{m.n} · Step</div>
              <h3 className="method-title">{m.title}</h3>
              <p className="method-desc">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="method-timeline reveal">
          <div className="method-timeline-item">
            <span className="method-timeline-label">Diagnostic</span>
            <span className="method-timeline-value">3 — 7 days</span>
          </div>
          <div className="method-timeline-item">
            <span className="method-timeline-label">First implementation</span>
            <span className="method-timeline-value">7 — 14 days</span>
          </div>
          <div className="method-timeline-item">
            <span className="method-timeline-label">Improvement</span>
            <span className="method-timeline-value">Monthly</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   USE CASES
───────────────────────────────────────────── */
function UseCases() {
  const [active, setActive] = useState(useCases[0].id);
  const current = useCases.find((u) => u.id === active);
  return (
    <section className="section section-alt" id="use-cases">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">Use cases</div>
          <h2 className="sec-title">
            Built for businesses where small operational gaps become real
            financial loss.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            The thread is always the same: leads, agenda, operations, or
            evidence. Different businesses, same operating logic.
          </p>
        </div>

        <div className="reveal">
          <div className="usecase-tabs" role="tablist">
            {useCases.map((u) => (
              <button
                key={u.id}
                className={`usecase-tab ${active === u.id ? "active" : ""}`}
                onClick={() => setActive(u.id)}
                role="tab"
                aria-selected={active === u.id}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="usecase-panel">
            <div>
              <div className="pill" style={{ marginBottom: 16 }}>
                {current.label}
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--text-primary)", marginBottom: 16 }}>
                {current.desc}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                Operating thread · capture → respond → schedule → measure
              </p>
            </div>
            <div className="usecase-thread-list">
              {current.threads.map((t) => (
                <div key={t.text} className="usecase-thread">
                  <iconify-icon icon={t.icon} />
                  <span>{t.text}</span>
                  <span className="usecase-thread-bar" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   METRICS
───────────────────────────────────────────── */
function Metrics() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setAnimated(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="section">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">What we measure</div>
          <h2 className="sec-title">What gets measured gets recovered.</h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            We do not invent performance numbers. We track operating signals
            so leakage becomes visible — and recovery becomes provable.
          </p>
        </div>

        <div className="metrics-grid reveal" ref={ref}>
          {metrics.map((m) => (
            <div key={m.label} className="metric-cell">
              <div className="metric-label">{m.label}</div>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{ width: animated ? `${m.fill}%` : "0%" }}
                />
              </div>
              <div className="metric-status">Tracked</div>
            </div>
          ))}
        </div>

        <div className="metrics-example reveal">
          <div className="metrics-example-header">
            <div className="metrics-example-title">Operating view · last 30 days</div>
            <div className="metrics-example-tag">Example · illustrative, not client data</div>
          </div>
          <div className="metrics-example-grid">
            <div className="metrics-example-cell">
              <span className="metrics-example-cell-label">Leads received</span>
              <span className="metrics-example-cell-value">428</span>
              <div className="metrics-example-cell-bar">
                <div className="metrics-example-cell-bar-fill" style={{ width: "82%" }} />
              </div>
            </div>
            <div className="metrics-example-cell">
              <span className="metrics-example-cell-label">Response time</span>
              <span className="metrics-example-cell-value">4m</span>
              <div className="metrics-example-cell-bar">
                <div className="metrics-example-cell-bar-fill" style={{ width: "62%" }} />
              </div>
            </div>
            <div className="metrics-example-cell">
              <span className="metrics-example-cell-label">Appointments</span>
              <span className="metrics-example-cell-value">312</span>
              <div className="metrics-example-cell-bar">
                <div className="metrics-example-cell-bar-fill" style={{ width: "88%" }} />
              </div>
            </div>
            <div className="metrics-example-cell">
              <span className="metrics-example-cell-label">Reactivated</span>
              <span className="metrics-example-cell-value">47</span>
              <div className="metrics-example-cell-bar">
                <div className="metrics-example-cell-bar-fill" style={{ width: "44%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   DIFFERENTIATION CALLOUT
───────────────────────────────────────────── */
function Callout() {
  return (
    <section className="section">
      <div className="section-narrow">
        <div className="callout reveal">
          <div className="callout-content">
            <div className="pill pill-dark" style={{ marginBottom: 22 }}>
              The distinction
            </div>
            <p className="callout-quote">
              Another tool will not fix a scattered operation. Seny installs
              the <em>operating layer</em> that makes the tools useful.
            </p>
            <p className="callout-sub">
              Most competitors sell tools, automations, websites, dashboards,
              or AI chatbots. Seny sells operational clarity — the layer that
              decides how work moves, who owns it, what happens next, and what
              gets measured.
            </p>
          </div>
          <div className="callout-visual">
            <div className="callout-row">
              <span className="callout-row-label">More tools added</span>
              <span className="callout-row-bar">
                <span className="callout-bar-bad" />
                <span className="callout-bar-bad" />
                <span className="callout-bar-bad" />
              </span>
            </div>
            <div className="callout-row">
              <span className="callout-row-label">Scattered ownership</span>
              <span className="callout-row-bar">
                <span className="callout-bar-bad" />
                <span className="callout-bar-bad" />
              </span>
            </div>
            <div className="callout-row" style={{ background: "rgba(168,176,156,0.08)", borderColor: "rgba(168,176,156,0.22)" }}>
              <span className="callout-row-label" style={{ color: "var(--brand-offwhite)" }}>
                Operating layer installed
              </span>
              <span className="callout-row-bar">
                <span className="callout-bar-good" />
                <span className="callout-bar-good" />
                <span className="callout-bar-good" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TRUST
───────────────────────────────────────────── */
function Trust() {
  return (
    <section className="section section-alt">
      <div className="section-narrow">
        <div className="reveal">
          <div className="sec-eyebrow">Principles</div>
          <h2 className="sec-title">
            Automation where it helps. Human judgment where it matters.
          </h2>
          <div className="sec-divider" />
          <p className="sec-sub">
            Calm by design. Scope-limited by default. Measurable by structure.
          </p>
        </div>

        <div className="trust-grid reveal">
          {trust.map((t) => (
            <div key={t.title} className="trust-card">
              <div className="trust-icon">
                <iconify-icon icon={t.icon} />
              </div>
              <h3 className="trust-title">{t.title}</h3>
              <p className="trust-desc">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="final-cta" id="contact">
      <div className="final-cta-inner reveal">
        <div className="pill pill-dark" style={{ marginBottom: 28 }}>
          Operational review · Low risk first step
        </div>
        <h2 className="final-cta-title">
          Find where your operation is leaking revenue.
        </h2>
        <p className="final-cta-sub">
          Start with a focused operational review. We map the leakage,
          identify the highest-impact fixes, and show what system should be
          installed first.
        </p>
        <div className="final-cta-actions">
          <a href="#" className="btn btn-light-on-dark btn-lg">
            Request an operational review
            <iconify-icon icon="solar:arrow-right-linear" />
          </a>
          <a href="#" className="btn btn-ghost-dark btn-lg">
            Start with a simple diagnostic
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          <SenySymbol size={3} light={true} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--brand-offwhite)", letterSpacing: "-0.4px" }}>
            Seny
          </span>
          <span style={{ marginLeft: 12 }}>
            Operational systems for SMEs · Built in Valencia
          </span>
        </div>
        <div className="footer-right">
          <a href="#problem">What we fix</a>
          <a href="#systems">Systems</a>
          <a href="#method">Method</a>
          <a href="#contact">Contact</a>
          <span>© 2026 Seny</span>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   APP
───────────────────────────────────────────── */
export default function App() {
  useReveal();
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <Mechanism />
        <Systems />
        <Method />
        <UseCases />
        <Metrics />
        <Callout />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}