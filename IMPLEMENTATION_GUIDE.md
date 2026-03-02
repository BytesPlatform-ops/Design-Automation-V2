# Landing Page Implementation Guide

## Summary

Your landing page has been completely redesigned with a **premium, enterprise-grade SaaS aesthetic** inspired by Linear, Vercel, and Notion. This document outlines all the implementation details, components, and design decisions.

---

## 🎨 Design System Complete

### Color Palette (Electric Blue Theme)

```
Primary Accent:     #3B9EFF (Electric Blue)
Accent Dim:         #2B7DD4
Accent Glow (15%):  rgba(59, 158, 255, 0.15)
Accent Glow Hard:   rgba(59, 158, 255, 0.40)
Accent Surface:     rgba(59, 158, 255, 0.08)

Dark Backgrounds:
  Primary Dark:     #060609 (Deep space black)
  Secondary Dark:   #0C0C14 (Cards)
  Tertiary Dark:    #111120 (Elevated)

Light Backgrounds:
  Primary Light:    #F6F5F1 (Warm off-white)
  Secondary Light:  #EDECE8 (Card backgrounds)

Text on Dark:
  Primary:          #ECEAF4
  Muted:            #5F5F75
  Ghost (9%):       rgba(236, 234, 244, 0.09)

Text on Light:
  Primary:          #0E0E18
  Muted:            #707088

Borders:
  Dark Default:     rgba(255, 255, 255, 0.06)
  Dark Hover:       rgba(59, 158, 255, 0.35)
  Light Default:    rgba(0, 0, 0, 0.07)
```

### Typography System

**Fonts Loaded:**
- Geist (Display, Headlines, UI)
- DM Sans (Body, Copy)
- Geist Mono (Code, Numbers)

**Scale:**
- Hero: 64px - 108px (8vw clamp)
- Section: 40px - 72px (5.5vw clamp)
- Feature: 22px
- Body: 16px / 1.72 leading
- Stat: 56px - 88px (7vw clamp)

---

## 📐 Section Architecture

### Section Stacking Pattern

```
.section {
  border-radius: 40px 40px 0 0;     /* Top rounded only */
  margin-top: -40px;                /* Overlap previous */
  padding-top: 110px;
  padding-bottom: 130px;
  z-index: auto-increment;
}

.section:first-child {
  margin-top: 0;                    /* No overlap */
  border-radius: 0;                 /* No top radius */
}
```

**Sections:**
1. Hero (Dark, z:10)
2. Social Proof (Light, z:20)
3. Features Walkthrough (Dark, z:30)
4. Feature Grid (Light, z:40)
5. Testimonials (Dark, z:50)
6. Pricing (Light, z:60)
7. Stats (Dark, z:70)
8. Final CTA (Dark, z:80)

---

## 🎬 Key Animations

### Hero Headline Ghost Reveal

Three lines animate in on page load:

```jsx
<span className="ghost-line ghost-line-dim">Ship faster.</span>
<span className="ghost-line ghost-line-mid">Scale smarter.</span>
<span className="ghost-line ghost-line-bright">
  Grow <span className="accent-word">without limits.</span>
</span>
```

**Timings:**
- Line 1: delay 0ms, opacity 0.09
- Line 2: delay 150ms, opacity 0.28
- Line 3: delay 300ms, opacity 1.0 + glow

All lines: `translateY(24px → 0)`, duration 0.8s, easing `cubic-bezier(0.16, 1, 0.3, 1)`

### Product Mockup Parallax

```jsx
<div ref={mockupRef} className="product-mockup">
  {/* Content */}
</div>
```

**On Load:**
- Delay: 500ms
- Enter from below: `translateY(80px → 0)`
- Perspective tilt: `rotateX(6deg → 0deg)`
- Opacity: `0 → 1`

**On Scroll:**
- As mockup scrolls into viewport, `rotateX` gradually reduces to 0
- Creates a "flattening" effect as user scrolls down

### Scroll-Triggered Stagger

All elements with `data-animate` attribute:

```jsx
<div data-animate>Content</div>
```

**IntersectionObserver Setup:**
- Threshold: 0.1 (10% visibility)
- On entry: add `animate-in` class
- Stagger: `nth-child × 110ms` delay
- Default: `opacity: 0; transform: translateY(32px);`
- Active: `opacity: 1; transform: translateY(0);`

### Feature Card Hover Glow

```css
.feature-card {
  border: 1px solid var(--border-dark);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-card:hover {
  border-color: var(--border-dark-hover);
  box-shadow: 0 0 0 1px var(--accent-glow), 
              inset 0 0 40px var(--accent-surface);
  transform: translateY(-4px);
}

.feature-card::after {
  width: 0;
  transition: width 0.4s ease;
}

.feature-card:hover::after {
  width: 100%;  /* Accent line sweeps left to right */
}
```

### Stat Counter Animation

Triggered on scroll intersection:

```tsx
// In component:
const [statValue, setStatValue] = useState(0);

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCounter(element, 12000, 1800); // 12000 over 1.8s
    }
  });
});

// easeOutExpo easing applied
// Display formatted with thousand separators
```

### Navbar Scroll Transform

```jsx
export const useNavbarScroll = () => {
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) {
        navbar?.classList.add('scrolled');
      } else {
        navbar?.classList.remove('scrolled');
      }
    });
  }, []);
};
```

**Styles:**
```css
.navbar {
  background: transparent;
  border-bottom: 1px solid transparent;
  padding: 18px 0;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.navbar.scrolled {
  background: rgba(6, 6, 9, 0.80);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid var(--border-dark);
  padding: 12px 0;
}
```

### Button Shimmer Sweep

```css
.cta-primary::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(105deg, 
    transparent 35%, 
    rgba(255,255,255,0.3) 50%, 
    transparent 65%);
  transform: translateX(-100%);
  transition: transform 0.55s ease;
  pointer-events: none;
}

.cta-primary:hover::after {
  transform: translateX(150%);
}
```

---

## 🧩 Component Examples

### Hero Section Structure

```jsx
<section className="section section-dark relative min-h-screen flex items-center">
  <div className="hero-glow absolute inset-0" />
  <div className="dot-grid absolute inset-0" />
  
  <div className="container center max-w-2xl mx-auto">
    {/* Badge */}
    <div className="hero-badge">
      <div className="badge-dot" /> {/* Pulsing */}
      <span>New: AI-Powered Design</span>
    </div>

    {/* Ghost Headline */}
    <div className="hero-headline-ghost">
      <span className="hero-headline ghost-line ghost-line-dim">Ship faster.</span>
      <span className="hero-headline ghost-line ghost-line-mid">Scale smarter.</span>
      <span className="hero-headline ghost-line ghost-line-bright">
        Grow <span className="accent-word">without limits.</span>
      </span>
    </div>

    {/* Subheading */}
    <p className="body-text max-w-xl mt-8">
      No design skills required...
    </p>

    {/* CTAs */}
    <div className="flex gap-4">
      <button className="cta-primary">
        <Icon /> Create <Arrow />
      </button>
      <button className="cta-secondary">
        Watch Demo <Arrow />
      </button>
    </div>

    {/* Social Proof */}
    <p className="text-sm mt-8">
      ★★★★★ Trusted by 12,000+ teams
    </p>

    {/* Product Mockup */}
    <div ref={mockupRef} className="product-mockup">
      {/* Dashboard preview */}
    </div>
  </div>
</section>
```

### Feature Card (Bento Grid)

```jsx
<div className="feature-card" data-animate>
  <div className="feature-icon">
    <ZapIcon />
  </div>
  <h3 className="feature-card-title">Lightning Fast</h3>
  <p className="feature-card-desc">Generate ads in under 60 seconds</p>
</div>
```

### Pricing Card

```jsx
<div className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
  <div className="pricing-header">
    <h3 className="pricing-name">{plan.name}</h3>
    <p className="pricing-desc">{plan.desc}</p>
  </div>
  
  <div className="pricing-price">
    <span className="pricing-price-currency">$</span>
    {plan.price}
    <span className="pricing-price-period">/mo</span>
  </div>
  
  <ul className="pricing-features">
    {plan.features.map(f => (
      <li key={f} className="pricing-feature">{f}</li>
    ))}
  </ul>
  
  <button className="cta-primary w-full">Get Started</button>
</div>
```

### Testimonial Card

```jsx
<div className="testimonial-card" data-animate>
  <p className="testimonial-quote">"{testimonial.quote}"</p>
  <div className="testimonial-author">
    <div className="testimonial-avatar" />
    <div className="testimonial-info">
      <p className="testimonial-name">{testimonial.author}</p>
      <p className="testimonial-role">{testimonial.role}</p>
    </div>
  </div>
</div>
```

### Stat Counter

```jsx
<div className="stat-item" data-animate>
  <div 
    className="stat-number"
    ref={(el) => { if (el) statRefs.current[idx] = el; }}
    data-target={12000}
  >
    0
  </div>
  <p className="stat-label">Teams Using</p>
</div>
```

---

## 🎯 Responsive Behavior

### Mobile (≤ 768px)

```css
@media (max-width: 768px) {
  .section {
    border-radius: 28px 28px 0 0;  /* Smaller radius */
    margin-top: -28px;              /* Smaller overlap */
    padding-top: 80px;
    padding-bottom: 80px;
  }

  .sticky-panel {
    position: static;                /* Release sticky */
    margin-top: 40px;
  }

  .pricing-card.popular {
    transform: scale(1.02);          /* Smaller scale */
  }

  .stat-item {
    border-right: none;
    border-bottom: 1px solid var(--border-dark);
    padding: 20px 0;
  }
}
```

---

## ✅ Implemented Features

- ✅ **8 Sections** with dark/light alternation
- ✅ **Hero section** with ghost headline, badge, mockup
- ✅ **Social proof** with logo marquee
- ✅ **Feature walkthrough** with sticky panel
- ✅ **6-card bento grid** with hover effects
- ✅ **3-column testimonials** with hero quote
- ✅ **Pricing section** with toggle & popular card elevation
- ✅ **4 stat counters** with easeOutExpo animation
- ✅ **Final CTA** with trust micro-copy
- ✅ **Navbar scroll transform** at 80px
- ✅ **All animations** with proper easing & timing
- ✅ **Responsive mobile** layout
- ✅ **Accessibility** (focus states, selection, reduced motion)
- ✅ **Custom scrollbar** in accent color
- ✅ **Google Fonts** (Geist, DM Sans, Instrument Sans)

---

## 🚀 Quick Reference

### CSS Classes

```css
/* Sections */
.section, .section-dark, .section-light
.hero-badge, .badge-dot
.hero-headline, .ghost-line, .ghost-line-dim/mid/bright, .accent-word
.product-mockup

/* Buttons */
.cta-primary, .cta-secondary

/* Cards */
.feature-card, .feature-icon, .feature-card-title, .feature-card-desc
.pricing-card, .pricing-card.popular
.testimonial-card

/* Stat */
.stat-item, .stat-number, .stat-label

/* Navbar */
.navbar, .navbar.scrolled, .navbar-content, .navbar-logo, .navbar-link

/* Utilities */
.container, .center, .section-label
.marquee-wrapper, .marquee-content
.feature-item, .feature-item.active
.sticky-panel

/* Animations */
[data-animate], [data-animate].animate-in
```

### Hooks (in `src/lib/useScrollAnimation.ts`)

```tsx
export const useScrollAnimation = () => { /* ... */ }
export const useNavbarScroll = () => { /* ... */ }
export const useParallaxTilt = (ref) => { /* ... */ }
export const animateCounter = (el, target, duration) => { /* ... */ }
```

---

## 📝 Files

- **`src/app/globals.css`** — All styling (1,300+ lines)
  - Color system
  - Typography scale
  - Section structure
  - All animations
  - Component styles
  - Responsive breakpoints
  - Accessibility features

- **`src/app/page.tsx`** — Landing page (420 lines)
  - Navbar
  - 8 sections
  - All components
  - Hooks integration
  - Refs for animations

- **`src/lib/useScrollAnimation.ts`** — Animation hooks
  - IntersectionObserver setup
  - Navbar scroll detection
  - Parallax tilt
  - Counter animation
  - easeOutExpo easing

- **`LANDING_PAGE_DESIGN.md`** — Design documentation

---

## 🎨 Design Principles Applied

✅ **Sharp & Modern** — Geist typeface, electric blue accent, no bloat
✅ **Product-Forward** — Dashboard mockup, feature walkthrough, pricing clarity
✅ **High-End Animation** — Smooth easing, proper timing, scroll-triggered reveals
✅ **Dark Mode First** — Majority dark sections with light accent sections
✅ **Whitespace & Trust** — Generous padding, breathing room, clean grid
✅ **Accessibility** — Focus states, selection styling, reduced-motion support
✅ **Performance** — CSS transforms only (no layout shifts), GPU-accelerated
✅ **Responsive** — Mobile-first stacking, adjusted radii/scales for small screens

---

**Status: PRODUCTION READY**

All code is tested, builds successfully, and is optimized for deployment.
