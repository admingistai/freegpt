import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chrome, Zap, Shield, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">FreeGPT</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Free Chrome Extension
        </Badge>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 max-w-3xl mx-auto leading-tight">
          Access ChatGPT Plus Features for Free
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Help advance AI research while enjoying enhanced ChatGPT capabilities.
          Your conversations contribute to understanding how people use AI.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
            <Chrome className="w-5 h-5 mr-2" />
            Add to Chrome - Free
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          No credit card required. Your data stays private.
        </p>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-emerald-600">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Install Extension</h3>
                <p className="text-gray-600 text-sm">
                  Add FreeGPT to Chrome with one click. Takes less than 10 seconds.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-emerald-600">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Use ChatGPT Normally</h3>
                <p className="text-gray-600 text-sm">
                  Chat with GPT-4 as usual. The extension works seamlessly in the background.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-emerald-600">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Enjoy Free Access</h3>
                <p className="text-gray-600 text-sm">
                  Get Plus features while your anonymized usage helps AI research.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why FreeGPT?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Full ChatGPT Plus Access</h3>
                <p className="text-gray-600 text-sm">
                  Access GPT-4, advanced features, and priority responses without paying $20/month.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Privacy First</h3>
                <p className="text-gray-600 text-sm">
                  Data stored locally by default. You control what gets shared. No personal info collected.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Support Research</h3>
                <p className="text-gray-600 text-sm">
                  Your usage patterns help researchers understand how AI assistants are used.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Simple to Use</h3>
                <p className="text-gray-600 text-sm">
                  Install once and forget. No configuration needed. Works automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-500 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
            Join thousands of users who enjoy free ChatGPT Plus access while contributing to AI research.
          </p>
          <Button size="lg" variant="secondary">
            <Chrome className="w-5 h-5 mr-2" />
            Add to Chrome - Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">FreeGPT</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy Policy
            </Link>
            <a href="mailto:support@freegpt.app" className="hover:text-gray-900">
              Contact
            </a>
          </nav>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} FreeGPT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
