import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/ErrorBoundaryFallback";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// Lazy load route pages for optimal code-splitting performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const EpubReader = lazy(() => import("./pages/EpubReader"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const GroupGate = lazy(() => import("./pages/GroupGate"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// A generic full-page loader for Suspense transitions
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/book/:bookId" element={<BookDetail />} />
                  <Route path="/reader/:bookId" element={<EpubReader />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/join" element={<GroupGate />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/members/:userId" element={<MemberProfile />} />
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
