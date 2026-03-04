'use client';

import { useEffect, useRef } from 'react';

export const useScrollAnimation = () => {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const animateElements = document.querySelectorAll('[data-animate]');
    animateElements.forEach((el) => observer.observe(el));

    return () => {
      animateElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return elementRef;
};

// Counter animation for stats
export const animateCounter = (element: HTMLElement, target: number, duration: number = 1800) => {
  let start = 0;
  const startTime = performance.now();

  const easeOutExpo = (t: number) => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeOutExpo(progress);

    element.textContent = Math.floor(target * easeProgress).toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

// Navbar scroll detection
export const useNavbarScroll = () => {
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleScroll = () => {
      if (window.scrollY > 80) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
};

// Parallax tilt effect for product mockup
export const useParallaxTilt = (elementRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const scrollProgress = 1 - (rect.top / window.innerHeight);
      const tiltAmount = Math.max(0, Math.min(6, 6 * (1 - scrollProgress)));

      element.style.transform = `perspective(1200px) rotateX(${tiltAmount}deg)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [elementRef]);
};
