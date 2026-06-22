import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";
import RequireAuth from "./components/RequireAuth.tsx";
import LastActivePing from "./components/LastActivePing.tsx";
import NotificationListener from "./components/NotificationListener.tsx";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const Feed = lazy(() => import("./pages/Feed.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Upload = lazy(() => import("./pages/Upload.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const PostDetail = lazy(() => import("./pages/PostDetail.tsx"));
const UserProfile = lazy(() => import("./pages/UserProfile.tsx"));
const SignIn = lazy(() => import("./pages/SignIn.tsx"));
const SignUp = lazy(() => import("./pages/SignUp.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const SavedJobs = lazy(() => import("./pages/SavedJobs.tsx"));
const Applications = lazy(() => import("./pages/Applications.tsx"));
const MyJobs = lazy(() => import("./pages/MyJobs.tsx"));
const JobApplications = lazy(() => import("./pages/JobApplications.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Terms = lazy(() => import("./pages/legal/Terms.tsx"));
const Privacy = lazy(() => import("./pages/legal/Privacy.tsx"));
const Cookies = lazy(() => import("./pages/legal/Cookies.tsx"));
const About = lazy(() => import("./pages/legal/About.tsx"));
const Contact = lazy(() => import("./pages/legal/Contact.tsx"));

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
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
