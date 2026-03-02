'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Projects' },
  { href: '/create', label: 'Create' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-sm'
            : 'bg-transparent border-b border-transparent'
        }`}
        role="banner"
      >
        <div className="container flex h-[4.25rem] items-center justify-between">
          {/* Logo — warm gradient icon */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="AdGen Home">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-primary/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-[1.05rem] font-bold tracking-tight">
              AdGen
            </span>
          </Link>

          {/* Desktop Nav — refined pill-style indicators */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              className="hidden md:inline-flex h-9 px-5 rounded-xl text-[13px] font-semibold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 group"
            >
              <Link href="/create">
                Create Ad
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <button
              className="md:hidden flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted/60 transition-colors duration-200"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu — full-screen editorial overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute top-[4.25rem] left-0 right-0 bg-background border-b border-border/50 shadow-2xl animate-in slide-in-from-top-2 duration-400 p-8">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-4 py-4 text-lg font-display font-semibold rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                    <ArrowRight className="h-4 w-4 opacity-30" />
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 pt-6 border-t border-border/50">
              <Button asChild className="w-full h-13 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 group">
                <Link href="/create">
                  Start Creating
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                No signup required &middot; Instant results
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
