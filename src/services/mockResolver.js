/**
 * Offline mock resolver.
 *
 * While there is no backend, `api.js` routes every request here instead of
 * hitting the network (which returns the SPA's index.html and triggers the
 * "Unexpected token '<'" JSON error). Enable/disable with VITE_USE_MOCK.
 *
 * Each handler returns the same envelope the real API would ({ data, meta? }),
 * so services and hooks need no changes. `/auth/me` intentionally rejects with
 * a 401 so the app starts logged-out and the sign-in / invitation flows drive
 * the session, exactly like production.
 *
 * A handful of collections below (users, invitations, upgradeRequests,
 * accessRequests) are mutated in place during the session — e.g. submitting
 * an upgrade request makes it show up in the admin queue immediately, and
 * approving it flips the requester's tier — so the multi-tier onboarding
 * story is click-through-able without a real backend. None of this persists
 * past a full page reload; it's session-only, in-memory state for the demo.
 */
import { ApiError } from "./api";
import {
  users,
  companies,
  invitations,
  sharedClaimMatrixs,
  claimPackageOptions,
  documents,
  approvalQueue,
  notificationPreferences,
  integrationEvents,
  accessTiers,
  rbacPolicy,
  accessRequests,
  claimManagementCases,
  dashboardData,
  unclassifiedUploads,
} from "@/data/mock";

let sessionUserId = users[0].id;

function toSessionUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company,
    role: u.role,
    tier: u.tier ?? "auto",
    sourceApp: u.sourceApp ?? null,
    status: "Active",
  };
}

/** The signed-in user returned by login / accept-invitation / me. */
function sessionUser() {
  const u = users.find((x) => x.id === sessionUserId) ?? users[0];
  return toSessionUser(u);
}

/** Preview shown on the invitation screen (GET /invitations/lookup). */
function invitationPreview(code) {
  const inv = (code && invitations.find((i) => i.code === code)) || invitations[0];
  return {
    email: inv.email,
    company: inv.company,
    role: inv.role,
    matrixId: inv.matrixId,
    matrixTitle: inv.matrixTitle,
    expires: inv.expires,
  };
}

function list(data) {
  return { data, meta: { total: data.length, page: 1, limit: data.length || 20 } };
}

function nextId(prefix, collection) {
  return `${prefix}-${String(collection.length + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * Resolve a mocked response for a request. Returns the response envelope or
 * throws an ApiError to mimic a failure (e.g. no session).
 *
 * @param {string} path   Request path including any query string.
 * @param {string} method HTTP method.
 * @param {unknown} [body] Parsed JSON body (or FormData) for POST/PUT, when the caller sent one.
 * @returns {{ data: unknown, meta?: object }}
 */
export function resolveMock(path, method = "GET", body) {
  const clean = path.split("?")[0];
  const query = path.includes("?") ? Object.fromEntries(new URLSearchParams(path.split("?")[1])) : {};

  // ---- Auth ------------------------------------------------------------
  if (clean === "/auth/me" && method === "GET") {
    throw new ApiError("No active session", { status: 401, code: "unauthenticated" });
  }
  if (clean === "/auth/login") {
    const email = (body && typeof body === "object" && body.email) || "";
    const match = email && users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (match) sessionUserId = match.id;
    return { data: sessionUser() };
  }
  if (clean === "/auth/accept-invitation") {
    const code = body && typeof body === "object" ? body.code : null;
    const inv = code ? invitations.find((i) => i.code === code) : invitations[0];
    if (inv) {
      inv.status = "Accepted";
      let user = users.find((u) => u.email.toLowerCase() === inv.email.toLowerCase());
      if (!user) {
        user = {
          id: nextId("cmu", users),
          name: inv.email.split("@")[0].replace(/[._]/g, " "),
          email: inv.email,
          source: "Claim Matrix",
          sourceApp: null,
          company: inv.company,
          role: inv.role || "Matrix Receiver",
          // New invited-only users land as free receivers by default — they
          // can request an upgrade to initiate from the Upgrade screen.
          tier: "level1",
          status: "Active",
          lastSeen: "Just now",
        };
        users.push(user);
      }
      sessionUserId = user.id;
    }
    return { data: sessionUser() };
  }
  if (clean === "/auth/logout") return { data: null };
  if (clean === "/auth/password-reset") return { data: null };

  // ---- Invitations -------------------------------------------------------
  if (clean === "/invitations/lookup") return { data: invitationPreview(query.code) };
  if (clean === "/invitations" && method === "GET") return list(invitations);
  if (clean === "/invitations" && method === "POST") {
    const b = body && typeof body === "object" ? body : {};
    const created = {
      id: nextId("inv", invitations),
      code: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      email: b.email,
      company: b.company,
      role: b.role,
      matrixId: b.matrixId,
      matrixTitle: sharedClaimMatrixs.find((m) => m.id === b.matrixId)?.title ?? "",
      status: "Sent",
      expires: b.expiration || "30 days",
      permissions: ["View claim metadata", "Comment and respond", "Upload supporting documents"],
    };
    invitations.push(created);
    return { data: created };
  }
  if (clean.startsWith("/invitations/") && method === "GET") {
    const id = clean.split("/")[2];
    return { data: invitations.find((i) => i.id === id) ?? invitations[0] };
  }

  // ---- Claims --------------------------------------------------------------
  if (clean === "/claim-packages" && method === "GET") return list(claimPackageOptions);
  if (clean === "/claims" && method === "GET") return list(sharedClaimMatrixs);
  if (clean === "/claims" && method === "POST") {
    const b = body && typeof body === "object" ? body : {};
    const created = {
      id: nextId("CM-2609", sharedClaimMatrixs),
      autoClaimId: b.autoClaimId ?? null,
      originApp: b.originApp || "auto",
      title: b.title || claimPackageOptions.find((p) => p.id === b.autoClaimId)?.title || "New shared matrix",
      status: b.originApp && b.originApp !== "auto" ? "negotiation-active" : "settlement-proposed",
      initiator: sessionUser().company,
      recipient: b.recipientCompany,
      liability: b.originApp && b.originApp !== "auto" ? "Not applicable (negotiation-stage origin)" : "Pending",
      exposure: b.exposure || "Pending",
      opened: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      updated: "Just now",
      documents: Array.isArray(b.includedDocuments) ? b.includedDocuments.length : 0,
      comments: 0,
      participants: [sessionUser().company, b.recipientCompany].filter(Boolean),
    };
    sharedClaimMatrixs.push(created);

    // Mark's origination flow: a recipient that's a company not yet known to Matrix
    // routes through an automated Holding Queue for admin review, distinct from an
    // individual recipient, who goes straight to receive-only access with no
    // company-side gate at all. Model the queue entry here so it actually shows up
    // in Admin > Company Enablement rather than silently doing nothing.
    if (b.recipientIsNew && b.recipientType === "company" && b.recipientCompany) {
      const alreadyQueued = companies.some(
        (c) => c.name.toLowerCase() === String(b.recipientCompany).toLowerCase()
      );
      if (!alreadyQueued) {
        companies.push({
          id: nextId("ctk-co-hq", companies),
          name: b.recipientCompany,
          status: "Holding Queue",
          trust: "Unverified",
          subscription: "Not configured",
          contacts: 1,
          matrixs: 1,
          notifications: "Email",
          contactEmail: b.recipientAdjuster || null,
          holdingReason: `Auto-created by matrix ${created.id} — not yet a known Claim Toolkit company.`,
        });
      }
    }

    return { data: created };
  }
  if (clean.startsWith("/claims/") && method === "GET") {
    const id = clean.split("/")[2];
    return { data: sharedClaimMatrixs.find((c) => c.id === id) ?? sharedClaimMatrixs[0] };
  }

  // ---- Documents -----------------------------------------------------------
  if (clean === "/documents" && method === "GET") return list(documents);
  if (clean === "/documents" && method === "POST") {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const get = (key) => (isForm ? body.get(key) : body?.[key]);
    const file = isForm ? body.get("File") : null;
    const created = {
      id: nextId("doc", documents),
      name: get("DisplayName") || file?.name || "uploaded-file",
      matrixId: get("MatrixId") || "",
      type: get("Type") || "Evidence",
      version: "v1",
      status: "Pending review",
      owner: sessionUser().company,
      uploadedBy: sessionUser().name,
      uploadedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
      access: [sessionUser().company],
      metadata: get("Notes") ? [["Notes", get("Notes")]] : [],
    };
    documents.push(created);
    return { data: created };
  }
  if (clean.startsWith("/documents/") && method === "GET") {
    const id = clean.split("/")[2];
    return { data: documents.find((d) => d.id === id) ?? documents[0] };
  }

  // ---- Unclassified uploads -------------------------------------------------
  if (clean === "/unclassified-uploads" && method === "GET") {
    const filtered = query.matrixId ? unclassifiedUploads.filter((u) => u.matrixId === query.matrixId) : unclassifiedUploads;
    return list(filtered);
  }
  if (clean === "/unclassified-uploads" && method === "POST") {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const get = (key) => (isForm ? body.get(key) : body?.[key]);
    const file = isForm ? body.get("File") : null;
    const created = {
      id: nextId("unc", unclassifiedUploads),
      matrixId: get("MatrixId") || "",
      name: file?.name || get("Name") || "uploaded-file",
      uploadedBy: sessionUser().name,
      uploadedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC",
    };
    unclassifiedUploads.push(created);
    return { data: created };
  }
  if (clean.match(/^\/unclassified-uploads\/[^/]+\/promote$/) && method === "POST") {
    const id = clean.split("/")[2];
    const idx = unclassifiedUploads.findIndex((u) => u.id === id);
    if (idx === -1) throw new ApiError("Upload not found", { status: 404, code: "not_found" });
    const upload = unclassifiedUploads[idx];
    const b = body && typeof body === "object" ? body : {};
    const promoted = {
      id: nextId("doc", documents),
      name: upload.name,
      matrixId: upload.matrixId,
      type: b.type || "Evidence",
      version: "v1",
      status: "Pending review",
      owner: sessionUser().company,
      uploadedBy: upload.uploadedBy,
      uploadedAt: upload.uploadedAt,
      access: [sessionUser().company],
      metadata: [],
    };
    documents.push(promoted);
    unclassifiedUploads.splice(idx, 1);
    return { data: promoted };
  }
  if (clean.match(/^\/unclassified-uploads\/[^/]+$/) && method === "DELETE") {
    const id = clean.split("/")[2];
    const idx = unclassifiedUploads.findIndex((u) => u.id === id);
    if (idx !== -1) unclassifiedUploads.splice(idx, 1);
    return { data: null };
  }

  // ---- Access tiers, RBAC, upgrade + access requests ------------------------
  if (clean === "/access-tiers" && method === "GET") return list(accessTiers);
  if (clean === "/admin/rbac" && method === "GET") return { data: rbacPolicy };
  if (clean === "/admin/rbac" && method === "PUT") return { data: { saved: true } };
  if (clean === "/admin/roles" && method === "GET") return list(rbacPolicy.roles);

  if (clean === "/access-requests" && method === "GET") return list(accessRequests);
  if (clean === "/access-requests" && method === "POST") {
    const b = body && typeof body === "object" ? body : {};
    const created = {
      id: nextId("req", accessRequests),
      name: b.name,
      email: b.email,
      company: b.company,
      domain: (b.email || "").split("@")[1] || "",
      reason: b.reason || "",
      status: "Pending review",
      requestedAt: new Date().toISOString(),
    };
    accessRequests.push(created);
    return { data: created };
  }
  if (clean.match(/^\/access-requests\/[^/]+\/decision$/) && method === "POST") {
    const id = clean.split("/")[2];
    const b = body && typeof body === "object" ? body : {};
    const reqRow = accessRequests.find((r) => r.id === id);
    if (!reqRow) throw new ApiError("Access request not found", { status: 404, code: "not_found" });
    if (b.decision === "approve") {
      reqRow.status = "Approved";
      let user = users.find((u) => u.email.toLowerCase() === reqRow.email.toLowerCase());
      if (!user) {
        user = {
          id: nextId("cmu", users),
          name: reqRow.name,
          email: reqRow.email,
          source: "Claim Matrix",
          sourceApp: null,
          company: reqRow.company,
          role: "Matrix Receiver",
          tier: "level1",
          status: "Active",
          lastSeen: "Just now",
        };
        users.push(user);
      }
    } else if (b.decision === "reject") {
      reqRow.status = "Rejected";
    }
    return { data: reqRow };
  }

  // ---- Claim Management (UC5 — Contribution / JDA-SIA) --------------------
  if (clean === "/claim-management" && method === "GET") return list(claimManagementCases);
  if (clean === "/claim-management" && method === "POST") {
    const b = body && typeof body === "object" ? body : {};
    const created = {
      id: nextId("cm5", claimManagementCases),
      title: b.title || "Untitled contribution case",
      relatedMatrixId: b.relatedMatrixId || null,
      leadCompany: b.leadCompany || "",
      agreementType: b.agreementType || "JDA",
      status: "Still Treating",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agreement: { status: "Draft", docusignEnvelopeId: null, documentName: null, executedAt: null },
      parties: Array.isArray(b.parties) ? b.parties : [],
      activityNotes: [],
      documents: [],
      releases: [],
    };
    claimManagementCases.push(created);
    return { data: created };
  }
  if (clean.match(/^\/claim-management\/[^/]+$/) && method === "GET") {
    const id = clean.split("/")[2];
    return { data: claimManagementCases.find((c) => c.id === id) ?? null };
  }
  if (clean.match(/^\/claim-management\/[^/]+$/) && (method === "PUT" || method === "PATCH")) {
    const id = clean.split("/")[2];
    const row = claimManagementCases.find((c) => c.id === id);
    if (!row) throw new ApiError("Claim management case not found", { status: 404, code: "not_found" });
    const b = body && typeof body === "object" ? body : {};
    if (b.status) row.status = b.status;
    if (b.leadCompany) row.leadCompany = b.leadCompany;
    if (b.agreementType) row.agreementType = b.agreementType;
    if (b.agreement && typeof b.agreement === "object") row.agreement = { ...row.agreement, ...b.agreement };
    if (b.appendParty) row.parties.push({ id: nextId("tp", row.parties), paymentStatus: "Not started", ...b.appendParty });
    if (b.updateParty && b.updateParty.id) {
      row.parties = row.parties.map((p) => (p.id === b.updateParty.id ? { ...p, ...b.updateParty } : p));
    }
    if (b.appendNote) {
      row.activityNotes.push({ id: nextId("n", row.activityNotes), date: new Date().toISOString(), author: sessionUser().name, note: b.appendNote });
    }
    if (b.appendDocument) {
      row.documents.push({ id: nextId("d", row.documents), uploadedAt: new Date().toISOString(), ...b.appendDocument });
    }
    if (b.appendRelease) {
      row.releases.push({ id: nextId("r", row.releases), ...b.appendRelease });
    }
    row.updatedAt = new Date().toISOString();
    return { data: row };
  }

  // ---- Other read endpoints ------------------------------------------------
  if (clean === "/approvals" && method === "GET") return list(approvalQueue);
  if (clean === "/companies" && method === "GET") return list(companies);
  if (clean === "/users" && method === "GET") return list(users);
  if (clean === "/audit" && method === "GET") return list(integrationEvents);
  if (clean === "/notification-preferences" && method === "GET") return { data: notificationPreferences };
  if (clean === "/notifications" && method === "GET") return list([]);
  if (clean === "/dashboard" && method === "GET") return { data: dashboardData };

  // ---- Generic fallbacks ---------------------------------------------------
  if (method === "GET") return list([]);
  return { data: { ok: true } };
}
