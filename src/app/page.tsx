'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Play,
  LayoutDashboard,
  Wand2,
  Palette,
  Download,
  Paintbrush,
  Target,
  MonitorSmartphone,
  RefreshCw,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';

/* ─────────────── LANDING NAV ─────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [onLight, setOnLight] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Detect when nav overlaps light sections
  useEffect(() => {
    const lightSections = document.querySelectorAll('.lp-section-light');
    const obs = new IntersectionObserver(
      (entries) => {
        // Check if any light section is intersecting at the top of viewport
        const anyLight = entries.some((e) => {
          if (!e.isIntersecting) return false;
          const rect = e.boundingClientRect;
          return rect.top <= 80 && rect.bottom > 80;
        });
        setOnLight(anyLight);
      },
      { threshold: [0, 0.1, 0.5, 1], rootMargin: '-80px 0px -80% 0px' }
    );
    lightSections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const navBg = !scrolled
    ? 'transparent'
    : onLight
    ? 'rgba(244, 243, 239, 0.90)'
    : 'rgba(7, 7, 11, 0.85)';
  const navBorder = !scrolled
    ? '1px solid transparent'
    : onLight
    ? '1px solid rgba(0,0,0,0.07)'
    : '1px solid rgba(255,255,255,0.07)';
  const linkColor = onLight && scrolled ? '#0C0C12' : '#5F5F75';
  const logoColor = onLight && scrolled ? '#0C0C12' : '#ECEAF4';

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100]"
      style={{
        background: navBg,
        backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        borderBottom: navBorder,
        padding: scrolled ? '12px 0' : '18px 0',
        transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: '#3B9EFF' }} />
          <span
            className="text-lg font-bold font-display"
            style={{ color: logoColor, transition: 'color 0.35s ease' }}
          >
            AdGen AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Pricing', 'Testimonials'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium"
              style={{ color: linkColor, transition: 'color 0.35s ease' }}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium"
            style={{ color: linkColor, transition: 'color 0.35s ease' }}
          >
            Dashboard
          </Link>
          <Link
            href="/create"
            className="cta-primary text-sm font-semibold inline-flex items-center gap-2"
          >
            Get Started Free
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: '#ECEAF4' }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden px-4 pb-4 pt-2 flex flex-col gap-3"
          style={{
            background: 'rgba(6,6,9,0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {['Features', 'Pricing', 'Testimonials'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium py-2"
              style={{ color: '#ECEAF4' }}
              onClick={() => setMobileOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link
            href="/create"
            className="cta-primary text-sm font-semibold text-center mt-2"
            onClick={() => setMobileOpen(false)}
          >
            Get Started Free
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ─────────────── STAT COUNTER ─────────────── */
function StatCounter({
  target,
  suffix = '',
  duration = 1800,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {started && count >= target ? suffix : ''}
    </span>
  );
}

/* ─────────────── DATA ─────────────── */
const WALKTHROUGH = [
  {
    num: '01',
    title: 'Enter Your Business Details',
    desc: 'Tell us about your business, products, and target audience. Our AI understands your industry context.',
    icon: LayoutDashboard,
  },
  {
    num: '02',
    title: 'AI Generates Campaign Ideas',
    desc: 'Get 5 unique campaign concepts with themes, copy, and visual direction tailored to your brand.',
    icon: Wand2,
  },
  {
    num: '03',
    title: 'Select & Customize',
    desc: 'Pick your favorites, tweak the copy, adjust colors and style. Make each ad uniquely yours.',
    icon: Palette,
  },
  {
    num: '04',
    title: 'Download & Publish',
    desc: 'Export publish-ready ads in multiple formats. Direct integration with major ad platforms.',
    icon: Download,
  },
];

const GRID_FEATURES = [
  {
    icon: Wand2,
    title: 'AI-Powered Generation',
    desc: 'Create stunning ads from text descriptions in seconds',
  },
  {
    icon: Paintbrush,
    title: 'Brand Consistency',
    desc: 'Your brand colors, fonts, and style applied automatically',
  },
  {
    icon: MonitorSmartphone,
    title: 'Multi-Format Export',
    desc: 'Instagram, Facebook, Google Ads — all sizes in one click',
  },
  {
    icon: Target,
    title: 'A/B Test Variations',
    desc: 'Generate multiple variations to find what converts best',
  },
  {
    icon: RefreshCw,
    title: 'Bulk Generation',
    desc: 'Create entire campaign suites in minutes, not weeks',
  },
  {
    icon: BarChart3,
    title: 'Performance Insights',
    desc: 'AI-driven suggestions based on ad performance data',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'AdGen AI cut our ad creation time from 3 days to 15 minutes. The quality rivals our agency work.',
    name: 'Sarah Chen',
    role: 'Marketing Director',
    company: 'Bloom Commerce',
  },
  {
    quote:
      "We went from spending $5,000/month on design agencies to creating better ads in-house. Game changer.",
    name: 'Marcus Rivera',
    role: 'Founder & CEO',
    company: 'Launchpad Digital',
  },
  {
    quote:
      'The AI understands our brand better than most junior designers. Every ad feels on-brand and professional.',
    name: 'Emily Nakamura',
    role: 'Head of Growth',
    company: 'Stackwise',
  },
];

const PRICING = [
  {
    name: 'Starter',
    monthly: 0,
    annual: 0,
    desc: 'Perfect for trying out AI ad generation',
    features: [
      '10 ad generations / month',
      'Standard resolution',
      '3 campaign ideas',
      'Basic templates',
      'Email support',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    monthly: 29,
    annual: 24,
    desc: 'For growing businesses and marketers',
    features: [
      'Unlimited generations',
      '2K resolution export',
      'Unlimited campaign ideas',
      'Brand kit storage',
      'A/B variations',
      'Priority support',
      'Custom templates',
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthly: 99,
    annual: 79,
    desc: 'For teams and agencies at scale',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'API access',
      'Custom AI training',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO & security',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const STATS = [
  { value: 12000, suffix: '+', label: 'Teams worldwide', upperLabel: 'ACTIVE TEAMS' },
  { value: 500, suffix: 'K+', label: 'Ads generated', upperLabel: 'ADS CREATED' },
  { value: 10, suffix: 'x', label: 'Faster creation', upperLabel: 'SPEED BOOST' },
  { value: 98, suffix: '%', label: 'Satisfaction rate', upperLabel: 'HAPPY USERS' },
];

/* ─────────────── MAIN PAGE ─────────────── */
export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [dashTilt, setDashTilt] = useState(6);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* hero entrance */
  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  /* scroll-triggered section stagger — observe sections, reveal [data-animate] children */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target
              .querySelectorAll('[data-animate]')
              .forEach((el, i) => {
                setTimeout(() => {
                  el.classList.add('is-visible');
                }, i * 110);
              });
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.15 }
    );
    document
      .querySelectorAll('.lp-section')
      .forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  /* dashboard tilt flatten */
  useEffect(() => {
    const onScroll = () =>
      setDashTilt(Math.max(0, 6 - window.scrollY / 100));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* walkthrough active step */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = stepRefs.current.indexOf(
              e.target as HTMLDivElement
            );
            if (idx >= 0) setActiveStep(idx);
          }
        }),
      { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
    );
    stepRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <LandingNav />

      {/* ═══ SECTION 1 · HERO — Dark ═══ */}
      <section
        className="lp-section lp-section-dark relative"
        style={{
          paddingTop: '160px',
          paddingBottom: 0,
        }}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            zIndex: 0,
          }}
        />
        {/* Glow orb 1 - centered behind headline */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '700px',
            height: '450px',
            background: 'radial-gradient(ellipse, rgba(59,158,255,0.09), transparent 70%)',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 0,
          }}
        />
        {/* Glow orb 2 - bottom left */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '400px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(59,158,255,0.05), transparent 70%)',
            bottom: '5%',
            left: '5%',
            zIndex: 0,
          }}
        />
        <div className="section-content container mx-auto px-4 flex flex-col items-center text-center relative" style={{ zIndex: 1 }}>
          {/* badge */}
          <div
            data-animate
            className="inline-flex items-center gap-2 mb-8"
            style={{
              background: 'rgba(59,158,255,0.08)',
              border: '1px solid rgba(59,158,255,0.25)',
              borderRadius: '100px',
              padding: '6px 14px 6px 10px',
              fontSize: '13px',
              color: '#3B9EFF',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: '#3B9EFF',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }}
            />
            New: AI-Powered Ad Generation
          </div>

          {/* ghost headline */}
          <h1
            className="font-display leading-none mb-6"
            style={{
              fontSize: 'clamp(52px, 8vw, 108px)',
              fontWeight: 700,
              lineHeight: 1.0,
            }}
          >
            {[
              { text: 'Design manually.', color: 'rgba(236,234,244,0.09)', delay: '0ms' },
              { text: 'Hire agencies.', color: 'rgba(236,234,244,0.28)', delay: '150ms' },
            ].map((line) => (
              <span
                key={line.text}
                className="block"
                style={{
                  color: line.color,
                  transform: heroLoaded ? 'translateY(0)' : 'translateY(24px)',
                  opacity: heroLoaded ? 1 : 0,
                  transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
                  transitionDelay: line.delay,
                }}
              >
                {line.text}
              </span>
            ))}
            <span
              className="block"
              style={{
                color: '#ECEAF4',
                transform: heroLoaded ? 'translateY(0)' : 'translateY(24px)',
                opacity: heroLoaded ? 1 : 0,
                transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: '300ms',
              }}
            >
              Generate with{' '}
              <span
                style={{
                  color: '#3B9EFF',
                  textShadow: heroLoaded
                    ? '0 0 60px rgba(59,158,255,0.40)'
                    : 'none',
                  transition: 'text-shadow 1s ease',
                  transitionDelay: '600ms',
                }}
              >
                AI.
              </span>
            </span>
          </h1>

          {/* sub */}
          <p
            data-animate
            className="mb-8"
            style={{
              fontSize: '18px',
              color: '#5F5F75',
              maxWidth: '500px',
              lineHeight: 1.72,
            }}
          >
            Create stunning, publish-ready marketing ads in seconds. No
            design skills required. Just describe your business and let AI
            do the rest.
          </p>

          {/* CTA row */}
          <div
            data-animate
            className="flex flex-col sm:flex-row items-center gap-4 mb-6"
          >
            <Link
              href="/create"
              className="cta-primary inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="cta-ghost inline-flex items-center gap-2">
              <Play className="h-4 w-4" />
              Watch Demo
            </button>
          </div>

          {/* social micro */}
          <div
            data-animate
            className="flex items-center gap-1 mb-16"
            style={{ fontSize: '13px', color: '#5F5F75' }}
          >
            <div className="flex" style={{ color: '#3B9EFF' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span className="ml-2">Loved by 12,000+ teams</span>
          </div>

          {/* dashboard mockup */}
          <div
            className="w-full max-w-[1000px] mx-auto"
            style={{
              transform: heroLoaded
                ? `perspective(1200px) rotateX(${dashTilt}deg)`
                : 'perspective(1200px) rotateX(6deg) translateY(80px)',
              opacity: heroLoaded ? 1 : 0,
              transition:
                'transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.8s ease',
              transitionDelay: '500ms',
            }}
          >
            <div
              style={{
                background: '#0D0D16',
                borderRadius: '16px 16px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,158,255,0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Top bar */}
              <div
                style={{
                  height: '40px',
                  background: '#111120',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Traffic dots */}
                <div className="flex gap-2">
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
                </div>
                {/* URL bar */}
                <div className="flex-1 flex justify-center">
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '100px',
                      padding: '6px 16px',
                      fontSize: '12px',
                      color: '#5F5F75',
                    }}
                  >
                    app.adgenai.com
                  </div>
                </div>
                <div style={{ width: 60 }} />
              </div>

              <div className="flex" style={{ minHeight: '340px' }}>
                {/* Left sidebar */}
                <div
                  className="hidden sm:block"
                  style={{
                    width: '180px',
                    background: '#0A0A12',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    padding: '16px 10px',
                  }}
                >
                  {[
                    { name: 'Dashboard', active: false },
                    { name: 'Campaigns', active: true },
                    { name: 'Brand Kit', active: false },
                    { name: 'Analytics', active: false },
                    { name: 'Settings', active: false },
                  ].map((item) => (
                    <div
                      key={item.name}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: item.active ? 'rgba(59,158,255,0.12)' : 'transparent',
                        color: item.active ? '#3B9EFF' : '#5F5F75',
                        cursor: 'pointer',
                      }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>

                {/* Main area */}
                <div className="flex-1" style={{ padding: '20px' }}>
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-5">
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#ECEAF4' }}>My Campaigns</span>
                    <button
                      style={{
                        background: '#3B9EFF',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                      }}
                    >
                      + New Campaign
                    </button>
                  </div>

                  {/* Ad card grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { gradient: 'linear-gradient(135deg, #1a1a3e, #2d2d6b)', platform: 'FB' },
                      { gradient: 'linear-gradient(135deg, #1e2d1a, #2d4a26)', platform: 'IG' },
                      { gradient: 'linear-gradient(135deg, #2d1a1a, #5a2d2d)', platform: 'Google' },
                      { gradient: 'linear-gradient(135deg, #1a2d2d, #264a4a)', platform: 'FB' },
                      { gradient: 'linear-gradient(135deg, #2d2a1a, #4a4226)', platform: 'IG' },
                      { gradient: 'linear-gradient(135deg, #251a2d, #3d264a)', platform: 'Google' },
                    ].map((card, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#131322',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Ad image preview */}
                        <div
                          style={{
                            height: '90px',
                            background: card.gradient,
                          }}
                        />
                        {/* Card bottom */}
                        <div style={{ padding: '10px' }}>
                          <div
                            style={{
                              height: '8px',
                              width: '70%',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              marginBottom: '6px',
                            }}
                          />
                          <div
                            style={{
                              height: '6px',
                              width: '50%',
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '3px',
                              marginBottom: '8px',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              color: '#5F5F75',
                              background: 'rgba(255,255,255,0.05)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {card.platform}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2 · SOCIAL PROOF — Light ═══ */}
      <section
        className="lp-section lp-section-light relative"
        style={{ paddingTop: '60px', paddingBottom: '60px' }}
      >
        <div className="section-content container mx-auto px-4 text-center">
          <p
            data-animate
            className="mb-8"
            style={{
              fontSize: '13px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#707088',
              fontWeight: 500,
            }}
          >
            Trusted by teams at
          </p>
          <div
            className="relative overflow-hidden"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <div
              className="flex items-center gap-16 whitespace-nowrap"
              style={{
                animation: 'marquee 25s linear infinite',
                width: 'max-content',
              }}
            >
              {[...Array(2)].flatMap((_, setIdx) =>
                [
                  'Vercel',
                  'Stripe',
                  'Notion',
                  'Linear',
                  'Figma',
                  'Supabase',
                  'Shopify',
                  'Webflow',
                ].map((name) => (
                  <span
                    key={`${setIdx}-${name}`}
                    className="text-xl font-bold tracking-tight font-display"
                    style={{
                      color: 'rgba(14,14,24,0.18)',
                      minWidth: '120px',
                      textAlign: 'center',
                    }}
                  >
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 · FEATURES WALKTHROUGH — Dark ═══ */}
      <section
        id="features"
        className="lp-section lp-section-dark"
      >
        <div className="section-content container mx-auto px-4">
          <p data-animate className="lp-label">
            — How It Works
          </p>
          <h2
            data-animate
            className="font-display mb-16"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              fontWeight: 650,
              lineHeight: 1.1,
            }}
          >
            <span style={{ color: 'rgba(236,234,244,0.14)' }}>
              Four steps.
            </span>
            <br />
            <span style={{ color: '#ECEAF4' }}>Infinite <span style={{ color: '#3B9EFF' }}>possibilities.</span></span>
          </h2>

          <div
            className="walkthrough-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'start',
            }}
          >
            {/* left steps */}
            <div className="flex flex-col gap-4">
              {WALKTHROUGH.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    ref={(el) => { stepRefs.current[i] = el; }}
                    className={`walkthrough-step ${
                      activeStep === i ? 'active' : ''
                    }`}
                    onClick={() => setActiveStep(i)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="font-mono text-sm font-bold"
                        style={{
                          color:
                            activeStep === i
                              ? '#3B9EFF'
                              : 'rgba(59,158,255,0.3)',
                        }}
                      >
                        {step.num}
                      </span>
                      <div className="feature-icon">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3
                      className="text-lg font-semibold mb-1"
                      style={{ color: '#ECEAF4', fontSize: '22px', fontWeight: 600 }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm"
                      style={{
                        color: '#5F5F75',
                        lineHeight: 1.72,
                        maxWidth: '380px',
                      }}
                    >
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* right sticky panel */}
            <div className="sticky-panel">
              <div
                className="relative"
                style={{
                  minHeight: '420px',
                }}
              >
                {/* Panel 1 - Enter Business Details */}
                <div
                  style={{
                    position: activeStep === 0 ? 'relative' : 'absolute',
                    inset: 0,
                    opacity: activeStep === 0 ? 1 : 0,
                    transform: activeStep === 0 ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: activeStep === 0 ? 'auto' : 'none',
                    background: '#0D0D16',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    padding: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#ECEAF4', marginBottom: '20px' }}>Tell us about your business</div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: '#5F5F75', display: 'block', marginBottom: '6px' }}>Business name</label>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px', color: '#707088', fontSize: '14px' }}>Acme Inc.</div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '12px', color: '#5F5F75', display: 'block', marginBottom: '6px' }}>Describe your product or service...</label>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px', color: '#707088', fontSize: '14px', minHeight: '80px' }}>We sell premium coffee beans sourced from sustainable farms...</div>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '12px', color: '#5F5F75', display: 'block', marginBottom: '8px' }}>Target platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {['Instagram', 'Facebook', 'Google Ads'].map((p) => (
                        <span key={p} style={{ background: 'rgba(59,158,255,0.12)', color: '#3B9EFF', fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '100px' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <button style={{ width: '100%', background: '#3B9EFF', color: '#fff', fontSize: '14px', fontWeight: 600, padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Continue →</button>
                </div>

                {/* Panel 2 - AI Generates Campaign Ideas */}
                <div
                  style={{
                    position: activeStep === 1 ? 'relative' : 'absolute',
                    inset: 0,
                    opacity: activeStep === 1 ? 1 : 0,
                    transform: activeStep === 1 ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: activeStep === 1 ? 'auto' : 'none',
                    background: '#0D0D16',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    padding: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B9EFF', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '13px', color: '#5F5F75' }}>AI is generating...</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { title: 'Summer Sale Campaign', gradient: 'linear-gradient(135deg, #1a1a3e, #2d2d6b)' },
                      { title: 'Brand Awareness Push', gradient: 'linear-gradient(135deg, #1e2d1a, #2d4a26)' },
                      { title: 'Product Launch Promo', gradient: 'linear-gradient(135deg, #2d1a1a, #5a2d2d)' },
                    ].map((c, i) => (
                      <div key={i} style={{ background: '#131322', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: c.gradient, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#ECEAF4', marginBottom: '4px' }}>{c.title}</div>
                          <div style={{ fontSize: '12px', color: '#5F5F75' }}>3 variations • Multi-platform</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '20px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#3B9EFF', animation: 'progress-fill 2s ease-in-out infinite', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Panel 3 - Select & Customize */}
                <div
                  style={{
                    position: activeStep === 2 ? 'relative' : 'absolute',
                    inset: 0,
                    opacity: activeStep === 2 ? 1 : 0,
                    transform: activeStep === 2 ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: activeStep === 2 ? 'auto' : 'none',
                    background: '#0D0D16',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    padding: '24px',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex gap-4">
                    {/* Ad preview */}
                    <div style={{ flex: 1, background: 'linear-gradient(135deg, #1a1a3e, #2d2d6b)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', position: 'relative' }}>
                      <span style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.2)' }}>Your Ad</span>
                    </div>
                    {/* Controls */}
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', color: '#5F5F75', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headline</label>
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', color: '#ECEAF4', fontSize: '13px' }}>Summer Savings!</div>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', color: '#5F5F75', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colors</label>
                        <div className="flex gap-2">
                          {['#3B9EFF', '#FF6B6B', '#4ADE80', '#FBBF24'].map((c) => (
                            <span key={c} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: c === '#3B9EFF' ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '11px', color: '#5F5F75', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Style</label>
                        <div className="flex gap-2">
                          <span style={{ background: 'rgba(59,158,255,0.12)', color: '#3B9EFF', fontSize: '12px', fontWeight: 500, padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(59,158,255,0.3)' }}>Bold</span>
                          <span style={{ background: 'rgba(255,255,255,0.04)', color: '#5F5F75', fontSize: '12px', fontWeight: 500, padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>Clean</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#5F5F75' }}>Preview updates live</div>
                    </div>
                  </div>
                </div>

                {/* Panel 4 - Download & Publish */}
                <div
                  style={{
                    position: activeStep === 3 ? 'relative' : 'absolute',
                    inset: 0,
                    opacity: activeStep === 3 ? 1 : 0,
                    transform: activeStep === 3 ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: activeStep === 3 ? 'auto' : 'none',
                    background: '#0D0D16',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    padding: '24px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    minHeight: '300px',
                  }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59,158,255,0.15)', border: '2px solid #3B9EFF', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
                    <Check style={{ width: '28px', height: '28px', color: '#3B9EFF' }} />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#ECEAF4', marginBottom: '8px' }}>3 ads exported successfully</div>
                  <div className="flex items-center justify-center gap-4 mb-6" style={{ fontSize: '13px', color: '#5F5F75' }}>
                    <span>Facebook</span>
                    <span>Instagram</span>
                    <span>Google Ads</span>
                  </div>
                  <button style={{ background: '#3B9EFF', color: '#fff', fontSize: '14px', fontWeight: 600, padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>Download All</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 · FEATURE GRID — Light ═══ */}
      <section className="lp-section lp-section-light">
        <div className="section-content container mx-auto px-4">
          <div className="text-center mb-16">
            <p data-animate className="lp-label">
              — Everything You Need
            </p>
            <h2
              data-animate
              className="font-display"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 72px)',
                fontWeight: 650,
                lineHeight: 1.1,
              }}
            >
              <span style={{ color: 'rgba(12,12,18,0.15)' }}>Built for modern</span>
              <br />
              <span style={{ color: '#0C0C12' }}>marketers.</span>
            </h2>
          </div>

          <div
            className="bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
            }}
          >
            {GRID_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isLarge = i < 2;
              return (
                <div
                  key={f.title}
                  className="bento-card"
                  data-animate
                  style={{
                    gridColumn: isLarge ? 'span 1' : 'span 1',
                    transitionDelay: `${i * 110}ms`,
                  }}
                >
                  <div className="feature-icon-light mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3
                    className="font-semibold mb-2"
                    style={{
                      fontSize: '22px',
                      fontWeight: 600,
                      color: '#0E0E18',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '16px',
                      lineHeight: 1.72,
                      color: '#707088',
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 · TESTIMONIALS — Dark ═══ */}
      <section
        id="testimonials"
        className="lp-section lp-section-dark"
      >
        <div className="section-content container mx-auto px-4">
          <div className="text-center mb-16">
            <p data-animate className="lp-label">
              — Testimonials
            </p>
            <h2
              data-animate
              className="font-display"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 72px)',
                fontWeight: 650,
                lineHeight: 1.1,
              }}
            >
              <span style={{ color: 'rgba(236,234,244,0.14)' }}>
                Don&apos;t take our word.
              </span>
              <br />
              <span style={{ color: '#ECEAF4' }}>
                Take{' '}
                <span
                  style={{
                    color: '#3B9EFF',
                    textShadow: '0 0 60px rgba(59,158,255,0.40)',
                  }}
                >
                  theirs.
                </span>
              </span>
            </h2>
          </div>

          {/* hero quote */}
          <blockquote
            data-animate
            className="text-center mx-auto mb-16"
            style={{
              maxWidth: '700px',
              fontSize: '24px',
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: '#ECEAF4',
            }}
          >
            &ldquo;This is the closest thing to having a full creative team
            on demand. We&apos;ve 10x&apos;d our ad output.&rdquo;
            <div
              className="mt-4 not-italic"
              style={{ fontSize: '14px', color: '#5F5F75' }}
            >
              — Jordan Mitchell, VP Marketing at ScaleGrid
            </div>
          </blockquote>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="testimonial-card"
                data-animate
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                <p
                  className="mb-6"
                  style={{
                    fontSize: '16px',
                    lineHeight: 1.72,
                    color: '#ECEAF4',
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #3B9EFF, #1a5fa8)',
                      color: '#fff',
                    }}
                  >
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ color: '#ECEAF4' }}
                    >
                      {t.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5F5F75' }}>
                      {t.role}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 · PRICING — Light ═══ */}
      <section
        id="pricing"
        className="lp-section lp-section-light"
      >
        <div className="section-content container mx-auto px-4">
          <div className="text-center mb-12">
            <p data-animate className="lp-label">
              — Pricing
            </p>
            <h2
              data-animate
              className="font-display mb-4"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 72px)',
                fontWeight: 650,
                lineHeight: 1.1,
                color: '#0E0E18',
              }}
            >
              Simple, transparent pricing.
            </h2>
            <p
              data-animate
              style={{ fontSize: '18px', color: '#707088', lineHeight: 1.72 }}
            >
              Start free. Scale as you grow.
            </p>
          </div>

          {/* toggle */}
          <div data-animate className="flex justify-center mb-12">
            <div className="pricing-toggle">
              <button
                className={`pricing-toggle-btn ${!annual ? 'active' : ''}`}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                className={`pricing-toggle-btn ${annual ? 'active' : ''}`}
                onClick={() => setAnnual(true)}
              >
                Annual
                <span
                  className="ml-1.5 inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: annual
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(59,158,255,0.12)',
                    color: annual ? '#fff' : '#3B9EFF',
                  }}
                >
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* cards */}
          <div
            className="pricing-cards-grid flex flex-col md:flex-row gap-6 justify-center items-stretch max-w-[1000px] mx-auto"
          >
            {PRICING.map((plan, i) => (
              <div
                key={plan.name}
                className={`pricing-card flex-1 ${
                  plan.popular ? 'pricing-card-popular' : ''
                }`}
                data-animate
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                {plan.popular && (
                  <div
                    className="text-xs font-semibold mb-4 inline-block self-start px-3 py-1 rounded-full"
                    style={{ background: '#3B9EFF', color: '#fff' }}
                  >
                    Most Popular
                  </div>
                )}
                <h3
                  className="font-display text-xl font-bold mb-1"
                  style={{
                    color: plan.popular ? '#ECEAF4' : '#0E0E18',
                  }}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="font-display"
                    style={{
                      fontSize: '48px',
                      fontWeight: 700,
                      color: plan.popular ? '#ECEAF4' : '#0E0E18',
                    }}
                  >
                    $
                    {annual ? plan.annual : plan.monthly}
                  </span>
                  {(annual ? plan.annual : plan.monthly) > 0 && (
                    <span
                      style={{
                        fontSize: '14px',
                        color: plan.popular ? '#5F5F75' : '#707088',
                      }}
                    >
                      /mo
                    </span>
                  )}
                </div>
                <p
                  className="mb-6"
                  style={{
                    fontSize: '14px',
                    color: plan.popular ? '#5F5F75' : '#707088',
                    lineHeight: 1.6,
                  }}
                >
                  {plan.desc}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm"
                      style={{
                        color: plan.popular ? '#ECEAF4' : '#0E0E18',
                      }}
                    >
                      <Check
                        className="h-4 w-4 mt-0.5 flex-shrink-0"
                        style={{ color: '#3B9EFF' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.popular ? (
                  <Link
                    href="/create"
                    className="cta-primary w-full text-center block"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <Link
                    href="/create"
                    className="block w-full text-center py-3 rounded-[10px] font-semibold text-sm transition-all duration-200"
                    style={{
                      border: '1px solid var(--lp-border-light)',
                      color: '#0E0E18',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3B9EFF';
                      e.currentTarget.style.color = '#3B9EFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(0,0,0,0.07)';
                      e.currentTarget.style.color = '#0E0E18';
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 · STATS — Dark ═══ */}
      <section
        className="lp-section lp-section-dark"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div className="section-content container mx-auto px-4">
          <div
            className="stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0',
              textAlign: 'center',
            }}
          >
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                data-animate
                style={{
                  transitionDelay: `${i * 110}ms`,
                  borderRight:
                    i < STATS.length - 1
                      ? '1px solid rgba(255,255,255,0.08)'
                      : 'none',
                  padding: '20px 40px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    color: 'rgba(255,255,255,0.30)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  {stat.upperLabel}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 'clamp(48px, 7vw, 88px)',
                    fontWeight: 700,
                    color: '#3B9EFF',
                    lineHeight: 1,
                    marginBottom: '8px',
                    animation: 'glow-pulse 3s ease-in-out infinite',
                    animationDelay: `${i * 400}ms`,
                  }}
                >
                  <StatCounter
                    target={stat.value}
                    suffix={stat.suffix}
                  />
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#5F5F75',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8 · FINAL CTA — Dark ═══ */}
      <section
        className="lp-section lp-section-dark relative"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(59,158,255,0.08), transparent), #07070B',
        }}
      >
        <div className="section-content container mx-auto px-4 text-center">
          <h2
            data-animate
            className="font-display mb-6"
            style={{
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              fontWeight: 650,
              lineHeight: 1.1,
            }}
          >
            <span style={{ color: 'rgba(236,234,244,0.14)' }}>Ready to transform</span>
            <br />
            <span style={{ color: '#ECEAF4' }}>
              your{' '}
              <span
                style={{
                  color: '#3B9EFF',
                  textShadow: '0 0 60px rgba(59,158,255,0.40)',
                }}
              >
                marketing?
              </span>
            </span>
          </h2>

          <p
            data-animate
            className="mb-10 mx-auto"
            style={{
              fontSize: '18px',
              color: '#5F5F75',
              maxWidth: '480px',
              lineHeight: 1.72,
            }}
          >
            Join thousands of businesses creating professional ads at the
            speed of thought.
          </p>

          <div data-animate className="mb-6">
            <Link
              href="/create"
              className="cta-primary inline-flex items-center gap-2 text-lg px-10 py-4"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <p
            data-animate
            className="flex flex-wrap items-center justify-center gap-2"
            style={{ fontSize: '13px', color: '#5F5F75' }}
          >
            <span>No credit card required</span>
            <span>·</span>
            <span>Free 14-day trial</span>
            <span>·</span>
            <span>Cancel anytime</span>
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer
        style={{
          background: '#07070B',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '40px 0',
        }}
      >
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: '#3B9EFF' }} />
            <span
              className="font-display font-semibold"
              style={{ color: '#ECEAF4' }}
            >
              AdGen AI
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#5F5F75' }}>
            © 2026 AdGen AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
