import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/authCache";

interface Props {
  children: React.ReactNode;
}

/** Guards a route. Signed-out visitors are sent to /signin; after login they go to the feed. */
const RequireAuth = ({ children }: Props) => {
  const { ready, userId } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
