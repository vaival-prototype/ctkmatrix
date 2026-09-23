import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "@/components/shared/Spinner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";

// Same auth gate as AuthLayout, but renders bare -- no Sidebar/TopNav/Header --
// because these pages bring their own full-screen mock of the Auto/Compliance
// product chrome (see ProductChrome.jsx) and must not be wrapped in Matrix's
// own AppShell on top of it.
export default function ProductLayout() {
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
    <ErrorBoundary key={location.pathname}>
      <Outlet />
    </ErrorBoundary>
  );
}
