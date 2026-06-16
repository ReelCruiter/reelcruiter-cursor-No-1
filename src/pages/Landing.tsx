import { Link } from "react-router-dom";
import { PlayCircle, Briefcase, Users, ArrowRight, CheckCircle2, Star } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/authCache";
import { Navigate } from "react-router-dom";

const features = [
  {
    icon: PlayCircle,
    title: "Video profiles & job posts",
    text: "Candidates showcase experience on camera. Employers post role videos that attract the right fit.",
  },
  {
    icon: Briefcase,
    title: "Hire with more context",
    text: "See communication style and presence before the first interview. Save time on both sides.",
  },
  {
    icon: Users,
    title: "Two sided marketplace",
    text: "Dedicated modes for job seekers and employers, with messaging, applications, and saved jobs.",
  },
];

const testimonials = [
  {
    quote: "We cut first round interviews by half after reviewing candidate videos on ReelCruiter.",
    name: "Sarah Chen",
    role: "Head of Talent, NovaTech",
  },
  {
    quote: "My video CV got me three callbacks in a week. Paper resumes never did that.",
    name: "James Okonkwo",
    role: "Product Designer",
  },
];

const steps = [
  "Create your profile and choose job seeker or employer mode",
  "Record a short video: open to work, hiring, or workplace culture",
  "Discover, apply, message, and hire, all in one place",
];

export default function Landing() {
  const { ready, userId } = useAuth();
  if (!ready) return null;
  if (userId) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-16">
          <Logo size="lg" href="/" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Stories</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Video first hiring</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-foreground leading-[1.1] tracking-tight">
            Show who you are.
            <span className="block text-primary mt-1">Hire who fits.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            ReelCruiter replaces guesswork with short professional videos, for candidates proving their skills and employers showing real roles.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full h-12 px-8 text-base">
              <Link to="/signup">
                Join free <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full h-12 px-8 text-base">
              <Link to="/signin">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="bg-muted/40 border-y border-border py-16 lg:py-20">
        <div className="container">
          <h2 className="text-2xl lg:text-3xl font-heading font-bold text-center mb-12">Built for modern hiring</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-card rounded-2xl p-6 card-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="container py-16 lg:py-20">
        <h2 className="text-2xl lg:text-3xl font-heading font-bold text-center mb-12">How it works</h2>
        <ol className="max-w-2xl mx-auto space-y-6">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </span>
              <p className="text-foreground pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="testimonials" className="bg-primary text-primary-foreground py-16 lg:py-20">
        <div className="container max-w-4xl">
          <h2 className="text-2xl lg:text-3xl font-heading font-bold text-center mb-12">Trusted by hiring teams & talent</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="bg-primary-foreground/10 rounded-2xl p-6 backdrop-blur">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-primary-foreground/95 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-primary-foreground/70">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-heading font-bold">Ready to stand out?</h2>
        <p className="text-muted-foreground mt-2 mb-8 max-w-md mx-auto">
          Create your free account and post your first video in minutes.
        </p>
        <Button size="lg" asChild className="rounded-full">
          <Link to="/signup">Create account</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ReelCruiter. All rights reserved.</p>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
