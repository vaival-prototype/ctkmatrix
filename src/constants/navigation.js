export const APP_VERSION = "v0.10.0";
export const RELEASE_CHANNEL = "Development build";
export const COPYRIGHT_OWNER = "Teamwork Consulting, Inc.";

export const topNav = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { to: "/new-shared-claim", label: "Initiate Matrix", icon: "ClipboardCheck" },
  { to: "/claims", label: "Find Matrix", icon: "FolderKanban" },
];

// `show` decides who sees each tile — see useModuleNav.js.
export const moduleNav = [
  { to: "/claims", label: "Auto Liability", icon: "Car", show: "auto" },
  { to: "/compliance-matrix-entry", label: "Compliance", icon: "FileSearch", show: "compliance" },
  { to: "/audit-matrix-entry", label: "Audit", icon: "ClipboardList", show: "admin" },
  // Hidden for now (UC5 is deferred); the /claim-management page itself still works.
  // { to: "/claim-management", label: "Claim Management", icon: "Handshake", show: "caseManagement" },
  { to: "/approvals", label: "Approvals", icon: "Inbox", show: "approvals" },
  { to: "/audit", label: "Audit Trail", icon: "ScrollText", show: "auditTrail" },
  { to: "/admin/company-enablement", label: "Admin", icon: "ShieldCheck", show: "manageUsers" },
  { to: "/settings", label: "Support", icon: "HelpCircle", show: "everyone" },
];
