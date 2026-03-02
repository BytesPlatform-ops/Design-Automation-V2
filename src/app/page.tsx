'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Store,
  Briefcase,
  Monitor,
  Zap,
  Eye,
  Layers,
  Target,
  PenTool,
  Cpu,
  Star,
  ChevronDown,
  Clock,
  Palette,
  BarChart3,
  Shield,
} from 'lucide-react';
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion';
import BlurText from '@/components/reactbits/blur-text';
import ShinyText from '@/components/reactbits/shiny-text';
import GradientText from '@/components/reactbits/gradient-text';
import CountUp from '@/components/reactbits/count-up';
import { TiltCard } from '@/components/landing/tilt-card';

/* ─── Dynamic import for Three.js (SSR disabled) ─────────────── */
const HeroScene = dynamic(() => import('@/components/three/hero-scene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 animate-pulse" />
  ),
});

/* ─── Easing ────────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ─── Data ──────────────────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    title: 'Describe Your Brand',
    desc: 'Business name, industry, product type, target audience, and what makes you stand out. Takes 30 seconds.',
    icon: PenTool,
  },
  {
    num: '02',
    title: 'Get 5 Campaign Concepts',
    desc: 'Our engine analyzes your niche, current trends, seasonal context, and competitor strategies to generate unique campaign ideas.',
    icon: Cpu,
  },
  {
    num: '03',
    title: 'Pick Your Favorites',
    desc: 'Select 1–5 concepts you love. Each one becomes a detailed visual brief with scene composition, typography, and color direction.',
    icon: Target,
  },
  {
    num: '04',
    title: 'Get Publish-Ready Ads',
    desc: 'Our system generates photorealistic ads with your brand name, slogan, pricing, and CTA rendered directly into the image.',
    icon: Sparkles,
  },
];

const TESTIMONIALS = [
  {
    quote:
      'I used to spend hours in Canva or pay freelancers $50 per ad. Now I generate 5 scroll-stopping ads in under a minute. The quality is insane.',
    author: 'Ahmed Khan',
    role: 'Founder, BytesCart',
    initials: 'AK',
    gradient:
      'linear-gradient(135deg, oklch(0.65 0.22 30), oklch(0.55 0.18 50))',
  },
  {
    quote:
      "We launched our new menu campaign in 10 minutes. The system understood our brand's vibe perfectly — warm, inviting, premium. Our CTR doubled.",
    author: 'Maria Rodriguez',
    role: 'Marketing Lead, Saffron Kitchen',
    initials: 'MR',
    gradient:
      'linear-gradient(135deg, oklch(0.60 0.15 185), oklch(0.55 0.12 200))',
  },
  {
    quote:
      "As a solo founder, I can't afford a design team. AdGen gives me agency-quality ads that look like I hired a pro. Game changer.",
    author: 'James Chen',
    role: 'CEO, NovaTech',
    initials: 'JC',
    gradient:
      'linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.60 0.15 300))',
  },
  {
    quote:
      "We tested AdGen ads against our designer-made ones. The AdGen ads outperformed by 40% on engagement. We've fully switched over.",
    author: 'Sarah Williams',
    role: 'Head of Growth, FitPulse',
    initials: 'SW',
    gradient:
      'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.70 0.12 100))',
  },
];

const INDUSTRIES = [
  'Food & Beverage',
  'Fashion',
  'Technology',
  'Health & Wellness',
  'Beauty',
  'Real Estate',
  'Education',
  'Fitness',
  'Automotive',
  'Finance',
  'Travel',
  'E-commerce',
  'Entertainment',
  'Jewelry & Luxury',
  'Home & Garden',
  'SaaS',
];

const BUSINESS_TYPES = [
  {
    icon: Store,
    title: 'Physical Products',
    subtitle: 'Tangible goods you can touch',
    desc: 'Upload your product photo and get studio-quality ads with realistic scene placement, lifestyle photography, and professional lighting.',
    tags: ['Food & Beverage', 'Fashion', 'Electronics', 'Beauty', 'Jewelry'],
    accent: 'from-primary/15 to-amber-400/10',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Briefcase,
    title: 'Services',
    subtitle: 'Experiences & expertise',
    desc: 'Conceptual imagery that communicates your value proposition. Aspirational visuals with key selling points overlaid with editorial precision.',
    tags: ['Education', 'Healthcare', 'Consulting', 'Real Estate', 'Agencies'],
    accent: 'from-violet-500/15 to-blue-400/10',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
  },
  {
    icon: Monitor,
    title: 'Digital Products',
    subtitle: 'Software & digital goods',
    desc: 'Premium device mockups, screen renders, and tech-forward aesthetics. Feature highlights and UI previews that sell.',
    tags: ['SaaS', 'Apps', 'Courses', 'E-commerce', 'FinTech'],
    accent: 'from-emerald-500/15 to-teal-400/10',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
];

/* ─── Scroll Progress Bar ──────────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-amber-500 to-primary z-[100] origin-left"
      style={{ scaleX }}
    />
  );
}

/* ─── Reveal wrapper ───────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Parallax floating element ────────────────────────────────── */
function ParallaxOrb({ className }: { className?: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  return <motion.div ref={ref} style={{ y }} className={className} />;
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function Home() {
  /* ─── Hero parallax ────────────────────────────────────────────── */
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroScroll, [0, 1], [0, 150]);
  const heroOpacity = useTransform(heroScroll, [0, 0.55], [1, 0]);

  /* ─── Testimonial carousel ────────────────────────────────────── */
  const [currentTest, setCurrentTest] = useState(0);
  const [testPaused, setTestPaused] = useState(false);

  useEffect(() => {
    if (testPaused) return;
    const timer = setInterval(() => {
      setCurrentTest((p) => (p + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testPaused]);

  return (
    <div className="flex flex-col overflow-x-hidden">
      <ScrollProgress />

      {/* ══════════════════════════════════════════════════════════════
          HERO — Three.js background + BlurText + ShinyText badge
      ══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100dvh] flex items-center overflow-hidden"
        aria-label="Hero"
      >
        {/* Atmospheric backgrounds */}
        <div className="absolute inset-0 mesh-hero" />
        <div className="absolute inset-0 dot-grid opacity-30" />

        {/* Three.js 3D Scene — right side background */}
        <Suspense fallback={null}>
          <HeroScene className="absolute top-0 right-0 w-[55%] h-full opacity-50 lg:opacity-70 pointer-events-none select-none" />
        </Suspense>

        {/* Grain overlay */}
        <div className="absolute inset-0 grain pointer-events-none" />

        {/* Diagonal line texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 48px, currentColor 48px, currentColor 49px)',
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container relative z-10 py-24 md:py-0"
        >
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-6 items-center min-h-[80vh]">
            {/* ── Left: Text ── */}
            <div className="lg:col-span-7 lg:pr-8">
              {/* Shiny badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 relative overflow-hidden"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary relative z-10" />
                <ShinyText
                  text="Next-Gen Ad Creation Platform"
                  speed={3}
                  color="oklch(0.68 0.22 280)"
                  shineColor="oklch(0.85 0.15 270)"
                  className="text-sm font-medium"
                />
                <div className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
              </motion.div>

              {/* Accent line */}
              <Reveal>
                <div className="line-accent mb-8" />
              </Reveal>

              {/* Headline with BlurText */}
              <div className="mb-6">
                <BlurText
                  text="Ads that feel handcrafted,"
                  delay={80}
                  animateBy="words"
                  direction="bottom"
                  className="font-display text-[2.75rem] leading-[1.08] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[4.75rem] font-800 tracking-[-0.035em]"
                />
                <div className="mt-2">
                  <GradientText
                    colors={['#8b5cf6', '#a78bfa', '#f59e0b', '#c084fc', '#8b5cf6']}
                    animationSpeed={4}
                    className="font-display text-[2.75rem] leading-[1.08] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[4.75rem] font-800 tracking-[-0.035em]"
                  >
                    made in seconds.
                  </GradientText>
                </div>
              </div>

              {/* Subtext */}
              <Reveal delay={0.3}>
                <p className="font-body text-lg sm:text-xl text-muted-foreground max-w-lg leading-[1.7] mb-10">
                  Enter your business details. Pick from generated concepts.
                  Get publish-ready ads with your brand, pricing &amp; CTA baked
                  in — all under{' '}
                  <span className="text-foreground font-semibold">
                    60 seconds
                  </span>
                  .
                </p>
              </Reveal>

              {/* CTA buttons */}
              <Reveal delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="h-14 px-8 text-[15px] rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 group animate-glow-breathe"
                  >
                    <Link href="/create">
                      Start Creating
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    asChild
                    className="h-14 px-8 text-[15px] rounded-xl font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
                  >
                    <Link href="#how-it-works">
                      See how it works
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Reveal>

              {/* Social proof */}
              <Reveal delay={0.5} className="mt-14">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {['E.K.', 'M.R.', 'A.S.', 'J.D.'].map((initials, i) => (
                      <motion.div
                        key={i}
                        className="h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: [
                            'linear-gradient(135deg, oklch(0.65 0.22 30), oklch(0.70 0.18 50))',
                            'linear-gradient(135deg, oklch(0.60 0.15 185), oklch(0.55 0.12 200))',
                            'linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.60 0.15 300))',
                            'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.70 0.12 100))',
                          ][i],
                          color: 'white',
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: 1.2 + i * 0.1,
                          type: 'spring',
                          stiffness: 260,
                          damping: 20,
                        }}
                      />
                    ))}
                  </div>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6, duration: 0.5 }}
                  >
                    Trusted by{' '}
                    <span className="text-foreground font-semibold">
                      12,000+
                    </span>{' '}
                    businesses
                  </motion.span>
                </div>
              </Reveal>
            </div>

            {/* ── Right: Real Ad Showcase ── */}
            <div className="lg:col-span-5 relative hidden lg:block">
              <Reveal delay={0.4}>
                <div className="relative" style={{ perspective: '1200px' }}>
                  <motion.div
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{
                      rotateY: [-2, 3, -2],
                      rotateX: [1, -2, 1],
                    }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {/* Real ad in premium frame */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
                      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/40 via-amber-400/30 to-primary/20 z-0" />
                      <div className="relative rounded-2xl overflow-hidden z-10">
                        <Image
                          src="/ad-showcase.png"
                          alt="Professional ad for NutreoPak Honey — created with AdGen"
                          width={500}
                          height={625}
                          className="w-full h-auto block"
                          priority
                          quality={95}
                        />
                      </div>
                    </div>

                    {/* Reflection effect */}
                    <div className="mt-1 overflow-hidden h-16 opacity-20 rounded-b-2xl">
                      <div className="scale-y-[-1] blur-[2px]">
                        <Image
                          src="/ad-showcase.png"
                          alt=""
                          width={500}
                          height={625}
                          className="w-full h-auto block"
                          aria-hidden
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* "Generated in 42s" badge */}
                  <motion.div
                    className="absolute -bottom-2 -left-8 glass rounded-xl px-4 py-3 shadow-lg z-30"
                    initial={{ opacity: 0, y: 20, x: -10 }}
                    animate={{
                      opacity: 1,
                      y: [0, -8, 0],
                      x: 0,
                    }}
                    transition={{
                      opacity: { delay: 1.2, duration: 0.6 },
                      y: {
                        delay: 1.8,
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                      x: { delay: 1.2, duration: 0.6 },
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Generated in</p>
                        <p className="text-lg font-bold font-display text-emerald-600">
                          42s
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Resolution badge */}
                  <motion.div
                    className="absolute -top-3 -right-6 glass rounded-xl px-4 py-3 shadow-lg z-30"
                    initial={{ opacity: 0, y: -15, x: 10 }}
                    animate={{ opacity: 1, y: [0, -6, 0], x: 0 }}
                    transition={{
                      opacity: { delay: 1.4, duration: 0.6 },
                      y: {
                        delay: 2,
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                      x: { delay: 1.4, duration: 0.6 },
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">
                        2K Resolution
                      </span>
                    </div>
                  </motion.div>

                  {/* Publish-ready tag */}
                  <motion.div
                    className="absolute top-1/3 -right-10 glass rounded-xl px-3 py-2 shadow-lg z-30"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
                    transition={{
                      opacity: { delay: 1.6, duration: 0.6 },
                      y: {
                        delay: 2.5,
                        duration: 5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">
                        Publish Ready
                      </span>
                    </div>
                  </motion.div>
                </div>
              </Reveal>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <span className="text-[10px] text-muted-foreground font-medium tracking-[0.25em] uppercase">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
          </motion.div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MARQUEE — Infinite industry scroll with gradient masks
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-6 border-y border-border/50 overflow-hidden bg-muted/30 mask-fade-x"
        aria-label="Industries"
      >
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-8 mx-4">
              {INDUSTRIES.map((industry, i) => (
                <span
                  key={`${setIdx}-${i}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground font-medium select-none"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  {industry}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — Editorial numbered steps
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 md:py-36 relative"
        id="how-it-works"
        aria-label="How it works"
      >
        <ParallaxOrb className="absolute top-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

        <div className="container">
          {/* Section header */}
          <div className="grid lg:grid-cols-12 gap-8 mb-20">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="line-accent mb-6" />
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="font-display text-3xl sm:text-4xl md:text-[3.25rem] font-bold tracking-[-0.03em] leading-[1.1]">
                  <BlurText
                    text="Four steps."
                    delay={100}
                    animateBy="words"
                    direction="bottom"
                    className="inline"
                  />
                  <br />
                  <BlurText
                    text="Zero design skills."
                    delay={100}
                    animateBy="words"
                    direction="bottom"
                    className="inline"
                  />
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 flex items-end">
              <Reveal delay={0.1}>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Our advanced creative engine handles everything — from
                  campaign strategy to pixel-perfect image generation. No
                  templates. No design tools. Just results.
                </p>
              </Reveal>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="group grid md:grid-cols-12 items-center gap-6 md:gap-4 py-8 md:py-10 border-t border-border/50 hover:border-primary/30 transition-all duration-500 cursor-pointer">
                  {/* Number */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <motion.span
                      className="font-display text-4xl md:text-5xl font-800 text-primary/15 group-hover:text-primary/50 transition-all duration-500 select-none block"
                      whileHover={{ scale: 1.1 }}
                    >
                      {step.num}
                    </motion.span>
                  </div>
                  {/* Title */}
                  <div className="md:col-span-4 lg:col-span-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-all duration-300"
                        whileHover={{ rotate: 5, scale: 1.05 }}
                      >
                        <step.icon className="h-5 w-5 text-primary" />
                      </motion.div>
                      <h3 className="font-display text-xl font-semibold tracking-tight group-hover:text-primary transition-colors duration-300">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  {/* Description */}
                  <div className="md:col-span-6 lg:col-span-6 lg:col-start-7">
                    <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors duration-300">
                      {step.desc}
                    </p>
                  </div>
                  {/* Arrow on hover */}
                  <div className="hidden lg:flex lg:col-span-1 justify-end">
                    <ArrowRight className="h-5 w-5 text-transparent group-hover:text-primary/60 transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FEATURES — Bento grid with 3D tilt cards
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 md:py-36 relative grain overflow-hidden"
        style={{ background: 'linear-gradient(165deg, oklch(0.07 0.04 280), oklch(0.05 0.03 260))' }}
        aria-label="Features"
      >
        <div className="container">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="h-[3px] w-12 bg-gradient-to-r from-primary to-amber-400 rounded-full mb-6" />
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="font-display text-3xl sm:text-4xl md:text-[3.25rem] font-bold tracking-[-0.03em] leading-[1.1]">
                  <BlurText
                    text="Not your average"
                    delay={100}
                    animateBy="words"
                    direction="bottom"
                    className="inline"
                  />
                  <br />
                  <BlurText
                    text="ad creation tool."
                    delay={100}
                    animateBy="words"
                    direction="bottom"
                    className="inline"
                  />
                </h2>
              </Reveal>
            </div>
          </div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {/* Large card — spans 2 cols */}
            <Reveal className="lg:col-span-2">
              <TiltCard className="h-full">
                <div className="group relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-8 md:p-10 hover:bg-white/[0.08] transition-all duration-500 overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mb-6">
                      <Cpu className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-2xl font-semibold mb-3 text-white">
                      Dual-Engine Creative System
                    </h3>
                    <p className="text-white/60 leading-relaxed max-w-xl">
                      One engine handles creative strategy — trend analysis,
                      seasonal context, competitor insights, and
                      platform-specific optimization. The second renders the
                      final image with accurate text, realistic product
                      placement, and industry-authentic aesthetics.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                      {[
                        {
                          label: 'Strategy Engine',
                          color: 'bg-emerald-400/15 text-emerald-400',
                        },
                        {
                          label: 'Visual Engine',
                          color: 'bg-blue-400/15 text-blue-400',
                        },
                        {
                          label: '2K Output',
                          color: 'bg-amber-400/15 text-amber-400',
                        },
                      ].map((tag) => (
                        <span
                          key={tag.label}
                          className={`px-3 py-1.5 rounded-lg ${tag.color} text-xs font-semibold`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>

            {/* Tall card */}
            <Reveal delay={0.1} className="row-span-2">
              <TiltCard className="h-full">
                <div className="group relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-8 hover:bg-white/[0.08] transition-all duration-500 flex flex-col">
                  <div className="h-12 w-12 rounded-xl bg-amber-400/15 flex items-center justify-center mb-6">
                    <Target className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3 text-white">
                    Trend-Aware Concepts
                  </h3>
                  <p className="text-white/60 leading-relaxed mb-8">
                    Every campaign is contextualized with seasonal events,
                    cultural moments, and current design trends. Your
                    Valentine&rsquo;s Day ad won&rsquo;t look like your Eid
                    campaign.
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/[0.08]">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-3">
                      Context signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Seasonal',
                        'Cultural',
                        'Industry',
                        'Platform',
                        'Competitor',
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-md bg-white/[0.06] text-white/50 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>

            {/* Multi-format card */}
            <Reveal delay={0.15}>
              <TiltCard className="h-full">
                <div className="group relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-8 hover:bg-white/[0.08] transition-all duration-500">
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-400/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-violet-400/15 flex items-center justify-center mb-6">
                      <Layers className="h-6 w-6 text-violet-400" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2 text-white">
                      Multi-Format
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Square, portrait, story, landscape — optimized for
                      Instagram, Facebook, TikTok, YouTube, and LinkedIn. One
                      click.
                    </p>
                  </div>
                </div>
              </TiltCard>
            </Reveal>

            {/* Smart text card */}
            <Reveal delay={0.2}>
              <TiltCard className="h-full">
                <div className="group relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-8 hover:bg-white/[0.08] transition-all duration-500">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-rose-400/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-rose-400/15 flex items-center justify-center mb-6">
                      <PenTool className="h-6 w-6 text-rose-400" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2 text-white">
                      Smart Text Rendering
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Your brand name, slogan, pricing, and CTA are rendered
                      directly into the image with professional typography — not
                      slapped on top.
                    </p>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SEE WHAT WE CREATE — Real ad proof
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-24 md:py-36 relative overflow-hidden"
        aria-label="Output showcase"
      >
        <ParallaxOrb className="absolute top-[5%] left-[10%] w-[200px] h-[200px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
        <ParallaxOrb className="absolute bottom-[15%] right-[5%] w-[250px] h-[250px] rounded-full bg-amber-400/5 blur-[80px] pointer-events-none" />

        <div className="container">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="line-accent mb-6" />
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="font-display text-3xl sm:text-4xl md:text-[3.25rem] font-bold tracking-[-0.03em] leading-[1.1]">
                  See what we
                  <br />
                  actually create.
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 flex items-end">
              <Reveal delay={0.1}>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Not mockups. Not templates. These are real ads generated by
                  our system — with brand names, pricing, and CTAs baked right
                  into the image.
                </p>
              </Reveal>
            </div>
          </div>

          {/* Main showcase */}
          <Reveal delay={0.15}>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Real ad image */}
              <div className="relative group">
                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-primary/30 via-amber-400/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
                  <div className="relative rounded-2xl overflow-hidden z-10 bg-card">
                    <Image
                      src="/ad-showcase.png"
                      alt="Professional ad for NutreoPak Honey — created with AdGen"
                      width={800}
                      height={800}
                      className="w-full h-auto block"
                      quality={95}
                    />
                  </div>
                </motion.div>

                {/* Floating label */}
                <motion.div
                  className="absolute -bottom-4 left-6 glass rounded-full px-5 py-2.5 shadow-lg z-30 flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">
                    100% System Generated
                  </span>
                </motion.div>
              </div>

              {/* Context & details */}
              <div className="space-y-8">
                {/* Input summary */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mb-3">
                    What the user entered
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Business',
                        value: 'NutreoPak — Premium Honey Brand',
                      },
                      {
                        label: 'Product',
                        value: 'Acacia, Chilli & Cinnamon Infused Honey',
                      },
                      { label: 'Price', value: 'Rs 850' },
                      { label: 'Style', value: 'Luxury, Elegant, Natural' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground font-medium w-16 shrink-0 pt-0.5">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What the system created */}
                <div className="border-t border-border/50 pt-8">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mb-4">
                    What was generated
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Eye, label: 'Studio-quality photography' },
                      { icon: PenTool, label: 'Professional typography' },
                      { icon: Target, label: 'Brand-matched aesthetics' },
                      { icon: Layers, label: 'Print-ready resolution' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/30"
                      >
                        <item.icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-medium">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="border-t border-border/50 pt-8">
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    This ad was generated in{' '}
                    <span className="text-foreground font-semibold">
                      under 60 seconds
                    </span>{' '}
                    with zero design skills required. Your brand can look this
                    good too.
                  </p>
                  <Button
                    asChild
                    className="h-12 px-6 rounded-xl font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <Link href="/create">
                      Create Your First Ad
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATS — React Bits CountUp
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28 border-y border-border/50 relative overflow-hidden"
        aria-label="Statistics"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] via-transparent to-amber-400/[0.02] pointer-events-none" />

        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { target: 50, suffix: 'K+', label: 'Ads Generated', icon: BarChart3 },
              { target: 12, suffix: 'K+', label: 'Happy Businesses', icon: Shield },
              { target: 60, suffix: 's', label: 'Avg. Creation Time', prefix: '<', icon: Clock },
              { target: 4.9, suffix: '/5', label: 'User Rating', icon: Star },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="text-center md:text-left group">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <stat.icon className="h-4 w-4 text-primary/60" />
                  </div>
                  <p className="font-display text-4xl sm:text-5xl md:text-6xl font-800 tracking-tight text-foreground mb-2">
                    {stat.prefix || ''}
                    <CountUp
                      to={stat.target}
                      from={0}
                      duration={2.5}
                      separator=","
                      className="tabular-nums"
                    />
                    {stat.suffix}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TESTIMONIALS — Auto-rotating carousel
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28 bg-muted/40 relative overflow-hidden"
        aria-label="Testimonials"
        onMouseEnter={() => setTestPaused(true)}
        onMouseLeave={() => setTestPaused(false)}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 60px, currentColor 60px, currentColor 61px)',
          }}
        />

        <div className="container">
          <Reveal>
            <div className="max-w-4xl mx-auto relative">
              <span className="absolute -top-10 -left-4 md:-left-10 font-display text-[10rem] md:text-[14rem] leading-none text-primary/8 select-none pointer-events-none">
                &ldquo;
              </span>

              <div className="relative z-10 min-h-[280px] md:min-h-[250px]">
                <AnimatePresence mode="wait">
                  <motion.blockquote
                    key={currentTest}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  >
                    <p className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.35] tracking-[-0.02em] mb-10">
                      {TESTIMONIALS[currentTest].quote
                        .split('. ')
                        .map((sentence, si, arr) =>
                          si === arr.length - 1 ? (
                            <span key={si} className="text-primary">
                              {' '}
                              {sentence}
                            </span>
                          ) : (
                            <span key={si}>{sentence}. </span>
                          )
                        )}
                    </p>
                    <footer className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white select-none"
                        style={{
                          background: TESTIMONIALS[currentTest].gradient,
                        }}
                      >
                        {TESTIMONIALS[currentTest].initials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {TESTIMONIALS[currentTest].author}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {TESTIMONIALS[currentTest].role}
                        </p>
                      </div>
                      <div className="ml-auto hidden sm:flex gap-0.5">
                        {[...Array(5)].map((_, si) => (
                          <Star
                            key={si}
                            className="h-4 w-4 text-amber-400 fill-amber-400"
                          />
                        ))}
                      </div>
                    </footer>
                  </motion.blockquote>
                </AnimatePresence>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-10">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTest(i)}
                    className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                      i === currentTest
                        ? 'w-8 bg-primary'
                        : 'w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                    }`}
                    aria-label={`Show testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BUSINESS TYPES — Interactive cards with hover reveals
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36 relative" aria-label="Business types">
        <ParallaxOrb className="absolute bottom-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

        <div className="container">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="line-accent mb-6" />
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="font-display text-3xl sm:text-4xl md:text-[3.25rem] font-bold tracking-[-0.03em] leading-[1.1]">
                  Built for every
                  <br />
                  kind of business.
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 flex items-end">
              <Reveal delay={0.1}>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Physical products, services, or digital goods — our system
                  adapts its visual language, composition, and messaging to your
                  industry.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {BUSINESS_TYPES.map((item, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  className="group relative rounded-2xl border border-border/50 bg-card p-7 md:p-8 h-full hover:border-primary/25 transition-all duration-500 overflow-hidden cursor-pointer"
                  whileHover={{
                    y: -6,
                    boxShadow:
                      '0 25px 50px -12px oklch(0.65 0.22 30 / 0.08)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl`}
                  />

                  <div className="relative z-10">
                    <motion.div
                      className={`h-12 w-12 rounded-xl ${item.iconBg} flex items-center justify-center mb-5`}
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                    </motion.div>
                    <h3 className="font-display text-xl font-semibold mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">
                      {item.subtitle}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                      {item.desc}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-md bg-muted/80 text-xs text-muted-foreground font-medium group-hover:bg-background/60 transition-colors duration-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA — Dramatic dark gradient with animated orbs
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-28 md:py-40 overflow-hidden grain"
        aria-label="Call to action"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0718] via-[#140d28] to-[#0d0a1e]" />
        <div className="absolute inset-0 mesh-warm opacity-80" />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 32px, rgba(255,255,255,0.5) 32px, rgba(255,255,255,0.5) 33px)',
          }}
        />

        <motion.div
          className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-primary/15 blur-[100px] pointer-events-none"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[15%] w-[250px] h-[250px] rounded-full bg-violet-400/10 blur-[80px] pointer-events-none"
          animate={{
            x: [0, -25, 15, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 3,
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <div className="h-[3px] w-12 bg-gradient-to-r from-primary to-amber-400 rounded-full mb-8 mx-auto" />
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.75rem] font-bold text-white tracking-[-0.03em] leading-[1.1] mb-6">
                Ready to create ads
                <br />
                that actually convert?
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg text-white/50 max-w-lg mx-auto mb-10 leading-relaxed">
                Join 12,000+ businesses creating professional ads in seconds.
                Your first 10 ads are completely free.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-10 text-[15px] rounded-xl font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 group bg-primary text-primary-foreground hover:bg-primary/90 animate-glow-breathe"
                >
                  <Link href="/create">
                    Start Creating — It&apos;s Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-sm text-white/30 mt-8 tracking-wide">
                No credit card &middot; No signup &middot; Instant results
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER — Refined editorial
      ══════════════════════════════════════════════════════════════ */}
      <footer
        className="py-14 md:py-20 border-t border-border/50"
        role="contentinfo"
      >
        <div className="container">
          <div className="grid gap-10 md:grid-cols-12">
            {/* Brand */}
            <div className="md:col-span-5">
              <Link
                href="/"
                className="flex items-center gap-2.5 mb-5 group"
                aria-label="AdGen Home"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-md shadow-primary/20">
                  <Sparkles className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-display text-lg font-bold tracking-tight">
                  AdGen
                </span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                Professional ad creation platform. Generate publish-ready ads
                for any business in seconds, not hours.
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </div>
            </div>

            {/* Links */}
            <div className="md:col-span-3 md:col-start-7">
              <h4 className="font-display text-sm font-semibold mb-5 tracking-wide">
                Product
              </h4>
              <ul
                className="space-y-3 text-sm text-muted-foreground"
                role="list"
              >
                <li>
                  <Link
                    href="/create"
                    className="hover:text-foreground transition-colors duration-200"
                  >
                    Create Ad
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-foreground transition-colors duration-200"
                  >
                    My Projects
                  </Link>
                </li>
                <li>
                  <span className="cursor-default">Pricing</span>
                </li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <h4 className="font-display text-sm font-semibold mb-5 tracking-wide">
                Company
              </h4>
              <ul
                className="space-y-3 text-sm text-muted-foreground"
                role="list"
              >
                <li>
                  <span className="cursor-default">About</span>
                </li>
                <li>
                  <span className="cursor-default">Blog</span>
                </li>
                <li>
                  <span className="cursor-default">Contact</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} AdGen. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span className="cursor-default hover:text-foreground transition-colors">
                Privacy
              </span>
              <span className="cursor-default hover:text-foreground transition-colors">
                Terms
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
