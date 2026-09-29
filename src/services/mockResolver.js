/**
 * Offline mock backend (enabled with VITE_USE_MOCK="true", which is what the
 * GitHub Pages demo runs). `api.js` routes every request here instead of the
 * network, passing the caller's bearer token so the resolver always knows who
 * is asking. Data lives in src/services/mockDb.js (persisted to
 * localStorage), and every handler enforces the agreed access rules the same
 * way a real backend would — the UI hiding a button is never the only check.
 */
import { ApiError } from "./api";
import {
  accessTiers,
  rbacPolicy,
  dashboardData,
  systemOwnershipBoundaries,
  collaborationModes,
  integrationEvents,
} from "@/data/mock";
import { loadDb, saveDb, resetDb } from "./mockDb";

// Seed accounts only (shown on the sign-in page). Accounts created during the
// demo set their own password through the emailed set-password link.
const DEMO_PASSWORD = "demo1234";
const TOKEN_PREFIX = "mock:";
const INVITE_DAYS = 7;
const DAY_MS = 86400000;
// Claim Toolkit (Auto/Compliance) accounts sign in through their app. Decided by
// where the account comes from, not its level — an upgraded Level 1 is Level 3
// inside Matrix but still signs in with a Matrix password.
const isCtkUser = (u) => u?.source === "Claim Toolkit";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LEVEL_LABELS = {
  admin: "Admin",
  approver: "Approver",
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3",
  level4: "Level 4",
};

const STATUS_LABELS = {
  ready: "Ready — not shared yet",
  sent: "Sent",
  "invitation-pending": "Invitation pending",
  viewed: "Viewed",
  "under-review": "Under review",
  "response-submitted": "Response submitted",
  "negotiation-active": "Negotiation active",
  "settlement-proposed": "Settlement proposed",
  "settlement-countered": "Settlement countered",
  "settlement-accepted": "Settlement accepted",
  closed: "Closed",
};

const PERMISSIONS_BY_LEVEL = {
  level1: ["See the claim", "Upload evidence", "Make and reply to offers", "Chat"],
  level4: ["See the claim (view only)"],
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fail(status, message, code, fields) {
  throw new ApiError(message, { status, code, fields });
}

function ok(data) {
  return { data };
}

function list(items, meta) {
  return { data: items, meta: meta ?? { total: items.length, page: 1, limit: items.length || 20 } };
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "INV-";
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function nowIso() {
  return new Date().toISOString();
}

function today() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relative(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function sameEmail(a, b) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

function capsOf(tier) {
  return accessTiers.find((t) => t.key === tier)?.capabilities ?? {};
}

function toSessionUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company,
    role: u.role,
    tier: u.tier,
    sourceApp: u.sourceApp ?? null,
    accountType: u.accountType ?? null,
    source: u.source ?? null,
    status: u.status,
  };
}

function publicUser(u) {
  const { password: _password, ...rest } = u;
  return { ...rest, tierLabel: LEVEL_LABELS[u.tier] ?? u.tier };
}

function session(user) {
  return ok({ user: toSessionUser(user), token: `${TOKEN_PREFIX}${user.id}` });
}

function body(b) {
  return b && typeof b === "object" && !(typeof FormData !== "undefined" && b instanceof FormData) ? b : {};
}

function formGetter(b) {
  const isForm = typeof FormData !== "undefined" && b instanceof FormData;
  return (key) => (isForm ? b.get(key) : b?.[key]);
}

// ---------------------------------------------------------------------------
// Access checks
// ---------------------------------------------------------------------------

function requireUser(ctx) {
  if (!ctx.me) fail(401, "Please sign in to continue.", "unauthenticated");
  return ctx.me;
}

function requireCap(ctx, capability, message) {
  requireUser(ctx);
  if (!ctx.caps[capability]) {
    fail(403, message ?? "Your account doesn't have access to this.", "forbidden");
  }
}

function isActiveMember(claim, me) {
  return (claim.members ?? []).some((m) => m.userId === me.id && m.status === "Active");
}

function canSeeClaim(claim, me) {
  if (!me) return false;
  if (capsOf(me.tier).viewAllClaims) return true;
  if (claim.status === "ready") return claim.ownerUserId === me.id;
  return claim.initiatorUserId === me.id || isActiveMember(claim, me);
}

function findClaim(ctx, id) {
  const claim = ctx.db.claims.find((c) => c.id === id);
  if (!claim) fail(404, "This claim doesn't exist.", "not_found");
  if (!canSeeClaim(claim, ctx.me)) fail(403, "You don't have access to this claim.", "forbidden");
  return claim;
}

/** An in-claim action: needs the capability, must not be read-only, and the claim must be live. */
function requireClaimAction(ctx, claimId, capability, message) {
  requireCap(ctx, capability, message);
  const claim = findClaim(ctx, claimId);
  if (ctx.caps.readOnly) fail(403, "Your account can view this claim but can't change it.", "forbidden");
  if (claim.status === "ready") fail(409, "This claim hasn't been shared yet — start a Matrix from it first.", "not_started");
  if (claim.status === "closed") fail(409, "This claim is closed.", "closed");
  return claim;
}

// ---------------------------------------------------------------------------
// Side effects shared by several handlers
// ---------------------------------------------------------------------------

function logEvent(ctx, action, { target, matrixCode, oldValue, newValue, actor, actorCompany } = {}) {
  ctx.db.auditEvents.unshift({
    id: uid("ae"),
    timestamp: nowIso(),
    actor: actor ?? ctx.me?.name ?? "System",
    actorCompany: actorCompany ?? ctx.me?.company ?? null,
    action,
    target: target ?? matrixCode ?? "",
    matrixCode: matrixCode ?? null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
  });
}

function sendEmail(ctx, { to, toName, subject, text, cta, claimId }) {
  ctx.db.emails.unshift({
    id: uid("em"),
    to,
    toName: toName ?? to,
    subject,
    body: text,
    cta: cta ?? null,
    sentAt: nowIso(),
    claimId: claimId ?? null,
  });
}

function notify(ctx, userId, title, text) {
  if (!userId) return;
  ctx.db.notifications.unshift({ id: uid("ntf"), userId, title, body: text, time: nowIso(), read: false });
}

function notifyApprovers(ctx, title, text) {
  ctx.db.users
    .filter((u) => capsOf(u.tier).approvals && u.status === "Active")
    .forEach((u) => notify(ctx, u.id, title, text));
}

function createPasswordToken(ctx, user, purpose) {
  const token = `pw-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  ctx.db.passwordTokens.push({ token, userId: user.id, email: user.email, purpose, createdAt: nowIso(), usedAt: null });
  const isSetup = purpose === "setup";
  sendEmail(ctx, {
    to: user.email,
    toName: user.name,
    subject: isSetup ? "Set your Claim Matrix password" : "Reset your Claim Matrix password",
    text: isSetup
      ? `Your Claim Matrix account is ready, ${user.name}. Set a password to sign in.`
      : "Use this link to choose a new Claim Matrix password.",
    cta: { label: isSetup ? "Set your password" : "Reset password", path: `/set-password?token=${token}`, openAs: "public" },
  });
  return token;
}

/** Marks invitations older than 7 days as Expired (and the matching claim members). */
function expireInvitations(db) {
  const now = Date.now();
  for (const inv of db.invitations) {
    if (inv.status === "Sent" && new Date(inv.expiresAt).getTime() < now) {
      inv.status = "Expired";
      const claim = db.claims.find((c) => c.id === inv.claimId);
      const member = claim?.members?.find((m) => m.inviteCode === inv.code);
      if (member && member.status === "Invited") member.status = "Expired";
    }
  }
}

function initiatorMember(me) {
  return {
    id: uid("m"),
    userId: me.id,
    email: me.email,
    name: me.name,
    company: me.company,
    level: me.tier,
    role: "Initiator",
    status: "Active",
    invitedBy: null,
    invitedAt: nowIso(),
  };
}

/**
 * Adds people to a claim. Known accounts join at their own level straight
 * away; an unknown email becomes an invitation — "company-user" (Level 1,
 * must request access and be approved) or "claim-party" (Level 4, just sets
 * a password). Returns one result row per invitee.
 */
function addInvitees(ctx, claim, invitees, message) {
  const results = [];
  const fields = {};
  invitees.forEach((inv, index) => {
    const email = String(inv?.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) fields[`invitees.${index}.email`] = "Enter a valid email address";
  });
  if (Object.keys(fields).length) fail(422, "Some invitees need fixing.", "validation", fields);

  for (const inv of invitees) {
    const email = String(inv.email).trim().toLowerCase();
    const existingMember = (claim.members ?? []).find(
      (m) => sameEmail(m.email, email) && !["Rejected", "Expired"].includes(m.status)
    );
    if (existingMember) {
      results.push({ email, name: existingMember.name, status: "Already in this claim", level: existingMember.level });
      continue;
    }

    const account = ctx.db.users.find((u) => sameEmail(u.email, email));
    if (account) {
      const isCtk = isCtkUser(account);
      const memberStatus = account.status === "Active" ? "Active" : "Awaiting password";
      claim.members.push({
        id: uid("m"),
        userId: account.id,
        email: account.email,
        name: account.name,
        company: account.company,
        level: account.tier,
        role: "Receiver",
        status: memberStatus,
        invitedBy: ctx.me.id,
        invitedAt: nowIso(),
      });
      sendEmail(ctx, {
        to: account.email,
        toName: account.name,
        subject: `${ctx.me.name} added you to a claim on Claim Matrix`,
        text: `${ctx.me.name} (${ctx.me.company ?? "Claim Matrix"}) added you to “${claim.title}”.${message ? ` Message: “${message}”` : ""}`,
        cta: isCtk
          ? { label: "Open the claim", path: `/claims/${claim.id}`, openAs: "sso", email: account.email }
          : { label: "Sign in to open the claim", path: "/signin", openAs: "public" },
        claimId: claim.id,
      });
      notify(ctx, account.id, "Added to a claim", `${ctx.me.name} added you to ${claim.id}.`);
      logEvent(ctx, "Person added", { target: account.name, matrixCode: claim.id, newValue: memberStatus });
      results.push({ email, name: account.name, status: memberStatus, level: account.tier });
      continue;
    }

    const type = inv.type === "claim-party" ? "claim-party" : inv.type === "company-user" ? "company-user" : null;
    const name = String(inv.name ?? "").trim();
    if (!type) fail(422, `Choose whether ${email} is a company user or a person in the claim.`, "validation");
    if (!name) fail(422, `Add a name for ${email}.`, "validation");

    const level = type === "claim-party" ? "level4" : "level1";
    const code = inviteCode();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * DAY_MS).toISOString();
    ctx.db.invitations.push({
      id: uid("inv"),
      code,
      claimId: claim.id,
      matrixId: claim.id,
      matrixTitle: claim.title,
      email,
      name,
      company: type === "company-user" ? String(inv.company ?? "").trim() || null : null,
      inviteType: type,
      level,
      role: type === "claim-party" ? "Person in the claim (Level 4)" : "Company user (Level 1)",
      invitedByUserId: ctx.me.id,
      invitedBy: ctx.me.name,
      status: "Sent",
      sentAt: nowIso(),
      expiresAt,
      permissions: PERMISSIONS_BY_LEVEL[level],
    });
    claim.members.push({
      id: uid("m"),
      userId: null,
      email,
      name,
      company: type === "company-user" ? String(inv.company ?? "").trim() || null : null,
      level,
      role: "Receiver",
      status: "Invited",
      invitedBy: ctx.me.id,
      invitedAt: nowIso(),
      inviteCode: code,
      expiresAt,
    });
    sendEmail(ctx, {
      to: email,
      toName: name,
      subject: `${ctx.me.name} invited you to a claim on Claim Matrix`,
      text:
        type === "company-user"
          ? `${ctx.me.name} (${ctx.me.company ?? "Claim Matrix"}) invited you to “${claim.title}”. Tell us about your company to request access. This invitation expires in ${INVITE_DAYS} days.`
          : `${ctx.me.name} (${ctx.me.company ?? "Claim Matrix"}) shared the claim “${claim.title}” with you. Set a password to view it. This invitation expires in ${INVITE_DAYS} days.`,
      cta:
        type === "company-user"
          ? { label: "Request access", path: `/request-access?invite=${code}`, openAs: "public" }
          : { label: "Set your password", path: `/accept-invite?code=${code}`, openAs: "public" },
      claimId: claim.id,
    });
    logEvent(ctx, "Person invited", { target: name, matrixCode: claim.id, newValue: `Invited · ${LEVEL_LABELS[level]}` });
    results.push({ email, name, status: "Invited", level });
  }
  claim.updated = "Just now";
  return results;
}

function serializeClaim(ctx, claim) {
  const members = claim.members ?? [];
  const active = members.filter((m) => m.status === "Active");
  const participants = [...new Set(active.filter((m) => m.company && m.level !== "level4").map((m) => m.company))];
  return {
    ...claim,
    statusLabel: STATUS_LABELS[claim.status] ?? claim.status,
    participants,
    documents: ctx.db.documents.filter((d) => d.matrixId === claim.id).length,
    isInitiator: !!ctx.me && claim.initiatorUserId === ctx.me.id,
    participantDetails: members.map((m) => ({
      name: m.name,
      company: m.company ?? "Individual",
      role: m.role,
      contactEmail: m.email,
      contactRole: LEVEL_LABELS[m.level] ?? m.level,
      level: m.level,
      joined: m.invitedAt,
      lastActivity: m.lastActivity ?? null,
      invitationStatus: m.status,
    })),
  };
}

function toPackage(ctx, claim) {
  const owner = ctx.db.users.find((u) => u.id === claim.ownerUserId);
  return {
    id: claim.autoClaimId,
    matrixId: claim.id,
    title: claim.title,
    insured: claim.insuredName,
    adjuster: owner?.name ?? "—",
    lossDescription: claim.accidentDesc ?? claim.title,
    contributingFactor: claim.accidentType,
    lossDate: claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—",
    lossLocation: claim.lossLocation,
    lossCity: claim.lossCity,
    stateOfLoss: claim.state,
    assessment: "Assessment complete",
    suggestedLiability: claim.liability,
    documents: claim.documentsAvailable ?? [],
    copiedAt: claim.copiedAt,
  };
}

function createDocumentsFor(ctx, claim, names, source) {
  for (const name of names) {
    ctx.db.documents.push({
      id: uid("doc"),
      name,
      matrixId: claim.id,
      type: source === "auto" ? "Claim Toolkit Auto document" : "Uploaded document",
      version: "v1",
      status: "Shared",
      owner: ctx.me.company,
      uploadedBy: ctx.me.name,
      uploadedAt: nowIso(),
      access: ["Everyone in this claim"],
      metadata: [["Source", source === "auto" ? "Claim Toolkit Auto" : "Manual entry"]],
    });
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

const routes = [];
function route(method, pattern, handler) {
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`);
  routes.push({ method, regex, handler });
}

// ---- Auth ------------------------------------------------------------------

route("POST", "/auth/login", (ctx, b) => {
  const email = String(b.email ?? "");
  const user = ctx.db.users.find((u) => sameEmail(u.email, email));
  const wrong = () => fail(401, "Email or password is incorrect.", "invalid_credentials");
  if (!user) wrong();
  if (isCtkUser(user)) {
    fail(
      403,
      "This is a Claim Toolkit account. Open Claim Matrix from your Claim Toolkit Auto or Compliance app — you'll be signed in automatically.",
      "ctk_account"
    );
  }
  if (user.status !== "Active") {
    fail(403, "Your account isn't ready yet. Use the link in your email to set a password.", "not_activated");
  }
  const expected = user.password === undefined ? DEMO_PASSWORD : user.password;
  if (!expected || b.password !== expected) wrong();
  user.lastSeen = "Now";
  return session(user);
});

// Simulated single sign-on from the Claim Toolkit Auto / Compliance app.
route("POST", "/auth/sso", (ctx, b) => {
  const user = ctx.db.users.find((u) => sameEmail(u.email, b.email));
  if (!isCtkUser(user)) {
    fail(403, "Only Claim Toolkit Auto and Compliance accounts can open Matrix from their app.", "forbidden");
  }
  user.lastSeen = "Now";
  return session(user);
});

route("GET", "/auth/me", (ctx) => {
  const me = requireUser(ctx);
  return ok(toSessionUser(me));
});

route("POST", "/auth/logout", () => ok(null));

route("POST", "/auth/password-reset", (ctx, b) => {
  const user = ctx.db.users.find((u) => sameEmail(u.email, b.email));
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  if (user && !isCtkUser(user) && user.status === "Active") createPasswordToken(ctx, user, "reset");
  return ok(null);
});

route("GET", "/auth/password-token", (ctx, _b, q) => {
  const record = ctx.db.passwordTokens.find((t) => t.token === q.token && !t.usedAt);
  if (!record) fail(404, "This link is no longer valid. Ask for a new one.", "invalid_token");
  const user = ctx.db.users.find((u) => u.id === record.userId);
  return ok({ email: user?.email, name: user?.name, purpose: record.purpose });
});

route("POST", "/auth/set-password", (ctx, b) => {
  const record = ctx.db.passwordTokens.find((t) => t.token === b.token && !t.usedAt);
  if (!record) fail(404, "This link is no longer valid. Ask for a new one.", "invalid_token");
  if (String(b.password ?? "").length < 8) {
    fail(422, "Choose a longer password.", "validation", { password: "Password must be at least 8 characters" });
  }
  const user = ctx.db.users.find((u) => u.id === record.userId);
  if (!user) fail(404, "This account no longer exists.", "not_found");
  user.password = b.password;
  user.status = "Active";
  user.lastSeen = "Now";
  record.usedAt = nowIso();
  for (const claim of ctx.db.claims) {
    for (const m of claim.members ?? []) {
      if (m.userId === user.id && m.status === "Awaiting password") m.status = "Active";
    }
  }
  ctx.me = user;
  logEvent(ctx, record.purpose === "setup" ? "Account activated" : "Password reset", { target: user.email });
  return session(user);
});

// ---- Invitations -----------------------------------------------------------

route("GET", "/invitations/lookup", (ctx, _b, q) => {
  const inv = ctx.db.invitations.find((i) => i.code === q.code);
  if (!inv) fail(404, "We couldn't find this invitation.", "not_found");
  if (inv.status === "Expired") fail(410, "This invitation has expired.", "invitation_expired");
  if (["Rejected", "Cancelled"].includes(inv.status)) fail(410, "This invitation is no longer active.", "invitation_closed");
  return ok({
    email: inv.email,
    name: inv.name,
    company: inv.company,
    role: inv.role,
    inviteType: inv.inviteType,
    level: inv.level,
    matrixId: inv.matrixId,
    matrixTitle: inv.matrixTitle,
    invitedBy: inv.invitedBy,
    expiresAt: inv.expiresAt,
    status: inv.status,
    accountExists: ctx.db.users.some((u) => sameEmail(u.email, inv.email)),
  });
});

// Level 4: a person in the claim sets a password and gets straight in.
route("POST", "/auth/accept-invitation", (ctx, b) => {
  const inv = ctx.db.invitations.find((i) => i.code === b.code);
  if (!inv) fail(404, "We couldn't find this invitation.", "not_found");
  if (inv.status === "Expired") fail(410, "This invitation has expired.", "invitation_expired");
  if (inv.inviteType !== "claim-party") fail(400, "This invitation needs an access request instead.", "wrong_flow");
  if (inv.status !== "Sent") fail(409, "This invitation has already been used.", "used");
  const fields = {};
  if (!String(b.fullName ?? "").trim()) fields.fullName = "Full name is required";
  if (String(b.password ?? "").length < 8) fields.password = "Password must be at least 8 characters";
  if (Object.keys(fields).length) fail(422, "Some fields need fixing.", "validation", fields);
  if (ctx.db.users.some((u) => sameEmail(u.email, inv.email))) {
    fail(409, "You already have an account — sign in instead.", "account_exists");
  }
  const user = {
    id: uid("cmu"),
    name: String(b.fullName).trim(),
    email: inv.email,
    source: "Claim Matrix",
    sourceApp: null,
    company: null,
    accountType: "individual",
    role: "Claim Party",
    tier: "level4",
    status: "Active",
    password: b.password,
    lastSeen: "Now",
  };
  ctx.db.users.push(user);
  inv.status = "Accepted";
  const claim = ctx.db.claims.find((c) => c.id === inv.claimId);
  const member = claim?.members?.find((m) => m.inviteCode === inv.code);
  if (member) {
    member.userId = user.id;
    member.name = user.name;
    member.status = "Active";
  }
  ctx.me = user;
  logEvent(ctx, "Invitation accepted", { target: user.name, matrixCode: inv.claimId, oldValue: "Invited", newValue: "Active" });
  return session(user);
});

route("GET", "/invitations", (ctx) => {
  requireCap(ctx, "invite");
  const items = ctx.caps.viewAllClaims
    ? ctx.db.invitations
    : ctx.db.invitations.filter((i) => i.invitedByUserId === ctx.me.id);
  return list(items);
});

route("POST", "/invitations", (ctx, b) => {
  requireCap(ctx, "invite", "Only Admin, Level 3 and Level 2 users can invite people.");
  const claim = requireClaimAction(ctx, b.matrixId, "invite");
  const results = addInvitees(
    ctx,
    claim,
    [{ email: b.email, name: b.name || String(b.email ?? "").split("@")[0], company: b.company, type: b.type || "company-user" }],
    b.message
  );
  const created = ctx.db.invitations.find((i) => sameEmail(i.email, b.email) && i.claimId === claim.id);
  return ok(created ?? results[0]);
});

route("GET", "/invitations/:id", (ctx, _b, _q, p) => {
  requireCap(ctx, "invite");
  const inv = ctx.db.invitations.find((i) => i.id === p.id);
  if (!inv) fail(404, "Invitation not found.", "not_found");
  return ok(inv);
});

// ---- Claims ----------------------------------------------------------------

route("GET", "/claims", (ctx) => {
  const me = requireUser(ctx);
  const items = ctx.db.claims.filter((c) => canSeeClaim(c, me)).map((c) => serializeClaim(ctx, c));
  return list(items);
});

route("GET", "/claims/:id", (ctx, _b, _q, p) => {
  requireUser(ctx);
  return ok(serializeClaim(ctx, findClaim(ctx, p.id)));
});

route("GET", "/claim-packages", (ctx) => {
  requireCap(ctx, "initiateFromAuto", "Only Claim Toolkit Auto accounts can start from an Auto claim.");
  const ready = ctx.db.claims.filter(
    (c) => c.status === "ready" && (ctx.caps.viewAllClaims || c.ownerUserId === ctx.me.id)
  );
  return list(ready.map((c) => toPackage(ctx, c)));
});

route("GET", "/directory/lookup", (ctx, _b, q) => {
  requireCap(ctx, "invite");
  const user = ctx.db.users.find((u) => sameEmail(u.email, q.email));
  if (!user) return ok({ known: false });
  return ok({
    known: true,
    name: user.name,
    company: user.company,
    tier: user.tier,
    tierLabel: LEVEL_LABELS[user.tier],
    isCtk: isCtkUser(user),
  });
});

route("POST", "/claims", (ctx, b) => {
  requireCap(ctx, "initiate", "Your account can't start a Matrix. Level 1 users can request an upgrade.");
  const invitees = Array.isArray(b.invitees) ? b.invitees.filter((i) => i && i.email) : [];
  if (invitees.length === 0) fail(422, "Invite at least one person.", "validation", { invitees: "Invite at least one person" });

  let claim;
  if (b.autoClaimId) {
    requireCap(ctx, "initiateFromAuto", "Only Claim Toolkit Auto accounts can start from an Auto claim.");
    claim = ctx.db.claims.find((c) => c.autoClaimId === b.autoClaimId && c.status === "ready");
    if (!claim) {
      const started = ctx.db.claims.some((c) => c.autoClaimId === b.autoClaimId);
      fail(started ? 409 : 404, started ? "A Matrix has already been started from this claim." : "This claim isn't ready for Matrix.", "unavailable");
    }
    if (!ctx.caps.viewAllClaims && claim.ownerUserId !== ctx.me.id) {
      fail(403, "You can only start a Matrix from your own claims.", "forbidden");
    }
    const available = claim.documentsAvailable ?? [];
    const selected = (Array.isArray(b.includedDocuments) ? b.includedDocuments : []).filter((n) => available.includes(n));
    claim.includedDocuments = selected;
    claim.status = "sent";
    claim.initiatorUserId = ctx.me.id;
    claim.initiator = ctx.me.company;
    claim.opened = today();
    claim.members = [initiatorMember(ctx.me)];
    createDocumentsFor(ctx, claim, selected, "auto");
  } else {
    if (!String(b.claimNumber ?? "").trim() && !String(b.insuredName ?? "").trim()) {
      fail(422, "Add a claim number or insured name.", "validation", { claimNumber: "Add a claim number or insured name" });
    }
    const documentsList = Array.isArray(b.includedDocuments) ? b.includedDocuments : [];
    const sequence = String(ctx.db.claims.filter((c) => c.id.startsWith("CM-2609")).length + 301).padStart(4, "0");
    claim = {
      id: `CM-2609-${sequence}`,
      autoClaimId: null,
      originApp: ctx.me.tier === "level2" ? "compliance" : "manual",
      title: b.title || "Untitled matter",
      status: "negotiation-active",
      ownerUserId: ctx.me.id,
      initiatorUserId: ctx.me.id,
      initiator: ctx.me.company,
      liability: "Not assessed (manual entry)",
      exposure: null,
      opened: today(),
      comments: 0,
      claimNumber: b.claimNumber || null,
      insuredName: b.insuredName || null,
      accidentType: b.accidentType || null,
      dateOfLoss: b.dateOfLoss || null,
      timeOfLoss: b.timeOfLoss || null,
      state: b.accidentState || null,
      lossLocation: b.lossLocationStreet || null,
      lossCity: b.city || null,
      lossZip: b.zip || null,
      accidentDesc: b.accidentFacts || null,
      sceneConditions: b.sceneConditions ?? [],
      parties: [],
      companyAssessments: [],
      dutyAgreements: [],
      documentsAvailable: documentsList,
      includedDocuments: documentsList,
      members: [initiatorMember(ctx.me)],
    };
    ctx.db.claims.unshift(claim);
    createDocumentsFor(ctx, claim, documentsList, "manual");
  }

  logEvent(ctx, "Matrix started", {
    target: claim.id,
    matrixCode: claim.id,
    oldValue: b.autoClaimId ? "Ready" : null,
    newValue: STATUS_LABELS[claim.status],
  });
  const results = addInvitees(ctx, claim, invitees, b.message);
  const first = results[0];
  claim.recipient = first ? ctx.db.users.find((u) => sameEmail(u.email, first.email))?.company ?? first.name : null;
  claim.updated = "Just now";
  return ok({ ...serializeClaim(ctx, claim), inviteResults: results });
});

route("POST", "/claims/:id/invitations", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "invite", "Only Admin, Level 3 and Level 2 users can invite people.");
  const invitees = Array.isArray(b.invitees) ? b.invitees.filter((i) => i && i.email) : [];
  if (invitees.length === 0) fail(422, "Invite at least one person.", "validation");
  const results = addInvitees(ctx, claim, invitees, b.message);
  return ok({ results, claim: serializeClaim(ctx, claim) });
});

const SETTLEMENT_STATUS = {
  propose: "settlement-proposed",
  counter: "settlement-countered",
  accept: "settlement-accepted",
  reject: "negotiation-active",
};

route("POST", "/claims/:id/settlement", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "offers");
  const action = SETTLEMENT_STATUS[b.action] ? b.action : "propose";
  const old = STATUS_LABELS[claim.status];
  claim.status = SETTLEMENT_STATUS[action];
  const amount = Number(String(b.amount ?? "").replace(/[^0-9.]/g, ""));
  if (amount > 0) claim.exposure = amount;
  const split = b.split || (b.splits && b.splits.initiator ? `${b.splits.initiator} / ${b.splits.recipient}` : null);
  if (split) claim.liability = split;
  claim.offers = [...(claim.offers ?? []), { action, amount: amount || null, split, note: b.rationale || b.acceptanceNote || b.terms || "", by: ctx.me.name, at: nowIso() }];
  claim.updated = "Just now";
  const verb = { propose: "Offer proposed", counter: "Offer countered", accept: "Offer accepted", reject: "Offer rejected" }[action];
  logEvent(ctx, verb, { matrixCode: claim.id, oldValue: old, newValue: [amount ? `$${amount.toLocaleString()}` : null, split].filter(Boolean).join(" · ") || STATUS_LABELS[claim.status] });
  return ok(serializeClaim(ctx, claim));
});

route("POST", "/claims/:id/responses", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "dispute", "Your account can't file a formal dispute.");
  const old = STATUS_LABELS[claim.status];
  claim.status = "response-submitted";
  claim.responses = [...(claim.responses ?? []), { ...b, by: ctx.me.name, company: ctx.me.company, at: nowIso() }];
  claim.updated = "Just now";
  logEvent(ctx, "Formal dispute filed", { matrixCode: claim.id, oldValue: old, newValue: STATUS_LABELS[claim.status] });
  return ok(serializeClaim(ctx, claim));
});

route("POST", "/claims/:id/assessment", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "assessment", "Only Admin and Level 3 users can edit the Assessment.");
  const splits = Array.isArray(b.splits) ? b.splits : [];
  const total = splits.reduce((sum, s) => sum + (Number(s.percent) || 0), 0);
  if (total !== 100) fail(422, "The split must add up to 100%.", "validation");
  const company = ctx.me.company ?? ctx.me.name;
  claim.companyAssessments = [
    ...(claim.companyAssessments ?? []).filter((a) => a.company !== company),
    { company, splits: splits.map((s) => ({ company: s.company, percent: Number(s.percent) || 0 })), submitted: today() },
  ];
  claim.updated = "Just now";
  logEvent(ctx, "Assessment submitted", { matrixCode: claim.id, newValue: splits.map((s) => s.percent).join(" / ") });
  return ok(serializeClaim(ctx, claim));
});

route("POST", "/claims/:id/duty-agreement", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "assessment", "Only Admin and Level 3 users can edit the Assessment.");
  const items = Array.isArray(b.items) ? b.items : [];
  claim.dutyAgreements = (claim.dutyAgreements ?? []).map((d) => {
    const change = items.find((i) => i.category === d.category);
    return change ? { ...d, status: change.status, reason: change.reason } : d;
  });
  claim.updated = "Just now";
  logEvent(ctx, "Duty agreement updated", { matrixCode: claim.id, newValue: `${items.length} duties reviewed` });
  return ok(serializeClaim(ctx, claim));
});

route("POST", "/claims/:id/decisions", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "agreeSplit", "Your account can't record a decision on the fault split.");
  claim.decisions = [...(claim.decisions ?? []), { decision: b.decision, notes: b.notes, by: ctx.me.name, at: nowIso() }];
  logEvent(ctx, "Fault split decision", { matrixCode: claim.id, newValue: b.decision });
  return ok(serializeClaim(ctx, claim));
});

route("POST", "/claims/:id/close", (ctx, b, _q, p) => {
  const claim = requireClaimAction(ctx, p.id, "closeClaim", "Your account can't close claims.");
  const isAdmin = ctx.caps.manageUsers;
  if (!isAdmin && claim.initiatorUserId !== ctx.me.id) {
    fail(403, "Only the person who started this Matrix, or an Admin, can close it.", "forbidden");
  }
  const old = STATUS_LABELS[claim.status];
  claim.status = "closed";
  claim.closeNotes = b.notes ?? "";
  claim.updated = "Just now";
  logEvent(ctx, "Claim closed", { matrixCode: claim.id, oldValue: old, newValue: "Closed" });
  return ok(serializeClaim(ctx, claim));
});

// ---- Documents ---------------------------------------------------------------

function visibleClaimIds(ctx) {
  return new Set(ctx.db.claims.filter((c) => canSeeClaim(c, ctx.me)).map((c) => c.id));
}

route("GET", "/documents", (ctx) => {
  requireUser(ctx);
  const ids = visibleClaimIds(ctx);
  return list(ctx.db.documents.filter((d) => ids.has(d.matrixId)));
});

route("GET", "/documents/:id", (ctx, _b, _q, p) => {
  requireUser(ctx);
  const doc = ctx.db.documents.find((d) => d.id === p.id);
  if (!doc) fail(404, "Document not found.", "not_found");
  if (!visibleClaimIds(ctx).has(doc.matrixId)) fail(403, "You don't have access to this document.", "forbidden");
  return ok(doc);
});

route("POST", "/documents", (ctx, b) => {
  const get = formGetter(b);
  const claim = requireClaimAction(ctx, get("MatrixId"), "uploadEvidence", "Your account can't upload evidence.");
  const file = get("File");
  const created = {
    id: uid("doc"),
    name: get("DisplayName") || file?.name || "uploaded-file",
    matrixId: claim.id,
    type: get("Type") || "Evidence",
    version: "v1",
    status: "Pending review",
    owner: ctx.me.company ?? ctx.me.name,
    uploadedBy: ctx.me.name,
    uploadedAt: nowIso(),
    access: ["Everyone in this claim"],
    metadata: get("Notes") ? [["Notes", get("Notes")]] : [],
  };
  ctx.db.documents.push(created);
  logEvent(ctx, "Document uploaded", { target: created.name, matrixCode: claim.id, newValue: created.type });
  return ok(created);
});

route("GET", "/unclassified-uploads", (ctx, _b, q) => {
  requireUser(ctx);
  const ids = visibleClaimIds(ctx);
  return list(ctx.db.unclassifiedUploads.filter((u) => ids.has(u.matrixId) && (!q.matrixId || u.matrixId === q.matrixId)));
});

route("POST", "/unclassified-uploads", (ctx, b) => {
  const get = formGetter(b);
  const claim = requireClaimAction(ctx, get("MatrixId"), "uploadEvidence", "Your account can't upload evidence.");
  const file = get("File");
  const created = { id: uid("unc"), matrixId: claim.id, name: file?.name || get("Name") || "uploaded-file", uploadedBy: ctx.me.name, uploadedAt: new Date().toLocaleString() };
  ctx.db.unclassifiedUploads.push(created);
  logEvent(ctx, "File added", { target: created.name, matrixCode: claim.id });
  return ok(created);
});

route("POST", "/unclassified-uploads/:id/promote", (ctx, b, _q, p) => {
  const upload = ctx.db.unclassifiedUploads.find((u) => u.id === p.id);
  if (!upload) fail(404, "Upload not found.", "not_found");
  const claim = requireClaimAction(ctx, upload.matrixId, "uploadEvidence", "Your account can't classify uploads.");
  const promoted = {
    id: uid("doc"),
    name: upload.name,
    matrixId: claim.id,
    type: body(b).type || "Evidence",
    version: "v1",
    status: "Pending review",
    owner: ctx.me.company ?? ctx.me.name,
    uploadedBy: upload.uploadedBy,
    uploadedAt: nowIso(),
    access: ["Everyone in this claim"],
    metadata: [],
  };
  ctx.db.documents.push(promoted);
  ctx.db.unclassifiedUploads = ctx.db.unclassifiedUploads.filter((u) => u.id !== p.id);
  logEvent(ctx, "Upload classified", { target: upload.name, matrixCode: claim.id, newValue: promoted.type });
  return ok(promoted);
});

route("DELETE", "/unclassified-uploads/:id", (ctx, _b, _q, p) => {
  const upload = ctx.db.unclassifiedUploads.find((u) => u.id === p.id);
  if (!upload) return ok(null);
  requireClaimAction(ctx, upload.matrixId, "uploadEvidence", "Your account can't remove uploads.");
  ctx.db.unclassifiedUploads = ctx.db.unclassifiedUploads.filter((u) => u.id !== p.id);
  return ok(null);
});

// ---- Access requests (Request Access) ---------------------------------------------

// Pending first, then newest first.
function byStatusThenNewest(order, dateField) {
  return (a, b) =>
    (order[a.status] ?? 1) - (order[b.status] ?? 1) || String(b[dateField]).localeCompare(String(a[dateField]));
}

route("GET", "/access-requests", (ctx) => {
  requireCap(ctx, "approvals");
  const order = { "Pending review": 0 };
  return list([...ctx.db.accessRequests].sort(byStatusThenNewest(order, "requestedAt")));
});

route("POST", "/access-requests", (ctx, b) => {
  const fields = {};
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const company = String(b.company ?? "").trim();
  if (!name) fields.name = "Full name is required";
  if (!EMAIL_RE.test(email)) fields.email = "Enter a valid email address";
  if (!company) fields.company = "Company is required";
  if (Object.keys(fields).length) fail(422, "Some fields need fixing.", "validation", fields);
  if (ctx.db.users.some((u) => sameEmail(u.email, email))) {
    fail(409, "An account already exists for this email. Sign in instead.", "account_exists", { email: "An account already exists for this email" });
  }
  if (ctx.db.accessRequests.some((r) => sameEmail(r.email, email) && r.status === "Pending review")) {
    fail(409, "A request for this email is already waiting for review.", "duplicate");
  }

  let invite = null;
  if (b.inviteCode) {
    invite = ctx.db.invitations.find((i) => i.code === b.inviteCode);
    if (!invite) fail(404, "We couldn't find this invitation.", "not_found");
    if (invite.status === "Expired") fail(410, "This invitation has expired.", "invitation_expired");
    if (invite.inviteType !== "company-user") fail(400, "This invitation doesn't need an access request.", "wrong_flow");
    if (invite.status !== "Sent") fail(409, "This invitation has already been used.", "used");
    if (!sameEmail(invite.email, email)) fail(422, "Use the email address the invitation was sent to.", "validation", { email: "Must match the invited email" });
    invite.status = "Pending approval";
    const claim = ctx.db.claims.find((c) => c.id === invite.claimId);
    const member = claim?.members?.find((m) => m.inviteCode === invite.code);
    if (member) {
      member.status = "Awaiting approval";
      member.name = name;
      member.company = company;
    }
  }

  const created = {
    id: uid("req"),
    name,
    email,
    company,
    domain: email.split("@")[1] ?? "",
    reason: String(b.reason ?? "").trim(),
    source: invite ? "invite" : "self",
    inviteId: invite?.id ?? null,
    claimId: invite?.claimId ?? null,
    invitedBy: invite?.invitedBy ?? null,
    status: "Pending review",
    requestedAt: nowIso(),
  };
  ctx.db.accessRequests.unshift(created);
  logEvent(ctx, "Access requested", { actor: name, actorCompany: company, target: invite?.claimId ?? email, matrixCode: invite?.claimId, newValue: "Awaiting approval" });
  notifyApprovers(ctx, "New access request", `${name} (${company}) is waiting for approval.`);
  return ok(created);
});

route("POST", "/access-requests/:id/decision", (ctx, b, _q, p) => {
  requireCap(ctx, "approvals");
  const req = ctx.db.accessRequests.find((r) => r.id === p.id);
  if (!req) fail(404, "Access request not found.", "not_found");
  if (req.status !== "Pending review") fail(409, "This request has already been decided.", "decided");
  const invite = req.inviteId ? ctx.db.invitations.find((i) => i.id === req.inviteId) : null;
  const claim = invite ? ctx.db.claims.find((c) => c.id === invite.claimId) : null;
  const member = claim?.members?.find((m) => m.inviteCode === invite?.code);

  if (b.decision === "reject") {
    req.status = "Rejected";
    req.note = b.note ?? "";
    req.decidedBy = ctx.me.name;
    req.decidedAt = nowIso();
    if (invite) invite.status = "Rejected";
    if (member) member.status = "Rejected";
    if (invite) notify(ctx, invite.invitedByUserId, "Access rejected", `${req.name}'s access to ${invite.claimId} was rejected.`);
    sendEmail(ctx, {
      to: req.email,
      toName: req.name,
      subject: "Your Claim Matrix access request",
      text: `Your request to join Claim Matrix was declined.${b.note ? ` Note from the reviewer: “${b.note}”` : ""}`,
    });
    logEvent(ctx, "Access request rejected", { target: req.name, matrixCode: req.claimId, oldValue: "Awaiting approval", newValue: "Rejected" });
    return ok(req);
  }

  let companyName;
  if (b.companyMode === "existing") {
    const company = ctx.db.companies.find((c) => c.id === b.companyId);
    if (!company) fail(422, "Choose the company to link them to.", "validation", { companyId: "Choose a company" });
    companyName = company.name;
  } else {
    companyName = req.company;
    if (ctx.db.companies.some((c) => c.name.toLowerCase() === companyName.toLowerCase())) {
      fail(409, `${companyName} already exists — link them to it instead.`, "company_exists");
    }
    ctx.db.companies.push({
      id: uid("ctk-co"),
      name: companyName,
      status: "Enabled",
      trust: "Approved",
      subscription: "Claim Matrix only",
      contacts: 1,
      matrixs: claim ? 1 : 0,
      notifications: "Email",
      allowedDomain: req.domain,
    });
  }
  if (ctx.db.users.some((u) => sameEmail(u.email, req.email))) fail(409, "An account already exists for this email.", "account_exists");

  const user = {
    id: uid("cmu"),
    name: req.name,
    email: req.email,
    source: "Claim Matrix",
    sourceApp: null,
    company: companyName,
    role: "Matrix User",
    tier: "level1",
    status: "Awaiting password",
    password: null,
    lastSeen: "Never",
  };
  ctx.db.users.push(user);
  req.status = "Approved";
  req.companyName = companyName;
  req.decidedBy = ctx.me.name;
  req.decidedAt = nowIso();
  if (invite) invite.status = "Approved";
  if (member) {
    member.userId = user.id;
    member.company = companyName;
    member.status = "Awaiting password";
  }
  createPasswordToken(ctx, user, "setup");
  logEvent(ctx, "Access request approved", { target: req.name, matrixCode: req.claimId, oldValue: "Awaiting approval", newValue: `Level 1 · ${companyName}` });
  return ok(req);
});

// ---- Upgrade requests (Level 1 → Level 2/3) ------------------------------------------

route("GET", "/upgrade-requests", (ctx) => {
  requireUser(ctx);
  if (ctx.caps.approvals) {
    const order = { "Pending review": 0 };
    return list([...ctx.db.upgradeRequests].sort(byStatusThenNewest(order, "requestedAt")));
  }
  // Everyone else sees only their own — including just after an approval,
  // when they're no longer Level 1 but still need to see the result.
  return list(ctx.db.upgradeRequests.filter((r) => r.userId === ctx.me.id));
});

route("POST", "/upgrade-requests", (ctx, b) => {
  requireCap(ctx, "requestUpgrade", "Only Level 1 accounts can request an upgrade.");
  if (ctx.db.upgradeRequests.some((r) => r.userId === ctx.me.id && r.status === "Pending review")) {
    fail(409, "You already have an upgrade request waiting for review.", "duplicate");
  }
  const created = {
    id: uid("upg"),
    userId: ctx.me.id,
    name: ctx.me.name,
    email: ctx.me.email,
    company: ctx.me.company,
    currentTier: ctx.me.tier,
    note: String(b.note ?? "").trim(),
    status: "Pending review",
    requestedAt: nowIso(),
  };
  ctx.db.upgradeRequests.unshift(created);
  logEvent(ctx, "Upgrade requested", { target: ctx.me.name, newValue: "Awaiting approval" });
  notifyApprovers(ctx, "New upgrade request", `${ctx.me.name} (${ctx.me.company}) asked to upgrade from Level 1.`);
  return ok(created);
});

route("POST", "/upgrade-requests/:id/decision", (ctx, b, _q, p) => {
  requireCap(ctx, "approvals");
  const req = ctx.db.upgradeRequests.find((r) => r.id === p.id);
  if (!req) fail(404, "Upgrade request not found.", "not_found");
  if (req.status !== "Pending review") fail(409, "This request has already been decided.", "decided");
  const user = ctx.db.users.find((u) => u.id === req.userId);
  if (!user) fail(404, "This user no longer exists.", "not_found");

  if (b.decision === "reject") {
    req.status = "Rejected";
    req.note = b.note ?? "";
    req.decidedBy = ctx.me.name;
    req.decidedAt = nowIso();
    notify(ctx, user.id, "Upgrade not approved", b.note ? `Your upgrade request was declined: ${b.note}` : "Your upgrade request was declined.");
    sendEmail(ctx, { to: user.email, toName: user.name, subject: "Your Claim Matrix upgrade request", text: `Your upgrade request was declined.${b.note ? ` Note: “${b.note}”` : ""}` });
    logEvent(ctx, "Upgrade rejected", { target: user.name, oldValue: "Level 1", newValue: "Level 1" });
    return ok(req);
  }

  if (!["level2", "level3"].includes(b.level)) {
    fail(422, "Choose Level 2 or Level 3.", "validation", { level: "Choose Level 2 or Level 3" });
  }
  user.tier = b.level;
  user.role = b.level === "level3" ? "Matrix User · Level 3" : "Matrix User · Level 2";
  req.status = "Approved";
  req.approvedLevel = b.level;
  req.decidedBy = ctx.me.name;
  req.decidedAt = nowIso();
  notify(ctx, user.id, "Upgrade approved", `You're now ${LEVEL_LABELS[b.level]} and can start a Matrix.`);
  sendEmail(ctx, {
    to: user.email,
    toName: user.name,
    subject: "Your Claim Matrix upgrade was approved",
    text: `You're now ${LEVEL_LABELS[b.level]} in Claim Matrix. You can start a Matrix and invite people.`,
    cta: { label: "Sign in", path: "/signin", openAs: "public" },
  });
  logEvent(ctx, "Upgrade approved", { target: user.name, oldValue: "Level 1", newValue: LEVEL_LABELS[b.level] });
  return ok(req);
});

// ---- Users -------------------------------------------------------------------

route("GET", "/users", (ctx) => {
  requireCap(ctx, "manageUsers");
  return list(ctx.db.users.map(publicUser));
});

route("POST", "/users", (ctx, b) => {
  requireCap(ctx, "manageUsers", "Only the Admin can add local users.");
  const fields = {};
  const name = String(b.fullName ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const accountType = b.accountType === "level1" ? "level1" : "approver";
  if (!name) fields.fullName = "Full name is required";
  if (!EMAIL_RE.test(email)) fields.email = "Enter a valid email address";
  if (accountType === "level1" && !String(b.company ?? "").trim()) fields.company = "Company is required for a Level 1 user";
  if (Object.keys(fields).length) fail(422, "Some fields need fixing.", "validation", fields);
  if (ctx.db.users.some((u) => sameEmail(u.email, email))) fail(409, "An account already exists for this email.", "account_exists", { email: "Already in use" });

  const user = {
    id: uid("cmu"),
    name,
    email,
    source: "Claim Matrix",
    sourceApp: null,
    company: accountType === "approver" ? "Claim Toolkit" : String(b.company).trim(),
    role: accountType === "approver" ? "Claim Matrix Approver" : "Matrix User",
    tier: accountType,
    jobTitle: b.jobTitle || null,
    phone: b.phone || null,
    status: "Awaiting password",
    password: null,
    lastSeen: "Never",
  };
  ctx.db.users.push(user);
  if (b.sendInvite !== false) createPasswordToken(ctx, user, "setup");
  logEvent(ctx, "Local user added", { target: user.name, newValue: LEVEL_LABELS[user.tier] });
  return ok(publicUser(user));
});

route("PUT", "/users/:id", (ctx, b, _q, p) => {
  const me = requireUser(ctx);
  if (p.id !== me.id) requireCap(ctx, "manageUsers");
  const user = ctx.db.users.find((u) => u.id === p.id);
  if (!user) fail(404, "User not found.", "not_found");
  if (b.fullName || b.name) user.name = String(b.fullName || b.name).trim();
  if (p.id !== me.id && b.status) user.status = b.status;
  return ok(publicUser(user));
});

// ---- Companies -------------------------------------------------------------------

route("GET", "/companies", (ctx) => {
  requireUser(ctx);
  return list(ctx.db.companies);
});

route("GET", "/companies/:code", (ctx, _b, _q, p) => {
  requireUser(ctx);
  const company = ctx.db.companies.find((c) => c.id === p.code);
  if (!company) fail(404, "Company not found.", "not_found");
  return ok(company);
});

route("POST", "/companies/onboarding", (ctx, b) => {
  requireCap(ctx, "manageUsers", "Only the Admin can onboard companies.");
  const existing = ctx.db.companies.find((c) => c.id === b.companyId);
  const record = { ...(existing ?? {}), id: b.companyId || uid("ctk-co"), name: b.companyName, status: b.draft ? "Pending activation" : "Enabled" };
  if (existing) Object.assign(existing, record);
  else ctx.db.companies.push({ trust: "Review", subscription: "Not configured", contacts: 0, matrixs: 0, notifications: "Email", ...record });
  logEvent(ctx, b.draft ? "Company draft saved" : "Company activated", { target: b.companyName });
  return ok(record);
});

// ---- Simulated Claim Toolkit Auto app + background job -------------------------------

function autoAppClaimView(ctx, a) {
  const matrix = ctx.db.claims.find((c) => c.autoClaimId === a.id);
  const { claimData: _claimData, ...rest } = a;
  return { ...rest, matrixId: matrix?.id ?? null, matrixStatus: matrix?.status ?? null, matrixStatusLabel: matrix ? STATUS_LABELS[matrix.status] : null };
}

route("GET", "/auto-app/claims", (ctx) => {
  requireCap(ctx, "initiateFromAuto", "This screen is for Claim Toolkit Auto accounts.");
  const items = ctx.db.autoAppClaims.filter((a) => ctx.caps.viewAllClaims || a.ownerUserId === ctx.me.id);
  return list(items.map((a) => autoAppClaimView(ctx, a)));
});

route("POST", "/auto-app/claims/:id/complete-assessment", (ctx, _b, _q, p) => {
  requireCap(ctx, "initiateFromAuto", "This screen is for Claim Toolkit Auto accounts.");
  const autoClaim = ctx.db.autoAppClaims.find((a) => a.id === p.id);
  if (!autoClaim || (!ctx.caps.viewAllClaims && autoClaim.ownerUserId !== ctx.me.id)) fail(404, "Claim not found.", "not_found");
  if (autoClaim.assessmentStatus === "Complete") fail(409, "This Assessment is already complete.", "already_complete");
  autoClaim.assessmentStatus = "Complete";
  autoClaim.assessment = "Liability assessment v1";

  // The background job: copy the whole claim into the Matrix database once.
  const data = autoClaim.claimData ?? {};
  const owner = ctx.db.users.find((u) => u.id === autoClaim.ownerUserId);
  const sequence = String(ctx.db.claims.filter((c) => c.id.startsWith("CM-2609")).length + 201).padStart(4, "0");
  const matrixClaim = {
    id: `CM-2609-${sequence}`,
    autoClaimId: autoClaim.id,
    originApp: "auto",
    title: autoClaim.title,
    status: "ready",
    ownerUserId: autoClaim.ownerUserId,
    initiatorUserId: null,
    initiator: owner?.company ?? null,
    recipient: null,
    liability: data.liability ?? "Pending",
    exposure: data.exposure ?? null,
    exposureCurrency: "USD",
    copiedAt: nowIso(),
    updated: "Just now",
    comments: 0,
    claimNumber: data.claimNumber ?? autoClaim.id,
    insuredName: autoClaim.insuredName,
    accidentType: data.accidentType ?? null,
    dateOfLoss: autoClaim.dateOfLoss,
    timeOfLoss: data.timeOfLoss ?? null,
    state: autoClaim.state,
    lossLocation: data.lossLocation ?? null,
    lossCity: autoClaim.lossCity,
    lossZip: data.lossZip ?? null,
    accidentDesc: data.accidentDesc ?? null,
    overallSummary: data.overallSummary ?? null,
    parties: data.parties ?? [],
    vehicles: data.vehicles ?? [],
    statements: data.statements ?? [],
    companyAssessments: [],
    dutyAgreements: data.dutyAgreements ?? [],
    documentsAvailable: data.documents ?? [],
    includedDocuments: [],
    members: [],
  };
  ctx.db.claims.unshift(matrixClaim);
  logEvent(ctx, "Assessment completed", { target: autoClaim.id, matrixCode: matrixClaim.id, newValue: "Complete" });
  logEvent(ctx, "Claim copied from Auto", { actor: "Background job", actorCompany: "Claim Matrix", target: autoClaim.id, matrixCode: matrixClaim.id, newValue: "Ready" });
  notify(ctx, autoClaim.ownerUserId, "Claim ready for Matrix", `${autoClaim.id} finished its Assessment and was copied into Claim Matrix.`);
  return ok({ ...autoAppClaimView(ctx, autoClaim), matrixId: matrixClaim.id });
});

// ---- Dashboard, notifications, audit --------------------------------------------------

route("GET", "/dashboard", (ctx) => {
  const me = requireUser(ctx);
  const visible = ctx.db.claims.filter((c) => canSeeClaim(c, me) && c.status !== "ready");
  const ids = new Set(visible.map((c) => c.id));
  const ready = ctx.db.claims.filter((c) => c.status === "ready" && canSeeClaim(c, me));
  const metrics = [
    { label: "Open claims", value: String(visible.filter((c) => c.status !== "closed").length) },
    { label: "Awaiting response", value: String(visible.filter((c) => ["sent", "invitation-pending", "under-review"].includes(c.status)).length) },
    { label: "In negotiation", value: String(visible.filter((c) => c.status === "negotiation-active" || c.status.startsWith("settlement")).length) },
    { label: "Ready to share", value: String(ready.length) },
  ];
  const activity = ctx.db.auditEvents
    .filter((e) => e.matrixCode && (ids.has(e.matrixCode) || ready.some((r) => r.id === e.matrixCode)))
    .slice(0, 5)
    .map((e) => ({ who: e.actor, org: e.actorCompany ?? "", action: `${e.action.toLowerCase()} —`, target: e.matrixCode, time: relative(e.timestamp) }));
  const mine = ctx.db.notifications.filter((n) => n.userId === me.id).slice(0, 4);
  return ok({
    metrics,
    activity,
    notifications: mine.map((n) => ({ id: n.id, title: n.title, body: n.body, time: relative(n.time) })),
    settlement: dashboardData.settlement,
  });
});

route("GET", "/notifications", (ctx) => {
  const me = requireUser(ctx);
  return list(
    ctx.db.notifications
      .filter((n) => n.userId === me.id)
      .map((n) => ({ id: n.id, title: n.title, body: n.body, time: relative(n.time), unread: !n.read, tone: "info" }))
  );
});

route("POST", "/notifications/mark-all-read", (ctx) => {
  const me = requireUser(ctx);
  ctx.db.notifications.forEach((n) => {
    if (n.userId === me.id) n.read = true;
  });
  return ok(null);
});

route("GET", "/notification-preferences", (ctx) => {
  requireUser(ctx);
  return ok(ctx.db.notificationPreferences);
});

route("PUT", "/notification-preferences", (ctx, b) => {
  requireUser(ctx);
  if (Array.isArray(b.preferences)) ctx.db.notificationPreferences = b.preferences;
  return ok(ctx.db.notificationPreferences);
});

route("GET", "/audit-events", (ctx, _b, q) => {
  requireCap(ctx, "auditTrail", "The Audit Trail is only available to the Admin and Approvers.");
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.max(1, Number(q.limit) || 25);
  const filtered = ctx.db.auditEvents.filter((e) => !q.matrixCode || e.matrixCode === q.matrixCode);
  return list(filtered.slice((page - 1) * limit, page * limit), { total: filtered.length, page, limit });
});

// ---- Access levels, RBAC, admin reference data ------------------------------------------

route("GET", "/access-tiers", () => list(accessTiers));
route("GET", "/admin/rbac", () => ok(rbacPolicy));
route("PUT", "/admin/rbac", (ctx) => {
  requireCap(ctx, "manageUsers");
  return ok({ saved: true });
});
route("GET", "/admin/roles", () => list(rbacPolicy.roles));
route("GET", "/admin/system-boundaries", () => list(systemOwnershipBoundaries));
route("GET", "/admin/collaboration-modes", () => list(collaborationModes));
route("GET", "/admin/integration-events", () => list(integrationEvents));

// ---- Claim Management (UC5 — kept as-is this phase) ---------------------------------------

route("GET", "/claim-management", (ctx) => {
  requireCap(ctx, "caseManagement");
  return list(ctx.db.claimManagementCases);
});

route("POST", "/claim-management", (ctx, b) => {
  requireCap(ctx, "caseManagement");
  const created = {
    id: uid("cm5"),
    title: b.title || "Untitled contribution case",
    relatedMatrixId: b.relatedMatrixId || null,
    leadCompany: b.leadCompany || "",
    agreementType: b.agreementType || "JDA",
    status: "Still Treating",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    agreement: { status: "Draft", docusignEnvelopeId: null, documentName: null, executedAt: null },
    parties: Array.isArray(b.parties) ? b.parties : [],
    activityNotes: [],
    documents: [],
    releases: [],
  };
  ctx.db.claimManagementCases.push(created);
  return ok(created);
});

route("GET", "/claim-management/:id", (ctx, _b, _q, p) => {
  requireCap(ctx, "caseManagement");
  return ok(ctx.db.claimManagementCases.find((c) => c.id === p.id) ?? null);
});

route("PUT", "/claim-management/:id", (ctx, b, _q, p) => {
  requireCap(ctx, "caseManagement");
  const row = ctx.db.claimManagementCases.find((c) => c.id === p.id);
  if (!row) fail(404, "Claim management case not found", "not_found");
  if (b.status) row.status = b.status;
  if (b.leadCompany) row.leadCompany = b.leadCompany;
  if (b.agreementType) row.agreementType = b.agreementType;
  if (b.agreement && typeof b.agreement === "object") row.agreement = { ...row.agreement, ...b.agreement };
  if (b.appendParty) row.parties.push({ id: uid("tp"), paymentStatus: "Not started", ...b.appendParty });
  if (b.updateParty && b.updateParty.id) row.parties = row.parties.map((party) => (party.id === b.updateParty.id ? { ...party, ...b.updateParty } : party));
  if (b.appendNote) row.activityNotes.push({ id: uid("n"), date: nowIso(), author: ctx.me.name, note: b.appendNote });
  if (b.appendDocument) row.documents.push({ id: uid("d"), uploadedAt: nowIso(), ...b.appendDocument });
  if (b.appendRelease) row.releases.push({ id: uid("r"), ...b.appendRelease });
  row.updatedAt = nowIso();
  return ok(row);
});

// ---- Prototype helpers (simulated email inbox + reset) ----------------------------------

route("GET", "/demo/emails", (ctx) =>
  list([...ctx.db.emails].sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt))))
);
route("POST", "/demo/reset", () => {
  resetDb();
  return ok({ reset: true });
});

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Resolve a mocked response. Returns the API envelope or throws an ApiError,
 * exactly like the real API helpers.
 *
 * @param {string} path   Request path including any query string.
 * @param {string} method HTTP method.
 * @param {unknown} [rawBody] Parsed JSON body (or FormData).
 * @param {string|null} [token] The caller's bearer token.
 */
export function resolveMock(path, method = "GET", rawBody, token) {
  const [clean, queryString] = path.split("?");
  const query = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
  const db = loadDb();
  expireInvitations(db);

  const userId = typeof token === "string" && token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
  const me = userId ? db.users.find((u) => u.id === userId && u.status === "Active") ?? null : null;
  const ctx = { db, me, caps: me ? capsOf(me.tier) : {} };

  const match = routes.find((r) => r.method === method && r.regex.test(clean));
  if (!match) {
    return method === "GET" ? list([]) : ok({ ok: true });
  }
  const params = match.regex.exec(clean).groups ?? {};
  const isForm = typeof FormData !== "undefined" && rawBody instanceof FormData;
  const result = match.handler(ctx, isForm ? rawBody : body(rawBody), query, params);
  if (clean !== "/demo/reset") saveDb(ctx.db);
  return result;
}
