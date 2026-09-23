import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppShell from "@/components/app-shell/AppShell";
import ScrollToTop from "@/components/shared/ScrollToTop";
import Spinner from "@/components/shared/Spinner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <ScrollToTop />
      <AppShell>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </AppShell>
    </>
  );
}
