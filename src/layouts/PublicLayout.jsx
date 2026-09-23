import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "@/components/shared/Spinner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";

export default function PublicLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  // Already signed in — no reason to see the auth screens.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary key={location.pathname}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
