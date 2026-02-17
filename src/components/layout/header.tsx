'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span className="text-lg md:text-xl font-bold">AdGen AI</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/create" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Create
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button asChild size="sm" className="md:size-default">
            <Link href="/create">
              <Sparkles className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Ad</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
