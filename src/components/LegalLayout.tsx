import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <Logo size="md" href="/" />
          <ThemeToggle />
        </div>
      </header>
      <main className="container max-w-3xl py-10 lg:py-14">
        <h1 className="text-3xl font-heading font-bold mb-8">{title}</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
          {children}
        </div>
        <p className="mt-12 text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">← Back to home</Link>
        </p>
      </main>
    </div>
  );
}
