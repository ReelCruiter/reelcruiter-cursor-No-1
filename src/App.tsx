import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing.tsx";
import Feed from "./pages/Feed.tsx";
import Profile from "./pages/Profile.tsx";
import Upload from "./pages/Upload.tsx";
import Messages from "./pages/Messages.tsx";
import Notifications from "./pages/Notifications.tsx";
import PostDetail from "./pages/PostDetail.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Settings from "./pages/Settings.tsx";
import SavedJobs from "./pages/SavedJobs.tsx";
import Applications from "./pages/Applications.tsx";
import MyJobs from "./pages/MyJobs.tsx";
import JobApplications from "./pages/JobApplications.tsx";
import NotFound from "./pages/NotFound.tsx";
import Terms from "./pages/legal/Terms.tsx";
import Privacy from "./pages/legal/Privacy.tsx";
import Cookies from "./pages/legal/Cookies.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import LastActivePing from "./components/LastActivePing.tsx";
import NotificationListener from "./components/NotificationListener.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner richColors closeButton position="top-center" />
          <BrowserRouter>
            <LastActivePing />
            <NotificationListener />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
              <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/saved" element={<RequireAuth><SavedJobs /></RequireAuth>} />
              <Route path="/applications" element={<RequireAuth><Applications /></RequireAuth>} />
              <Route path="/my-jobs" element={<RequireAuth><MyJobs /></RequireAuth>} />
              <Route path="/my-jobs/:postId/applications" element={<RequireAuth><JobApplications /></RequireAuth>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
