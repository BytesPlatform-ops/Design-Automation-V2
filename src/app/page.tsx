import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Target, 
  Palette, 
  ArrowRight,
  CheckCircle,
  Store,
  Briefcase,
  Monitor
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="container relative">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered Design Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Generate Stunning Marketing Ads in{' '}
              <span className="text-primary">Seconds</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              No design skills required. Our AI analyzes your business, creates marketing 
              campaign ideas, and generates publish-ready ads with your brand name, 
              pricing, and slogan perfectly integrated.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/create">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your First Ad
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                See Examples
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>10 free credits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>2K resolution</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From business details to publish-ready ads in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Enter Details',
                description: 'Tell us about your business, industry, and what you sell',
                icon: Briefcase
              },
              {
                step: '02',
                title: 'AI Ideation',
                description: 'Our AI analyzes trends and generates 5 campaign ideas',
                icon: Sparkles
              },
              {
                step: '03',
                title: 'Select Ideas',
                description: 'Pick 1-5 ideas you like for A/B testing',
                icon: Target
              },
              {
                step: '04',
                title: 'Get Your Ads',
                description: 'Download publish-ready ads with perfect text rendering',
                icon: Palette
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-background rounded-lg p-6 border h-full">
                  <div className="text-4xl font-bold text-primary/20 mb-4">
                    {item.step}
                  </div>
                  <item.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Types */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Works for Every Business</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you sell physical products, services, or digital goods - 
              we&apos;ve got you covered
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            <div className="rounded-xl border bg-card p-6 md:p-8 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-6">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Physical Products</h3>
              <p className="text-muted-foreground mb-4">
                Food, apparel, retail items. Upload your product image and we&apos;ll 
                place it in stunning, hyper-realistic environments.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Background removal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Product placement
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Lifestyle scenes
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-6 md:p-8 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-6">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Services</h3>
              <p className="text-muted-foreground mb-4">
                Salons, clinics, agencies. We generate conceptual imagery that 
                highlights your service&apos;s emotional impact.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Lifestyle imagery
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Emotional appeal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Before/after concepts
                </li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-6 md:p-8 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-6">
                <Monitor className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Digital Products</h3>
              <p className="text-muted-foreground mb-4">
                SaaS, courses, eBooks. We use mockup marketing to showcase your 
                product on modern devices and 3D environments.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Device mockups
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Screen rendering
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Tech aesthetics
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4">
            <Zap className="h-10 w-10 md:h-12 md:w-12 mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Create Your First Ad?
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Join thousands of businesses using AI to create professional 
              marketing campaigns in seconds, not hours.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/create">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">AdGen AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 AdGen AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
