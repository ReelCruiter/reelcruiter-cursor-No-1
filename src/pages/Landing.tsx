import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  FileText,
  HelpCircle,
  Link2,
  MessageCircle,
  Smartphone,
  Sparkles,
  Timer,
  UserPlus,
  Users,
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
import LandingHeroVisual from "@/components/landing/LandingHeroVisual";
import LandingIndustryMarquee from "@/components/landing/LandingIndustryMarquee";
import LandingStickyCta from "@/components/landing/LandingStickyCta";
import { useAuth } from "@/lib/authCache";
import { cn } from "@/lib/utils";

const trustBadges = [
  "Free for job seekers and employers",
  "Create your profile in 5 to 10 minutes",
  "No app download required",
];

const problemCards = [
  {
    icon: Timer,
    accent: "from-amber-500/20 to-amber-500/5",
    title: "Candidates wait too long",
    text: "You send dozens of CVs and wait weeks for a reply.",
  },
  {
    icon: Users,
    accent: "from-primary/25 to-primary/5",
    title: "Employers repeat first calls",
    text: "First interviews are often just to check communication and personality.",
  },
  {
    icon: HelpCircle,
    accent: "from-rose-500/15 to-rose-500/5",
    title: "Wrong fit wastes time",
    text: "Candidates and employers often find out the role or person is not right only after several interviews.",
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
    text: "Introduce yourself or your company. 30 to 60 seconds is enough.",
  },
  {
    n: 3,
    title: "Connect instantly",
    text: "Apply, message, and hire without the usual back and forth.",
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
  { icon: UserPlus, text: "Find better fit hires faster" },
];

const testimonials = [
  {
    quote: "My intro video helped employers see how I talk to guests, not just my CV.",
    name: "Sofia M.",
    role: "Front desk, hospitality",
    initials: "SM",
  },
  {
    quote: "We review videos before booking first calls. It saves everyone time.",
    name: "James R.",
    role: "Retail hiring manager",
    initials: "JR",
  },
];

const faqs = [
  {
    q: "Why do I need a video?",
    a: "For customer facing roles, employers want to hear how you communicate before scheduling an interview. A short video answers that upfront.",
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

function SectionHeading({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
        {children}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export default function Landing() {
  const { ready, userId } = useAuth();
  if (!ready) return null;
  if (userId) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container flex items-center justify-between h-14 sm:h-16">
          <Logo size="md" href="/" />
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#benefits" className="hover:text-foreground transition-colors">
              Benefits
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex h-10">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button
              asChild
              className="rounded-full h-10 px-5 font-semibold shadow-md shadow-primary/20"
            >
              <Link to="/signup">Create profile</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative landing-mesh border-b border-border/50">
        <div className="container pt-10 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left landing-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground mb-5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Video first hiring · 100% free
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-heading font-bold text-foreground leading-[1.1] tracking-tight">
                Skip the first interview.{" "}
                <span className="landing-gradient-text">Connect through video</span> first.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Create a short video profile, apply with one click, and message employers directly.
                Employers showcase culture before scheduling interviews.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-foreground max-w-md mx-auto lg:mx-0">
                {trustBadges.map((badge) => (
                  <li key={badge} className="flex items-center gap-2.5 justify-center lg:justify-start">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 shrink-0">
                      <Check className="w-3 h-3 text-accent" aria-hidden />
                    </span>
                    <span>{badge}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start landing-fade-up landing-delay-2">
                <Button
                  size="lg"
                  asChild
                  className="rounded-full h-12 px-8 text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary/25"
                >
                  <Link to="/signup">
                    Create your profile
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-full h-12 px-8 text-base w-full sm:w-auto bg-background/60 backdrop-blur-sm"
                >
                  <Link to="/signin">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="landing-fade-up landing-delay-3 lg:pl-4">
              <LandingHeroVisual />
            </div>
          </div>

          <div className="mt-12 lg:mt-14 landing-fade-up landing-delay-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Built for people facing roles
            </p>
            <LandingIndustryMarquee />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-12 lg:py-16">
        <div className="container max-w-5xl">
          <SectionHeading subtitle="Sound familiar? There is a faster way.">
            Hiring takes too long.
          </SectionHeading>
          <div className="mt-10 grid sm:grid-cols-3 gap-4 lg:gap-5">
            {problemCards.map(({ icon: Icon, accent, title, text }) => (
              <div
                key={title}
                className={cn(
                  "landing-card-lift rounded-2xl p-5 border border-border/80 bg-gradient-to-b",
                  accent,
                  "bg-card",
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ReelCruiter helps both sides understand fit <em>before</em> the first interview.
          </p>
          <div className="mt-6 text-center">
            <Button asChild className="rounded-full h-11 px-8 font-semibold">
              <Link to="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-muted/40 border-y border-border/60 py-12 lg:py-16 scroll-mt-16"
      >
        <div className="container max-w-4xl">
          <SectionHeading subtitle="Three steps. About ten minutes. You are live.">
            How ReelCruiter works
          </SectionHeading>
          <ol className="mt-12 relative grid md:grid-cols-3 gap-8 md:gap-6">
            <div
              className="hidden md:block absolute top-5 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
              aria-hidden
            />
            {steps.map((step) => (
              <li key={step.n} className="relative text-center">
                <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-4 shadow-lg shadow-primary/25 ring-4 ring-background">
                  {step.n}
                </div>
                <h3 className="font-heading font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed px-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-12 lg:py-16 scroll-mt-16">
        <div className="container max-w-5xl">
          <SectionHeading subtitle="One platform for job seekers and employers.">
            Made for both sides
          </SectionHeading>
          <div className="mt-10 grid md:grid-cols-2 gap-6 lg:gap-8">
            <div className="landing-card-lift rounded-3xl p-6 sm:p-7 border-2 border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
              <span className="inline-flex text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Job seekers
              </span>
              <h2 className="mt-3 text-xl font-heading font-bold text-foreground">
                Get noticed before the interview
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Hospitality, retail, sales, and more.
              </p>
              <ul className="space-y-3">
                {seekerBenefits.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm">
                    <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-7 rounded-full w-full sm:w-auto font-semibold shadow-md shadow-primary/20">
                <Link to="/signup">Create your video profile</Link>
              </Button>
            </div>

            <div className="landing-card-lift rounded-3xl p-6 sm:p-7 border-2 border-primary/20 bg-card relative overflow-hidden">
              <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <span className="inline-flex text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Employers
              </span>
              <h2 className="mt-3 text-xl font-heading font-bold text-foreground">
                Hire with more context
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-5">People facing roles, faster.</p>
              <ul className="space-y-3">
                {employerBenefits.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm">
                    <span className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </span>
                    <span className="pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-7 rounded-full w-full sm:w-auto font-semibold shadow-md shadow-primary/20"
              >
                <Link to="/signup">Create an employer profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-12 lg:py-16">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, hsl(var(--accent) / 0.35), transparent 45%), radial-gradient(circle at 80% 20%, hsl(0 0% 100% / 0.08), transparent 40%)",
          }}
          aria-hidden
        />
        <div className="container max-w-4xl relative">
          <SectionHeading subtitle="Hotels, retail, healthcare, education, and customer service.">
            <span className="text-primary-foreground">Built for modern hiring</span>
          </SectionHeading>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="landing-card-lift rounded-2xl bg-primary-foreground/[0.08] backdrop-blur-sm border border-primary-foreground/15 p-6"
              >
                <p className="text-3xl leading-none text-accent/80 font-serif mb-2">&ldquo;</p>
                <p className="leading-relaxed text-primary-foreground/95">{t.quote}</p>
                <footer className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                    {t.initials}
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-primary-foreground/70">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-12 lg:py-16 max-w-2xl scroll-mt-16">
        <SectionHeading subtitle="Quick answers before you sign up.">Questions</SectionHeading>
        <div className="mt-8 rounded-2xl border border-border bg-card p-2 sm:p-4 shadow-sm">
          <Accordion type="single" collapsible>
            {faqs.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} className="border-border/60 px-2">
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container py-12 lg:py-16">
        <div className="relative max-w-xl mx-auto text-center rounded-3xl overflow-hidden border border-primary/15 p-8 sm:p-12 landing-mesh bg-gradient-to-b from-primary/[0.06] to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--accent)/0.15),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30">
              <Smartphone className="w-7 h-7" aria-hidden />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Ready to stand out?
            </h2>
            <p className="mt-2 text-muted-foreground">Create your free profile in minutes.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                asChild
                className="rounded-full h-12 px-8 font-semibold shadow-lg shadow-primary/25"
              >
                <Link to="/signup">Create account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-full h-12 px-8 bg-background/80"
              >
                <Link to="/signin">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="sm" href="/" />
            <p>© {new Date().getFullYear()} ReelCruiter</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/about" className="hover:text-foreground font-medium transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-foreground font-medium transition-colors">
              Contact
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>

      <LandingStickyCta />
    </div>
  );
}
