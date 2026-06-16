import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const highlights = [
  {
    title: "Job seekers share their story",
    text: "Introduce your skills, experience, and personality in a short professional video.",
  },
  {
    title: "Employers share their company",
    text: "Introduce your team, open roles, and workplace culture in a short professional video.",
  },
  {
    title: "A clearer way to connect",
    text: "See each other on video before the interview and start conversations with more context.",
  },
];

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-primary text-primary-foreground flex-col min-h-screen p-10 xl:p-14">
        <Logo size="lg" inverted href="/" />

        <div className="flex-1 flex flex-col justify-center max-w-md py-10">
          <div>
            <h2 className="text-3xl xl:text-4xl font-heading font-bold leading-tight">
              Video works both ways
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg leading-relaxed">
              ReelCruiter connects job seekers and employers through short professional videos.
              Both sides get to present themselves clearly before the first conversation.
            </p>
          </div>
          <ul className="space-y-5 mt-8">
            {highlights.map((item) => (
              <li key={item.title} className="border-l-2 border-accent pl-4">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-primary-foreground/75 mt-0.5">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-foreground/60 shrink-0 pt-10 mt-auto">
          © {new Date().getFullYear()} ReelCruiter
        </p>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between py-5 px-6 lg:px-10 border-b border-border/60 lg:border-none shrink-0">
          <div className="lg:hidden flex-1 flex justify-center">
            <Logo size="lg" href="/" />
          </div>
          <div className="hidden lg:block flex-1" />
          <ThemeToggle />
        </header>

        <div className="lg:hidden px-4 pb-2 shrink-0">
          <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-foreground">Video works both ways</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Job seekers and employers both share professional videos for a clearer hiring experience.
            </p>
          </div>
        </div>

        <main className="flex-1 flex items-start justify-center px-4 lg:px-10 pb-12 pt-4 lg:pt-8">
          <div className="w-full max-w-[400px] space-y-6">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            </div>
            {children}
            {footer}
          </div>
        </main>
      </div>
    </div>
  );
}
