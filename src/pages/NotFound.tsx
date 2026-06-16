import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const NotFound = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <header className="border-b border-border px-6 h-16 flex items-center justify-between">
      <Logo size="md" href="/" />
      <ThemeToggle />
    </header>
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-heading font-bold text-primary/20">404</p>
        <h1 className="text-2xl font-heading font-bold mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-2 mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-full gap-2">
            <Link to="/">
              <Home className="w-4 h-4" /> Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-full gap-2">
            <Link to="/feed">
              <Search className="w-4 h-4" /> Browse feed
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default NotFound;
