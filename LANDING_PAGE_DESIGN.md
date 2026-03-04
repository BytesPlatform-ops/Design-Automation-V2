# Landing Page Redesign — SaaS Product Grade

## Overview

This is a **production-ready, enterprise-grade landing page** inspired by the HackerRank 2024 scroll-experience design pattern, tuned specifically for a SaaS product brand. The design draws aesthetic and interaction principles from Linear, Vercel, and Notion.

### Key Features

✅ **Dark/Light Section Alternation** — Signature card-stack effect with 40px rounded corners
✅ **Ghost Headline Technique** — 3-line progressive opacity reveal animation
✅ **Perspective Tilt Dashboard** — Product mockup with 3D parallax and glowing top edge
✅ **Scroll-Triggered Animations** — IntersectionObserver with 110ms stagger per child
✅ **Feature Walkthrough** — Sticky right panel that changes with left-column scroll position
✅ **Bento Grid** — 6-card feature grid with hover glow border + top-corner accents
✅ **Pricing Toggle** — Smooth monthly/yearly switch with pre-elevated popular card
✅ **Stat Counters** — easeOutExpo animated number reveals at scroll entry
✅ **Navbar Scroll Transform** — Background/blur transition at 80px scroll threshold
✅ **Logo Marquee** — Infinite auto-scroll with edge fade mask
✅ **Testimonials** — Hero quote + 3-column card grid with accent left border
✅ **Button Shimmer** — Primary CTA with sweep animation on hover
✅ **Reduced Motion Support** — Respects prefers-reduced-motion media query
✅ **Responsive** — Mobile-optimized with stacked layouts and adjusted radii

---

## Color System

```css
/* Accent — Electric Blue (Never use green!) */
--accent: #3B9EFF;
--accent-dim: #2B7DD4;
--accent-glow: rgba(59, 158, 255, 0.15);
--accent-glow-hard: rgba(59, 158, 255, 0.40);
--accent-surface: rgba(59, 158, 255, 0.08);

/* Backgrounds */
--bg-dark: #060609;      /* Hero, footer, dark sections */
--bg-dark-2: #0C0C14;    /* Cards on dark */
--bg-dark-3: #111120;    /* Elevated surfaces */
--bg-light: #F6F5F1;     /* Light sections */
--bg-light-2: #EDECE8;   /* Light cards */

/* Text */
--text-primary-dark: #ECEAF4;     /* Main text on dark */
--text-muted-dark: #5F5F75;       /* Secondary text on dark */
--text-ghost-dark: rgba(..., 0.09); /* Very faint on dark */
--text-primary-light: #0E0E18;    /* Main text on light */
--text-muted-light: #707088;      /* Secondary text on light */

/* Borders */
--border-dark: rgba(255, 255, 255, 0.06);      /* Default on dark */
--border-dark-hover: rgba(59, 158, 255, 0.35); /* On hover/active */
--border-light: rgba(0, 0, 0, 0.07);           /* Default on light */
```

---

## Typography

### Fonts
- **Display**: Geist (sharp, product-grade)
- **Body**: DM Sans (friendly, readable)
- **Mono**: Geist Mono (code, metrics, terminal)

### Scale

| Use Case | Size | Weight | Line Height |
|----------|------|--------|------------|
| Hero Headline | clamp(64px, 8vw, 108px) | 700 | 1.0 |
| Section Headline | clamp(40px, 5.5vw, 72px) | 650 | 1.1 |
| Feature Title | 22px | 600 | 1.3 |
| Body Text | 16px | 400 | 1.72 |
| Label/Tag | 11px | 500 | 1.0 (uppercase) |
| Stat Number | clamp(56px, 7vw, 88px) | 700 | 1.0 |

---

## Sections

### 1. **Hero** (Dark)
- Badge pill with pulsing dot
- 3-line ghost headline (dim → mid → bright + glow)
- Subheading + social proof
- CTA buttons (primary + secondary)
- Product mockup with perspective tilt & glowing top border
- Radial blue glow + dot grid background

### 2. **Social Proof** (Light)
- "Trusted by teams at" headline
- Auto-scrolling logo marquee with edge fade mask
- Compact ~160px height

### 3. **Features Walkthrough** (Dark)
- Left: 3-4 scrollable feature items with number + title + description
- Right: Sticky product panel that crossfades per item
- Active item gets left accent border
- Scene label: "— How It Works"

### 4. **Feature Grid** (Light)
- 6-card bento layout (varied sizing)
- Feature icon + title + description
- Hover: lift + glow border + top-edge accent line sweep
- One card can span 2 columns

### 5. **Testimonials** (Dark)
- Hero quote above (24px italic, larger)
- 3-column grid of testimonial cards
- Cards: accent left border (3px), quote + avatar + name + role
- Hover effects included

### 6. **Pricing** (Light)
- Monthly/Yearly toggle
- 3 pricing tiers
- Popular card: pre-scaled 1.04x + accent border + glow
- Feature checklists with accent checkmark
- Annual savings badge on yearly toggle

### 7. **Stats** (Dark)
- 4 metrics in grid
- Large animated numbers (easeOutExpo)
- Subtle separator lines
- Optional: faint horizontal line grid background

### 8. **Final CTA** (Dark)
- Centered 2-line headline
- Large primary button
- Trust micro-copy: "No credit card · Free 14-day trial · Cancel anytime"
- Optional: blue glow orb in background

---

## Animations

### Global Easing
```css
cubic-bezier(0.16, 1, 0.3, 1) /* Elegant, product-forward */
```

### 1. Hero Headline Ghost Reveal
```
Line 1: delay 0ms    — opacity 0.09, slideUp +24px
Line 2: delay 150ms  — opacity 0.28, slideUp +24px
Line 3: delay 300ms  — opacity 1.0 + accent glow, slideUp +24px
```

### 2. Product Mockup Entry
```
Delay: 500ms
From: translateY(80px) + rotateX(6deg) + opacity(0)
To:   translateY(0) + rotateX(0deg) + opacity(1)
Parallax: On scroll, rotateX gradually reduces to 0
```

### 3. Scroll-Triggered Section Stagger
```
IntersectionObserver on .section > * children
Initial:  opacity 0, translateY(32px)
Entered:  opacity 1, translateY(0)
Threshold: 0.1
Stagger: nth-child × 110ms
```

### 4. Feature Card Hover Glow
```
Border: var(--border-dark) → var(--border-dark-hover)
Box-shadow: inset 0 0 40px var(--accent-surface)
Transform: translateY(-4px)
Top edge accent line: width 0% → 100% on hover
```

### 5. Sticky Feature Walkthrough
```
Left text blocks: opacity 0.3 → 1, translateX(-8px → 0)
Right panel: smooth crossfade to corresponding screenshot
Active item: left border 2px solid accent, padding-left 20px
```

### 6. Pricing Cards
```
Popular card: scale 1.04 by default
All cards on hover: translateY(-6px)
Popular hover: scale 1.04 + translateY(-6px) + enhanced glow
```

### 7. CTA Button Shimmer
```
::after sweep: translateX(-100% → 150%) on hover
Duration: 0.55s ease
Background: linear-gradient(105deg, transparent, rgba(255,255,255,0.3), transparent)
```

### 8. Stat Counters
```
On IntersectionObserver entry:
Animate 0 → target via requestAnimationFrame
Duration: 1800ms, easing: easeOutExpo
Suffix (+ or %) types in after number finishes
```

### 9. Navbar Scroll Transformation
```
At top:
  background: transparent
  border-bottom: transparent
  padding: 18px 0

After 80px scroll:
  background: rgba(6, 6, 9, 0.80)
  backdrop-filter: blur(20px) saturate(160%)
  border-bottom: var(--border-dark)
  padding: 12px 0
  transition: 0.35s cubic-bezier(0.16, 1, 0.3, 1)
```

### 10. Logo Marquee
```
@keyframes marquee: 0% { translateX(0) } → 100% { translateX(-50%) }
Duration: 25s, linear infinite
Duplicate items for seamless loop
Edge fade: mask-image linear gradient
```

---

## Components

### Hero Badge
```jsx
<div className="hero-badge">
  <div className="badge-dot" />
  <span>New: Feature Name</span>
</div>
```

### Feature Card
```jsx
<div className="feature-card">
  <div className="feature-icon">
    <Icon />
  </div>
  <h3 className="feature-card-title">Title</h3>
  <p className="feature-card-desc">Description</p>
</div>
```

### Pricing Card
```jsx
<div className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
  <div className="pricing-header">...</div>
  <div className="pricing-price">$99<span>/mo</span></div>
  <ul className="pricing-features">
    <li className="pricing-feature">Feature</li>
  </ul>
  <button className="cta-primary">Get Started</button>
</div>
```

### Stat Counter
```jsx
<div className="stat-item">
  <div className="stat-number" data-target="12000">0</div>
  <p className="stat-label">Teams Using</p>
</div>
```

---

## Hooks

### `useScrollAnimation()`
Sets up IntersectionObserver on all `[data-animate]` elements.

```tsx
useScrollAnimation(); // Call once in component
```

### `useNavbarScroll()`
Adds/removes `scrolled` class on navbar at 80px threshold.

```tsx
useNavbarScroll();
```

### `useParallaxTilt(ref)`
Smoothly reduces rotateX from 6deg → 0deg as element scrolls into view.

```tsx
const mockupRef = useRef<HTMLElement>(null);
useParallaxTilt(mockupRef);
```

### `animateCounter(element, target, duration)`
Animates number from 0 to target with easeOutExpo easing.

```tsx
animateCounter(element, 12000, 1800);
```

---

## Responsive Breakpoints

### Mobile (≤ 768px)
- Section border-radius: 28px (instead of 40px)
- Section margin-top: -28px (instead of -40px)
- Sticky panels → static
- Pricing card popular: scale 1.02 (instead of 1.04)
- Hero headline: clamp(40px, 9vw, 64px)
- Stats layout: flex-direction column with bottom borders

---

## Checklist ✅

- [x] Dark/light sections alternate with rounded corners
- [x] Hero badge pill with pulsing dot
- [x] Ghost headline 3-line technique + load animation
- [x] Product screenshot perspective tilt + parallax flatten
- [x] Feature walkthrough sticky right panel
- [x] Bento grid with hover glow + top-corner accent
- [x] Pricing toggle (monthly/yearly)
- [x] Popular pricing card pre-elevated + glow
- [x] Stat counters easeOutExpo animation
- [x] Button shimmer sweep on hover
- [x] Navbar scroll transform at 80px
- [x] Logo marquee with edge fade
- [x] Accent #3B9EFF everywhere, no green
- [x] Custom scrollbar in accent
- [x] ::selection styled
- [x] Mobile responsive stacked/sticky-released
- [x] prefers-reduced-motion support

---

## What NOT to Do ❌

- ❌ Use green — accent is ONLY #3B9EFF
- ❌ Pure black (#000) or white (#fff) — use defined palette
- ❌ Inter or Roboto — use Geist / Instrument Sans / DM Sans
- ❌ Purple gradients — stick to blue/dark theme
- ❌ Generic stock hero photos — use product mockup
- ❌ Linear easing anywhere — use cubic-bezier(0.16, 1, 0.3, 1)
- ❌ Layout-shifting animations — transform/opacity ONLY
- ❌ More than 3 fonts loaded
- ❌ Fake testimonials with AI-generated names
- ❌ Center ALL sections — vary alignment
- ❌ Cluttered features — whitespace = trust for SaaS

---

## Files

- `src/app/globals.css` — Design system, colors, typography, animations
- `src/app/page.tsx` — Landing page component with all sections
- `src/lib/useScrollAnimation.ts` — Scroll animation hooks

---

## Quick Start

```bash
npm run dev
# Open http://localhost:3000
```

Build:
```bash
npm run build
npm start
```

---

**Design System v1.0 — March 2026**
