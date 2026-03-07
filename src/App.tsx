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
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — no redundant refetches on tab focus
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes (fast back-navigation)
      gcTime: 10 * 60 * 1000,
      // Don't refetch when user switches browser tabs — prevents jarring UI flickers
      refetchOnWindowFocus: false,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      // Show errors once; don't retry mutations which can have side effects
      retry: 0,
    },
  },
});

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
          <PwaInstallPrompt />
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
