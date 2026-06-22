import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  FileText,
  Link2,
  MessageCircle,
  Play,
  Smartphone,
  UserPlus,
  Video,
  Zap,
} from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import LandingPhoneMockup from "@/components/landing/LandingPhoneMockup";
import LandingProductShots from "@/components/landing/LandingProductShots";
import LandingStickyCta from "@/components/landing/LandingStickyCta";
import { useAuth } from "@/lib/authCache";

const trustBadges = [
  "Free for job seekers and employers",
  "Create your profile in 5–10 minutes",
  "No app download required",
];

const problemCards = [
  {
    title: "Candidates wait too long",
    text: "You send dozens of CVs and wait weeks for a reply.",
  },
  {
    title: "Employers repeat first calls",
    text: "First interviews are often just to check communication and personality.",
  },
  {
    title: "Poor fit shows up late",
    text: "Both sides lose time when the real mismatch appears too late.",
  },
];

const steps = [
  {
    n: 1,
    title: "Create your profile",
    text: "Choose Job Seeker or Employer. Add basics in a few minutes.",
  },
  {
    n: 2,
    title: "Record a short video",
    text: "Introduce yourself or your company. 30–60 seconds is enough.",
  },
  {
    n: 3,
    title: "Connect instantly",
    text: "Apply, message, and hire without the usual back-and-forth.",
  },
];

const seekerBenefits = [
  { icon: Video, text: "Show your communication skills on camera" },
  { icon: Zap, text: "Apply with one click" },
  { icon: MessageCircle, text: "Message employers directly" },
  { icon: Link2, text: "Share your profile anywhere" },
  { icon: FileText, text: "Let employers see more than your CV" },
];

const employerBenefits = [
  { icon: Building2, text: "Showcase your company culture" },
  { icon: Video, text: "Share job and workplace videos" },
  { icon: Clock, text: "Reduce unnecessary first interviews" },
  { icon: MessageCircle, text: "Speak directly with candidates" },
  { icon: UserPlus, text: "Find better-fit hires faster" },
];

const testimonials = [
  {
    quote: "My intro video helped employers see how I talk to guests, not just my CV.",
    name: "Sofia M.",
    role: "Front desk, hospitality",
  },
  {
    quote: "We review videos before booking first calls. It saves everyone time.",
    name: "James R.",
    role: "Retail hiring manager",
  },
];

const faqs = [
  {
    q: "Why do I need a video?",
    a: "For customer-facing roles, employers want to hear how you communicate before scheduling an interview. A short video answers that upfront.",
  },
  {
    q: "How long should my video be?",
    a: "30 to 60 seconds is plenty for your intro. Keep it natural: who you are, what you want, and one strength or result.",
  },
  {
    q: "Is ReelCruiter free?",
    a: "Yes. It is completely free for job seekers and employers.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. ReelCruiter works in your mobile browser. You can add it to your home screen if you like.",
  },
  {
    q: "Can employers contact me directly?",
    a: "Yes. Once your profile is live, employers can message you on the platform.",
  },
  {
    q: "Can I apply without uploading a video?",
    a: "You can sign up and browse jobs, but a short intro video helps you stand out in hospitality, retail, sales, and similar roles.",
  },
];

function scrollToDemo() {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground text-center tracking-tight">
      {children}
    </h2>
  );
}

export default function Landing() {
  const { ready, userId } = useAuth();
  if (!ready) return null;
  if (userId) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-14 sm:h-16">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex h-10">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full h-10 px-5 font-semibold">
              <Link to="/signup">Create profile</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-heading font-bold text-foreground leading-[1.12] tracking-tight">
              Skip the first interview. Connect through video first.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              Create a short video profile, apply with one click, and message employers directly.
              For employers, showcase your workplace, team, and culture before scheduling interviews.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-foreground max-w-md mx-auto lg:mx-0">
              {trustBadges.map((badge) => (
                <li key={badge} className="flex items-start gap-2 justify-center lg:justify-start">
                  <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden />
                  <span>{badge}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" asChild className="rounded-full h-12 px-8 text-base font-semibold w-full sm:w-auto">
                <Link to="/signup">
                  Create your profile
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                type="button"
                onClick={scrollToDemo}
                className="rounded-full h-12 px-8 text-base w-full sm:w-auto"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch demo
              </Button>
            </div>
          </div>
          <div id="demo" className="scroll-mt-20">
            <LandingPhoneMockup />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-muted/50 border-y border-border py-12 lg:py-14">
        <div className="container max-w-4xl">
          <SectionHeading>Hiring takes too long.</SectionHeading>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {problemCards.map((card) => (
              <div key={card.title} className="bg-card rounded-2xl p-5 border border-border/80">
                <h3 className="font-heading font-bold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ReelCruiter helps candidates and employers understand each other before the first
            interview.
          </p>
          <div className="mt-6 text-center">
            <Button asChild className="rounded-full h-11 px-8 font-semibold">
              <Link to="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container py-12 lg:py-14 scroll-mt-16">
        <SectionHeading>How ReelCruiter works</SectionHeading>
        <ol className="mt-10 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step) => (
            <li key={step.n} className="relative text-center md:text-left">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto md:mx-0 mb-3">
                {step.n}
              </div>
              <h3 className="font-heading font-bold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits */}
      <section className="bg-muted/50 border-y border-border py-12 lg:py-14">
        <div className="container grid md:grid-cols-2 gap-8 max-w-5xl">
          <div className="bg-card rounded-2xl p-6 border border-border/80">
            <h2 className="text-xl font-heading font-bold text-foreground">Get noticed before the interview</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">For job seekers in hospitality, retail, sales, and more.</p>
            <ul className="space-y-3">
              {seekerBenefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </span>
                  <span className="pt-1">{text}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 rounded-full w-full sm:w-auto font-semibold">
              <Link to="/signup">Create your video profile</Link>
            </Button>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border/80">
            <h2 className="text-xl font-heading font-bold text-foreground">Hire with more context</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">For employers hiring people-facing roles.</p>
            <ul className="space-y-3">
              {employerBenefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </span>
                  <span className="pt-1">{text}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="secondary" className="mt-6 rounded-full w-full sm:w-auto font-semibold">
              <Link to="/signup">Create an employer profile</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="container py-12 lg:py-14 scroll-mt-16">
        <SectionHeading>See what users see</SectionHeading>
        <p className="mt-3 text-center text-sm text-muted-foreground max-w-lg mx-auto">
          Real screens from the product — video feed, profiles, applications, and messaging.
        </p>
        <div className="mt-8">
          <LandingProductShots />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-muted-foreground">
          {["Video profiles", "Direct messaging", "One-click applications", "Company culture videos"].map((tag) => (
            <span key={tag} className="px-3 py-1.5 rounded-full bg-muted">{tag}</span>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-primary text-primary-foreground py-12 lg:py-14">
        <div className="container max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center">Built for modern hiring</h2>
          <p className="mt-2 text-center text-primary-foreground/80 text-sm">
            Hotels, retail, healthcare, education, and customer service teams.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="bg-primary-foreground/10 rounded-2xl p-5">
                <p className="leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-3 text-sm">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-primary-foreground/75">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-12 lg:py-14 max-w-2xl scroll-mt-16">
        <SectionHeading>Questions</SectionHeading>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="container py-12 lg:py-16 text-center">
        <div className="max-w-lg mx-auto bg-card rounded-3xl border border-border p-8 sm:p-10">
          <Smartphone className="w-10 h-10 text-primary mx-auto mb-4" aria-hidden />
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Ready to stand out?</h2>
          <p className="mt-2 text-muted-foreground">Create your free profile in minutes.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="rounded-full h-12 px-8 font-semibold">
              <Link to="/signup">Create account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full h-12 px-8">
              <Link to="/signin">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ReelCruiter</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/about" className="hover:text-foreground font-medium">About</Link>
            <Link to="/contact" className="hover:text-foreground font-medium">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          </nav>
        </div>
      </footer>

      <LandingStickyCta />
    </div>
  );
}
