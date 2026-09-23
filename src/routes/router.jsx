import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import ProductLayout from "@/layouts/ProductLayout";
import PublicLayout from "@/layouts/PublicLayout";

// Lazy-loaded pages
const SignIn = lazy(() => import("@/pages/SignIn"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));
const PasswordReset = lazy(() => import("@/pages/PasswordReset"));
const AccessExpired = lazy(() => import("@/pages/AccessExpired"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Claims = lazy(() => import("@/pages/Claims"));
const ClaimDetail = lazy(() => import("@/pages/ClaimDetail"));
const ClaimRespond = lazy(() => import("@/pages/ClaimRespond"));
const ClaimSettlement = lazy(() => import("@/pages/ClaimSettlement"));
const ClaimClose = lazy(() => import("@/pages/ClaimClose"));
const NewSharedClaim = lazy(() => import("@/pages/NewSharedClaim"));
const ClaimPackages = lazy(() => import("@/pages/ClaimPackages"));

const Documents = lazy(() => import("@/pages/Documents"));
const DocumentDetail = lazy(() => import("@/pages/DocumentDetail"));
const DocumentUpload = lazy(() => import("@/pages/DocumentUpload"));

const Approvals = lazy(() => import("@/pages/Approvals"));
const Audit = lazy(() => import("@/pages/Audit"));
const Notifications = lazy(() => import("@/pages/Notifications"));

const Settings = lazy(() => import("@/pages/Settings"));
const SettingsNotifications = lazy(() => import("@/pages/SettingsNotifications"));
const SettingsWorkspace = lazy(() => import("@/pages/SettingsWorkspace"));
const SettingsSecurity = lazy(() => import("@/pages/SettingsSecurity"));

const AdminCompanyEnablement = lazy(() => import("@/pages/AdminCompanyEnablement"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminUserNew = lazy(() => import("@/pages/AdminUserNew"));
const AdminUserSync = lazy(() => import("@/pages/AdminUserSync"));

const Companies = lazy(() => import("@/pages/Companies"));
const CompanyOnboarding = lazy(() => import("@/pages/CompanyOnboarding"));

const Invitations = lazy(() => import("@/pages/Invitations"));
const InvitationDetail = lazy(() => import("@/pages/InvitationDetail"));

const ExternalDashboard = lazy(() => import("@/pages/ExternalDashboard"));
const Demo = lazy(() => import("@/pages/Demo"));
const PrototypeStates = lazy(() => import("@/pages/PrototypeStates"));
const AutoMatrixEntry = lazy(() => import("@/pages/AutoMatrixEntry"));
const ComplianceMatrixEntry = lazy(() => import("@/pages/ComplianceMatrixEntry"));
const AutoProductDashboard = lazy(() => import("@/pages/AutoProductDashboard"));
const ComplianceProductDashboard = lazy(() => import("@/pages/ComplianceProductDashboard"));
const AuditMatrixEntry = lazy(() => import("@/pages/AuditMatrixEntry"));
const AdminAccessRequests = lazy(() => import("@/pages/AdminAccessRequests"));
const ClaimManagement = lazy(() => import("@/pages/ClaimManagement"));
const ClaimManagementDetail = lazy(() => import("@/pages/ClaimManagementDetail"));
const RequestAccess = lazy(() => import("@/pages/RequestAccess"));

const NotFound = lazy(() => import("@/pages/NotFound"));

function Spinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-muted border-t-accent" />
    </div>
  );
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<Spinner />}>
      {children}
    </Suspense>
  );
}

function LegacyInitiateMatrixRedirect() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={`new-shared-claim${search}`} replace />;
}

function page(Component) {
  return (
    <SuspenseWrapper>
      <Component />
    </SuspenseWrapper>
  );
}

const routerBaseName = import.meta.env.PROD ? "/ctkmatrix" : "/";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Navigate to="signin" replace />,
    },
    {
      element: <PublicLayout />,
      children: [
        { path: "signin", element: page(SignIn) },
        { path: "accept-invite", element: page(AcceptInvitation) },
        { path: "password-reset", element: page(PasswordReset) },
        { path: "access-expired", element: page(AccessExpired) },
        { path: "unauthorized", element: page(Unauthorized) },
        { path: "request-access", element: page(RequestAccess) },
      ],
    },
    {
      element: <AuthLayout />,
      children: [
        { path: "dashboard", element: page(Dashboard) },
        { path: "claims", element: page(Claims) },
        { path: "claims/:claimId", element: page(ClaimDetail) },
        { path: "claims/:claimId/respond", element: page(ClaimRespond) },
        { path: "claims/:claimId/settlement", element: page(ClaimSettlement) },
        { path: "claims/:claimId/close", element: page(ClaimClose) },
        { path: "new-shared-claim", element: page(NewSharedClaim) },
        { path: "claim-management", element: page(ClaimManagement) },
        { path: "claim-management/:caseId", element: page(ClaimManagementDetail) },
        { path: "claim-packages", element: page(ClaimPackages) },
        { path: "documents", element: page(Documents) },
        { path: "documents/upload", element: page(DocumentUpload) },
        { path: "documents/:documentId", element: page(DocumentDetail) },
        { path: "approvals", element: page(Approvals) },
        { path: "audit", element: page(Audit) },
        { path: "notifications", element: page(Notifications) },
        { path: "settings", element: page(Settings) },
        { path: "settings/notifications", element: page(SettingsNotifications) },
        { path: "settings/workspace", element: page(SettingsWorkspace) },
        { path: "settings/security", element: page(SettingsSecurity) },
        { path: "admin/company-enablement", element: page(AdminCompanyEnablement) },
        { path: "admin/users", element: page(AdminUsers) },
        { path: "admin/users/new", element: page(AdminUserNew) },
        { path: "admin/users/sync", element: page(AdminUserSync) },
        { path: "companies", element: page(Companies) },
        { path: "companies/onboarding", element: page(CompanyOnboarding) },
        { path: "invitations", element: page(Invitations) },
        { path: "invitations/:inviteId", element: page(InvitationDetail) },
        { path: "external-dashboard", element: page(ExternalDashboard) },
        { path: "demo", element: page(Demo) },
        { path: "prototype-states", element: page(PrototypeStates) },
        { path: "auto-matrix-entry", element: page(AutoMatrixEntry) },
        { path: "compliance-matrix-entry", element: page(ComplianceMatrixEntry) },
        { path: "audit-matrix-entry", element: page(AuditMatrixEntry) },
        { path: "initiate-matrix", element: <LegacyInitiateMatrixRedirect /> },
        { path: "admin/access-requests", element: page(AdminAccessRequests) },
      ],
    },
    {
      element: <ProductLayout />,
      children: [
        { path: "product/auto", element: page(AutoProductDashboard) },
        { path: "product/compliance", element: page(ComplianceProductDashboard) },
      ],
    },
    {
      path: "*",
      element: page(NotFound),
    },
  ],
  {
    basename: routerBaseName,
  }
);
